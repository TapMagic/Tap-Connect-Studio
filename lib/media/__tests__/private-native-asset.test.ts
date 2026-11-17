import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateNativeAsset, PRIVATE_NATIVE_OBJECT_CONTRACT } from "../private-native-asset";

test("root-level private media requires exact persisted tenant, key, bucket and content provenance", () => {
  const prior = process.env.R2_PRIVATE_MEDIA_BUCKET_NAME;
  process.env.R2_PRIVATE_MEDIA_BUCKET_NAME = "private-test";
  try {
    const asset = { businessId: "tenant", storageKey: "song.m4a", mimeType: "audio/mp4", contentHash: "a".repeat(64),
      derivationRecipe: { contractId: PRIVATE_NATIVE_OBJECT_CONTRACT, businessId: "tenant", storageKey: "song.m4a", bucket: "private-test", contentHash: "a".repeat(64) } };
    assert.equal(isPrivateNativeAsset(asset), true);
    for (const change of [{ businessId: "foreign" }, { storageKey: "other.m4a" }, { contentHash: "b".repeat(64) }, { mimeType: "image/png" }, { derivationRecipe: null }])
      assert.equal(isPrivateNativeAsset({ ...asset, ...change }), false);
    assert.equal(isPrivateNativeAsset({ ...asset, derivationRecipe: { ...asset.derivationRecipe, bucket: "public-test" } }), false);
    delete process.env.R2_PRIVATE_MEDIA_BUCKET_NAME;
    assert.equal(isPrivateNativeAsset(asset), false);
  } finally { if (prior === undefined) delete process.env.R2_PRIVATE_MEDIA_BUCKET_NAME; else process.env.R2_PRIVATE_MEDIA_BUCKET_NAME = prior; }
});

test("normal private uploads retain tenant-prefixed compatibility without accepting foreign namespaces", () => {
  const asset = { businessId: "tenant", storageKey: "tenant/private/native-media/asset/song.m4a", mimeType: "audio/mp4", contentHash: null, derivationRecipe: null };
  assert.equal(isPrivateNativeAsset(asset), true);
  assert.equal(isPrivateNativeAsset({ ...asset, businessId: "foreign" }), false);
  assert.equal(isPrivateNativeAsset({ ...asset, storageKey: "song.m4a" }), false);
});
