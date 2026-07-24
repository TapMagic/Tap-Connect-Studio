/**
 * Keywords / Brand Vocabulary service — single orchestration surface for APIs.
 * Autopilot may generate; Brand Kit stores approved; surfaces consume contracts.
 */

import { buildGroundContext, type GroundContextInput } from "./brand-context";
import { getChannelRules } from "./channel-rules";
import { createMemoryVocabularyRepository } from "./memory-repository";
import { familyToVocabularyKind } from "./normalization";
import { suggestKeywords } from "./suggestions";
import { buildConversationalKeywordSet } from "./trigger-collisions";
import type {
  BrandTerm,
  KeywordBrandPack,
  KeywordChannel,
  KeywordSuggestion,
  NamedBrandPack,
  RegenerateMode,
  SuggestResult,
  TriggerBindingInput,
  VocabularyApprovalStatus,
} from "./types";
import type { VocabularyRepository } from "./repository";

let repoOverride: VocabularyRepository | null = null;

/** Inject Prisma (or test) repository — call from API routes / server only. */
export function configureVocabularyRepository(repo: VocabularyRepository | null) {
  repoOverride = repo;
}

/** @deprecated use configureVocabularyRepository */
export function setVocabularyRepositoryForTests(repo: VocabularyRepository | null) {
  configureVocabularyRepository(repo);
}

async function repo(): Promise<VocabularyRepository> {
  if (repoOverride) return repoOverride;
  const { isIsolatedFusionDatabaseConfigured } = await import("@/lib/fusion/db/safety");
  if (isIsolatedFusionDatabaseConfigured()) {
    const { createPrismaVocabularyRepository } = await import("./prisma-repository");
    return createPrismaVocabularyRepository();
  }
  return createMemoryVocabularyRepository();
}

export async function loadVocabularyPack(businessId: string): Promise<KeywordBrandPack> {
  return (await repo()).loadBrandPackView(businessId);
}

export async function suggestVocabulary(opts: {
  businessId: string;
  businessName?: string;
  brandKitTone?: string;
  locale?: string;
  channel?: KeywordChannel;
  mode?: RegenerateMode;
  limit?: number;
  surface?: string;
  campaignId?: string;
  ground?: Partial<GroundContextInput>;
  actorId?: string;
}): Promise<SuggestResult & { pack: KeywordBrandPack }> {
  const r = await repo();
  const pack = await r.loadBrandPackView(opts.businessId);
  const ground = buildGroundContext({
    businessId: opts.businessId,
    businessName: opts.businessName,
    brandKitTone: opts.brandKitTone,
    locale: opts.locale ?? pack.locale,
    brandPack: pack,
    channel: opts.channel,
    ...opts.ground,
  });
  const result = suggestKeywords({
    ground,
    channel: opts.channel,
    mode: opts.mode,
    limit: opts.limit ?? getChannelRules(opts.channel ?? "instagram").recommendedCount.max * 2,
  });
  const run = await r.recordSuggestionRun({
    businessId: opts.businessId,
    channel: result.channel,
    campaignId: opts.campaignId ?? opts.ground?.campaignId ?? undefined,
    surface: opts.surface,
    requestContext: { mode: opts.mode, groundSummary: Object.keys(opts.ground ?? {}) },
    generated: result.suggestions,
    actorId: opts.actorId,
  });
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: opts.mode ? "keywords.regenerate" : "keywords.suggest",
    count: result.suggestions.length,
    channel: result.channel,
    campaignId: opts.campaignId,
    families: [...new Set(result.suggestions.map((s) => s.family))],
    actorId: opts.actorId,
  });
  return { ...result, runId: run.id, pack };
}

export async function acceptVocabularyTerms(opts: {
  businessId: string;
  terms: Array<BrandTerm | KeywordSuggestion>;
  persist?: boolean;
  actorId?: string;
  runId?: string;
}): Promise<{ pack: KeywordBrandPack; accepted: number; terms: BrandTerm[] }> {
  const r = await repo();
  if (opts.persist === false) {
    const pack = await r.loadBrandPackView(opts.businessId);
    return { pack, accepted: opts.terms.length, terms: opts.terms as BrandTerm[] };
  }
  const mapped = opts.terms.map((t) => {
    const suggestion = t as KeywordSuggestion;
    const kind =
      "vocabularyKind" in t && t.vocabularyKind
        ? t.vocabularyKind
        : "family" in suggestion && suggestion.family
          ? familyToVocabularyKind(suggestion.family, suggestion.kind)
          : ("KEYWORD" as const);
    // Avoid silently writing exclusions into approved if family is avoid
    const approvalStatus: VocabularyApprovalStatus =
      "family" in suggestion && suggestion.family === "avoid_exclusion"
        ? "APPROVED"
        : "APPROVED";
    const finalKind =
      "family" in suggestion && suggestion.family === "avoid_exclusion"
        ? ("EXCLUDED_TERM" as const)
        : kind;
    return {
      value: t.value,
      kind: finalKind,
      approvalStatus,
      locked: Boolean(t.locked),
      channels: ("channels" in t ? t.channels : undefined) as KeywordChannel[] | undefined,
      rationale: "rationale" in suggestion ? suggestion.rationale : undefined,
      confidence:
        "confidence" in suggestion
          ? suggestion.confidence === "high"
            ? 0.9
            : suggestion.confidence === "medium"
              ? 0.6
              : 0.3
          : undefined,
      sourceType: "GROUNDED_SUGGEST",
      createdBy: opts.actorId,
    };
  });
  const saved = await r.upsertTerms(opts.businessId, mapped);
  if (opts.runId) {
    await r.updateSuggestionRun(opts.runId, {
      selected: opts.terms as KeywordSuggestion[],
    });
  }
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.accept",
    count: saved.length,
    actorId: opts.actorId,
  });
  const pack = await r.loadBrandPackView(opts.businessId);
  return {
    pack,
    accepted: saved.length,
    terms: saved.map((s) => ({
      id: s.id,
      value: s.value,
      kind: "keyword",
      vocabularyKind: s.kind,
      locked: s.locked,
      channels: s.channels,
    })),
  };
}

