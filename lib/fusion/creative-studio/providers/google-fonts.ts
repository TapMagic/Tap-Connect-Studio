import "server-only";
import { FONT_CATALOG } from "@/lib/fusion/creative-studio/fonts/catalog";

export type GoogleFontCatalogItem = {
  family: string;
  category: string;
  variants: string[];
  subsets: string[];
  axes: Array<{ tag: string; start: number; end: number }>;
  files: Record<string, string>;
  lastModified?: string;
  version?: string;
  source: "google-fonts" | "development-fallback";
};

type ProviderFont = Omit<GoogleFontCatalogItem, "source">;
let cache: { expiresAt: number; items: GoogleFontCatalogItem[] } | null = null;

export function normalizeGoogleFontsCatalog(value: unknown): GoogleFontCatalogItem[] {
  const items = value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items) ? (value as { items: unknown[] }).items : [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const font = item as Partial<ProviderFont>;
    if (typeof font.family !== "string" || !font.family.trim()) return [];
    return [{
      family: font.family,
      category: typeof font.category === "string" ? font.category : "sans-serif",
      variants: Array.isArray(font.variants) ? font.variants.filter((entry): entry is string => typeof entry === "string") : ["regular"],
      subsets: Array.isArray(font.subsets) ? font.subsets.filter((entry): entry is string => typeof entry === "string") : [],
      axes: Array.isArray(font.axes) ? font.axes.filter((axis): axis is { tag: string; start: number; end: number } => Boolean(axis && typeof axis.tag === "string" && typeof axis.start === "number" && typeof axis.end === "number")) : [],
      files: font.files && typeof font.files === "object" ? font.files as Record<string, string> : {},
      lastModified: typeof font.lastModified === "string" ? font.lastModified : undefined,
      version: typeof font.version === "string" ? font.version : undefined,
      source: "google-fonts" as const,
    }];
  });
}

function fallbackCatalog(): GoogleFontCatalogItem[] {
  return FONT_CATALOG.map((font) => ({ family: font.family, category: font.category, variants: font.weights.map(String), subsets: ["latin"], axes: [], files: {}, source: "development-fallback" }));
}

export async function getGoogleFontsCatalog(): Promise<{ items: GoogleFontCatalogItem[]; fallback: boolean }> {
  if (cache && cache.expiresAt > Date.now()) return { items: cache.items, fallback: cache.items[0]?.source === "development-fallback" };
  const key = process.env.GOOGLE_FONTS_API_KEY;
  if (!key) return { items: fallbackCatalog(), fallback: true };
  try {
    const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?capability=VF&capability=WOFF2&sort=popularity&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Google Fonts metadata failed: ${response.status}`);
    const items = normalizeGoogleFontsCatalog(await response.json());
    if (!items.length) throw new Error("Google Fonts returned no usable families");
    cache = { items, expiresAt: Date.now() + 86_400_000 };
    return { items, fallback: false };
  } catch {
    const items = fallbackCatalog();
    cache = { items, expiresAt: Date.now() + 300_000 };
    return { items, fallback: true };
  }
}
