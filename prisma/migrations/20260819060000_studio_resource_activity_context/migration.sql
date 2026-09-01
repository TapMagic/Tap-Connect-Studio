ALTER TYPE "CreativeResourceKind" ADD VALUE IF NOT EXISTS 'ICON';

ALTER TABLE "CreativeResourceRecent"
ADD COLUMN "resourceKind" TEXT NOT NULL DEFAULT 'creative-resource',
ADD COLUMN "consumer" TEXT NOT NULL DEFAULT 'studio',
ADD COLUMN "context" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "lastOperation" TEXT NOT NULL DEFAULT 'select_for_use';

DROP INDEX "CreativeResourceRecent_businessId_userId_resourceId_key";
DROP INDEX "CreativeResourceRecent_businessId_userId_lastUsedAt_idx";

CREATE UNIQUE INDEX "CreativeResourceRecent_businessId_userId_resourceId_consumer_context_key"
ON "CreativeResourceRecent"("businessId", "userId", "resourceId", "consumer", "context");

CREATE INDEX "CreativeResourceRecent_businessId_userId_consumer_context_lastUsedAt_idx"
ON "CreativeResourceRecent"("businessId", "userId", "consumer", "context", "lastUsedAt");
