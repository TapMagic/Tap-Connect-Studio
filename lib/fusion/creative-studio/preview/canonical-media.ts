import type { MediaAsset } from "@prisma/client";
import { prisma } from "@/lib/db";
import { prepareUploadedImage } from "@/lib/media/service";
import { readMediaObject } from "@/lib/media/storage";
import { MAX_UPLOAD_SOURCE_BYTES } from "@/lib/media/upload-policy";
import { mapPreviewVisualSources, previewMediaAssetId, previewMediaAssetSource } from "./visual-resources";

type PreviewAsset = Pick<MediaAsset, "id" | "businessId" | "url" | "sourceUrl" | "storageKey" | "filename" | "approvalStatus">;
type FindAssets = (businessId: string, sources: string[], ids: string[]) => Promise<PreviewAsset[]>;

const findAssets: FindAssets = (businessId, sources, ids) => prisma.mediaAsset.findMany({
  where: { businessId, approvalStatus: { not: "REJECTED" }, OR: [
    { url: { in: sources } }, { sourceUrl: { in: sources } }, { id: { in: ids } },
  ] },
  orderBy: { id: "asc" },
  select: { id: true, businessId: true, url: true, sourceUrl: true, storageKey: true, filename: true, approvalStatus: true },
});

/** Read-only compatibility projection. Never uploads, duplicates or edits an Asset
 * or document. An inline source needs an exact, same-tenant registered Asset. */
export async function normalizePreviewMedia<T>(value: T, businessId: string, lookup: FindAssets = findAssets): Promise<{ value: T; assetIds: Set<string> }> {
  const sources = new Set<string>(), ids = new Set<string>();
  mapPreviewVisualSources(value, source => {
    if (source.startsWith("data:image/")) sources.add(source);
    const id = previewMediaAssetId(source);
    if (id) ids.add(id);
    return source;
  });
  if (!sources.size && !ids.size) return { value, assetIds: new Set() };
  const candidates = await lookup(businessId, [...sources], [...ids]);
  const assets: PreviewAsset[] = [];
  for (const asset of candidates) {
    if (asset.businessId !== businessId || asset.approvalStatus === "REJECTED") continue;
    if (!asset.storageKey && asset.url.startsWith("data:image/")) {
      try { await readPreviewMediaAsset(asset, businessId); } catch { continue; }
    }
    assets.push(asset);
  }
  const assetIds = new Set<string>();
  const normalized = mapPreviewVisualSources(value, source => {
    const id = previewMediaAssetId(source);
    const asset = assets.find(asset => asset.businessId === businessId && asset.approvalStatus !== "REJECTED"
      && (id ? asset.id === id : asset.url === source || asset.sourceUrl === source));
    if (!asset) return source;
    if (asset.storageKey?.startsWith(businessId + "/") || asset.url.startsWith("data:image/")) {
      assetIds.add(asset.id);
      return previewMediaAssetSource(asset.id);
    }
    // A normalized runtime rendition may already have a durable delivery URL.
    if (/^https:\/\//.test(asset.url)) return asset.url;
    return source;
  });
  return { value: normalized, assetIds };
}

/** Existing Asset bytes, delivered only after the signed session's reference and
 * tenant checks. Decode using the upload authority; don't trust legacy MIME labels. */
export async function readPreviewMediaAsset(asset: PreviewAsset, businessId: string, readObject = readMediaObject) {
  if (asset.businessId !== businessId || asset.approvalStatus === "REJECTED") throw new Error("Asset unavailable");
  if (asset.storageKey) {
    if (!asset.storageKey.startsWith(businessId + "/")) throw new Error("Asset unavailable");
    const bytes = await readObject(asset.storageKey);
    const prepared = await prepareUploadedImage({ bytes, declaredMimeType: "", filename: asset.filename || "preview-image" });
    return { bytes: prepared.originalBytes, mimeType: prepared.originalMimeType };
  }
  const match = asset.url.match(/^data:(image\/(?:png|jpeg|webp|gif|avif|svg\+xml));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match || match[2].length > Math.ceil(MAX_UPLOAD_SOURCE_BYTES / 3) * 4 + 4) throw new Error("Asset unavailable");
  const prepared = await prepareUploadedImage({
    bytes: Buffer.from(match[2], "base64"), declaredMimeType: match[1], filename: asset.filename || "legacy-preview-image",
  });
  return { bytes: prepared.originalBytes, mimeType: prepared.originalMimeType };
}
