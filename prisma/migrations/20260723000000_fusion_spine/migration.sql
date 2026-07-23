-- Fusion spine (additive). Safe alongside V1 DeviceSlot / Campaign tables.

-- Enums
CREATE TYPE "FusionAuditActorType" AS ENUM ('USER', 'SYSTEM', 'PUBLIC', 'ADMIN');
CREATE TYPE "FusionOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');
CREATE TYPE "FusionTapPointStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'PAUSED', 'LOST', 'REPLACED', 'RETIRED');

-- Feature overrides
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlagOverride_featureId_scope_key" ON "FeatureFlagOverride"("featureId", "scope");
CREATE INDEX "FeatureFlagOverride_featureId_idx" ON "FeatureFlagOverride"("featureId");

-- Platform audit
CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "actorType" "FusionAuditActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformAuditEvent_occurredAt_idx" ON "PlatformAuditEvent"("occurredAt");
CREATE INDEX "PlatformAuditEvent_resourceType_resourceId_idx" ON "PlatformAuditEvent"("resourceType", "resourceId");
CREATE INDEX "PlatformAuditEvent_businessId_occurredAt_idx" ON "PlatformAuditEvent"("businessId", "occurredAt");

-- Outbox
CREATE TABLE "FusionOutboxEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "topic" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FusionOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FusionOutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FusionOutboxEvent_status_availableAt_idx" ON "FusionOutboxEvent"("status", "availableAt");
CREATE INDEX "FusionOutboxEvent_businessId_createdAt_idx" ON "FusionOutboxEvent"("businessId", "createdAt");

-- Idempotency
CREATE TABLE "FusionIdempotencyRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FusionIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FusionIdempotencyRecord_businessId_operation_key_key" ON "FusionIdempotencyRecord"("businessId", "operation", "key");
CREATE INDEX "FusionIdempotencyRecord_expiresAt_idx" ON "FusionIdempotencyRecord"("expiresAt");

-- Tap Points
CREATE TABLE "TapPoint" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT,
    "status" "FusionTapPointStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "deviceSlotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TapPoint_deviceSlotId_key" ON "TapPoint"("deviceSlotId");
CREATE INDEX "TapPoint_businessId_status_idx" ON "TapPoint"("businessId", "status");

CREATE TABLE "TapPointAddress" (
    "id" TEXT NOT NULL,
    "tapPointId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapPointAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TapPointAddress_tapPointId_key" ON "TapPointAddress"("tapPointId");
CREATE UNIQUE INDEX "TapPointAddress_code_key" ON "TapPointAddress"("code");

ALTER TABLE "TapPointAddress" ADD CONSTRAINT "TapPointAddress_tapPointId_fkey" FOREIGN KEY ("tapPointId") REFERENCES "TapPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Immutable publications
CREATE TABLE "PublicationSnapshot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "manifest" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tapPointId" TEXT,

    CONSTRAINT "PublicationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicationSnapshot_subjectType_subjectId_version_key" ON "PublicationSnapshot"("subjectType", "subjectId", "version");
CREATE UNIQUE INDEX "PublicationSnapshot_subjectType_subjectId_contentHash_key" ON "PublicationSnapshot"("subjectType", "subjectId", "contentHash");
CREATE INDEX "PublicationSnapshot_businessId_publishedAt_idx" ON "PublicationSnapshot"("businessId", "publishedAt");
CREATE INDEX "PublicationSnapshot_tapPointId_idx" ON "PublicationSnapshot"("tapPointId");

ALTER TABLE "PublicationSnapshot" ADD CONSTRAINT "PublicationSnapshot_tapPointId_fkey" FOREIGN KEY ("tapPointId") REFERENCES "TapPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
