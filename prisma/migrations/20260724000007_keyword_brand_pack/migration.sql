-- Keyword / hashtag Brand Pack on Brand Kit (isolated tapconnect_fusion_dev only)

ALTER TABLE "BrandKit" ADD COLUMN IF NOT EXISTS "keywordBrandPack" JSONB NOT NULL DEFAULT '{}';
