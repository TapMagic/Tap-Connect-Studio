/**
 * Client-safe Keywords barrel — no Prisma / Node DB imports.
 * UI panels MUST import from here (or leaf modules), not the root index.
 */

export {
  KEYWORD_FEATURE_ID,
  BRAND_VOCABULARY_FEATURE_ID,
  KEYWORDS_RECIPE_VERSION,
  type KeywordChannel,
  type SuggestionFamily,
  type TermKind,
  type BrandTerm,
  type KeywordBrandPack,
  type KeywordSuggestion,
  type ConflictWarning,
  type RegenerateMode,
  type SuggestResult,
  type GroundContext,
} from "./types";

export {
  KEYWORD_CHANNELS,
  CHANNEL_LABEL,
  CHANNEL_FAMILY_PRIORITY,
  CHANNEL_RULES,
  preferHashtag,
  getChannelRules,
  adaptTermForChannel,
  sortSuggestionsForChannel,
  filterSuggestionsForChannel,
} from "./channel-rules";

export {
  EMPTY_BRAND_PACK,
  parseKeywordBrandPack,
  mergeAcceptedTerms,
  lockTerm,
  allPackValues,
} from "./brand-pack";

export { buildGroundContext, summarizeGroundFacts } from "./ground-context";

export { suggestKeywords } from "./suggestions";

export {
  RESERVED_CONVERSATIONAL_KEYWORDS,
  buildConversationalKeywordSet,
} from "./trigger-collisions";
