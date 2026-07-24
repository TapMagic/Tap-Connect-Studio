/**
 * Shared AI Keywords, Hashtags, Search Phrases & Trigger Vocabulary — public barrel.
 * Prefer `./client` for React client components (avoids Prisma / circular export * issues).
 */

export {
  KEYWORD_FEATURE_ID,
  BRAND_VOCABULARY_FEATURE_ID,
  KEYWORDS_RECIPE_VERSION,
} from "./types";
export type * from "./types";

export {
  termKey,
  normalizeHashtag,
  applyCapitalization,
  isHashtagLike,
  dedupeValues,
  familyToVocabularyKind,
  vocabularyKindToTermKind,
  packBucketForKind,
} from "./normalization";

export {
  EMPTY_BRAND_PACK,
  parseKeywordBrandPack,
  mergeAcceptedTerms,
  lockTerm,
  allPackValues,
  bannedAndExclusionKeys,
} from "./brand-pack";

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
  buildGroundContext,
  summarizeGroundFacts,
  packFactCount,
  termsToBrandPackView,
} from "./brand-context";
export type { GroundContextInput } from "./brand-context";

export { suggestKeywords, generateSuggestions } from "./suggestions";

export {
  RESERVED_CONVERSATIONAL_KEYWORDS,
  EXAMPLE_TRIGGER_HINTS,
  buildConversationalKeywordSet,
  detectTriggerCollisions,
  matchesTrigger,
} from "./trigger-collisions";
export type { ConversationalKeywordSet, ActiveTriggerBinding } from "./trigger-collisions";

export {
  resetKeywordAnalyticsMemory,
  recordKeywordAnalytics,
  listKeywordAnalytics,
  summarizeKeywordAnalytics,
} from "./analytics";

export type {
  VocabularyRepository,
  VocabularyTermRecord,
  SuggestionRunRecord,
} from "./repository";

export {
  createMemoryVocabularyRepository,
  resetMemoryVocabularyRepository,
  getVocabularyRepository,
} from "./memory-repository";

// Prisma vocabulary repo is server-only — import from
// `@/lib/fusion/keywords/prisma-repository` in API/routes, never from this barrel
// (pulling `pg` into Client Component Browser breaks the whole app compile).

export {
  configureVocabularyRepository,
  setVocabularyRepositoryForTests,
  loadVocabularyPack,
  suggestVocabulary,
  acceptVocabularyTerms,
  rejectVocabularyTerms,
  applyVocabularyTerms,
  saveBrandPackView,
  createNamedBrandPack,
  updateNamedBrandPack,
  deleteNamedBrandPack,
  listNamedBrandPacks,
  archiveVocabularyTerm,
  restoreVocabularyTerm,
  lockVocabularyTerm,
  editVocabularyTerm,
  detectAndBindTrigger,
  getConversationalSet,
  getVocabularyAnalytics,
  observePerformanceStub,
  resolveTikTokHashtags,
} from "./service";
