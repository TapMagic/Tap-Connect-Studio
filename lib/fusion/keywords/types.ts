/**
 * Shared AI Keywords / Hashtags / Triggers — canonical types.
 * Brand Kit owns approved vocabulary. Surfaces consume via shared contracts.
 * Never invent business facts. Never claim trending without an approved provider.
 * Never claim causation from correlation.
 */

export const KEYWORD_FEATURE_ID = "ai.keywords" as const;
export const BRAND_VOCABULARY_FEATURE_ID = "brand.vocabulary" as const;
export const KEYWORDS_RECIPE_VERSION = "keywords.v1" as const;

export type KeywordChannel =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "threads"
  | "youtube"
  | "youtube_shorts"
  | "linkedin"
  | "pinterest"
  | "x"
  | "bluesky"
  | "gbp"
  | "snapchat"
  | "reddit"
  | "mastodon"
  | "nextdoor"
  | "email"
  | "messenger"
  | "instagram_direct"
  | "whatsapp"
  | "telegram"
  | "sms"
  | "discord"
  | "tapcanvas"
  | "tapflow"
  | "assets_templates";

export type SuggestionFamily =
  | "primary"
  | "local"
  | "audience"
  | "intent"
  | "branded_keyword"
  | "branded_hashtag"
  | "niche"
  | "campaign_hashtag"
  | "seo_phrase"
  | "social_discovery"
  | "caption_title"
  | "comment_dm_trigger"
  | "synonym"
  | "asset_tag"
  | "avoid_exclusion";

/** UI / suggestion term kinds (maps to Prisma VocabularyTermKind). */
export type TermKind =
  | "keyword"
  | "hashtag"
  | "phrase"
  | "trigger"
  | "synonym"
  | "asset_tag"
  | "misspelling"
  | "required"
  | "excluded"
  | "competitor";

export type VocabularyTermKind =
  | "KEYWORD"
  | "HASHTAG"
  | "BRANDED_HASHTAG"
  | "LOCAL_TERM"
  | "AUDIENCE_TERM"
  | "INTENT_TERM"
  | "SEO_PHRASE"
  | "TITLE_PHRASE"
  | "CAPTION_PHRASE"
  | "COMMENT_TRIGGER"
  | "DM_TRIGGER"
  | "SYNONYM"
  | "MISSPELLING"
  | "INTERNAL_TAG"
  | "REQUIRED_TERM"
  | "EXCLUDED_TERM"
  | "COMPETITOR_EXCLUSION";

export type VocabularyApprovalStatus =
  | "SUGGESTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

export type VocabularyScope =
  | "WORKSPACE"
  | "BUSINESS"
  | "LOCATION"
  | "CAMPAIGN"
  | "BRAND_PACK"
  | "CHANNEL";

export type ConfidenceBand = "high" | "medium" | "low";

export type SuggestionSourceFact = {
  field: string;
  value: string;
  evidence: "confirmed" | "modeled" | "stub" | "correlated" | "incomplete";
};

export type BrandTerm = {
  id: string;
  value: string;
  kind: TermKind;
  family?: SuggestionFamily;
  locked?: boolean;
  channels?: KeywordChannel[];
  notes?: string;
  acceptedAt?: string;
  approvalStatus?: VocabularyApprovalStatus;
  vocabularyKind?: VocabularyTermKind;
};

/** View-model Brand Pack (also mirrored to BrandKit.keywordBrandPack for compatibility). */
export type KeywordBrandPack = {
  version: 1;
  locale: string;
  capitalization: "as_provided" | "title" | "lower" | "upper";
  approvedTerms: BrandTerm[];
  brandedHashtags: BrandTerm[];
  requiredTerms: BrandTerm[];
  bannedTerms: BrandTerm[];
  competitorExclusions: BrandTerm[];
  locationVocabulary: BrandTerm[];
  productVocabulary: BrandTerm[];
  audienceVocabulary: BrandTerm[];
  recurringCampaignTags: BrandTerm[];
  updatedAt?: string;
};

