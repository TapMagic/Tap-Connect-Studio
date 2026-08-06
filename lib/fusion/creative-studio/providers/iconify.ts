import "server-only";
import { createIconAsset, type IconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import {
  ICONIFY_APPROVED_PREFIXES,
  normalizeIconifySearch,
} from "@/lib/fusion/creative-studio/iconify-normalize";

export type CanonicalIconProviderResult = {
  provider: "iconify";
  collection: string;
  name: string;
  canonicalId: string;
  license?: { title?: string; spdx?: string; url?: string };
  author?: { name?: string; url?: string };
  source: string;
  /** Sanitized inline SVG markup for visual library tiles. */
  svg?: string;
  viewBox?: string;
  renderMode?: IconAsset["renderMode"];
  width?: number;
  height?: number;
};

export { normalizeIconifySearch };

async function fetchIconSvg(collection: string, name: string): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://api.iconify.design/${encodeURIComponent(collection)}/${encodeURIComponent(name)}.svg?height=28`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } }
    );
    if (!response.ok) return undefined;
    const svg = await response.text();
    const asset = createIconAsset({
      provider: "iconify",
      collection,
      iconName: name,
      svg,
    });
    return asset?.body;
  } catch {
    return undefined;
  }
}

export async function searchIconify(query: string): Promise<CanonicalIconProviderResult[]> {
  const response = await fetch(
    `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=96&prefixes=${encodeURIComponent(ICONIFY_APPROVED_PREFIXES.join(","))}`,
    { signal: AbortSignal.timeout(7000), next: { revalidate: 3600 } }
  );
  if (!response.ok) throw new Error(`Iconify search failed: ${response.status}`);
  const icons = normalizeIconifySearch(await response.json()).slice(0, 48);
  const withSvg = await Promise.all(
    icons.map(async (icon) => {
      const svg = await fetchIconSvg(icon.collection, icon.name);
      if (!svg) return { ...icon };
      const asset = createIconAsset({
        provider: "iconify",
        collection: icon.collection,
        iconName: icon.name,
        svg,
        source: icon.source,
      });
      if (!asset) return { ...icon };
      return {
        ...icon,
        svg: asset.body,
        viewBox: asset.viewBox,
        renderMode: asset.renderMode,
        width: asset.width,
        height: asset.height,
      };
    })
  );
  return withSvg.sort((a, b) => Number(Boolean(b.svg)) - Number(Boolean(a.svg)));
}