export async function rejectVocabularyTerms(opts: {
  businessId: string;
  termIds?: string[];
  suggestions?: KeywordSuggestion[];
  runId?: string;
  actorId?: string;
}) {
  const r = await repo();
  let count = 0;
  for (const id of opts.termIds ?? []) {
    await r.setApproval(opts.businessId, id, "REJECTED", opts.actorId);
    count += 1;
  }
  if (opts.runId && opts.suggestions) {
    await r.updateSuggestionRun(opts.runId, { rejected: opts.suggestions });
  }
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.reject",
    count: count || opts.suggestions?.length || 0,
    actorId: opts.actorId,
  });
  return { ok: true as const, rejected: count || opts.suggestions?.length || 0 };
}

export async function applyVocabularyTerms(opts: {
  businessId: string;
  terms: BrandTerm[];
  channel?: KeywordChannel;
  variantIds?: string[];
  destination?: string;
  runId?: string;
  actorId?: string;
}) {
  const r = await repo();
  if (opts.runId) {
    await r.updateSuggestionRun(opts.runId, {
      selected: opts.terms as unknown as KeywordSuggestion[],
      appliedDestination: opts.destination ?? opts.channel,
    });
  }
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.apply",
    count: opts.terms.length,
    channel: opts.channel,
    actorId: opts.actorId,
    detail: { variantIds: opts.variantIds ?? [] },
  });
  return {
    ok: true as const,
    applied: opts.terms,
    variantIds: opts.variantIds ?? [],
    channel: opts.channel,
    note: "Surface owns merge into variants; API records apply audit only",
  };
}

export async function saveBrandPackView(opts: {
  businessId: string;
  pack: KeywordBrandPack;
  actorId?: string;
}) {
  const r = await repo();
  await r.mirrorBrandPackJson(opts.businessId, opts.pack);
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.save_brand",
    count: 1,
    actorId: opts.actorId,
  });
  return r.loadBrandPackView(opts.businessId);
}

export async function createNamedBrandPack(opts: {
  businessId: string;
  slug: string;
  name: string;
  description?: string;
  locale?: string;
  channels?: KeywordChannel[];
  termIds?: string[];
  approved?: boolean;
  actorId?: string;
}): Promise<NamedBrandPack> {
  const r = await repo();
  const pack = await r.createPack(opts.businessId, opts);
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.brand_pack.create",
    count: 1,
    actorId: opts.actorId,
  });
  return pack;
}

export async function updateNamedBrandPack(
  businessId: string,
  packId: string,
  patch: Parameters<VocabularyRepository["updatePack"]>[2]
) {
  return (await repo()).updatePack(businessId, packId, patch);
}

export async function deleteNamedBrandPack(businessId: string, packId: string) {
  return (await repo()).deletePack(businessId, packId);
}

export async function listNamedBrandPacks(businessId: string) {
  return (await repo()).listPacks(businessId);
}

export async function archiveVocabularyTerm(businessId: string, termId: string, actorId?: string) {
  const r = await repo();
  const row = await r.archiveTerm(businessId, termId);
  await r.recordAnalytics({
    businessId,
    event: "keywords.archive",
    count: 1,
    actorId,
  });
  return row;
}

export async function restoreVocabularyTerm(businessId: string, termId: string, actorId?: string) {
  const r = await repo();
  const row = await r.restoreTerm(businessId, termId);
  await r.recordAnalytics({
    businessId,
    event: "keywords.restore",
    count: 1,
    actorId,
  });
  return row;
}

