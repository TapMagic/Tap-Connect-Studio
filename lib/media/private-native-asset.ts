/** Persisted server provenance, never accepted from authored component props. */
export const PRIVATE_NATIVE_OBJECT_CONTRACT = "studioPrivateNativeObject@1";
type PrivateAsset = {
  businessId: string;
  storageKey: string | null;
  contentHash: string | null;
  mimeType: string;
  derivationRecipe: unknown;
};

export function isPrivateNativeAsset(asset: PrivateAsset): boolean {
  if (!asset.storageKey || !/^(audio|video)\//.test(asset.mimeType)) return false;
  if (asset.storageKey.startsWith(`${asset.businessId}/private/native-media/`)) return true;
  const proof = asset.derivationRecipe as Record<string, unknown> | null;
  return Boolean(process.env.R2_PRIVATE_MEDIA_BUCKET_NAME?.trim() && proof && proof.contractId === PRIVATE_NATIVE_OBJECT_CONTRACT
    && proof.businessId === asset.businessId && proof.storageKey === asset.storageKey
    && proof.contentHash === asset.contentHash && /^[a-f0-9]{64}$/.test(asset.contentHash || "")
    && proof.bucket === process.env.R2_PRIVATE_MEDIA_BUCKET_NAME?.trim());
}
