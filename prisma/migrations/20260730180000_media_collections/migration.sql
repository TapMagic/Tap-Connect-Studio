-- Asset Studio Collections — organization without MediaAsset duplication

CREATE TABLE "MediaCollection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "accent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCollectionMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaCollectionMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaCollection_businessId_name_key" ON "MediaCollection"("businessId", "name");
CREATE INDEX "MediaCollection_businessId_sortOrder_idx" ON "MediaCollection"("businessId", "sortOrder");
CREATE INDEX "MediaCollection_businessId_pinned_updatedAt_idx" ON "MediaCollection"("businessId", "pinned", "updatedAt");

CREATE UNIQUE INDEX "MediaCollectionMember_collectionId_mediaAssetId_key" ON "MediaCollectionMember"("collectionId", "mediaAssetId");
CREATE INDEX "MediaCollectionMember_businessId_mediaAssetId_idx" ON "MediaCollectionMember"("businessId", "mediaAssetId");
CREATE INDEX "MediaCollectionMember_collectionId_sortOrder_idx" ON "MediaCollectionMember"("collectionId", "sortOrder");

ALTER TABLE "MediaCollection" ADD CONSTRAINT "MediaCollection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCollection" ADD CONSTRAINT "MediaCollection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaCollectionMember" ADD CONSTRAINT "MediaCollectionMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCollectionMember" ADD CONSTRAINT "MediaCollectionMember_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "MediaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCollectionMember" ADD CONSTRAINT "MediaCollectionMember_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
