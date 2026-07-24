/**
 * Brand / Knowledge / Campaign grounding assembly.
 * Never invent products, offers, locations, or business claims.
 */

export {
  buildGroundContext,
  summarizeGroundFacts,
  packFactCount,
  type GroundContextInput,
} from "./ground-context";

import type { BrandTerm, KeywordBrandPack, VocabularyTermKind } from "./types";
import { vocabularyKindToTermKind } from "./normalization";

/** Map durable vocabulary rows into the Brand Pack view-model buckets. */
export function termsToBrandPackView(opts: {
  locale?: string;
  capitalization?: KeywordBrandPack["capitalization"];
  terms: Array<{
    id: string;
    value: string;
    kind: VocabularyTermKind;
    locked?: boolean;
    channels?: string[];
    notes?: string | null;
    acceptedAt?: string | null;
    approvalStatus?: string;
  }>;
}): KeywordBrandPack {
  const pack: KeywordBrandPack = {
    version: 1,
    locale: opts.locale ?? "en",
    capitalization: opts.capitalization ?? "as_provided",
    approvedTerms: [],
    brandedHashtags: [],
    requiredTerms: [],
    bannedTerms: [],
    competitorExclusions: [],
    locationVocabulary: [],
    productVocabulary: [],
    audienceVocabulary: [],
    recurringCampaignTags: [],
    updatedAt: new Date().toISOString(),
  };

  for (const t of opts.terms) {
    const term: BrandTerm = {
      id: t.id,
      value: t.value,
      kind: vocabularyKindToTermKind(t.kind),
      locked: Boolean(t.locked),
      channels: t.channels as BrandTerm["channels"],
      notes: t.notes ?? undefined,
      acceptedAt: t.acceptedAt ?? undefined,
      vocabularyKind: t.kind,
      approvalStatus: t.approvalStatus as BrandTerm["approvalStatus"],
    };
    switch (t.kind) {
      case "BRANDED_HASHTAG":
        pack.brandedHashtags.push(term);
        break;
      case "REQUIRED_TERM":
        pack.requiredTerms.push(term);
        break;
      case "EXCLUDED_TERM":
        pack.bannedTerms.push(term);
        break;
      case "COMPETITOR_EXCLUSION":
        pack.competitorExclusions.push(term);
        break;
      case "LOCAL_TERM":
        pack.locationVocabulary.push(term);
        break;
      case "AUDIENCE_TERM":
        pack.audienceVocabulary.push(term);
        break;
      case "INTERNAL_TAG":
        pack.productVocabulary.push(term);
        break;
      default:
        if (t.kind === "HASHTAG" || t.kind === "KEYWORD") {
          pack.approvedTerms.push(term);
        } else {
          pack.approvedTerms.push(term);
        }
    }
  }
  return pack;
}
