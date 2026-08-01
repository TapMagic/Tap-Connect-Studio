-- Wave 1 operational lifecycle foundations. Additive and backward compatible.
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'FAILED';

CREATE TYPE "CardPublicationStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');
CREATE TYPE "EmailStatus" AS ENUM (
  'DRAFT',
  'READY',
  'SCHEDULED',
  'QUEUED',
  'SENDING',
  'SENT',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'ARCHIVED'
);

ALTER TABLE "BrandKit" ADD COLUMN "currentCardPublicationId" TEXT;
ALTER TABLE "DemoPublication" ADD COLUMN "cardPublicationId" TEXT;

ALTER TABLE "TapEvent"
  ADD COLUMN "cardPublicationId" TEXT,
  ADD COLUMN "scheduleDecision" JSONB,
  ADD COLUMN "fixture" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "resolutionOutcome" TEXT;

ALTER TABLE "ClickEvent"
  ADD COLUMN "tapEventId" TEXT,
  ADD COLUMN "cardPublicationId" TEXT,
  ADD COLUMN "fixture" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CardPublication" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "brandKitId" TEXT NOT NULL,
  "publicationSnapshotId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "sourceDraftRevision" INTEGER NOT NULL,
  "status" "CardPublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "comparisonSummary" JSONB NOT NULL DEFAULT '{}',
  "publishedById" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  "rolledBackFromId" TEXT,
  CONSTRAINT "CardPublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignLifecycleEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "fromStatus" "CampaignStatus",
  "toStatus" "CampaignStatus" NOT NULL,
  "command" TEXT NOT NULL,
  "reason" TEXT,
  "actorId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDocument" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "campaignId" TEXT,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL DEFAULT '',
  "document" JSONB NOT NULL DEFAULT '{}',
  "status" "EmailStatus" NOT NULL DEFAULT 'DRAFT',
  "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "scheduledFor" TIMESTAMP(3),
  "fixtureOnly" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailLifecycleEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "emailId" TEXT NOT NULL,
  "fromStatus" "EmailStatus",
  "toStatus" "EmailStatus" NOT NULL,
  "command" TEXT NOT NULL,
  "reason" TEXT,
  "actorId" TEXT,
  "providerRef" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandKit_currentCardPublicationId_key" ON "BrandKit"("currentCardPublicationId");
CREATE UNIQUE INDEX "CardPublication_publicationSnapshotId_key" ON "CardPublication"("publicationSnapshotId");
CREATE UNIQUE INDEX "CardPublication_brandKitId_version_key" ON "CardPublication"("brandKitId", "version");
CREATE INDEX "CardPublication_businessId_status_publishedAt_idx" ON "CardPublication"("businessId", "status", "publishedAt");
CREATE INDEX "CardPublication_brandKitId_status_version_idx" ON "CardPublication"("brandKitId", "status", "version");
CREATE INDEX "CampaignLifecycleEvent_businessId_occurredAt_idx" ON "CampaignLifecycleEvent"("businessId", "occurredAt");
CREATE INDEX "CampaignLifecycleEvent_campaignId_occurredAt_idx" ON "CampaignLifecycleEvent"("campaignId", "occurredAt");
CREATE INDEX "ClickEvent_tapEventId_createdAt_idx" ON "ClickEvent"("tapEventId", "createdAt");
CREATE INDEX "ClickEvent_businessId_createdAt_idx" ON "ClickEvent"("businessId", "createdAt");
CREATE UNIQUE INDEX "EmailDocument_businessId_campaignId_key" ON "EmailDocument"("businessId", "campaignId");
CREATE INDEX "EmailDocument_businessId_status_updatedAt_idx" ON "EmailDocument"("businessId", "status", "updatedAt");
CREATE INDEX "EmailDocument_businessId_scheduledFor_idx" ON "EmailDocument"("businessId", "scheduledFor");
CREATE INDEX "EmailLifecycleEvent_businessId_occurredAt_idx" ON "EmailLifecycleEvent"("businessId", "occurredAt");
CREATE INDEX "EmailLifecycleEvent_emailId_occurredAt_idx" ON "EmailLifecycleEvent"("emailId", "occurredAt");

ALTER TABLE "CardPublication" ADD CONSTRAINT "CardPublication_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardPublication" ADD CONSTRAINT "CardPublication_brandKitId_fkey"
  FOREIGN KEY ("brandKitId") REFERENCES "BrandKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignLifecycleEvent" ADD CONSTRAINT "CampaignLifecycleEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignLifecycleEvent" ADD CONSTRAINT "CampaignLifecycleEvent_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_tapEventId_fkey"
  FOREIGN KEY ("tapEventId") REFERENCES "TapEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDocument" ADD CONSTRAINT "EmailDocument_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailDocument" ADD CONSTRAINT "EmailDocument_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLifecycleEvent" ADD CONSTRAINT "EmailLifecycleEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLifecycleEvent" ADD CONSTRAINT "EmailLifecycleEvent_emailId_fkey"
  FOREIGN KEY ("emailId") REFERENCES "EmailDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
