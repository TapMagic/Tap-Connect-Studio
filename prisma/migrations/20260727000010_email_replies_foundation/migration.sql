-- Email & Replies / Reply Routing foundation (additive, provider-neutral)
-- Local migrate only — never apply to production from this wave.

CREATE TYPE "ReplyHandlingMode" AS ENUM ('TAP_ROUTE_EXTERNAL', 'TAP_INBOX', 'DIRECT_EXTERNAL', 'CONNECTED_DESTINATION');
CREATE TYPE "ReplyDestinationType" AS ENUM ('EMAIL_ADDRESS', 'TAP_INBOX', 'INTEGRATION', 'WEBHOOK', 'DIRECT_REPLY_TO');
CREATE TYPE "ReplyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'REVOKED');
CREATE TYPE "ReplyDestinationRole" AS ENUM ('PRIMARY', 'FALLBACK');
CREATE TYPE "ReplyRoutingState" AS ENUM ('RECEIVED', 'CONTEXT_MATCHED', 'CLASSIFIED', 'ROUTE_PENDING', 'ROUTED', 'ROUTE_FAILED', 'RETAINED_IN_TAP', 'PAUSED', 'SKIPPED_DIRECT');

CREATE TABLE "ReplyDestination" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "destinationType" "ReplyDestinationType" NOT NULL,
    "destinationReference" TEXT,
    "normalizedAddress" TEXT,
    "verificationStatus" "ReplyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "role" "ReplyDestinationRole" NOT NULL DEFAULT 'PRIMARY',
    "selectedCategories" JSONB NOT NULL DEFAULT '["all"]',
    "keepCopyInTap" BOOLEAN NOT NULL DEFAULT false,
    "failureNotificationAddress" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "credentialRef" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "lastSuccessfulRouteAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "consecutiveFailureCount" INTEGER NOT NULL DEFAULT 0,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "pausedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyDestination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyVerificationToken" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyPolicy" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "mode" "ReplyHandlingMode" NOT NULL DEFAULT 'TAP_ROUTE_EXTERNAL',
    "primaryDestinationId" TEXT,
    "fallbackDestinationId" TEXT,
    "keepCopyInTap" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "failureNotificationAddress" TEXT,
    "useTapInboxFallback" BOOLEAN NOT NULL DEFAULT true,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "skipTestAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyAlias" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "campaignId" TEXT,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "originatingMessageRef" TEXT,
    "emailDocumentVersion" INTEGER,
    "replyPolicyMode" "ReplyHandlingMode",
    "destinationId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyProviderEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "eventId" TEXT NOT NULL,
    "receivedEmailId" TEXT,
    "eventType" TEXT NOT NULL,
    "processingState" TEXT NOT NULL DEFAULT 'received',
    "payloadDigest" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyInitialMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT,
    "contactId" TEXT,
    "relationshipId" TEXT,
    "campaignId" TEXT,
    "threadId" TEXT,
    "inboxMessageId" TEXT,
    "aliasId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT,
    "internetMessageId" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "replyAlias" TEXT,
    "subject" TEXT,
    "normalizedText" TEXT NOT NULL,
    "sanitizedHtmlRef" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "attachmentMetadata" JSONB NOT NULL DEFAULT '[]',
    "classification" TEXT,
    "urgency" TEXT,
    "routingDestinationId" TEXT,
    "routingState" "ReplyRoutingState" NOT NULL DEFAULT 'RECEIVED',
    "externalReference" TEXT,
    "evidenceClass" TEXT NOT NULL DEFAULT 'confirmed',
    "retentionState" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyInitialMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReplyRoutingAttempt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "initialMessageId" TEXT,
    "destinationId" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerRef" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "handoffKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyRoutingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReplyVerificationToken_tokenHash_key" ON "ReplyVerificationToken"("tokenHash");
