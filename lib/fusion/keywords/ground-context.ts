/**
 * Build ground context from known workspace facts only.
 * Never invent products, offers, locations, or business claims.
 */

import type { GroundContext, KeywordBrandPack, KeywordChannel } from "./types";
import { allPackValues } from "./brand-pack";

export type GroundContextInput = {
  businessId: string;
  businessName?: string | null;
  tone?: string | null;
  locale?: string | null;
  language?: string | null;
  locationLabels?: string[] | null;
  brandKitTone?: string | null;
  knownProducts?: string[] | null;
  knownOffers?: string[] | null;
  audienceHints?: string[] | null;
  seasonHint?: string | null;
  channel?: KeywordChannel | null;
  campaignTitle?: string | null;
  campaignId?: string | null;
  existingContentSnippets?: string[] | null;
  brandPack?: KeywordBrandPack | null;
  priorPerformanceStubs?: GroundContext["priorPerformanceStubs"];
};

function cleanList(list: string[] | null | undefined, max = 24): string[] {
  if (!list) return [];
  return list
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Assemble grounded context — empty fields stay empty (no invention). */
export function buildGroundContext(input: GroundContextInput): GroundContext {
  const pack = input.brandPack;
  const approved = pack
    ? [
        ...pack.approvedTerms,
        ...pack.brandedHashtags,
        ...pack.requiredTerms,
        ...pack.recurringCampaignTags,
      ].map((t) => t.value)
    : [];
  const banned = pack
    ? [...pack.bannedTerms, ...pack.competitorExclusions].map((t) => t.value)
    : [];
  const locationFromPack = pack?.locationVocabulary.map((t) => t.value) ?? [];
  const productFromPack = pack?.productVocabulary.map((t) => t.value) ?? [];
  const audienceFromPack = pack?.audienceVocabulary.map((t) => t.value) ?? [];

  return {
    businessId: input.businessId,
    businessName: input.businessName?.trim() || undefined,
    tone: input.tone?.trim() || input.brandKitTone?.trim() || undefined,
    locale: input.locale?.trim() || pack?.locale || undefined,
    language: input.language?.trim() || undefined,
    locationLabels: cleanList([...(input.locationLabels ?? []), ...locationFromPack]),
    brandKitTone: input.brandKitTone?.trim() || undefined,
    knownProducts: cleanList([...(input.knownProducts ?? []), ...productFromPack]),
    knownOffers: cleanList(input.knownOffers),
    audienceHints: cleanList([...(input.audienceHints ?? []), ...audienceFromPack]),
    seasonHint: input.seasonHint?.trim() || undefined,
    channel: input.channel ?? undefined,
    campaignTitle: input.campaignTitle?.trim() || undefined,
    campaignId: input.campaignId?.trim() || undefined,
    existingContentSnippets: cleanList(input.existingContentSnippets, 12),
    approvedTerms: cleanList(approved, 48),
    bannedTerms: cleanList(banned, 48),
    competitorExclusions: pack
      ? cleanList(pack.competitorExclusions.map((t) => t.value), 24)
      : [],
    priorPerformanceStubs: input.priorPerformanceStubs?.map((p) => ({
      ...p,
      note: "correlation_stub_not_causation" as const,
    })),
  };
}

export function summarizeGroundFacts(ctx: GroundContext): string[] {
  const facts: string[] = [];
  if (ctx.businessName) facts.push(`businessName=${ctx.businessName}`);
  if (ctx.tone) facts.push(`tone=${ctx.tone}`);
  if (ctx.locale) facts.push(`locale=${ctx.locale}`);
  if (ctx.locationLabels?.length) facts.push(`locations=${ctx.locationLabels.join("|")}`);
  if (ctx.knownProducts?.length) facts.push(`products=${ctx.knownProducts.join("|")}`);
  if (ctx.knownOffers?.length) facts.push(`offers=${ctx.knownOffers.join("|")}`);
  if (ctx.audienceHints?.length) facts.push(`audience=${ctx.audienceHints.join("|")}`);
  if (ctx.seasonHint) facts.push(`season=${ctx.seasonHint}`);
  if (ctx.campaignTitle) facts.push(`campaign=${ctx.campaignTitle}`);
  if (ctx.approvedTerms?.length) facts.push(`approved=${ctx.approvedTerms.length}`);
  if (ctx.bannedTerms?.length) facts.push(`banned=${ctx.bannedTerms.length}`);
  return facts;
}

export function packFactCount(pack: KeywordBrandPack): number {
  return allPackValues(pack).length;
}
