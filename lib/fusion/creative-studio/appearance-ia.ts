/**
 * Appearance information architecture — category mental models per target.
 * Category count is intentionally NOT fixed; tests must assert semantics, not counts.
 */

import type { ObjectFamily } from "./capabilities";

export type AppearanceCategoryId =
  | "fill"
  | "color"
  | "material"
  | "effects"
  | "border"
  | "text_box"
  | "artwork"
  | "backing_surface"
  | "media"
  | "texture";

export type AppearanceCategory = {
  id: AppearanceCategoryId;
  label: string;
  description: string;
  /** Primary controls shown on the category home. */
  primary: readonly string[];
};

/** Semantic categories for a selected family. Smallest coherent set. */
export function appearanceCategoriesForFamily(family: ObjectFamily): AppearanceCategory[] {
  switch (family) {
    case "text":
      return [
        { id: "color", label: "Color", description: "Glyph color and gradient", primary: ["solid", "gradient"] },
        { id: "material", label: "Material", description: "Surface treatments for glyphs", primary: ["materials"] },
        { id: "effects", label: "Effects", description: "Glow, neon, shadow, dimensional edge", primary: ["effects"] },
        { id: "text_box", label: "Text Box", description: "Backing fill, border, and box effects", primary: ["fill", "border", "effects"] },
      ];
    case "icon":
      return [
        { id: "artwork", label: "Artwork", description: "Icon color and material on the SVG", primary: ["color", "materials"] },
        { id: "effects", label: "Effects", description: "Artwork glow and edge treatments", primary: ["effects"] },
        { id: "backing_surface", label: "Backing Surface", description: "Optional plate behind the icon", primary: ["fill", "border", "material"] },
      ];
    case "badge":
    case "button":
    case "shape":
    case "container":
    case "coupon":
    case "ticket":
      return [
        { id: "fill", label: "Fill", description: "Solid color or gradient fill", primary: ["solid", "gradient"] },
        { id: "material", label: "Material", description: "Gold, glass, metal, dimensional recipes", primary: ["materials"] },
        { id: "effects", label: "Effects", description: "Glow, neon, shadow, dimensional edge", primary: ["effects"] },
        { id: "border", label: "Border", description: "Stroke style, width, color, radius", primary: ["border"] },
      ];
    case "image":
    case "logo":
      return [
        { id: "fill", label: "Frame", description: "Frame fill and overlay", primary: ["fill"] },
        { id: "effects", label: "Effects", description: "Shadow and glow on the frame", primary: ["effects"] },
        { id: "border", label: "Border", description: "Frame border and corners", primary: ["border"] },
      ];
    case "card_root":
      return [
        { id: "fill", label: "Fill", description: "Card background color or gradient", primary: ["solid", "gradient"] },
        { id: "texture", label: "Material", description: "Background material recipes", primary: ["materials"] },
        { id: "media", label: "Media", description: "Background photo or video", primary: ["media"] },
        { id: "effects", label: "Effects", description: "Overlay and atmospheric effects", primary: ["effects"] },
      ];
    case "group":
      // Groups fan out — no invisible Group Surface.
      return [
        { id: "color", label: "Color", description: "Applies to compatible text in the Group", primary: ["solid"] },
        { id: "material", label: "Material", description: "Applies where adapters exist", primary: ["materials"] },
        { id: "effects", label: "Effects", description: "Applies to compatible descendants", primary: ["effects"] },
      ];
    default:
      return [
        { id: "fill", label: "Fill", description: "Fill and color", primary: ["solid", "gradient"] },
        { id: "effects", label: "Effects", description: "Effects", primary: ["effects"] },
        { id: "border", label: "Border", description: "Border", primary: ["border"] },
      ];
  }
}

export function appearanceCategoryLabels(family: ObjectFamily): string[] {
  return appearanceCategoriesForFamily(family).map((category) => category.label);
}

/** Effects that own on-page tuning (no separate Quick Effects / Advanced Effect drawer). */
export const EFFECT_TUNING_FIELDS: Record<
  string,
  readonly { key: string; label: string; min: number; max: number; step?: number }[]
> = {
  neon_edge: [
    { key: "glowColor", label: "Neon color", min: 0, max: 0 },
    { key: "coreBrightness", label: "Core brightness", min: 0.4, max: 1.5, step: 0.05 },
    { key: "edgeWidth", label: "Edge width", min: 0.5, max: 4, step: 0.1 },
    { key: "glow", label: "Glow radius", min: 0, max: 40 },
    { key: "auraIntensity", label: "Aura strength", min: 0, max: 1, step: 0.05 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  soft_glow: [
    { key: "glowColor", label: "Glow color", min: 0, max: 0 },
    { key: "glow", label: "Glow radius", min: 0, max: 48 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  aura: [
    { key: "glowColor", label: "Aura color", min: 0, max: 0 },
    { key: "glow", label: "Inner radius", min: 0, max: 48 },
    { key: "secondaryGlow", label: "Outer aura", min: 0, max: 72 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  double_neon: [
    { key: "glowColor", label: "Neon color", min: 0, max: 0 },
    { key: "glow", label: "Near glow", min: 0, max: 36 },
    { key: "secondaryGlow", label: "Outer glow", min: 0, max: 64 },
    { key: "coreBrightness", label: "Core brightness", min: 0.4, max: 1.5, step: 0.05 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  electric: [
    { key: "glowColor", label: "Electric color", min: 0, max: 0 },
    { key: "edgeWidth", label: "Edge sharpness", min: 0.5, max: 3, step: 0.1 },
    { key: "glow", label: "Energy radius", min: 0, max: 36 },
    { key: "secondaryGlow", label: "Secondary flash", min: 0, max: 48 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  soft_shadow: [
    { key: "shadow", label: "Distance", min: 0, max: 40 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  deep_shadow: [
    { key: "shadow", label: "Distance", min: 0, max: 56 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  floating: [
    { key: "shadow", label: "Elevation", min: 0, max: 64 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ],
  none: [],
};

export function tuningFieldsForEffect(effectId: string | null | undefined) {
  if (!effectId) return [];
  const key = effectId.replaceAll("-", "_");
  return EFFECT_TUNING_FIELDS[key] || [
    { key: "glow", label: "Glow", min: 0, max: 48 },
    { key: "shadow", label: "Shadow", min: 0, max: 48 },
    { key: "glowColor", label: "Glow color", min: 0, max: 0 },
    { key: "opacity", label: "Opacity", min: 0.2, max: 1, step: 0.05 },
  ];
}
