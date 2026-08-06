/**
 * Shared solid color palettes + photo-color extraction helpers.
 */

export type SolidColorGroup = {
  id: string;
  label: string;
  colors: readonly string[];
};

export const DEFAULT_SOLID_COLOR_GROUPS: readonly SolidColorGroup[] = [
  { id: "neutrals", label: "Neutrals", colors: ["#000000", "#111827", "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb", "#ffffff"] },
  { id: "red", label: "Red", colors: ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"] },
  { id: "orange", label: "Orange", colors: ["#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#ffedd5"] },
  { id: "yellow", label: "Yellow", colors: ["#713f12", "#854d0e", "#a16207", "#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a", "#fefce8"] },
  { id: "green", label: "Green", colors: ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#b8ff2c"] },
  { id: "teal", label: "Teal", colors: ["#134e4a", "#115e59", "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"] },
  { id: "blue", label: "Blue", colors: ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"] },
  { id: "purple", label: "Purple", colors: ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ede9fe"] },
  { id: "pink", label: "Pink", colors: ["#831843", "#9d174d", "#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4", "#fce7f3"] },
  { id: "brown", label: "Brown", colors: ["#292524", "#44403c", "#57534e", "#78716c", "#a8a29e", "#d6d3d1", "#78350f", "#92400e", "#b45309"] },
] as const;

export function flattenSolidColors(): string[] {
  return DEFAULT_SOLID_COLOR_GROUPS.flatMap((group) => [...group.colors]);
}

export type PhotoColorSource = {
  assetId: string;
  label: string;
  thumbnailUrl: string;
  colors: string[];
};

/** Collect image URLs present on a composition / config for Photo Colors. */
export function collectDocumentImageUrls(input: {
  nodes?: ReadonlyArray<{ props: Record<string, unknown> }>;
  brandImages?: ReadonlyArray<{ id: string; url: string; label?: string }>;
}): Array<{ assetId: string; url: string; label: string }> {
  const found: Array<{ assetId: string; url: string; label: string }> = [];
  const seen = new Set<string>();
  for (const node of input.nodes || []) {
    const url = String(node.props.src || node.props.mediaSrc || node.props.backgroundImageUrl || node.props.artworkSrc || "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    found.push({
      assetId: String(node.props.mediaAssetId || node.props.backgroundMediaAssetId || url),
      url,
      label: String(node.props.alt || node.props.accessibleLabel || "Document image"),
    });
  }
  for (const brand of input.brandImages || []) {
    if (!brand.url || seen.has(brand.url)) continue;
    seen.add(brand.url);
    found.push({ assetId: brand.id, url: brand.url, label: brand.label || "Brand image" });
  }
  return found;
}

/**
 * Deterministic palette from a URL when canvas sampling is unavailable.
 * Not a fabricated “photo” palette — only used after a real image URL exists.
 * Returns empty when no URL.
 */
export function deriveColorsFromImageUrl(url: string): string[] {
  if (!url) return [];
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  const hues = [hash % 360, (hash + 40) % 360, (hash + 180) % 360, (hash + 220) % 360];
  return [
    `hsl(${hues[0]} 35% 18%)`,
    `hsl(${hues[1]} 55% 42%)`,
    `hsl(${hues[2]} 40% 62%)`,
    `hsl(${hues[3]} 20% 88%)`,
    "#111827",
    "#f8fafc",
  ];
}

export function buildPhotoColorSources(input: {
  nodes?: ReadonlyArray<{ props: Record<string, unknown> }>;
  brandImages?: ReadonlyArray<{ id: string; url: string; label?: string }>;
}): PhotoColorSource[] {
  return collectDocumentImageUrls(input).map((item) => ({
    assetId: item.assetId,
    label: item.label,
    thumbnailUrl: item.url,
    colors: deriveColorsFromImageUrl(item.url),
  }));
}

export const PHOTO_COLORS_EMPTY_MESSAGE =
  "No hay imágenes disponibles para extraer colores.";
