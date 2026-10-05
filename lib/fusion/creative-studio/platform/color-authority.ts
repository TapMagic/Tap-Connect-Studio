export const STUDIO_COLOR_AUTHORITY = "studioColorAuthority@1.0.0" as const;

export type StudioColorProvenance = "brand" | "document" | "custom" | "default";

export const STUDIO_SEMANTIC_DOCUMENT_COLORS = ["#FFFFFF", "#F8FAFC", "#111827", "#000000"] as const;

export function normalizeStudioHex(value: unknown, fallback = "#000000"): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const expanded = /^#[0-9a-f]{3}$/i.test(raw)
    ? `#${raw.slice(1).split("").map((part) => `${part}${part}`).join("")}`
    : raw;
  return /^#[0-9a-f]{6}$/i.test(expanded) ? expanded.toUpperCase() : normalizeStudioHex(fallback, "#000000");
}

export function isStudioHex(value: string): boolean {
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value.trim());
}

export function studioColorPalette(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && isStudioHex(value)).map((value) => normalizeStudioHex(value)))];
}
