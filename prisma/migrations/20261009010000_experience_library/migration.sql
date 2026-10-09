-- Promote the existing independent CardCreativeDocument draft authority into
-- the organizational Experience Library. No second creative document model is
-- introduced; existing draft JSON and optimistic revisions remain canonical.
ALTER TABLE "CardCreativeDocument"
  ADD COLUMN "clientName" TEXT NOT NULL DEFAULT 'Unassigned',
  ADD COLUMN "experienceType" TEXT NOT NULL DEFAULT 'DEMO',
  ADD COLUMN "experienceStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "coverUrl" TEXT,
  ADD COLUMN "sourceDocumentId" TEXT,
  ADD COLUMN "previewedAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "publicationActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "currentPublicationSnapshotId" TEXT;

CREATE UNIQUE INDEX "CardCreativeDocument_currentPublicationSnapshotId_key" ON "CardCreativeDocument"("currentPublicationSnapshotId");
DROP INDEX "CardCreativeDocument_businessId_updatedAt_idx";
CREATE INDEX "CardCreativeDocument_businessId_archivedAt_updatedAt_idx" ON "CardCreativeDocument"("businessId", "archivedAt", "updatedAt");
CREATE INDEX "CardCreativeDocument_businessId_clientName_updatedAt_idx" ON "CardCreativeDocument"("businessId", "clientName", "updatedAt");
CREATE INDEX "CardCreativeDocument_businessId_experienceType_experienceSt_idx" ON "CardCreativeDocument"("businessId", "experienceType", "experienceStatus");

CREATE TABLE "ExperiencePublicDestination" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "experienceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "accessActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExperiencePublicDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperienceAccessCredential" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenHint" TEXT NOT NULL,
  "credentialType" TEXT NOT NULL DEFAULT 'PERMANENT',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "redemptionLimit" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExperienceAccessCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExperiencePublicDestination_experienceId_key" ON "ExperiencePublicDestination"("experienceId");
CREATE UNIQUE INDEX "ExperiencePublicDestination_slug_key" ON "ExperiencePublicDestination"("slug");
CREATE INDEX "ExperiencePublicDestination_businessId_accessActive_idx" ON "ExperiencePublicDestination"("businessId", "accessActive");
CREATE UNIQUE INDEX "ExperienceAccessCredential_tokenHash_key" ON "ExperienceAccessCredential"("tokenHash");
CREATE INDEX "ExperienceAccessCredential_businessId_status_createdAt_idx" ON "ExperienceAccessCredential"("businessId", "status", "createdAt");
CREATE INDEX "ExperienceAccessCredential_destinationId_status_createdAt_idx" ON "ExperienceAccessCredential"("destinationId", "status", "createdAt");

ALTER TABLE "ExperiencePublicDestination" ADD CONSTRAINT "ExperiencePublicDestination_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperiencePublicDestination" ADD CONSTRAINT "ExperiencePublicDestination_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CardCreativeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperienceAccessCredential" ADD CONSTRAINT "ExperienceAccessCredential_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperienceAccessCredential" ADD CONSTRAINT "ExperienceAccessCredential_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ExperiencePublicDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
