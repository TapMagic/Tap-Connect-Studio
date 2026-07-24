/**
 * Term normalization, hashtag formatting, capitalization, dedupe keys.
 */

import type { KeywordBrandPack, TermKind, VocabularyTermKind } from "./types";

export function termKey(value: string): string {
  return value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ");
}

export function normalizeHashtag(value: string): string {
  const trimmed = value.trim().replace(/^#+/, "");
  if (!trimmed) return "";
  return `#${trimmed.replace(/\s+/g, "")}`;
}

export function applyCapitalization(
  value: string,
  mode: KeywordBrandPack["capitalization"]
): string {
  if (mode === "lower") return value.toLowerCase();
  if (mode === "upper") return value.toUpperCase();
  if (mode === "title") {
    return value
      .split(/\s+/)
      .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  }
  return value;
}

export function isHashtagLike(value: string): boolean {
  return value.trim().startsWith("#") || /^[A-Za-z0-9_]+$/.test(value.trim().replace(/^#/, ""));
}

export function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = termKey(v);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

export function familyToVocabularyKind(
  family: string,
  kind: TermKind
): VocabularyTermKind {
  switch (family) {
    case "branded_hashtag":
      return "BRANDED_HASHTAG";
    case "local":
      return "LOCAL_TERM";
    case "audience":
      return "AUDIENCE_TERM";
    case "intent":
      return "INTENT_TERM";
    case "seo_phrase":
      return "SEO_PHRASE";
    case "caption_title":
      return kind === "phrase" ? "CAPTION_PHRASE" : "TITLE_PHRASE";
    case "comment_dm_trigger":
      return "COMMENT_TRIGGER";
    case "synonym":
      return kind === "misspelling" ? "MISSPELLING" : "SYNONYM";
    case "asset_tag":
      return "INTERNAL_TAG";
    case "avoid_exclusion":
      return "EXCLUDED_TERM";
    case "campaign_hashtag":
      return "HASHTAG";
    default:
      break;
  }
  if (kind === "hashtag") return "HASHTAG";
  if (kind === "trigger") return "COMMENT_TRIGGER";
  if (kind === "synonym") return "SYNONYM";
  if (kind === "misspelling") return "MISSPELLING";
  if (kind === "asset_tag") return "INTERNAL_TAG";
  if (kind === "required") return "REQUIRED_TERM";
  if (kind === "excluded") return "EXCLUDED_TERM";
  if (kind === "competitor") return "COMPETITOR_EXCLUSION";
  if (kind === "phrase") return "SEO_PHRASE";
  return "KEYWORD";
}

export function vocabularyKindToTermKind(kind: VocabularyTermKind): TermKind {
  switch (kind) {
    case "HASHTAG":
    case "BRANDED_HASHTAG":
      return "hashtag";
    case "COMMENT_TRIGGER":
    case "DM_TRIGGER":
      return "trigger";
    case "SYNONYM":
      return "synonym";
    case "MISSPELLING":
      return "misspelling";
    case "INTERNAL_TAG":
      return "asset_tag";
    case "REQUIRED_TERM":
      return "required";
    case "EXCLUDED_TERM":
      return "excluded";
    case "COMPETITOR_EXCLUSION":
      return "competitor";
    case "SEO_PHRASE":
    case "TITLE_PHRASE":
    case "CAPTION_PHRASE":
    case "INTENT_TERM":
      return "phrase";
    default:
      return "keyword";
  }
}

export function packBucketForKind(
  kind: VocabularyTermKind
):
  | "approvedTerms"
  | "brandedHashtags"
  | "requiredTerms"
  | "bannedTerms"
  | "competitorExclusions"
  | "locationVocabulary"
  | "audienceVocabulary"
  | "recurringCampaignTags"
  | "productVocabulary" {
  switch (kind) {
    case "BRANDED_HASHTAG":
      return "brandedHashtags";
    case "REQUIRED_TERM":
      return "requiredTerms";
    case "EXCLUDED_TERM":
      return "bannedTerms";
    case "COMPETITOR_EXCLUSION":
      return "competitorExclusions";
    case "LOCAL_TERM":
      return "locationVocabulary";
    case "AUDIENCE_TERM":
      return "audienceVocabulary";
    default:
      return "approvedTerms";
  }
}
