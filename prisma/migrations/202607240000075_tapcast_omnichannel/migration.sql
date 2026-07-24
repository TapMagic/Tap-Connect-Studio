-- Omnichannel TapCast: channel variants, connections, audit

CREATE TABLE "TapCastChannelVariant" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalDraftId" TEXT,
    "externalPostId" TEXT,
    "lastError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "tikTokCastId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapCastChannelVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TapCastChannelConnection" (
    "businessId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "health" TEXT NOT NULL DEFAULT 'healthy',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapCastChannelConnection_pkey" PRIMARY KEY ("businessId","channelId")
);

CREATE TABLE "TapCastAuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "channelId" TEXT,
    "variantId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapCastAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TapCastChannelVariant_businessId_campaignId_idx" ON "TapCastChannelVariant"("businessId", "campaignId");
CREATE INDEX "TapCastChannelVariant_businessId_channelId_updatedAt_idx" ON "TapCastChannelVariant"("businessId", "channelId", "updatedAt");
CREATE INDEX "TapCastChannelVariant_businessId_status_idx" ON "TapCastChannelVariant"("businessId", "status");
CREATE INDEX "TapCastChannelConnection_businessId_updatedAt_idx" ON "TapCastChannelConnection"("businessId", "updatedAt");
CREATE INDEX "TapCastAuditLog_businessId_createdAt_idx" ON "TapCastAuditLog"("businessId", "createdAt");

ALTER TABLE "TapCastChannelVariant" ADD CONSTRAINT "TapCastChannelVariant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TapCastChannelConnection" ADD CONSTRAINT "TapCastChannelConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TapCastAuditLog" ADD CONSTRAINT "TapCastAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
