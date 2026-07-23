-- Wallet lifecycle + TapInbox/TapCase + suppression (additive)

CREATE TYPE "FusionWalletPlatform" AS ENUM ('APPLE', 'GOOGLE');
CREATE TYPE "FusionWalletPassStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'ISSUED', 'UPDATED', 'REVOKED', 'REPLACED', 'EXPIRED');
CREATE TYPE "FusionThreadChannel" AS ENUM ('EMAIL', 'MESSENGER', 'INSTAGRAM_DM', 'WHATSAPP', 'TELEGRAM', 'SMS', 'MANYCHAT');
CREATE TYPE "FusionThreadStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');
CREATE TYPE "FusionMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'SYSTEM');
CREATE TYPE "FusionCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');

CREATE TABLE IF NOT EXISTS "WalletPass" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "platform" "FusionWalletPlatform" NOT NULL,
    "status" "FusionWalletPassStatus" NOT NULL DEFAULT 'DRAFT',
    "serialNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cardId" TEXT,
    "externalId" TEXT,
    "installUrl" TEXT,
    "previewUrl" TEXT,
    "replacedById" TEXT,
    "projection" JSONB NOT NULL DEFAULT '{}',
    "mock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WalletPassEvent" (
    "id" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletPassEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageThread" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "leadId" TEXT,
    "channel" "FusionThreadChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "FusionThreadStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "participant" TEXT,
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboxMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "direction" "FusionMessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "subject" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "guardianCode" TEXT,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TapCase" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "threadId" TEXT,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "status" "FusionCaseStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "assigneeId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunicationSuppression" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT,
    "sourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WalletPass_businessId_serialNumber_key" ON "WalletPass"("businessId", "serialNumber");
CREATE INDEX IF NOT EXISTS "WalletPass_businessId_status_idx" ON "WalletPass"("businessId", "status");
CREATE INDEX IF NOT EXISTS "WalletPass_contactId_idx" ON "WalletPass"("contactId");
CREATE INDEX IF NOT EXISTS "WalletPass_relationshipId_idx" ON "WalletPass"("relationshipId");

CREATE INDEX IF NOT EXISTS "WalletPassEvent_passId_occurredAt_idx" ON "WalletPassEvent"("passId", "occurredAt");
CREATE INDEX IF NOT EXISTS "WalletPassEvent_businessId_occurredAt_idx" ON "WalletPassEvent"("businessId", "occurredAt");

CREATE INDEX IF NOT EXISTS "MessageThread_businessId_status_lastMessageAt_idx" ON "MessageThread"("businessId", "status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "MessageThread_contactId_idx" ON "MessageThread"("contactId");
CREATE INDEX IF NOT EXISTS "MessageThread_leadId_idx" ON "MessageThread"("leadId");

CREATE INDEX IF NOT EXISTS "InboxMessage_threadId_createdAt_idx" ON "InboxMessage"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "InboxMessage_businessId_createdAt_idx" ON "InboxMessage"("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "TapCase_businessId_status_idx" ON "TapCase"("businessId", "status");
CREATE INDEX IF NOT EXISTS "TapCase_threadId_idx" ON "TapCase"("threadId");
CREATE INDEX IF NOT EXISTS "TapCase_assigneeId_idx" ON "TapCase"("assigneeId");

CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationSuppression_businessId_channel_address_key" ON "CommunicationSuppression"("businessId", "channel", "address");
CREATE INDEX IF NOT EXISTS "CommunicationSuppression_businessId_channel_idx" ON "CommunicationSuppression"("businessId", "channel");

DO $$ BEGIN
  ALTER TABLE "WalletPass" ADD CONSTRAINT "WalletPass_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "WalletPassEvent" ADD CONSTRAINT "WalletPassEvent_passId_fkey" FOREIGN KEY ("passId") REFERENCES "WalletPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TapCase" ADD CONSTRAINT "TapCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TapCase" ADD CONSTRAINT "TapCase_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CommunicationSuppression" ADD CONSTRAINT "CommunicationSuppression_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
