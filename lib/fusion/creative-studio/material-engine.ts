/**
 * Shared Material Engine — reusable surface recipes, independent of Shape/Color.
 */

export type MaterialCategory =
  | "flat"
  | "raised"
  | "recessed"
  | "glass"
  | "metallic"
  | "enamel"
  | "neon"
  | "texture"
  | "custom";

export type MaterialRecipe = Readonly<{
  id: string;
  label: string;
  category: MaterialCategory;
  fill?: string;
  gradient?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderWidth?: number;
  borderColor?: string;
  radius?: number;
  highlight?: string;
  innerShadow?: string;
  outerShadow?: number;
  glow?: number;
  glowColor?: string;
  bevel?: boolean;
  emboss?: "emboss" | "deboss" | null;
  shine?: boolean;
  texture?: string;
  depth?: number;
  opacity?: number;
  textColor?: string;
}>;

const SURFACE_KEYS = [
  "materialPreset",
  "fill",
  "gradientFill",
  "gradientStart",
  "gradientEnd",
  "buttonSurfaceKind",
  "surfaceFillKind",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "boxShadow",
  "shadow",
  "boxGlow",
  "glow",
  "glowColor",
  "shine",
  "surfaceOpacity",
  "opacity",
  "innerShadow",
  "highlight",
  "texture",
  "depth",
] as const;

export const MATERIAL_CATALOG: readonly MaterialRecipe[] = [
  { id: "flat", label: "Flat", category: "flat", fill: "#334155", borderWidth: 0, outerShadow: 0, opacity: 1 },
  { id: "soft_raised", label: "Soft raised", category: "raised", fill: "#334155", outerShadow: 16, highlight: "linear-gradient(180deg,#fff6,#0000 55%)", opacity: 1 },
  { id: "hard_raised", label: "Hard raised", category: "raised", fill: "#1e293b", outerShadow: 24, bevel: true, highlight: "linear-gradient(180deg,#fff8,#0000 40%)", opacity: 1 },
  { id: "recessed", label: "Recessed", category: "recessed", fill: "#0f172a", innerShadow: "inset 0 3px 8px rgba(0,0,0,.55)", outerShadow: 0, opacity: 1 },
  { id: "beveled", label: "Beveled", category: "raised", gradient: "linear-gradient(145deg,#ffffff,#94a3b8 45%,#0f172a)", outerShadow: 10, bevel: true },
  { id: "embossed", label: "Embossed", category: "raised", gradient: "linear-gradient(160deg,#f8fafc,#64748b 55%,#0f172a)", emboss: "emboss", outerShadow: 6 },
  { id: "debossed", label: "Debossed", category: "recessed", gradient: "linear-gradient(200deg,#0f172a,#64748b 50%,#e2e8f0)", emboss: "deboss", innerShadow: "inset 0 2px 4px rgba(0,0,0,.45)" },
  { id: "glossy", label: "Glossy", category: "enamel", gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 18, textColor: "#ffffff" },
  { id: "glass", label: "Glass", category: "glass", fill: "#ffffff24", borderWidth: 1, borderColor: "#ffffff80", outerShadow: 16, textColor: "#ffffff" },
  { id: "frosted_glass", label: "Frosted glass", category: "glass", gradient: "linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.08))", borderWidth: 1, borderColor: "#ffffff55", outerShadow: 28, textColor: "#ffffff" },
  { id: "clear_glass", label: "Clear glass", category: "glass", fill: "#ffffff0f", borderWidth: 1, borderColor: "#ffffff66", outerShadow: 12, textColor: "#ffffff" },
  { id: "chrome", label: "Chrome", category: "metallic", gradient: "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)", outerShadow: 20, textColor: "#111827" },
  { id: "brushed_silver", label: "Brushed silver", category: "metallic", gradient: "linear-gradient(120deg,#6b7280,#e5e7eb,#9ca3af)", outerShadow: 18, textColor: "#111827" },
  { id: "gold", label: "Gold", category: "metallic", gradient: "linear-gradient(120deg,#8a5a00,#ffe169,#b77900)", outerShadow: 20, textColor: "#17100a" },
  { id: "rose_gold", label: "Rose gold", category: "metallic", gradient: "linear-gradient(120deg,#9f5f59,#f4c2b8,#a75d56)", outerShadow: 18, textColor: "#2b1110" },
  { id: "copper", label: "Copper", category: "metallic", gradient: "linear-gradient(120deg,#7c2d12,#fb923c,#9a3412)", outerShadow: 20, textColor: "#fff7ed" },
  { id: "gunmetal", label: "Gunmetal", category: "metallic", gradient: "linear-gradient(120deg,#111827,#64748b,#1f2937)", outerShadow: 18, textColor: "#ffffff" },
  { id: "enamel", label: "Enamel", category: "enamel", gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 16, textColor: "#ffffff" },
  { id: "neon", label: "Neon", category: "neon", fill: "#111827", borderWidth: 2, borderColor: "#67e8f9", glow: 24, glowColor: "#67e8f9", textColor: "#67e8f9" },
  { id: "stamped", label: "Stamped", category: "texture", fill: "#334155", texture: "stamped", outerShadow: 4, emboss: "deboss" },
  { id: "paper", label: "Paper", category: "texture", fill: "#f5f5f4", texture: "paper", outerShadow: 6, textColor: "#1c1917" },
  { id: "kraft", label: "Kraft", category: "texture", fill: "#d6a77a", texture: "kraft", outerShadow: 8, textColor: "#3b2414" },
  { id: "holographic", label: "Holographic", category: "metallic", gradient: "linear-gradient(120deg,#f0abfc,#67e8f9,#fde68a,#c4b5fd)", outerShadow: 18, shine: true, textColor: "#111827" },
  { id: "subtle_texture", label: "Subtle texture", category: "texture", fill: "#1f2937", texture: "noise", outerShadow: 8, textColor: "#f8fafc" },
] as const;

