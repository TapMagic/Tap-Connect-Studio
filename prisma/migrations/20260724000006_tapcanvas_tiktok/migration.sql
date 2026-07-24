-- TapCanvas + TikTok TapCast persistence (isolated tapconnect_fusion_dev only)

CREATE TYPE "TapCanvasMode" AS ENUM ('sketch', 'build', 'operate', 'analyze');
CREATE TYPE "CanvasProposalStatus" AS ENUM ('pending', 'accepted', 'rejected', 'previewed');
CREATE TYPE "CanvasApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'invalidated');

CREATE TABLE "TapCanvasDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TapCanvasMode" NOT NULL DEFAULT 'sketch',
    "version" INTEGER NOT NULL DEFAULT 1,
    "graph" JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TapCanvasDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasVersionRecord" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasVersionRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "sketch" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "liveStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasConnector" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "label" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'flow',
    "sketch" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasConnector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasFrame" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasFrame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasComment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "nodeId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "mentionIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasObjectBinding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasObjectBinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasProposal" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "status" "CanvasProposalStatus" NOT NULL DEFAULT 'pending',
    "proposedPatch" JSONB NOT NULL DEFAULT '{}',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasApproval" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "CanvasApprovalStatus" NOT NULL DEFAULT 'pending',
    "workItemId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasExecutionOverlay" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasExecutionOverlay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasIssue" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warn',
    "message" TEXT NOT NULL,
    "nodeId" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasExternalWorkItemProjection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasExternalWorkItemProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasAuditLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TikTokCast" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "campaignId" TEXT,
    "cardId" TEXT,
    "tapPointId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalDraftId" TEXT,
    "externalPostId" TEXT,
    "lastError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokCast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TikTokConnection" (
    "businessId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'mock',
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokConnection_pkey" PRIMARY KEY ("businessId")
);

CREATE TABLE "TikTokAuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "castId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TikTokAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TapCanvasDocument_businessId_updatedAt_idx" ON "TapCanvasDocument"("businessId", "updatedAt");
CREATE INDEX "TapCanvasDocument_businessId_archivedAt_idx" ON "TapCanvasDocument"("businessId", "archivedAt");
CREATE UNIQUE INDEX "CanvasVersionRecord_documentId_version_key" ON "CanvasVersionRecord"("documentId", "version");
CREATE INDEX "CanvasVersionRecord_documentId_createdAt_idx" ON "CanvasVersionRecord"("documentId", "createdAt");
CREATE UNIQUE INDEX "CanvasItem_documentId_nodeId_key" ON "CanvasItem"("documentId", "nodeId");
CREATE INDEX "CanvasItem_documentId_kind_idx" ON "CanvasItem"("documentId", "kind");
CREATE UNIQUE INDEX "CanvasConnector_documentId_edgeId_key" ON "CanvasConnector"("documentId", "edgeId");
CREATE INDEX "CanvasConnector_documentId_idx" ON "CanvasConnector"("documentId");
CREATE UNIQUE INDEX "CanvasFrame_documentId_nodeId_key" ON "CanvasFrame"("documentId", "nodeId");
CREATE INDEX "CanvasComment_documentId_createdAt_idx" ON "CanvasComment"("documentId", "createdAt");
CREATE UNIQUE INDEX "CanvasObjectBinding_documentId_nodeId_key" ON "CanvasObjectBinding"("documentId", "nodeId");
CREATE INDEX "CanvasObjectBinding_objectType_objectId_idx" ON "CanvasObjectBinding"("objectType", "objectId");
CREATE INDEX "CanvasObjectBinding_documentId_idx" ON "CanvasObjectBinding"("documentId");
CREATE INDEX "CanvasProposal_documentId_status_idx" ON "CanvasProposal"("documentId", "status");
CREATE INDEX "CanvasApproval_documentId_status_idx" ON "CanvasApproval"("documentId", "status");
CREATE INDEX "CanvasExecutionOverlay_documentId_capturedAt_idx" ON "CanvasExecutionOverlay"("documentId", "capturedAt");
CREATE INDEX "CanvasIssue_documentId_resolved_idx" ON "CanvasIssue"("documentId", "resolved");
CREATE UNIQUE INDEX "CanvasExternalWorkItemProjection_documentId_nodeId_key" ON "CanvasExternalWorkItemProjection"("documentId", "nodeId");
CREATE INDEX "CanvasExternalWorkItemProjection_workItemId_idx" ON "CanvasExternalWorkItemProjection"("workItemId");
CREATE INDEX "CanvasAuditLog_documentId_createdAt_idx" ON "CanvasAuditLog"("documentId", "createdAt");
CREATE INDEX "TikTokCast_businessId_updatedAt_idx" ON "TikTokCast"("businessId", "updatedAt");
CREATE INDEX "TikTokCast_businessId_status_idx" ON "TikTokCast"("businessId", "status");
CREATE INDEX "TikTokAuditLog_businessId_createdAt_idx" ON "TikTokAuditLog"("businessId", "createdAt");

ALTER TABLE "TapCanvasDocument" ADD CONSTRAINT "TapCanvasDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasVersionRecord" ADD CONSTRAINT "CanvasVersionRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasItem" ADD CONSTRAINT "CanvasItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasConnector" ADD CONSTRAINT "CanvasConnector_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasFrame" ADD CONSTRAINT "CanvasFrame_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasComment" ADD CONSTRAINT "CanvasComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasObjectBinding" ADD CONSTRAINT "CanvasObjectBinding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasProposal" ADD CONSTRAINT "CanvasProposal_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasApproval" ADD CONSTRAINT "CanvasApproval_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasExecutionOverlay" ADD CONSTRAINT "CanvasExecutionOverlay_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasIssue" ADD CONSTRAINT "CanvasIssue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasExternalWorkItemProjection" ADD CONSTRAINT "CanvasExternalWorkItemProjection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasAuditLog" ADD CONSTRAINT "CanvasAuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "TapCanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TikTokCast" ADD CONSTRAINT "TikTokCast_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TikTokConnection" ADD CONSTRAINT "TikTokConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TikTokAuditLog" ADD CONSTRAINT "TikTokAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
