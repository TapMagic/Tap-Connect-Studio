-- CreateEnum
CREATE TYPE "MediaApprovalStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaLicenseCode" AS ENUM ('OWNER_SUPPLIED', 'PEXELS', 'NO_LICENSE_ASSERTED', 'EXTERNAL_UNVERIFIED', 'OTHER');

-- CreateEnum
CREATE TYPE "CreativeSurfaceKind" AS ENUM ('CARD', 'EMAIL', 'CAMPAIGN', 'SPOTLIGHT', 'OFFER', 'COUPON');

-- DropIndex
DROP INDEX "MediaAsset_businessId_idx";

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "approvalStatus" "MediaApprovalStatus" NOT NULL DEFAULT 'UNREVIEWED',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "attributionText" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "creatorName" TEXT,
ADD COLUMN     "creatorUrl" TEXT,
ADD COLUMN     "defaultAltText" TEXT,
ADD COLUMN     "licenseCode" "MediaLicenseCode",
ADD COLUMN     "licenseUrl" TEXT,
ADD COLUMN     "parentAssetId" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerAssetId" TEXT,
ADD COLUMN     "renditionKind" TEXT,
ADD COLUMN     "rightsNote" TEXT,
ADD COLUMN     "sourcePageUrl" TEXT,
ADD COLUMN     "storageKey" TEXT;

-- Conservative compatibility backfill. Provider facts remain nullable when
-- the legacy row does not prove their origin.
UPDATE "MediaAsset"
SET
  "provider" = CASE
    WHEN "source" = 'logo_dev' THEN 'logo_dev'
    WHEN "source" IN ('pexels', 'stock') AND COALESCE("sourceUrl", '') LIKE '%pexels.com%' THEN 'pexels'
    ELSE NULL
  END,
  "providerAssetId" = "providerId",
  "sourcePageUrl" = "sourceUrl",
  "creatorName" = "attributionName",
  "creatorUrl" = "attributionUrl",
  "rightsNote" = "rights",
  "licenseCode" = CASE
    WHEN "source" = 'upload' THEN 'OWNER_SUPPLIED'::"MediaLicenseCode"
    WHEN "source" = 'logo_dev' THEN 'NO_LICENSE_ASSERTED'::"MediaLicenseCode"
    WHEN "source" IN ('pexels', 'stock') AND COALESCE("sourceUrl", '') LIKE '%pexels.com%' THEN 'PEXELS'::"MediaLicenseCode"
    WHEN "source" = 'url' THEN 'EXTERNAL_UNVERIFIED'::"MediaLicenseCode"
    ELSE NULL
  END;

-- A previously selected primary logo is approved only when it exactly matches
-- an existing tenant asset. No synthetic asset or approver is invented.
UPDATE "MediaAsset" AS asset
SET
  "approvalStatus" = 'APPROVED',
  "approvedAt" = COALESCE(asset."importedAt", asset."createdAt")
FROM "Business" AS business
WHERE business."id" = asset."businessId"
  AND business."logoUrl" IS NOT NULL
  AND business."logoUrl" = asset."url";

-- CreateTable
CREATE TABLE "MediaAssetFavorite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAssetFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAssetRecent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "useCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MediaAssetRecent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAssetUsage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "surface" "CreativeSurfaceKind" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "documentPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeAssetUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAssetFavorite_businessId_userId_createdAt_idx" ON "MediaAssetFavorite"("businessId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAssetFavorite_businessId_userId_mediaAssetId_key" ON "MediaAssetFavorite"("businessId", "userId", "mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaAssetRecent_businessId_userId_lastUsedAt_idx" ON "MediaAssetRecent"("businessId", "userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAssetRecent_businessId_userId_mediaAssetId_key" ON "MediaAssetRecent"("businessId", "userId", "mediaAssetId");

-- CreateIndex
CREATE INDEX "CreativeAssetUsage_businessId_mediaAssetId_idx" ON "CreativeAssetUsage"("businessId", "mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeAssetUsage_businessId_surface_subjectId_documentPat_key" ON "CreativeAssetUsage"("businessId", "surface", "subjectId", "documentPath", "mediaAssetId");

-- CreateIndex
CREATE INDEX "MediaAsset_businessId_approvalStatus_createdAt_idx" ON "MediaAsset"("businessId", "approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_businessId_contentHash_idx" ON "MediaAsset"("businessId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_businessId_provider_providerAssetId_key" ON "MediaAsset"("businessId", "provider", "providerAssetId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetFavorite" ADD CONSTRAINT "MediaAssetFavorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetFavorite" ADD CONSTRAINT "MediaAssetFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetFavorite" ADD CONSTRAINT "MediaAssetFavorite_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetRecent" ADD CONSTRAINT "MediaAssetRecent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetRecent" ADD CONSTRAINT "MediaAssetRecent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAssetRecent" ADD CONSTRAINT "MediaAssetRecent_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAssetUsage" ADD CONSTRAINT "CreativeAssetUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAssetUsage" ADD CONSTRAINT "CreativeAssetUsage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reconcile two legacy index names that PostgreSQL truncated before Prisma's
-- suffix-preserving naming convention was applied. Existing synchronized
-- databases already have the target names, so these are safe no-ops there.
ALTER INDEX IF EXISTS "VocabularyTriggerBinding_businessId_normalizedValue_channel_act"
  RENAME TO "VocabularyTriggerBinding_businessId_normalizedValue_channel_idx";
ALTER INDEX IF EXISTS "VocabularyTriggerBinding_businessId_normalizedValue_channel_flo"
  RENAME TO "VocabularyTriggerBinding_businessId_normalizedValue_channel_key";
