export type DocumentMediaReference = {
  mediaAssetId: string;
  documentPath: string;
};

export function collectDocumentMediaReferences(
  value: unknown,
  path = "$"
): DocumentMediaReference[] {
  const references: DocumentMediaReference[] = [];
  const seen = new Set<object>();

  function visit(node: unknown, currentPath: string) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.mediaAssetId === "string" && record.mediaAssetId) {
      references.push({
        mediaAssetId: record.mediaAssetId,
        documentPath: `${currentPath}.mediaAssetId`,
      });
    }
    for (const [key, item] of Object.entries(record)) {
      if (key !== "mediaAssetId") visit(item, `${currentPath}.${key}`);
    }
  }

  visit(value, path);
  return references;
}
