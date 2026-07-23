-- Fusion audience domain (additive — V1 Lead preserved)

-- CreateEnum
CREATE TYPE "FusionConsentChannel" AS ENUM ('EMAIL', 'SMS', 'WALLET', 'MARKETING');
CREATE TYPE "FusionConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'WITHDRAWN');
CREATE TYPE "FusionRelationshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable Lead: bridge to Contact
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateTable Contact
CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable CustomerRelationship
CREATE TABLE IF NOT EXISTS "CustomerRelationship" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" "FusionRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" TEXT,
    "sourceLeadId" TEXT,
    "sourceTapPointId" TEXT,
    "tapSaveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsentRecord
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" "FusionConsentChannel" NOT NULL,
    "status" "FusionConsentStatus" NOT NULL,
    "legalBasis" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_businessId_createdAt_idx" ON "Contact"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "Contact_businessId_email_idx" ON "Contact"("businessId", "email");
CREATE INDEX IF NOT EXISTS "Contact_businessId_phone_idx" ON "Contact"("businessId", "phone");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerRelationship_publicToken_key" ON "CustomerRelationship"("publicToken");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerRelationship_businessId_contactId_key" ON "CustomerRelationship"("businessId", "contactId");
CREATE INDEX IF NOT EXISTS "CustomerRelationship_businessId_status_idx" ON "CustomerRelationship"("businessId", "status");

CREATE INDEX IF NOT EXISTS "ConsentRecord_contactId_channel_idx" ON "ConsentRecord"("contactId", "channel");
CREATE INDEX IF NOT EXISTS "ConsentRecord_businessId_recordedAt_idx" ON "ConsentRecord"("businessId", "recordedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerRelationship" ADD CONSTRAINT "CustomerRelationship_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerRelationship" ADD CONSTRAINT "CustomerRelationship_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