export async function editVocabularyTerm(
  businessId: string,
  termId: string,
  patch: { value?: string; locale?: string; campaignId?: string | null; locationId?: string | null },
  actorId?: string
) {
  const r = await repo();
  const row = await r.editTerm(businessId, termId, patch);
  if (row) {
    await r.recordAnalytics({
      businessId,
      event: "keywords.edit",
      count: 1,
      campaignId: patch.campaignId ?? undefined,
      actorId,
      detail: { termId, patch },
    });
  }
  return row;
}

export async function lockVocabularyTerm(
  businessId: string,
  termId: string,
  locked: boolean,
  actorId?: string
) {
  const r = await repo();
  const row = await r.setLocked(businessId, termId, locked);
  await r.recordAnalytics({
    businessId,
    event: "keywords.lock",
    count: 1,
    actorId,
  });
  return row;
}

export async function detectAndBindTrigger(opts: {
  businessId: string;
  binding: TriggerBindingInput;
  actorId?: string;
}) {
  const r = await repo();
  const result = await r.upsertTriggerBinding(opts.businessId, opts.binding);
  if (result.collisions.length) {
    await r.recordAnalytics({
      businessId: opts.businessId,
      event: "keywords.trigger_collision",
      count: result.collisions.length,
      channel: opts.binding.channel,
      actorId: opts.actorId,
      detail: { collisions: result.collisions },
    });
  }
  return result;
}

export async function getConversationalSet(businessId: string, extraTriggers?: string[]) {
  const pack = await loadVocabularyPack(businessId);
  return buildConversationalKeywordSet(pack, extraTriggers);
}

export async function getVocabularyAnalytics(businessId: string) {
  const r = await repo();
  const analytics = await r.listAnalytics(businessId);
  let generated = 0;
  let accepted = 0;
  let applied = 0;
  let rejected = 0;
  let brandPackSaves = 0;
  let collisions = 0;
  for (const e of analytics) {
    if (e.event === "keywords.suggest" || e.event === "keywords.regenerate") {
      generated += e.count;
    }
    if (e.event === "keywords.accept") accepted += e.count;
    if (e.event === "keywords.apply") applied += e.count;
    if (e.event === "keywords.reject") rejected += e.count;
    if (e.event === "keywords.save_brand" || e.event === "keywords.brand_pack.create") {
      brandPackSaves += e.count;
    }
    if (e.event === "keywords.trigger_collision") collisions += e.count;
  }
  return {
    analytics,
    summary: {
      generated,
      accepted,
      applied,
      rejected,
      brandPackSaves,
      collisions,
      disclaimer: "counts_only_no_causal_claim" as const,
      evidenceClass: "modeled" as const,
      note: "Observations are counts only — not causal performance claims",
    },
  };
}

export async function observePerformanceStub(opts: {
  businessId: string;
  term: string;
  channel?: KeywordChannel;
  campaignId?: string;
  metrics?: Record<string, number>;
  evidenceClass?: "confirmed" | "correlated" | "modeled" | "incomplete";
  actorId?: string;
}) {
  const r = await repo();
  await r.recordAnalytics({
    businessId: opts.businessId,
    event: "keywords.performance.observe",
    count: 1,
    channel: opts.channel,
    campaignId: opts.campaignId,
    actorId: opts.actorId,
    detail: {
      term: opts.term,
      metrics: opts.metrics ?? {},
      evidenceClass: opts.evidenceClass ?? "incomplete",
      note: "Observation only — correlation is not causation",
    },
  });
  return {
    ok: true as const,
    evidenceClass: opts.evidenceClass ?? "incomplete",
    disclaimer: "counts_only_no_causal_claim" as const,
  };
}

/** Default hashtags for TikTok when Brand Kit has none — never invent business facts. */
export async function resolveTikTokHashtags(opts: {
  businessId: string;
  campaignTitle?: string;
}): Promise<string[]> {
  const pack = await loadVocabularyPack(opts.businessId);
  const branded = pack.brandedHashtags.map((t) =>
    t.value.startsWith("#") ? t.value : `#${t.value.replace(/\s+/g, "")}`
  );
  const approved = pack.approvedTerms
    .filter((t) => t.kind === "hashtag" || t.value.startsWith("#"))
    .map((t) => (t.value.startsWith("#") ? t.value : `#${t.value.replace(/\s+/g, "")}`));
  const campaign = pack.recurringCampaignTags.map((t) =>
    t.value.startsWith("#") ? t.value : `#${t.value.replace(/\s+/g, "")}`
  );
  const fromSuggest = suggestKeywords({
    ground: buildGroundContext({
      businessId: opts.businessId,
      campaignTitle: opts.campaignTitle,
      brandPack: pack,
    }),
    channel: "tiktok",
    limit: 5,
  }).suggestions
    .filter((s) => s.kind === "hashtag" && s.family !== "avoid_exclusion")
    .map((s) => s.value);

  const merged = [...branded, ...approved, ...campaign, ...fromSuggest];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of merged) {
    const k = h.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
    if (out.length >= 5) break;
  }
  return out;
}
