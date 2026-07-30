CREATE TYPE "CreativeResourceKind" AS ENUM (
  'COMPOSITION',
  'TEXT_STYLE',
  'BUTTON_STYLE',
  'FRAME_TREATMENT',
  'GRADIENT',
  'BACKGROUND',
  'PALETTE',
  'MASK_FAVORITES',
  'OFFER_LAYOUT',
  'COUPON_LAYOUT',
  'EMAIL_SECTION',
  'CAMPAIGN_SECTION',
  'TEMPLATE'
);

CREATE TYPE "CreativeResourceStatus" AS ENUM ('DRAFT', 'APPROVED', 'DEPRECATED');

CREATE TABLE "CreativeResource" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "kind" "CreativeResourceKind" NOT NULL,
  "name" TEXT NOT NULL,
  "activeNameKey" TEXT,
  "status" "CreativeResourceStatus" NOT NULL DEFAULT 'DRAFT',
  "currentRevisionId" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeResourceRevision" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeResourceRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeResourceUsage" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "resourceRevisionId" TEXT NOT NULL,
  "surface" "CreativeSurfaceKind" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "documentPath" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeResourceUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeResourceFavorite" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeResourceFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeResourceRecent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "useCount" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "CreativeResourceRecent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreativeResource_activeNameKey_key"
ON "CreativeResource"("activeNameKey");
CREATE UNIQUE INDEX "CreativeResource_currentRevisionId_key"
ON "CreativeResource"("currentRevisionId");
CREATE INDEX "CreativeResource_businessId_kind_status_idx"
ON "CreativeResource"("businessId", "kind", "status");
CREATE INDEX "CreativeResource_businessId_updatedAt_idx"
ON "CreativeResource"("businessId", "updatedAt");

CREATE UNIQUE INDEX "CreativeResourceRevision_resourceId_version_key"
ON "CreativeResourceRevision"("resourceId", "version");
CREATE INDEX "CreativeResourceRevision_resourceId_createdAt_idx"
ON "CreativeResourceRevision"("resourceId", "createdAt");

CREATE UNIQUE INDEX "creative_resource_usage_subject_path_key"
ON "CreativeResourceUsage"("businessId", "surface", "subjectId", "documentPath");
CREATE INDEX "CreativeResourceUsage_businessId_resourceId_idx"
ON "CreativeResourceUsage"("businessId", "resourceId");
CREATE INDEX "CreativeResourceUsage_businessId_resourceRevisionId_idx"
ON "CreativeResourceUsage"("businessId", "resourceRevisionId");

CREATE UNIQUE INDEX "CreativeResourceFavorite_businessId_userId_resourceId_key"
ON "CreativeResourceFavorite"("businessId", "userId", "resourceId");
CREATE INDEX "CreativeResourceFavorite_businessId_userId_createdAt_idx"
ON "CreativeResourceFavorite"("businessId", "userId", "createdAt");

CREATE UNIQUE INDEX "CreativeResourceRecent_businessId_userId_resourceId_key"
ON "CreativeResourceRecent"("businessId", "userId", "resourceId");
CREATE INDEX "CreativeResourceRecent_businessId_userId_lastUsedAt_idx"
ON "CreativeResourceRecent"("businessId", "userId", "lastUsedAt");

ALTER TABLE "CreativeResource"
ADD CONSTRAINT "CreativeResource_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResource"
ADD CONSTRAINT "CreativeResource_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeResource"
ADD CONSTRAINT "CreativeResource_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeResource"
ADD CONSTRAINT "CreativeResource_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreativeResourceRevision"
ADD CONSTRAINT "CreativeResourceRevision_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "CreativeResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceRevision"
ADD CONSTRAINT "CreativeResourceRevision_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreativeResource"
ADD CONSTRAINT "CreativeResource_currentRevisionId_fkey"
FOREIGN KEY ("currentRevisionId") REFERENCES "CreativeResourceRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreativeResourceUsage"
ADD CONSTRAINT "CreativeResourceUsage_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceUsage"
ADD CONSTRAINT "CreativeResourceUsage_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "CreativeResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceUsage"
ADD CONSTRAINT "CreativeResourceUsage_resourceRevisionId_fkey"
FOREIGN KEY ("resourceRevisionId") REFERENCES "CreativeResourceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreativeResourceFavorite"
ADD CONSTRAINT "CreativeResourceFavorite_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceFavorite"
ADD CONSTRAINT "CreativeResourceFavorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceFavorite"
ADD CONSTRAINT "CreativeResourceFavorite_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "CreativeResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreativeResourceRecent"
ADD CONSTRAINT "CreativeResourceRecent_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceRecent"
ADD CONSTRAINT "CreativeResourceRecent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeResourceRecent"
ADD CONSTRAINT "CreativeResourceRecent_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "CreativeResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
