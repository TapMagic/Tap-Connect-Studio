ALTER TABLE "MediaAsset"
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "providerId" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "attributionName" TEXT,
  ADD COLUMN "attributionUrl" TEXT,
  ADD COLUMN "rights" TEXT,
  ADD COLUMN "importedAt" TIMESTAMP(3);

