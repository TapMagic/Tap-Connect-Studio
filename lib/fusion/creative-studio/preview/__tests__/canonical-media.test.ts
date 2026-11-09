import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizePreviewMedia, readPreviewMediaAsset } from "../canonical-media";
import { inspectPreviewVisualResourcePortability, previewMediaAssetSource, previewPortabilityRecovery, resolvePreviewVisualResources } from "../visual-resources";

const businessId = "preview-owner";
const asset = (url: string) => ({
  id: "existing-legacy-photo", businessId, url, sourceUrl: url,
  storageKey: null, filename: "legacy-photo.png", approvalStatus: "APPROVED" as const,
});

test("registered legacy contact JPEG is projected through its existing Asset ID, without data writes or duplication", async () => {
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#abcdef" } }).jpeg().toBuffer();
  const photo = "data:image/jpeg;base64," + bytes.toString("base64");
  const source = { snapshot: { experience: { pages: [
    { pageId: "home", title: "Home", composition: { nodes: [{ id: "nested-image", props: { src: photo, imageFit: "contain", imageOpacity: 0.6, mediaAssetId: "existing-legacy-photo" } }] } },
    { pageId: "music", title: "Music", surface: { backgroundImageUrl: photo } },
    { pageId: "tracks", title: "Tracks & Stories", container: { props: { backgroundImageUrl: photo } } },
    { pageId: "track", title: "Track #1", curated: { identityContentUrl: photo } },
  ] } }, profile: { photoUrl: photo } };
  const original = JSON.stringify(source);
  let lookups = 0;
  const normalized = await normalizePreviewMedia(source, businessId, async (tenant, sources) => {
    lookups++; assert.equal(tenant, businessId); assert.deepEqual(sources, [photo]); return [asset(photo)];
  });
  assert.equal(lookups, 1);
  assert.equal(JSON.stringify(source), original);
  assert.equal(normalized.value.profile.photoUrl, previewMediaAssetSource("existing-legacy-photo"));
  assert.equal(inspectPreviewVisualResourcePortability(normalized.value, normalized.assetIds).length, 0);
  const projected = resolvePreviewVisualResources(normalized.value, "signed-token");
  assert.match(projected.profile.photoUrl, /^\/api\/preview\/card\/asset\/signed-token\?assetId=existing-legacy-photo$/);
  const props = projected.snapshot.experience.pages[0].composition!.nodes[0].props;
  assert.equal(props.imageFit, "contain"); assert.equal(props.imageOpacity, 0.6);
  const delivered = await readPreviewMediaAsset(asset(photo), businessId);
  assert.equal(delivered.mimeType, "image/jpeg"); // Legacy filename/MIME metadata cannot relabel JPEG bytes.
  assert.deepEqual(delivered.bytes, bytes);
});

test("transparent canonical PNG retains its exact alpha-bearing bytes", async () => {
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.2 } } }).png().toBuffer();
  const url = "data:image/png;base64," + bytes.toString("base64");
  const delivered = await readPreviewMediaAsset(asset(url), businessId);
  assert.equal(delivered.mimeType, "image/png");
  assert.deepEqual(delivered.bytes, bytes);
  assert.equal((await sharp(delivered.bytes).metadata()).hasAlpha, true);
});

test("foreign, rejected, unregistered and malformed inline assets still fail closed", async () => {
  const bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: "#123456" } }).jpeg().toBuffer();
  const url = "data:image/jpeg;base64," + bytes.toString("base64");
  for (const rows of [[], [{ ...asset(url), businessId: "other-tenant" }], [{ ...asset(url), approvalStatus: "REJECTED" as const }]]) {
    const normalized = await normalizePreviewMedia({ photoUrl: url }, businessId, async () => rows);
    assert.equal(normalized.assetIds.size, 0);
    assert.equal(inspectPreviewVisualResourcePortability(normalized.value, normalized.assetIds).length, 1);
  }
  const malformed = "data:image/png;base64,AAAA";
  const bad = await normalizePreviewMedia({ src: malformed }, businessId, async () => [asset(malformed)]);
  assert.equal(bad.assetIds.size, 0);
  assert.equal(inspectPreviewVisualResourcePortability(bad.value, bad.assetIds).length, 1);
  const forged = await normalizePreviewMedia({ src: previewMediaAssetSource("foreign") }, businessId, async () => []);
  assert.equal(inspectPreviewVisualResourcePortability(forged.value, forged.assetIds).length, 1);
  await assert.rejects(readPreviewMediaAsset({ ...asset(url), businessId: "other-tenant" }, businessId));
});

test("modern uploaded/imported R2 resources already remain portable without database normalization", async () => {
  const value = { image: { src: "https://media.test/owner/uploads/runtime/transparent.webp", mediaAssetId: "canonical-upload" }, curated: { artworkSrc: "/visual-parts/signature/certified.png" } };
  const result = await normalizePreviewMedia(value, businessId, async () => { throw new Error("unnecessary lookup"); });
  assert.equal(result.value, value);
  assert.equal(inspectPreviewVisualResourcePortability(result.value).length, 0);
});

test("storage-backed registered assets use the existing durable reader and enforce the tenant key prefix", async () => {
  const bytes = await sharp({ create: { width: 1, height: 1, channels: 4, background: "#aabbcc" } }).png().toBuffer();
  let reads = 0;
  const read = async (key: string) => { reads++; assert.equal(key, businessId + "/original.png"); return bytes; };
  assert.deepEqual((await readPreviewMediaAsset({ ...asset(""), storageKey: businessId + "/original.png" }, businessId, read)).bytes, bytes);
  await assert.rejects(readPreviewMediaAsset({ ...asset(""), storageKey: "other/private.png" }, businessId, read));
  assert.equal(reads, 1);
});

test("portability recovery identifies the affected page/component without exposing embedded bytes or signed queries", () => {
  const value = { snapshot: { experience: { pages: [{ pageId: "p", title: "Music", composition: { nodes: [{ id: "hero-42", primitive: "image", props: { src: "blob:http://localhost/private?token=secret" } }] } }] } } };
  const recovery = previewPortabilityRecovery(value);
  assert.match(recovery, /Music/); assert.match(recovery, /image/); assert.match(recovery, /nodes\[0\].props.src/);
  assert.doesNotMatch(recovery, /token=secret/);
  const profile = previewPortabilityRecovery({ profile: { photoUrl: "data:image/jpeg;base64,PRIVATE_IMAGE_BYTES" } });
  assert.match(profile, /Workspace.*contact photo/);
  assert.doesNotMatch(profile, /PRIVATE_IMAGE_BYTES/);
});