CREATE UNIQUE INDEX "ReplyPolicy_businessId_locationId_key" ON "ReplyPolicy"("businessId", "locationId");
CREATE UNIQUE INDEX "ReplyAlias_token_key" ON "ReplyAlias"("token");
CREATE UNIQUE INDEX "ReplyAlias_tokenHash_key" ON "ReplyAlias"("tokenHash");
CREATE UNIQUE INDEX "ReplyProviderEvent_provider_eventId_key" ON "ReplyProviderEvent"("provider", "eventId");
CREATE UNIQUE INDEX "ReplyInitialMessage_provider_providerMessageId_key" ON "ReplyInitialMessage"("provider", "providerMessageId");
CREATE UNIQUE INDEX "ReplyRoutingAttempt_idempotencyKey_key" ON "ReplyRoutingAttempt"("idempotencyKey");

CREATE INDEX "ReplyDestination_businessId_enabled_idx" ON "ReplyDestination"("businessId", "enabled");
CREATE INDEX "ReplyDestination_businessId_normalizedAddress_idx" ON "ReplyDestination"("businessId", "normalizedAddress");
CREATE INDEX "ReplyDestination_businessId_verificationStatus_idx" ON "ReplyDestination"("businessId", "verificationStatus");
CREATE INDEX "ReplyVerificationToken_destinationId_createdAt_idx" ON "ReplyVerificationToken"("destinationId", "createdAt");
CREATE INDEX "ReplyVerificationToken_businessId_createdAt_idx" ON "ReplyVerificationToken"("businessId", "createdAt");
CREATE INDEX "ReplyPolicy_businessId_idx" ON "ReplyPolicy"("businessId");
CREATE INDEX "ReplyAlias_businessId_expiresAt_idx" ON "ReplyAlias"("businessId", "expiresAt");
CREATE INDEX "ReplyAlias_campaignId_idx" ON "ReplyAlias"("campaignId");
CREATE INDEX "ReplyAlias_contactId_idx" ON "ReplyAlias"("contactId");
CREATE INDEX "ReplyProviderEvent_provider_receivedEmailId_idx" ON "ReplyProviderEvent"("provider", "receivedEmailId");
CREATE INDEX "ReplyProviderEvent_businessId_createdAt_idx" ON "ReplyProviderEvent"("businessId", "createdAt");
CREATE INDEX "ReplyInitialMessage_businessId_receivedAt_idx" ON "ReplyInitialMessage"("businessId", "receivedAt");
CREATE INDEX "ReplyInitialMessage_campaignId_idx" ON "ReplyInitialMessage"("campaignId");
CREATE INDEX "ReplyInitialMessage_threadId_idx" ON "ReplyInitialMessage"("threadId");
CREATE INDEX "ReplyInitialMessage_routingState_idx" ON "ReplyInitialMessage"("routingState");
CREATE INDEX "ReplyRoutingAttempt_businessId_createdAt_idx" ON "ReplyRoutingAttempt"("businessId", "createdAt");
CREATE INDEX "ReplyRoutingAttempt_destinationId_createdAt_idx" ON "ReplyRoutingAttempt"("destinationId", "createdAt");
CREATE INDEX "ReplyRoutingAttempt_initialMessageId_idx" ON "ReplyRoutingAttempt"("initialMessageId");

ALTER TABLE "ReplyDestination" ADD CONSTRAINT "ReplyDestination_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyVerificationToken" ADD CONSTRAINT "ReplyVerificationToken_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ReplyDestination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyPolicy" ADD CONSTRAINT "ReplyPolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyPolicy" ADD CONSTRAINT "ReplyPolicy_primaryDestinationId_fkey" FOREIGN KEY ("primaryDestinationId") REFERENCES "ReplyDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplyPolicy" ADD CONSTRAINT "ReplyPolicy_fallbackDestinationId_fkey" FOREIGN KEY ("fallbackDestinationId") REFERENCES "ReplyDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplyAlias" ADD CONSTRAINT "ReplyAlias_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyProviderEvent" ADD CONSTRAINT "ReplyProviderEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplyInitialMessage" ADD CONSTRAINT "ReplyInitialMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyRoutingAttempt" ADD CONSTRAINT "ReplyRoutingAttempt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplyRoutingAttempt" ADD CONSTRAINT "ReplyRoutingAttempt_initialMessageId_fkey" FOREIGN KEY ("initialMessageId") REFERENCES "ReplyInitialMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplyRoutingAttempt" ADD CONSTRAINT "ReplyRoutingAttempt_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ReplyDestination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
