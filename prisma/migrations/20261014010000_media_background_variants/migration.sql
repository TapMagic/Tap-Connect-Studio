-- Durable, non-destructive background-treatment provenance.
-- The source MediaAsset remains unchanged; derived assets point to it through
-- parentAssetId and retain the normalized recipe used to create their bytes.
ALTER TABLE "MediaAsset" ADD COLUMN "derivationRecipe" JSONB;
