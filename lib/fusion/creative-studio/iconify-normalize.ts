/** Client-safe Iconify search normalization + collection whitelist. */

export type NormalizedIconifyHit = {
  provider: "iconify";
  collection: string;
  name: string;
  canonicalId: string;
  source: string;
};

export const ICONIFY_APPROVED_PREFIXES = ["lucide", "tabler", "ph", "material-symbols", "ri"] as const;

export function isApprovedIconifyCollection(collection: string): boolean {
  if ((ICONIFY_APPROVED_PREFIXES as readonly string[]).includes(collection)) return true;
  for (const prefix of ICONIFY_APPROVED_PREFIXES) {
    if (collection.startsWith(`${prefix}-`)) return true;
  }
  return false;
}

export function normalizeIconifySearch(value: unknown): NormalizedIconifyHit[] {
  const icons =
    value && typeof value === "object" && Array.isArray((value as { icons?: unknown }).icons)
      ? (value as { icons: unknown[] }).icons
      : [];
  return icons.flatMap((entry) => {
    if (typeof entry !== "string" || !entry.includes(":")) return [];
    const [collection, name] = entry.split(":", 2);
    if (!collection || !name || !isApprovedIconifyCollection(collection)) return [];
    return [
      {
        provider: "iconify" as const,
        collection,
        name,
        canonicalId: `${collection}:${name}`,
        source: `https://icon-sets.iconify.design/${collection}/${name}/`,
      },
    ];
  });
}