export type NamedBrandPack = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  locale: string;
  channels: KeywordChannel[];
  version: number;
  approved: boolean;
  archivedAt?: string | null;
  termIds: string[];
};

export type GroundContext = {
  businessId: string;
  businessName?: string;
  tone?: string;
  locale?: string;
  language?: string;
  locationLabels?: string[];
  brandKitTone?: string;
  knownProducts?: string[];
  knownOffers?: string[];
  audienceHints?: string[];
  seasonHint?: string;
  channel?: KeywordChannel;
  campaignTitle?: string;
  campaignId?: string;
  existingContentSnippets?: string[];
  approvedTerms?: string[];
  bannedTerms?: string[];
  competitorExclusions?: string[];
  priorPerformanceStubs?: Array<{
    term: string;
    impressionsStub?: number;
    engagementsStub?: number;
    note: "correlation_stub_not_causation";
  }>;
};

export type RegenerateMode =
  | "more_local"
  | "more_niche"
  | "broader"
  | "shorter"
  | "channel_specific"
  | "more_professional"
  | "more_playful"
  | "language_specific";

export type KeywordSuggestion = {
  id: string;
  value: string;
  kind: TermKind;
  family: SuggestionFamily;
  vocabularyKind?: VocabularyTermKind;
  channels: KeywordChannel[];
  confidence: ConfidenceBand;
  rationale: string;
  sourceFacts: SuggestionSourceFact[];
  locked?: boolean;
  warnings?: string[];
};

export type ConflictWarning = {
  code: "duplicate" | "banned" | "competitor" | "collision" | "reserved" | "exclusion";
  message: string;
  term: string;
  conflictsWith?: string;
  flowId?: string;
};

export type SuggestResult = {
  suggestions: KeywordSuggestion[];
  warnings: ConflictWarning[];
  channel: KeywordChannel;
  trendEnrichment: {
    status: "verified_credentials_required";
    label: "VERIFIED — CREDENTIALS REQUIRED";
    note: string;
  };
  analyticsEvent: "keywords.suggest";
  runId?: string;
  aiEnhancement: {
    status: "verified_credentials_required" | "local_grounded";
    label: string;
    note: string;
  };
};

export type KeywordAnalyticsEvent =
  | "keywords.suggest"
  | "keywords.regenerate"
  | "keywords.accept"
  | "keywords.reject"
  | "keywords.apply"
  | "keywords.save_brand"
  | "keywords.archive"
  | "keywords.restore"
  | "keywords.edit"
  | "keywords.brand_pack.create"
  | "keywords.trigger_collision"
  | "keywords.performance.observe"
  | "keywords.lock"
  | "keywords.copy";

export type KeywordAnalyticsEntry = {
  id: string;
  businessId: string;
  event: KeywordAnalyticsEvent;
  count: number;
  channel?: KeywordChannel;
  campaignId?: string;
  families?: SuggestionFamily[];
  at: string;
  disclaimer: "counts_only_no_causal_claim";
};

export type ChannelRuleSet = {
  channel: KeywordChannel;
  label: string;
  supportedKinds: TermKind[];
  hashtagSuitable: boolean;
  recommendedCount: { min: number; max: number };
  titleSearchRelevant: boolean;
  captionRelevant: boolean;
  triggerSuitable: boolean;
  prohibitedPatterns: RegExp[];
  characterGuidance: { maxTerm?: number; maxSetChars?: number };
  notes: string[];
};

export type TriggerMatchMode = "exact" | "contains" | "starts_with" | "case_insensitive";

export type TriggerBindingInput = {
  flowId: string;
  flowLabel?: string;
  canonicalValue: string;
  matchMode?: TriggerMatchMode;
  channel?: KeywordChannel;
  locationId?: string;
  campaignId?: string;
  termId?: string;
  activeFrom?: string;
  activeTo?: string;
  fallbackNote?: string;
};
