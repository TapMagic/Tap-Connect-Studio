CREATE TYPE "BusinessCategory" AS ENUM (
  'PROFESSIONAL_SERVICES',
  'HEALTH_WELLNESS',
  'FOOD_HOSPITALITY',
  'RETAIL_ECOMMERCE',
  'HOME_LOCAL_SERVICES',
  'REAL_ESTATE',
  'NONPROFIT_COMMUNITY',
  'CREATOR_PERSONAL_BRAND',
  'OTHER'
);

CREATE TYPE "CustomerOutcome" AS ENUM (
  'CONTACT',
  'REVIEWS',
  'OFFER',
  'APPOINTMENTS',
  'DIRECTIONS',
  'ESSENTIALS',
  'LOYALTY',
  'FAQ'
);

CREATE TYPE "KnowledgeSourceKind" AS ENUM (
  'OWNER',
  'WEBSITE',
  'UPLOAD',
  'SOCIAL',
  'BRAND_ASSET',
  'SYSTEM'
);

CREATE TYPE "KnowledgeIngestionStatus" AS ENUM ('PENDING', 'READY', 'PARTIAL', 'FAILED');
CREATE TYPE "KnowledgeApprovalStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED', 'STALE');
CREATE TYPE "KnowledgeContradictionStatus" AS ENUM ('NONE', 'SUSPECTED', 'CONFIRMED');
CREATE TYPE "KnowledgeEvidenceClass" AS ENUM (
  'HOST_DECLARED',
  'SYSTEM_OBSERVED',
  'DERIVED',
  'INFERRED'
);
CREATE TYPE "BrandDecisionStatus" AS ENUM (
  'SUGGESTED',
  'KEPT',
  'APPROVED',
  'REJECTED',
  'IGNORED',
  'REPLACED'
);
CREATE TYPE "BrandDecisionScope" AS ENUM ('BRAND', 'CARD_ONLY');
CREATE TYPE "BrandRightsStatus" AS ENUM (
  'CONFIRMED',
  'NEEDS_CONFIRMATION',
  'NOT_APPLICABLE'
);

ALTER TABLE "Business"
  ADD COLUMN "businessCategory" "BusinessCategory",
  ADD COLUMN "primaryCustomerOutcome" "CustomerOutcome",
  ADD COLUMN "cardFirstOnboardingPreviewedAt" TIMESTAMP(3),
  ADD COLUMN "cardFirstOnboardingCompletedAt" TIMESTAMP(3);

ALTER TABLE "BrandKit"
  ADD COLUMN "tapCardDraft" JSONB,
  ADD COLUMN "tapCardDraftUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "tapCardDraftRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tapCardPublishedAt" TIMESTAMP(3);

-- Existing tapCard values remain the published representation. A draft is
-- initialized lazily on first authorized edit, never by this migration.
UPDATE "BrandKit"
SET "tapCardPublishedAt" = "updatedAt"
WHERE "tapCard" IS NOT NULL
  AND "tapCard" <> '{}'::jsonb;

CREATE TABLE "KnowledgeSource" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "locationId" TEXT,
  "mediaAssetId" TEXT,
  "kind" "KnowledgeSourceKind" NOT NULL,
  "normalizedUri" TEXT,
  "displayLabel" TEXT NOT NULL,
  "contentHash" TEXT,
  "ingestionStatus" "KnowledgeIngestionStatus" NOT NULL DEFAULT 'PENDING',
  "rightsNote" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeFact" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "locationId" TEXT,
  "sourceId" TEXT NOT NULL,
  "factKey" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "approvalStatus" "KnowledgeApprovalStatus" NOT NULL DEFAULT 'SUGGESTED',
  "contradictionStatus" "KnowledgeContradictionStatus" NOT NULL DEFAULT 'NONE',
  "contradictionGroup" TEXT,
  "evidenceClass" "KnowledgeEvidenceClass" NOT NULL,
  "whereUsed" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "supersedesId" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandPropertyDecision" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "brandKitId" TEXT NOT NULL,
  "propertyKey" TEXT NOT NULL,
  "candidate" JSONB NOT NULL,
  "status" "BrandDecisionStatus" NOT NULL DEFAULT 'SUGGESTED',
  "scope" "BrandDecisionScope" NOT NULL DEFAULT 'BRAND',
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMP(3),
  "knowledgeSourceId" TEXT,
  "mediaAssetId" TEXT,
  "provider" TEXT,
  "confidence" DOUBLE PRECISION,
  "rationale" TEXT,
  "rightsStatus" "BrandRightsStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "replacesDecisionId" TEXT,
  "actedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandPropertyDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeSource_businessId_kind_idx"
ON "KnowledgeSource"("businessId", "kind");
CREATE INDEX "KnowledgeSource_businessId_normalizedUri_idx"
ON "KnowledgeSource"("businessId", "normalizedUri");
CREATE INDEX "KnowledgeSource_mediaAssetId_idx"
ON "KnowledgeSource"("mediaAssetId");

CREATE INDEX "KnowledgeFact_businessId_factKey_approvalStatus_idx"
ON "KnowledgeFact"("businessId", "factKey", "approvalStatus");
CREATE INDEX "KnowledgeFact_sourceId_idx" ON "KnowledgeFact"("sourceId");
CREATE INDEX "KnowledgeFact_locationId_idx" ON "KnowledgeFact"("locationId");
CREATE INDEX "KnowledgeFact_supersedesId_idx" ON "KnowledgeFact"("supersedesId");

CREATE INDEX "BrandPropertyDecision_brandKitId_propertyKey_status_idx"
ON "BrandPropertyDecision"("brandKitId", "propertyKey", "status");
CREATE INDEX "BrandPropertyDecision_businessId_propertyKey_idx"
ON "BrandPropertyDecision"("businessId", "propertyKey");
CREATE INDEX "BrandPropertyDecision_mediaAssetId_idx"
ON "BrandPropertyDecision"("mediaAssetId");
CREATE INDEX "BrandPropertyDecision_knowledgeSourceId_idx"
ON "BrandPropertyDecision"("knowledgeSourceId");

ALTER TABLE "KnowledgeSource"
ADD CONSTRAINT "KnowledgeSource_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource"
ADD CONSTRAINT "KnowledgeSource_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource"
ADD CONSTRAINT "KnowledgeSource_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KnowledgeFact"
ADD CONSTRAINT "KnowledgeFact_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeFact"
ADD CONSTRAINT "KnowledgeFact_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeFact"
ADD CONSTRAINT "KnowledgeFact_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeFact"
ADD CONSTRAINT "KnowledgeFact_supersedesId_fkey"
FOREIGN KEY ("supersedesId") REFERENCES "KnowledgeFact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrandPropertyDecision"
ADD CONSTRAINT "BrandPropertyDecision_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandPropertyDecision"
ADD CONSTRAINT "BrandPropertyDecision_brandKitId_fkey"
FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandPropertyDecision"
ADD CONSTRAINT "BrandPropertyDecision_knowledgeSourceId_fkey"
FOREIGN KEY ("knowledgeSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandPropertyDecision"
ADD CONSTRAINT "BrandPropertyDecision_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BrandPropertyDecision"
ADD CONSTRAINT "BrandPropertyDecision_replacesDecisionId_fkey"
FOREIGN KEY ("replacesDecisionId") REFERENCES "BrandPropertyDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
