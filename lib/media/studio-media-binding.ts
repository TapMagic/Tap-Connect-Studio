/** Server-side validation of native media references before save/publication. */
export type BoundMediaAsset = {
  id: string;
  url: string;
  mimeType: string;
  approvalStatus: string;
};
export function collectStudioMediaBindings(
  value: unknown,
): { id: string; url: string; kind: "audio" | "video" }[] {
  const bindings: { id: string; url: string; kind: "audio" | "video" }[] = [];
  function visit(item: unknown) {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    const record = item as Record<string, unknown>;
    if (record.primitive === "audio") {
      const props = record.props as Record<string, unknown> | undefined;
      if (props && (props.src || props.mediaAssetId))
        bindings.push({
          id: String(props.mediaAssetId || ""),
          url: String(props.src || ""),
          kind: "audio",
        });
      const related = props?.relatedVideo as
        Record<string, unknown> | undefined;
      if (related && (related.url || related.mediaAssetId))
        bindings.push({
          id: String(related.mediaAssetId || ""),
          url: String(related.url || ""),
          kind: "video",
        });
    }
    if (record.primitive === "video") {
      const props = record.props as Record<string, unknown> | undefined;
      if (props?.mediaAssetId)
        bindings.push({
          id: String(props.mediaAssetId),
          url: String(props.videoUrl || props.src || ""),
          kind: "video",
        });
    }
    Object.values(record).forEach(visit);
  }
  visit(value);
  return bindings;
}
export function validateStudioMediaBindings(
  bindings: ReturnType<typeof collectStudioMediaBindings>,
  assets: BoundMediaAsset[],
) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const binding of bindings) {
    const asset = byId.get(binding.id);
    if (
      !asset ||
      asset.url !== binding.url ||
      !asset.mimeType.startsWith(`${binding.kind}/`) ||
      asset.approvalStatus === "REJECTED"
    ) {
      throw new Error(
        "Select an available native media Asset from this workspace before saving or publishing.",
      );
    }
  }
}
