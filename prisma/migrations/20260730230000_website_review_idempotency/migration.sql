ALTER TABLE "KnowledgeSource"
ADD COLUMN "requestFingerprint" TEXT;

CREATE UNIQUE INDEX "KnowledgeSource_businessId_kind_requestFingerprint_key"
ON "KnowledgeSource"("businessId", "kind", "requestFingerprint");
