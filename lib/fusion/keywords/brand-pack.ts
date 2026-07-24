/**
 * Keyword Brand Pack view-model — parse / merge helpers.
 * Durable truth lives in BrandVocabularyTerm; JSON on BrandKit is a mirror.
 */

import type { BrandTerm, KeywordBrandPack, TermKind } from "./types";
import { applyCapitalization, normalizeHashtag, termKey } from "./normalization";

export { applyCapitalization, normalizeHashtag, termKey } from "./normalization";

export const EMPTY_BRAND_PACK: KeywordBrandPack = {
  version: 1,
  locale: "en",
  capitalization: "as_provided",
  approvedTerms: [],
  brandedHashtags: [],
  requiredTerms: [],
  bannedTerms: [],
  competitorExclusions: [],
  locationVocabulary: [],
  productVocabulary: [],
  audienceVocabulary: [],
  recurringCampaignTags: [],
};

function asTermArray(raw: unknown): BrandTerm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
    .map((t, i) => ({
      id: typeof t.id === "string" ? t.id : `term_${i}`,
      value: typeof t.value === "string" ? t.value.trim() : "",
      kind: (typeof t.kind === "string" ? t.kind : "keyword") as TermKind,
      family: t.family as BrandTerm["family"],
      locked: Boolean(t.locked),
      channels: Array.isArray(t.channels) ? (t.channels as BrandTerm["channels"]) : undefined,
      notes: typeof t.notes === "string" ? t.notes : undefined,
      acceptedAt: typeof t.acceptedAt === "string" ? t.acceptedAt : undefined,
    }))
    .filter((t) => t.value.length > 0);
}

/** Parse Brand Kit JSON blob into a normalized Brand Pack view-model. */
export function parseKeywordBrandPack(raw: unknown): KeywordBrandPack {
  if (!raw || typeof raw !== "object") return { ...EMPTY_BRAND_PACK };
  const o = raw as Record<string, unknown>;
  return {
    version: 1,
    locale: typeof o.locale === "string" && o.locale ? o.locale : "en",
    capitalization:
      o.capitalization === "title" ||
      o.capitalization === "lower" ||
      o.capitalization === "upper"
        ? o.capitalization
        : "as_provided",
    approvedTerms: asTermArray(o.approvedTerms),
    brandedHashtags: asTermArray(o.brandedHashtags),
    requiredTerms: asTermArray(o.requiredTerms),
    bannedTerms: asTermArray(o.bannedTerms),
    competitorExclusions: asTermArray(o.competitorExclusions),
    locationVocabulary: asTermArray(o.locationVocabulary),
    productVocabulary: asTermArray(o.productVocabulary),
    audienceVocabulary: asTermArray(o.audienceVocabulary),
    recurringCampaignTags: asTermArray(o.recurringCampaignTags),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}

/** Merge accepted terms into pack lists without inventing values. */
export function mergeAcceptedTerms(
  pack: KeywordBrandPack,
  terms: BrandTerm[],
  target: keyof Pick<
    KeywordBrandPack,
    | "approvedTerms"
    | "brandedHashtags"
    | "requiredTerms"
    | "bannedTerms"
    | "locationVocabulary"
    | "productVocabulary"
    | "audienceVocabulary"
    | "recurringCampaignTags"
  > = "approvedTerms"
): KeywordBrandPack {
  const existing = new Set(pack[target].map((t) => termKey(t.value)));
  const next = [...pack[target]];
  for (const t of terms) {
    const key = termKey(t.value);
    if (!key || existing.has(key)) continue;
    existing.add(key);
    next.push({
      ...t,
      value: applyCapitalization(
        t.kind === "hashtag" ? normalizeHashtag(t.value) : t.value,
        pack.capitalization
      ),
      acceptedAt: t.acceptedAt ?? new Date().toISOString(),
    });
  }
  return {
    ...pack,
    [target]: next,
    updatedAt: new Date().toISOString(),
  };
}

export function lockTerm(pack: KeywordBrandPack, termId: string, locked = true): KeywordBrandPack {
  const lockIn = (list: BrandTerm[]) =>
    list.map((t) => (t.id === termId ? { ...t, locked } : t));
  return {
    ...pack,
    approvedTerms: lockIn(pack.approvedTerms),
    brandedHashtags: lockIn(pack.brandedHashtags),
    requiredTerms: lockIn(pack.requiredTerms),
    bannedTerms: lockIn(pack.bannedTerms),
    competitorExclusions: lockIn(pack.competitorExclusions),
    locationVocabulary: lockIn(pack.locationVocabulary),
    productVocabulary: lockIn(pack.productVocabulary),
    audienceVocabulary: lockIn(pack.audienceVocabulary),
    recurringCampaignTags: lockIn(pack.recurringCampaignTags),
    updatedAt: new Date().toISOString(),
  };
}

export function allPackValues(pack: KeywordBrandPack): string[] {
  return [
    ...pack.approvedTerms,
    ...pack.brandedHashtags,
    ...pack.requiredTerms,
    ...pack.bannedTerms,
    ...pack.competitorExclusions,
    ...pack.locationVocabulary,
    ...pack.productVocabulary,
    ...pack.audienceVocabulary,
    ...pack.recurringCampaignTags,
  ].map((t) => t.value);
}

export function bannedAndExclusionKeys(pack: KeywordBrandPack): Set<string> {
  return new Set(
    [...pack.bannedTerms, ...pack.competitorExclusions].map((t) => termKey(t.value))
  );
}
