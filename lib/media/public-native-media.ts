import { collectDocumentMediaReferences } from "./document-usage";
function visibleDocument(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(visibleDocument);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const props = record.props as Record<string, unknown> | undefined;
  if (record.visible === false || props?.accessState === "locked") return null;
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, visibleDocument(item)]),
  );
}
/** Locked/hidden pages do not grant anonymous media access just by appearing in a manifest. */
export function publiclyReferencedMediaIds(value: unknown): Set<string> {
  const manifest = value as { document?: unknown; tapCard?: unknown } | null;
  const document = (manifest?.document ?? manifest?.tapCard ?? value) as {
    experience?: {
      pages?: {
        pageVisible?: boolean;
        access?: { state?: string };
        composition?: unknown;
      }[];
    };
  } | null;
  const pages = document?.experience?.pages;
  if (pages)
    return new Set(
      pages
        .filter(
          (page) =>
            page.pageVisible !== false && page.access?.state !== "locked",
        )
        .flatMap((page) =>
          collectDocumentMediaReferences(visibleDocument(page.composition)).map(
            (ref) => ref.mediaAssetId,
          ),
        ),
    );
  return new Set(
    collectDocumentMediaReferences(visibleDocument(document)).map(
      (ref) => ref.mediaAssetId,
    ),
  );
}
