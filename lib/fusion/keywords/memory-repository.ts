/**
 * In-memory vocabulary repository for unit tests without DB.
 */

import { nanoid } from "nanoid";
import { termsToBrandPackView } from "./brand-context";
import { EMPTY_BRAND_PACK, parseKeywordBrandPack } from "./brand-pack";
import { termKey } from "./normalization";
import { detectTriggerCollisions, type ActiveTriggerBinding } from "./trigger-collisions";
import type {
  KeywordAnalyticsEntry,
  KeywordBrandPack,
  NamedBrandPack,
  VocabularyTermKind,
} from "./types";
import type { SuggestionRunRecord, VocabularyRepository, VocabularyTermRecord } from "./repository";

type MemState = {
  terms: VocabularyTermRecord[];
  packs: NamedBrandPack[];
  packMembers: Map<string, string[]>;
  runs: SuggestionRunRecord[];
  analytics: KeywordAnalyticsEntry[];
  triggers: ActiveTriggerBinding[];
  jsonPack: KeywordBrandPack;
};

const byBusiness = new Map<string, MemState>();

function state(businessId: string): MemState {
  let s = byBusiness.get(businessId);
  if (!s) {
    s = {
      terms: [],
      packs: [],
      packMembers: new Map(),
      runs: [],
      analytics: [],
      triggers: [],
      jsonPack: { ...EMPTY_BRAND_PACK },
    };
    byBusiness.set(businessId, s);
  }
  return s;
}

export function resetMemoryVocabularyRepository() {
  byBusiness.clear();
}

