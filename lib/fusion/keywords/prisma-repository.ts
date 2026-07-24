/**
 * Prisma-backed Brand Vocabulary repository (isolated tapconnect_fusion_dev).
 * Mirrors Brand Pack view into BrandKit.keywordBrandPack for compatibility.
 * SERVER ONLY — never import from Client Components.
 */

import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma, VocabularyTermKind as PrismaKind } from "@prisma/client";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { termsToBrandPackView } from "./brand-context";
import { parseKeywordBrandPack } from "./brand-pack";
import { familyToVocabularyKind, termKey } from "./normalization";
import { detectTriggerCollisions, type ActiveTriggerBinding } from "./trigger-collisions";
import type {
  KeywordAnalyticsEntry,
  KeywordAnalyticsEvent,
  KeywordBrandPack,
  KeywordChannel,
  KeywordSuggestion,
  NamedBrandPack,
  SuggestionFamily,
  TriggerBindingInput,
  VocabularyApprovalStatus,
  VocabularyTermKind,
} from "./types";
import type { SuggestionRunRecord, VocabularyRepository, VocabularyTermRecord } from "./repository";

function asChannels(raw: unknown): KeywordChannel[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is KeywordChannel => typeof c === "string") as KeywordChannel[];
}

function mapTerm(row: {
  id: string;
  businessId: string;
  brandKitId: string | null;
  kind: string;
  value: string;
  normalizedValue: string;
  locale: string;
  scope: string;
  approvalStatus: string;
  sourceType: string;
  rationale: string | null;
  confidence: number | null;
  locked: boolean;
  active: boolean;
  channels: unknown;
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): VocabularyTermRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    brandKitId: row.brandKitId,
    kind: row.kind as VocabularyTermKind,
    value: row.value,
    normalizedValue: row.normalizedValue,
    locale: row.locale,
    scope: row.scope,
    approvalStatus: row.approvalStatus as VocabularyApprovalStatus,
    sourceType: row.sourceType,
    rationale: row.rationale,
    confidence: row.confidence,
    locked: row.locked,
    active: row.active,
    channels: asChannels(row.channels),
    campaignId: row.campaignId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

async function ensureBrandKit(businessId: string) {
  return prisma.brandKit.upsert({
    where: { businessId },
    create: { businessId },
    update: {},
    select: { id: true, keywordBrandPack: true, defaultLanguage: true },
  });
}

async function mirrorFromTerms(businessId: string) {
  const kit = await ensureBrandKit(businessId);
  const legacy = parseKeywordBrandPack(kit.keywordBrandPack);
  const rows = await prisma.brandVocabularyTerm.findMany({
    where: { businessId, active: true, archivedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const pack = termsToBrandPackView({
    locale: kit.defaultLanguage || legacy.locale || "en",
    terms: rows.map((r) => ({
      id: r.id,
      value: r.value,
      kind: r.kind as VocabularyTermKind,
      locked: r.locked,
      channels: asChannels(r.channels),
      notes: r.rationale,
      acceptedAt: r.approvalStatus === "APPROVED" ? r.updatedAt.toISOString() : null,
      approvalStatus: r.approvalStatus,
    })),
  });
  // Merge with legacy JSON buckets that may hold product vocab not yet kind-mapped
  if (pack.productVocabulary.length === 0 && legacy.productVocabulary.length > 0) {
    pack.productVocabulary = legacy.productVocabulary;
  }
  if (pack.recurringCampaignTags.length === 0 && legacy.recurringCampaignTags.length > 0) {
    pack.recurringCampaignTags = legacy.recurringCampaignTags;
  }
  pack.capitalization = legacy.capitalization;
  await prisma.brandKit.update({
    where: { businessId },
    data: { keywordBrandPack: pack as unknown as Prisma.InputJsonValue },
  });
  return pack;
}

function mapPack(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  channels: unknown;
  version: number;
  approved: boolean;
  archivedAt: Date | null;
  members?: { termId: string }[];
}): NamedBrandPack {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    locale: row.locale,
    channels: asChannels(row.channels),
    version: row.version,
    approved: row.approved,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    termIds: row.members?.map((m) => m.termId) ?? [],
  };
}

export function createPrismaVocabularyRepository(): VocabularyRepository {
  return {
    async listTerms(businessId, opts) {
      const rows = await prisma.brandVocabularyTerm.findMany({
        where: {
          businessId,
          ...(opts?.activeOnly === false ? {} : { active: true, archivedAt: null }),
        },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map(mapTerm);
    },

    async upsertTerms(businessId, terms) {
      const kit = await ensureBrandKit(businessId);
      const out: VocabularyTermRecord[] = [];
      for (const t of terms) {
        const normalizedValue = termKey(t.value);
        if (!normalizedValue) continue;
        const kind = t.kind as PrismaKind;
        const row = await prisma.brandVocabularyTerm.upsert({
          where: {
            businessId_kind_normalizedValue_scope: {
              businessId,
              kind,
              normalizedValue,
              scope: "BUSINESS",
            },
          },
          create: {
            businessId,
            brandKitId: t.brandKitId ?? kit.id,
            kind,
            value: t.value.trim(),
            normalizedValue,
            approvalStatus: t.approvalStatus ?? "APPROVED",
            sourceType: (t.sourceType as "MANUAL") ?? "MANUAL",
            locked: Boolean(t.locked),
            channels: (t.channels ?? []) as unknown as Prisma.InputJsonValue,
            rationale: t.rationale,
            confidence: t.confidence,
            campaignId: t.campaignId,
            createdBy: t.createdBy,
            active: true,
            archivedAt: null,
          },
          update: {
            value: t.value.trim(),
            approvalStatus: t.approvalStatus ?? "APPROVED",
            locked: t.locked ?? undefined,
            channels: t.channels
              ? (t.channels as unknown as Prisma.InputJsonValue)
              : undefined,
            rationale: t.rationale,
            confidence: t.confidence,
            active: true,
            archivedAt: null,
            brandKitId: t.brandKitId ?? kit.id,
          },
        });
        out.push(mapTerm(row));
      }
      await mirrorFromTerms(businessId);
      return out;
    },

    async setApproval(businessId, termId, status, approvedBy) {
      const existing = await prisma.brandVocabularyTerm.findFirst({
        where: { id: termId, businessId },
      });
      if (!existing) return null;
      if (existing.locked && status === "ARCHIVED") {
        // locked terms cannot be archived silently — keep approved
        return mapTerm(existing);
      }
      const row = await prisma.brandVocabularyTerm.update({
        where: { id: termId },
        data: {
          approvalStatus: status,
          approvedBy,
          archivedAt: status === "ARCHIVED" ? new Date() : null,
          active: status !== "ARCHIVED" && status !== "REJECTED",
        },
      });
      await mirrorFromTerms(businessId);
      return mapTerm(row);
    },

    async setLocked(businessId, termId, locked) {
      const existing = await prisma.brandVocabularyTerm.findFirst({
        where: { id: termId, businessId },
      });
      if (!existing) return null;
      const row = await prisma.brandVocabularyTerm.update({
        where: { id: termId },
        data: { locked },
      });
      await mirrorFromTerms(businessId);
      return mapTerm(row);
    },

    async archiveTerm(businessId, termId) {
      return this.setApproval(businessId, termId, "ARCHIVED");
    },

    async restoreTerm(businessId, termId) {
      const existing = await prisma.brandVocabularyTerm.findFirst({
        where: { id: termId, businessId },
      });
      if (!existing) return null;
      const row = await prisma.brandVocabularyTerm.update({
        where: { id: termId },
        data: { approvalStatus: "APPROVED", active: true, archivedAt: null },
      });
      await mirrorFromTerms(businessId);
      return mapTerm(row);
    },

    async editTerm(businessId, termId, patch) {
      const existing = await prisma.brandVocabularyTerm.findFirst({
        where: { id: termId, businessId },
      });
      if (!existing) return null;
      if (existing.locked && patch.value !== undefined && patch.value !== existing.value) {
        return null;
      }
      const data: Prisma.BrandVocabularyTermUpdateInput = {};
      if (patch.value !== undefined) {
        data.value = patch.value.trim();
        data.normalizedValue = termKey(patch.value);
      }
      if (patch.locale !== undefined) data.locale = patch.locale;
      if (patch.campaignId !== undefined) data.campaignId = patch.campaignId;
      if (patch.locationId !== undefined) data.locationId = patch.locationId;
      const row = await prisma.brandVocabularyTerm.update({
        where: { id: termId },
        data,
      });
      await mirrorFromTerms(businessId);
      return mapTerm(row);
    },

    async loadBrandPackView(businessId) {
      if (!(await prisma.brandVocabularyTerm.count({ where: { businessId } }))) {
        const kit = await ensureBrandKit(businessId);
        return parseKeywordBrandPack(kit.keywordBrandPack);
      }
      return mirrorFromTerms(businessId);
    },

    async mirrorBrandPackJson(businessId, pack) {
      await ensureBrandKit(businessId);
      await prisma.brandKit.update({
        where: { businessId },
        data: {
          keywordBrandPack: pack as unknown as Prisma.InputJsonValue,
          ...(pack.locale ? { defaultLanguage: pack.locale } : {}),
        },
      });
      // Hydrate normalized terms from pack buckets
      const buckets: Array<{
        list: typeof pack.approvedTerms;
        kind: VocabularyTermKind;
      }> = [
        { list: pack.approvedTerms, kind: "KEYWORD" },
        { list: pack.brandedHashtags, kind: "BRANDED_HASHTAG" },
        { list: pack.requiredTerms, kind: "REQUIRED_TERM" },
        { list: pack.bannedTerms, kind: "EXCLUDED_TERM" },
        { list: pack.competitorExclusions, kind: "COMPETITOR_EXCLUSION" },
        { list: pack.locationVocabulary, kind: "LOCAL_TERM" },
        { list: pack.audienceVocabulary, kind: "AUDIENCE_TERM" },
        { list: pack.productVocabulary, kind: "INTERNAL_TAG" },
        { list: pack.recurringCampaignTags, kind: "KEYWORD" },
      ];
      for (const b of buckets) {
        await this.upsertTerms(
          businessId,
          b.list.map((t) => ({
            value: t.value,
            kind: t.vocabularyKind ?? b.kind,
            approvalStatus:
              b.kind === "EXCLUDED_TERM" || b.kind === "COMPETITOR_EXCLUSION"
                ? "APPROVED"
                : "APPROVED",
            locked: t.locked,
            channels: t.channels,
            sourceType: "LEGACY_JSON",
          }))
        );
      }
    },

    async listPacks(businessId) {
      const rows = await prisma.brandVocabularyPack.findMany({
        where: { businessId },
        include: { members: true },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map(mapPack);
    },

    async createPack(businessId, input) {
      const kit = await ensureBrandKit(businessId);
      const row = await prisma.brandVocabularyPack.create({
        data: {
          businessId,
          brandKitId: kit.id,
          slug: input.slug,
          name: input.name,
          description: input.description,
          locale: input.locale ?? "en",
          channels: (input.channels ?? []) as unknown as Prisma.InputJsonValue,
          approved: Boolean(input.approved),
          createdBy: input.createdBy,
          members: input.termIds?.length
            ? {
                create: input.termIds.map((termId, i) => ({
                  termId,
                  sortOrder: i,
                })),
              }
            : undefined,
        },
        include: { members: true },
      });
      return mapPack(row);
    },

    async updatePack(businessId, packId, patch) {
      const existing = await prisma.brandVocabularyPack.findFirst({
        where: { id: packId, businessId },
      });
      if (!existing) return null;
      if (patch.termIds) {
        await prisma.brandVocabularyPackMember.deleteMany({ where: { packId } });
        if (patch.termIds.length) {
          await prisma.brandVocabularyPackMember.createMany({
            data: patch.termIds.map((termId, i) => ({
              packId,
              termId,
              sortOrder: i,
            })),
          });
        }
      }
      const row = await prisma.brandVocabularyPack.update({
        where: { id: packId },
        data: {
          name: patch.name,
          description: patch.description,
          locale: patch.locale,
          channels: patch.channels
            ? (patch.channels as unknown as Prisma.InputJsonValue)
            : undefined,
          approved: patch.approved,
          archivedAt: patch.archived ? new Date() : patch.archived === false ? null : undefined,
          version: { increment: 1 },
        },
        include: { members: true },
      });
      return mapPack(row);
    },

    async deletePack(businessId, packId) {
      const existing = await prisma.brandVocabularyPack.findFirst({
        where: { id: packId, businessId },
      });
      if (!existing) return false;
      await prisma.brandVocabularyPack.delete({ where: { id: packId } });
      return true;
    },

    async recordSuggestionRun(input) {
      const row = await prisma.vocabularySuggestionRun.create({
        data: {
          businessId: input.businessId,
          channel: input.channel,
          campaignId: input.campaignId,
          surface: input.surface,
          requestContext: input.requestContext as Prisma.InputJsonValue,
          generated: input.generated as unknown as Prisma.InputJsonValue,
          selected: (input.selected ?? []) as unknown as Prisma.InputJsonValue,
          rejected: (input.rejected ?? []) as unknown as Prisma.InputJsonValue,
          appliedDestination: input.appliedDestination,
          actorId: input.actorId,
          modelProvider: "local_grounded",
          recipeVersion: "keywords.v1",
          evidenceClass: "modeled",
        },
      });
      return {
        id: row.id,
        businessId: row.businessId,
        channel: row.channel,
        campaignId: row.campaignId,
        surface: row.surface,
        generated: input.generated,
        selected: input.selected ?? [],
        rejected: input.rejected ?? [],
        modelProvider: row.modelProvider,
        recipeVersion: row.recipeVersion,
        evidenceClass: row.evidenceClass,
        createdAt: row.createdAt.toISOString(),
      } satisfies SuggestionRunRecord;
    },

    async updateSuggestionRun(runId, patch) {
      await prisma.vocabularySuggestionRun.update({
        where: { id: runId },
        data: {
          selected: patch.selected
            ? (patch.selected as unknown as Prisma.InputJsonValue)
            : undefined,
          rejected: patch.rejected
            ? (patch.rejected as unknown as Prisma.InputJsonValue)
            : undefined,
          appliedDestination: patch.appliedDestination,
        },
      });
    },

    async recordAnalytics(input) {
      const row = await prisma.vocabularyAnalyticsEvent.create({
        data: {
          businessId: input.businessId,
          event: input.event,
          count: input.count ?? 1,
          channel: input.channel,
          campaignId: input.campaignId,
          families: (input.families ?? []) as unknown as Prisma.InputJsonValue,
          detail: (input.detail ?? {}) as Prisma.InputJsonValue,
          actorId: input.actorId,
          disclaimer: "counts_only_no_causal_claim",
        },
      });
      return {
        id: row.id,
        businessId: row.businessId,
        event: row.event as KeywordAnalyticsEvent,
        count: row.count,
        channel: (row.channel as KeywordChannel) ?? undefined,
        campaignId: row.campaignId ?? undefined,
        families: asChannels(row.families) as unknown as SuggestionFamily[],
        at: row.createdAt.toISOString(),
        disclaimer: "counts_only_no_causal_claim",
      };
    },

    async listAnalytics(businessId) {
      const rows = await prisma.vocabularyAnalyticsEvent.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        event: row.event as KeywordAnalyticsEvent,
        count: row.count,
        channel: (row.channel as KeywordChannel) ?? undefined,
        campaignId: row.campaignId ?? undefined,
        families: Array.isArray(row.families)
          ? (row.families as SuggestionFamily[])
          : undefined,
        at: row.createdAt.toISOString(),
        disclaimer: "counts_only_no_causal_claim" as const,
      }));
    },

    async listTriggerBindings(businessId, channel) {
      const rows = await prisma.vocabularyTriggerBinding.findMany({
        where: { businessId, ...(channel ? { channel } : {}) },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map(
        (r): ActiveTriggerBinding => ({
          id: r.id,
          flowId: r.flowId,
          flowLabel: r.flowLabel,
          canonicalValue: r.canonicalValue,
          normalizedValue: r.normalizedValue,
          channel: r.channel,
          matchMode: r.matchMode,
          active: r.active,
          locationId: r.locationId,
          campaignId: r.campaignId,
        })
      );
    },

    async upsertTriggerBinding(businessId, input: TriggerBindingInput) {
      const existing = await this.listTriggerBindings(businessId, input.channel);
      const collisions = detectTriggerCollisions({ existing, candidate: input });
      const normalizedValue = termKey(input.canonicalValue);
      const row = await prisma.vocabularyTriggerBinding.upsert({
        where: {
          businessId_normalizedValue_channel_flowId: {
            businessId,
            normalizedValue,
            channel: input.channel ?? "tapcanvas",
            flowId: input.flowId,
          },
        },
        create: {
          businessId,
          termId: input.termId,
          flowId: input.flowId,
          flowLabel: input.flowLabel,
          matchMode: input.matchMode ?? "contains",
          canonicalValue: input.canonicalValue.trim(),
          normalizedValue,
          channel: input.channel ?? "tapcanvas",
          locationId: input.locationId,
          campaignId: input.campaignId,
          activeFrom: input.activeFrom ? new Date(input.activeFrom) : null,
          activeTo: input.activeTo ? new Date(input.activeTo) : null,
          fallbackNote: input.fallbackNote,
          active: true,
        },
        update: {
          flowLabel: input.flowLabel,
          matchMode: input.matchMode ?? "contains",
          canonicalValue: input.canonicalValue.trim(),
          termId: input.termId,
          locationId: input.locationId,
          campaignId: input.campaignId,
          activeFrom: input.activeFrom ? new Date(input.activeFrom) : null,
          activeTo: input.activeTo ? new Date(input.activeTo) : null,
          fallbackNote: input.fallbackNote,
          active: true,
        },
      });
      return {
        binding: {
          id: row.id,
          flowId: row.flowId,
          flowLabel: row.flowLabel,
          canonicalValue: row.canonicalValue,
          normalizedValue: row.normalizedValue,
          channel: row.channel,
          matchMode: row.matchMode,
          active: row.active,
          locationId: row.locationId,
          campaignId: row.campaignId,
        },
        collisions,
      };
    },
  };
}

export function vocabularyPersistenceEnabled(): boolean {
  return isIsolatedFusionDatabaseConfigured();
}

/** Helper used when accepting suggestion families into kinds */
export function suggestionToVocabularyKind(s: KeywordSuggestion): VocabularyTermKind {
  return s.vocabularyKind ?? familyToVocabularyKind(s.family, s.kind);
}
