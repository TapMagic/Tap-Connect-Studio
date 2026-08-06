import "server-only";

export type CanonicalIconProviderResult = {
  provider: "iconify";
  collection: string;
  name: string;
  canonicalId: string;
  license?: { title?: string; spdx?: string; url?: string };
  author?: { name?: string; url?: string };
  source: string;
  /** Inline SVG markup for visual library tiles. */
  svg?: string;
};

const APPROVED_PREFIXES = new Set(["lucide", "tabler", "ph", "material-symbols", "ri"]);

export function normalizeIconifySearch(value: unknown): CanonicalIconProviderResult[] {
  const icons = value && typeof value === "object" && Array.isArray((value as { icons?: unknown }).icons) ? (value as { icons: unknown[] }).icons : [];
  return icons.flatMap((entry) => {
    if (typeof entry !== "string" || !entry.includes(":")) return [];
    const [collection, name] = entry.split(":", 2);
    if (!collection || !name) return [];
    return [{ provider: "iconify" as const, collection, name, canonicalId: `${collection}:${name}`, source: `https://icon-sets.iconify.design/${collection}/${name}/` }];
  });
}

async function fetchIconSvg(collection: string, name: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://api.iconify.design/${encodeURIComponent(collection)}/${encodeURIComponent(name)}.svg?height=28`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } }
    );
    if (!response.ok) return undefined;
    const svg = await response.text();
    return svg.includes("<svg") ? svg : undefined;
  } catch {
    return undefined;
  }
}

export async function searchIconify(query: string): Promise<CanonicalIconProviderResult[]> {
  const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=96&prefixes=${encodeURIComponent([...APPROVED_PREFIXES].join(","))}`, { signal: AbortSignal.timeout(7000), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Iconify search failed: ${response.status}`);
  const icons = normalizeIconifySearch(await response.json()).slice(0, 48);
  const withSvg = await Promise.all(
    icons.map(async (icon) => ({
      ...icon,
      svg: await fetchIconSvg(icon.collection, icon.name),
    }))
  );
  return withSvg;
}
