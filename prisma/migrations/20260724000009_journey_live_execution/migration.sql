-- TapFlow live visitor execution runtime (immutable published versions + persisted instances)

CREATE TYPE "JourneyExecutionStatus" AS ENUM (
  'RUNNING',
  'WAITING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BLOCKED',
  'HANDOFF'
);

CREATE TYPE "JourneyExecutionStepStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'SKIPPED',
  'RETRYING',
  'WAITING',
  'BLOCKED'
);

CREATE TABLE "JourneyPublishedVersion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyPublishedVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyExecution" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "publishedVersionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "JourneyExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "currentNodeId" TEXT,
    "visitorHash" TEXT NOT NULL,
    "sessionId" TEXT,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "campaignId" TEXT,
    "deviceSlotId" TEXT,
    "tapPointId" TEXT,
    "definitionSnapshot" JSONB NOT NULL,
    "path" JSONB NOT NULL DEFAULT '[]',
    "visitorContext" JSONB NOT NULL DEFAULT '{}',
    "waitUntil" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "JourneyExecutionStepStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "detail" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "effectRef" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "JourneyExecutionStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyProviderEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "executionId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JourneyPublishedVersion_journeyId_version_key" ON "JourneyPublishedVersion"("journeyId", "version");
CREATE INDEX "JourneyPublishedVersion_businessId_journeyId_idx" ON "JourneyPublishedVersion"("businessId", "journeyId");

CREATE UNIQUE INDEX "JourneyExecution_businessId_idempotencyKey_key" ON "JourneyExecution"("businessId", "idempotencyKey");
CREATE INDEX "JourneyExecution_businessId_status_updatedAt_idx" ON "JourneyExecution"("businessId", "status", "updatedAt");
CREATE INDEX "JourneyExecution_businessId_visitorHash_idx" ON "JourneyExecution"("businessId", "visitorHash");
CREATE INDEX "JourneyExecution_journeyId_status_idx" ON "JourneyExecution"("journeyId", "status");
CREATE INDEX "JourneyExecution_publishedVersionId_idx" ON "JourneyExecution"("publishedVersionId");
CREATE INDEX "JourneyExecution_sessionId_idx" ON "JourneyExecution"("sessionId");

CREATE INDEX "JourneyExecutionStep_executionId_occurredAt_idx" ON "JourneyExecutionStep"("executionId", "occurredAt");
CREATE INDEX "JourneyExecutionStep_businessId_occurredAt_idx" ON "JourneyExecutionStep"("businessId", "occurredAt");

CREATE UNIQUE INDEX "JourneyProviderEvent_businessId_provider_eventKey_key" ON "JourneyProviderEvent"("businessId", "provider", "eventKey");
CREATE INDEX "JourneyProviderEvent_businessId_processedAt_idx" ON "JourneyProviderEvent"("businessId", "processedAt");

ALTER TABLE "JourneyPublishedVersion" ADD CONSTRAINT "JourneyPublishedVersion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyPublishedVersion" ADD CONSTRAINT "JourneyPublishedVersion_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JourneyExecution" ADD CONSTRAINT "JourneyExecution_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyExecution" ADD CONSTRAINT "JourneyExecution_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "JourneyDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyExecution" ADD CONSTRAINT "JourneyExecution_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "JourneyPublishedVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JourneyExecutionStep" ADD CONSTRAINT "JourneyExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "JourneyExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JourneyProviderEvent" ADD CONSTRAINT "JourneyProviderEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyProviderEvent" ADD CONSTRAINT "JourneyProviderEvent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "JourneyExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