export function getMaterialRecipe(id: string | null | undefined): MaterialRecipe | null {
  if (!id) return null;
  const normalized = id.replaceAll("-", "_");
  return (
    MATERIAL_CATALOG.find((item) => item.id === id || item.id === normalized) ||
    MATERIAL_CATALOG.find((item) => item.id.replaceAll("_", "-") === id) ||
    null
  );
}

/** Alias map from legacy Badge/Button insertion ids → catalog ids. */
export function normalizeMaterialId(id: string): string {
  const map: Record<string, string> = {
    "rose-gold": "rose_gold",
    "frosted-glass": "frosted_glass",
    "clear-glass": "clear_glass",
    silver: "brushed_silver",
    gold_foil: "gold",
    polished_chrome: "chrome",
    neon_tube: "neon",
    metallic: "chrome",
    outline: "flat",
    sticker: "glossy",
  };
  return map[id] || id.replaceAll("-", "_");
}

/**
 * Apply a MaterialRecipe to surface props as a replacement (not a merge of prior materials).
 * Does not touch Shape, wording text, Action, or nested Icon identity.
 */
export function applySurfaceMaterial(
  props: Record<string, unknown>,
  materialId: string | null,
  options: { preserveTextColor?: boolean; asButtonSurface?: boolean } = {}
): Record<string, unknown> {
  const next = { ...props };
  for (const key of SURFACE_KEYS) {
    if (key === "opacity" && options.asButtonSurface) continue;
    next[key] = undefined;
  }
  if (!materialId || materialId === "none") {
    next.materialPreset = undefined;
    return next;
  }
  const recipe = getMaterialRecipe(normalizeMaterialId(materialId));
  if (!recipe) return next;

  const gradient = recipe.gradient;
  next.materialPreset = recipe.id;
  if (gradient) {
    next.gradientFill = gradient;
    next.fill = undefined;
    next.buttonSurfaceKind = options.asButtonSurface ? "gradient" : undefined;
    next.surfaceFillKind = "gradient";
    const stops = gradient.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g) || [];
    if (stops[0]) next.gradientStart = stops[0];
    if (stops[1]) next.gradientEnd = stops[1];
  } else if (recipe.fill) {
    next.fill = recipe.fill;
    next.gradientFill = undefined;
    next.buttonSurfaceKind = options.asButtonSurface ? "solid" : undefined;
    next.surfaceFillKind = "solid";
  }
  next.borderWidth = recipe.borderWidth ?? 0;
  next.borderColor = recipe.borderColor;
  next.borderStyle = recipe.borderStyle || (recipe.borderWidth ? "solid" : "none");
  if (recipe.radius !== undefined) next.radius = recipe.radius;
  next.boxShadow = recipe.outerShadow ?? 0;
  next.shadow = recipe.outerShadow ?? 0;
  next.boxGlow = recipe.glow ?? 0;
  next.glow = recipe.glow ?? 0;
  next.glowColor = recipe.glowColor;
  next.shine = recipe.shine === true;
  next.innerShadow = recipe.innerShadow;
  next.highlight = recipe.highlight;
  next.texture = recipe.texture;
  next.depth = recipe.depth;
  if (recipe.opacity !== undefined) {
    if (options.asButtonSurface) next.surfaceOpacity = recipe.opacity;
    else next.opacity = recipe.opacity;
  }
  if (!options.preserveTextColor && recipe.textColor) {
    next.color = recipe.textColor;
    next.labelColor = recipe.textColor;
    next.textColor = recipe.textColor;
  }
  return next;
}

export function materialPreviewCss(recipe: MaterialRecipe): string {
  return recipe.gradient || recipe.fill || "#334155";
}

export function materialsByCategory(category: MaterialCategory): MaterialRecipe[] {
  return MATERIAL_CATALOG.filter((item) => item.category === category);
}
