-- TapSave moments + Autopilot proposals (additive)

CREATE TYPE "AutopilotProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PARTIAL', 'SUPERSEDED', 'UNDONE');

CREATE TABLE "TapSaveMoment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "visitorRef" TEXT,
    "kind" TEXT NOT NULL,
    "campaignId" TEXT,
    "deviceSlotId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapSaveMoment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TapSaveMoment_relationshipId_occurredAt_idx" ON "TapSaveMoment"("relationshipId", "occurredAt");
CREATE INDEX "TapSaveMoment_businessId_occurredAt_idx" ON "TapSaveMoment"("businessId", "occurredAt");
CREATE INDEX "TapSaveMoment_businessId_kind_idx" ON "TapSaveMoment"("businessId", "kind");

ALTER TABLE "TapSaveMoment" ADD CONSTRAINT "TapSaveMoment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TapSaveMoment" ADD CONSTRAINT "TapSaveMoment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "CustomerRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutopilotProposal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" "AutopilotProposalStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "artifacts" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "acceptedArtifactKinds" JSONB NOT NULL DEFAULT '[]',
    "previousStatus" "AutopilotProposalStatus",
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AutopilotProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutopilotProposal_businessId_createdAt_idx" ON "AutopilotProposal"("businessId", "createdAt");
CREATE INDEX "AutopilotProposal_businessId_status_idx" ON "AutopilotProposal"("businessId", "status");

ALTER TABLE "AutopilotProposal" ADD CONSTRAINT "AutopilotProposal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
