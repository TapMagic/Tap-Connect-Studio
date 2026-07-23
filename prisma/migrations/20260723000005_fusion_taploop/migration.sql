-- TapLoop loyalty + JourneyDraft lifecycle (additive)

-- JourneyDraft lifecycle columns
CREATE TYPE "JourneyLifecycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'PAUSED');

ALTER TABLE "JourneyDraft" ADD COLUMN "status" "JourneyLifecycleStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "JourneyDraft" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "JourneyDraft" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "JourneyDraft" ADD COLUMN "pausedAt" TIMESTAMP(3);

CREATE INDEX "JourneyDraft_businessId_status_idx" ON "JourneyDraft"("businessId", "status");

-- TapLoop enums
CREATE TYPE "LoyaltyEnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
CREATE TYPE "LoyaltyLedgerType" AS ENUM ('AWARD', 'REDEEM', 'REVERSE', 'ADJUST', 'EXPIRE');

CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "earnRules" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "thresholdPoints" INTEGER NOT NULL DEFAULT 0,
    "perks" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyEnrollment" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "relationshipId" TEXT,
    "status" "LoyaltyEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyLedgerEntry" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "relationshipId" TEXT,
    "type" "LoyaltyLedgerType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceId" TEXT,
    "campaignId" TEXT,
    "rewardId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "reversesEntryId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoyaltyProgram_businessId_active_idx" ON "LoyaltyProgram"("businessId", "active");
CREATE INDEX "LoyaltyTier_programId_rank_idx" ON "LoyaltyTier"("programId", "rank");
CREATE INDEX "LoyaltyReward_programId_active_idx" ON "LoyaltyReward"("programId", "active");
CREATE UNIQUE INDEX "LoyaltyEnrollment_programId_contactId_key" ON "LoyaltyEnrollment"("programId", "contactId");
CREATE INDEX "LoyaltyEnrollment_businessId_status_idx" ON "LoyaltyEnrollment"("businessId", "status");
CREATE INDEX "LoyaltyEnrollment_contactId_idx" ON "LoyaltyEnrollment"("contactId");
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_businessId_idempotencyKey_key" ON "LoyaltyLedgerEntry"("businessId", "idempotencyKey");
CREATE INDEX "LoyaltyLedgerEntry_enrollmentId_createdAt_idx" ON "LoyaltyLedgerEntry"("enrollmentId", "createdAt");
CREATE INDEX "LoyaltyLedgerEntry_programId_createdAt_idx" ON "LoyaltyLedgerEntry"("programId", "createdAt");
CREATE INDEX "LoyaltyLedgerEntry_contactId_createdAt_idx" ON "LoyaltyLedgerEntry"("contactId", "createdAt");
CREATE INDEX "LoyaltyLedgerEntry_reversesEntryId_idx" ON "LoyaltyLedgerEntry"("reversesEntryId");

ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEnrollment" ADD CONSTRAINT "LoyaltyEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEnrollment" ADD CONSTRAINT "LoyaltyEnrollment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEnrollment" ADD CONSTRAINT "LoyaltyEnrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyEnrollment" ADD CONSTRAINT "LoyaltyEnrollment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "CustomerRelationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LoyaltyEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "CustomerRelationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
