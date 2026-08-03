CREATE TABLE "CardCreativeDocument" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "documentType" TEXT NOT NULL DEFAULT 'CARD_VARIATION',
  "draft" JSONB NOT NULL,
  "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardCreativeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CardCreativeDocument_businessId_updatedAt_idx"
ON "CardCreativeDocument"("businessId", "updatedAt");

ALTER TABLE "CardCreativeDocument"
ADD CONSTRAINT "CardCreativeDocument_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