export function createMemoryVocabularyRepository(): VocabularyRepository {
  return {
    async listTerms(businessId, opts) {
      return state(businessId).terms.filter((t) =>
        opts?.activeOnly === false ? true : t.active && !t.archivedAt
      );
    },

    async upsertTerms(businessId, terms) {
      const s = state(businessId);
      const out: VocabularyTermRecord[] = [];
      for (const t of terms) {
        const normalizedValue = termKey(t.value);
        if (!normalizedValue) continue;
        const idx = s.terms.findIndex(
          (r) =>
            r.kind === t.kind &&
            r.normalizedValue === normalizedValue &&
            r.scope === "BUSINESS"
        );
        const row: VocabularyTermRecord = {
          id: idx >= 0 ? s.terms[idx]!.id : `term_${nanoid(8)}`,
          businessId,
          kind: t.kind,
          value: t.value.trim(),
          normalizedValue,
          locale: "en",
          scope: "BUSINESS",
          approvalStatus: t.approvalStatus ?? "APPROVED",
          sourceType: t.sourceType ?? "MANUAL",
          rationale: t.rationale,
          confidence: t.confidence,
          locked: Boolean(t.locked),
          active: true,
          channels: t.channels ?? [],
          campaignId: t.campaignId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        };
        if (idx >= 0) s.terms[idx] = row;
        else s.terms.push(row);
        out.push(row);
      }
      s.jsonPack = termsToBrandPackView({
        terms: s.terms
          .filter((t) => t.active)
          .map((t) => ({
            id: t.id,
            value: t.value,
            kind: t.kind,
            locked: t.locked,
            channels: t.channels,
            notes: t.rationale,
            approvalStatus: t.approvalStatus,
          })),
      });
      return out;
    },

    async setApproval(businessId, termId, status) {
      const s = state(businessId);
      const row = s.terms.find((t) => t.id === termId);
      if (!row) return null;
      if (row.locked && status === "ARCHIVED") return row;
      row.approvalStatus = status;
      row.active = status !== "ARCHIVED" && status !== "REJECTED";
      row.archivedAt = status === "ARCHIVED" ? new Date().toISOString() : null;
      row.updatedAt = new Date().toISOString();
      return row;
    },

    async setLocked(businessId, termId, locked) {
      const row = state(businessId).terms.find((t) => t.id === termId);
      if (!row) return null;
      row.locked = locked;
      row.updatedAt = new Date().toISOString();
      return row;
    },

    async archiveTerm(businessId, termId) {
      return this.setApproval(businessId, termId, "ARCHIVED");
    },

    async restoreTerm(businessId, termId) {
      const row = state(businessId).terms.find((t) => t.id === termId);
      if (!row) return null;
      row.approvalStatus = "APPROVED";
      row.active = true;
      row.archivedAt = null;
      return row;
    },

    async editTerm(businessId, termId, patch) {
      const row = state(businessId).terms.find((t) => t.id === termId);
      if (!row) return null;
      if (row.locked && patch.value !== undefined && patch.value !== row.value) {
        return null;
      }
      if (patch.value !== undefined) {
        row.value = patch.value.trim();
        row.normalizedValue = termKey(patch.value);
      }
      if (patch.locale !== undefined) row.locale = patch.locale;
      if (patch.campaignId !== undefined) row.campaignId = patch.campaignId;
      row.updatedAt = new Date().toISOString();
      return row;
    },

    async loadBrandPackView(businessId) {
      return state(businessId).jsonPack;
    },

    async mirrorBrandPackJson(businessId, pack) {
      const s = state(businessId);
      s.jsonPack = parseKeywordBrandPack(pack);
      await this.upsertTerms(businessId, [
        ...pack.approvedTerms.map((t) => ({
          value: t.value,
          kind: "KEYWORD" as VocabularyTermKind,
          locked: t.locked,
        })),
        ...pack.brandedHashtags.map((t) => ({
          value: t.value,
          kind: "BRANDED_HASHTAG" as VocabularyTermKind,
          locked: t.locked,
        })),
        ...pack.bannedTerms.map((t) => ({
          value: t.value,
          kind: "EXCLUDED_TERM" as VocabularyTermKind,
        })),
        ...pack.competitorExclusions.map((t) => ({
          value: t.value,
          kind: "COMPETITOR_EXCLUSION" as VocabularyTermKind,
        })),
        ...pack.requiredTerms.map((t) => ({
          value: t.value,
          kind: "REQUIRED_TERM" as VocabularyTermKind,
        })),
        ...pack.locationVocabulary.map((t) => ({
          value: t.value,
          kind: "LOCAL_TERM" as VocabularyTermKind,
        })),
        ...pack.audienceVocabulary.map((t) => ({
          value: t.value,
          kind: "AUDIENCE_TERM" as VocabularyTermKind,
        })),
      ]);
    },

    async listPacks(businessId) {
      return state(businessId).packs.filter((p) => !p.archivedAt);
    },

    async createPack(businessId, input) {
      const pack: NamedBrandPack = {
        id: `pack_${nanoid(8)}`,
        slug: input.slug,
        name: input.name,
        description: input.description,
        locale: input.locale ?? "en",
        channels: input.channels ?? [],
        version: 1,
        approved: Boolean(input.approved),
        termIds: input.termIds ?? [],
      };
      state(businessId).packs.push(pack);
      state(businessId).packMembers.set(pack.id, pack.termIds);
      return pack;
    },

    async updatePack(businessId, packId, patch) {
      const s = state(businessId);
      const pack = s.packs.find((p) => p.id === packId);
      if (!pack) return null;
      if (patch.name) pack.name = patch.name;
      if (patch.description !== undefined) pack.description = patch.description;
      if (patch.locale) pack.locale = patch.locale;
      if (patch.channels) pack.channels = patch.channels;
      if (patch.termIds) pack.termIds = patch.termIds;
      if (patch.approved !== undefined) pack.approved = patch.approved;
      if (patch.archived) pack.archivedAt = new Date().toISOString();
      if (patch.archived === false) pack.archivedAt = null;
      pack.version += 1;
      return pack;
    },

    async deletePack(businessId, packId) {
      const s = state(businessId);
      const before = s.packs.length;
      s.packs = s.packs.filter((p) => p.id !== packId);
      return s.packs.length < before;
    },

    async recordSuggestionRun(input) {
      const run: SuggestionRunRecord = {
        id: `run_${nanoid(8)}`,
        businessId: input.businessId,
        channel: input.channel,
        campaignId: input.campaignId,
        surface: input.surface,
        generated: input.generated,
        selected: input.selected ?? [],
        rejected: input.rejected ?? [],
        modelProvider: "local_grounded",
        recipeVersion: "keywords.v1",
        evidenceClass: "modeled",
        createdAt: new Date().toISOString(),
      };
      state(input.businessId).runs.push(run);
      return run;
    },

    async updateSuggestionRun(runId, patch) {
      for (const s of byBusiness.values()) {
        const run = s.runs.find((r) => r.id === runId);
        if (!run) continue;
        if (patch.selected) run.selected = patch.selected;
        if (patch.rejected) run.rejected = patch.rejected;
      }
    },

    async recordAnalytics(input) {
      const entry: KeywordAnalyticsEntry = {
        id: `kwa_${nanoid(8)}`,
        businessId: input.businessId,
        event: input.event,
        count: input.count ?? 1,
        channel: input.channel,
        campaignId: input.campaignId,
        families: input.families,
        at: new Date().toISOString(),
        disclaimer: "counts_only_no_causal_claim",
      };
      state(input.businessId).analytics.push(entry);
      return entry;
    },

    async listAnalytics(businessId) {
      return [...state(businessId).analytics];
    },

    async listTriggerBindings(businessId, channel) {
      return state(businessId).triggers.filter((t) =>
        channel ? t.channel === channel : true
      );
    },

    async upsertTriggerBinding(businessId, input) {
      const s = state(businessId);
      const collisions = detectTriggerCollisions({
        existing: s.triggers,
        candidate: input,
      });
      const binding: ActiveTriggerBinding = {
        id: `trig_${nanoid(8)}`,
        flowId: input.flowId,
        flowLabel: input.flowLabel,
        canonicalValue: input.canonicalValue.trim(),
        normalizedValue: termKey(input.canonicalValue),
        channel: input.channel ?? "tapcanvas",
        matchMode: input.matchMode ?? "contains",
        active: true,
        locationId: input.locationId,
        campaignId: input.campaignId,
      };
      const idx = s.triggers.findIndex(
        (t) =>
          t.flowId === binding.flowId &&
          t.normalizedValue === binding.normalizedValue &&
          t.channel === binding.channel
      );
      if (idx >= 0) s.triggers[idx] = { ...s.triggers[idx]!, ...binding, id: s.triggers[idx]!.id };
      else s.triggers.push(binding);
      return { binding: idx >= 0 ? s.triggers[idx]! : binding, collisions };
    },
  };
}

/** Resolve repository: Prisma when isolated DB configured, else memory. */
export async function getVocabularyRepository(): Promise<VocabularyRepository> {
  const { isIsolatedFusionDatabaseConfigured } = await import("@/lib/fusion/db/safety");
  if (isIsolatedFusionDatabaseConfigured()) {
    const { createPrismaVocabularyRepository } = await import("./prisma-repository");
    return createPrismaVocabularyRepository();
  }
  return createMemoryVocabularyRepository();
}
