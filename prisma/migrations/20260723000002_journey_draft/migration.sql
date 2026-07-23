-- TapFlow journey drafts (additive)

CREATE TABLE "JourneyDraft" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JourneyDraft_businessId_updatedAt_idx" ON "JourneyDraft"("businessId", "updatedAt");

ALTER TABLE "JourneyDraft" ADD CONSTRAINT "JourneyDraft_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
