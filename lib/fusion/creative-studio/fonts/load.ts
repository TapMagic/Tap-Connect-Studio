/**
 * Lazy Google Fonts CSS loader — never eager-load the full catalog.
 */

import {
  FONT_CATALOG,
  getFontById,
  type FontFamilyDefinition,
} from "./catalog";

const loaded = new Set<string>();
const loading = new Map<string, Promise<void>>();

const RECENT_KEY = "tc-creative-studio-recent-fonts";
const FAVORITES_KEY = "tc-creative-studio-favorite-fonts";

function googleCssUrl(font: FontFamilyDefinition, weights?: number[]): string {
  const w = (weights?.length ? weights : font.weights).filter((n) =>
    font.weights.includes(n)
  );
  const unique = Array.from(new Set(w.length ? w : [400]));
  const italicAxis = font.italics ? "ital,wght@" : "wght@";
  const weightSpec = font.italics
    ? unique.map((n) => `0,${n};1,${n}`).join(";")
    : unique.join(";");
  const family = encodeURIComponent(font.googleFamily).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:${italicAxis}${weightSpec}&display=swap`;
}

export function ensureFontLoaded(
  fontId: string,
  weights?: number[]
): Promise<void> {
  const font = getFontById(fontId);
  if (!font) return Promise.resolve();
  const key = `${font.id}:${(weights || font.weights).join(",")}`;
  if (loaded.has(key) || loaded.has(font.id)) return Promise.resolve();
  const existing = loading.get(key);
  if (existing) return existing;

  if (typeof document === "undefined") {
    loaded.add(font.id);
    return Promise.resolve();
  }

  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleCssUrl(font, weights);
    link.dataset.fontId = font.id;
    link.onload = () => {
      loaded.add(key);
      loaded.add(font.id);
      loading.delete(key);
      resolve();
    };
    link.onerror = () => {
      loading.delete(key);
      reject(new Error(`Font failed to load: ${font.family}`));
    };
    document.head.appendChild(link);
  });
  loading.set(key, promise);
  return promise;
}

export function preloadBrandFonts(brandFontIds: string[]): void {
  for (const id of brandFontIds.slice(0, 6)) {
    void ensureFontLoaded(id).catch(() => undefined);
  }
}

export function isFontLoaded(fontId: string): boolean {
  return loaded.has(fontId) || [...loaded].some((k) => k.startsWith(`${fontId}:`));
}

export function readRecentFonts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function pushRecentFont(fontId: string): string[] {
  const next = [fontId, ...readRecentFonts().filter((id) => id !== fontId)].slice(
    0,
    12
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }
  return next;
}

export function readFavoriteFonts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteFont(fontId: string): string[] {
  const cur = readFavoriteFonts();
  const next = cur.includes(fontId)
    ? cur.filter((id) => id !== fontId)
    : [...cur, fontId];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }
  return next;
}

/** Server-safe: catalog ids only (no DOM). */
export function catalogFontIds(): string[] {
  return FONT_CATALOG.map((f) => f.id);
}
