-- Canonical Brand Vocabulary / AI Keywords durable models (tapconnect_fusion_dev)

CREATE TYPE "VocabularyTermKind" AS ENUM (
  'KEYWORD',
  'HASHTAG',
  'BRANDED_HASHTAG',
  'LOCAL_TERM',
  'AUDIENCE_TERM',
  'INTENT_TERM',
  'SEO_PHRASE',
  'TITLE_PHRASE',
  'CAPTION_PHRASE',
  'COMMENT_TRIGGER',
  'DM_TRIGGER',
  'SYNONYM',
  'MISSPELLING',
  'INTERNAL_TAG',
  'REQUIRED_TERM',
  'EXCLUDED_TERM',
  'COMPETITOR_EXCLUSION'
);

CREATE TYPE "VocabularyApprovalStatus" AS ENUM (
  'SUGGESTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "VocabularyScope" AS ENUM (
  'WORKSPACE',
  'BUSINESS',
  'LOCATION',
  'CAMPAIGN',
  'BRAND_PACK',
  'CHANNEL'
);

CREATE TYPE "VocabularySourceType" AS ENUM (
  'BRAND_KIT',
  'MANUAL',
  'GROUNDED_SUGGEST',
  'AUTOPILOT',
  'IMPORT',
  'PERFORMANCE_STUB',
  'LEGACY_JSON'
);

CREATE TABLE "BrandVocabularyTerm" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "brandKitId" TEXT,
  "kind" "VocabularyTermKind" NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "scope" "VocabularyScope" NOT NULL DEFAULT 'BUSINESS',
  "approvalStatus" "VocabularyApprovalStatus" NOT NULL DEFAULT 'SUGGESTED',
  "sourceType" "VocabularySourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceReference" TEXT,
  "rationale" TEXT,
  "confidence" DOUBLE PRECISION,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "channels" JSONB NOT NULL DEFAULT '[]',
  "locationId" TEXT,
  "campaignId" TEXT,
  "capitalization" TEXT,
  "reviewAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "BrandVocabularyTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandVocabularyPack" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "brandKitId" TEXT,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "channels" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BrandVocabularyPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandVocabularyPackMember" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandVocabularyPackMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabularySuggestionRun" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "channel" TEXT,
  "campaignId" TEXT,
  "surface" TEXT,
  "requestContext" JSONB NOT NULL DEFAULT '{}',
  "generated" JSONB NOT NULL DEFAULT '[]',
  "selected" JSONB NOT NULL DEFAULT '[]',
  "rejected" JSONB NOT NULL DEFAULT '[]',
  "appliedDestination" TEXT,
  "modelProvider" TEXT NOT NULL DEFAULT 'local_grounded',
  "recipeVersion" TEXT NOT NULL DEFAULT 'keywords.v1',
  "costCents" INTEGER NOT NULL DEFAULT 0,
  "evidenceClass" TEXT NOT NULL DEFAULT 'modeled',
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VocabularySuggestionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabularyAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "channel" TEXT,
  "campaignId" TEXT,
  "families" JSONB NOT NULL DEFAULT '[]',
  "detail" JSONB NOT NULL DEFAULT '{}',
  "disclaimer" TEXT NOT NULL DEFAULT 'counts_only_no_causal_claim',
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VocabularyAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VocabularyTriggerBinding" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "termId" TEXT,
  "flowId" TEXT NOT NULL,
  "flowLabel" TEXT,
  "matchMode" TEXT NOT NULL DEFAULT 'contains',
  "canonicalValue" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'tapcanvas',
  "locationId" TEXT,
  "campaignId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "activeFrom" TIMESTAMP(3),
  "activeTo" TIMESTAMP(3),
  "fallbackNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VocabularyTriggerBinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandVocabularyTerm_businessId_kind_normalizedValue_scope_key"
  ON "BrandVocabularyTerm"("businessId", "kind", "normalizedValue", "scope");
CREATE INDEX "BrandVocabularyTerm_businessId_approvalStatus_active_idx"
  ON "BrandVocabularyTerm"("businessId", "approvalStatus", "active");
CREATE INDEX "BrandVocabularyTerm_businessId_kind_idx" ON "BrandVocabularyTerm"("businessId", "kind");
CREATE INDEX "BrandVocabularyTerm_brandKitId_idx" ON "BrandVocabularyTerm"("brandKitId");
CREATE INDEX "BrandVocabularyTerm_campaignId_idx" ON "BrandVocabularyTerm"("campaignId");

CREATE UNIQUE INDEX "BrandVocabularyPack_businessId_slug_key" ON "BrandVocabularyPack"("businessId", "slug");
CREATE INDEX "BrandVocabularyPack_businessId_archivedAt_idx" ON "BrandVocabularyPack"("businessId", "archivedAt");

CREATE UNIQUE INDEX "BrandVocabularyPackMember_packId_termId_key" ON "BrandVocabularyPackMember"("packId", "termId");
CREATE INDEX "BrandVocabularyPackMember_termId_idx" ON "BrandVocabularyPackMember"("termId");

CREATE INDEX "VocabularySuggestionRun_businessId_createdAt_idx" ON "VocabularySuggestionRun"("businessId", "createdAt");
CREATE INDEX "VocabularySuggestionRun_businessId_channel_idx" ON "VocabularySuggestionRun"("businessId", "channel");
CREATE INDEX "VocabularySuggestionRun_campaignId_idx" ON "VocabularySuggestionRun"("campaignId");

CREATE INDEX "VocabularyAnalyticsEvent_businessId_event_createdAt_idx"
  ON "VocabularyAnalyticsEvent"("businessId", "event", "createdAt");
CREATE INDEX "VocabularyAnalyticsEvent_businessId_channel_idx" ON "VocabularyAnalyticsEvent"("businessId", "channel");

CREATE UNIQUE INDEX "VocabularyTriggerBinding_businessId_normalizedValue_channel_flowId_key"
  ON "VocabularyTriggerBinding"("businessId", "normalizedValue", "channel", "flowId");
CREATE INDEX "VocabularyTriggerBinding_businessId_normalizedValue_channel_active_idx"
  ON "VocabularyTriggerBinding"("businessId", "normalizedValue", "channel", "active");
CREATE INDEX "VocabularyTriggerBinding_flowId_idx" ON "VocabularyTriggerBinding"("flowId");

ALTER TABLE "BrandVocabularyTerm"
  ADD CONSTRAINT "BrandVocabularyTerm_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandVocabularyTerm"
  ADD CONSTRAINT "BrandVocabularyTerm_brandKitId_fkey"
  FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandVocabularyPack"
  ADD CONSTRAINT "BrandVocabularyPack_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandVocabularyPack"
  ADD CONSTRAINT "BrandVocabularyPack_brandKitId_fkey"
  FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandVocabularyPackMember"
  ADD CONSTRAINT "BrandVocabularyPackMember_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "BrandVocabularyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandVocabularyPackMember"
  ADD CONSTRAINT "BrandVocabularyPackMember_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "BrandVocabularyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VocabularySuggestionRun"
  ADD CONSTRAINT "VocabularySuggestionRun_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VocabularyAnalyticsEvent"
  ADD CONSTRAINT "VocabularyAnalyticsEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VocabularyTriggerBinding"
  ADD CONSTRAINT "VocabularyTriggerBinding_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyTriggerBinding"
  ADD CONSTRAINT "VocabularyTriggerBinding_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "BrandVocabularyTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
