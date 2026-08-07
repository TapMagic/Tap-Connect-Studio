/**
 * Universal Material Engine — shared Appearance recipes with target adapters.
 * Object identity / Shape / wording / Action are never mutated here.
 */

export type MaterialCategory =
  | "basic"
  | "dimensional"
  | "glass"
  | "metallic"
  | "neon"
  | "texture"
  | "custom"
  /** @deprecated legacy aliases — normalize via categoryForRecipe */
  | "flat"
  | "raised"
  | "recessed"
  | "enamel";

export type AppearanceMaterialTarget =
  | "surface"
  | "glyph"
  | "icon_artwork"
  | "icon_backing"
  | "text_box"
  | "background";

export type MaterialRecipe = Readonly<{
  id: string;
  label: string;
  category: MaterialCategory;
  supportedTargets?: readonly AppearanceMaterialTarget[];
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
  secondaryGlow?: number;
  bevel?: boolean;
  emboss?: "emboss" | "deboss" | null;
  shine?: boolean;
  texture?: string;
  depth?: number;
  opacity?: number;
  textColor?: string;
  artworkFill?: string;
  glyphShadowLayers?: string;
}>;

export type EffectRecipe = Readonly<{
  id: string;
  label: string;
  supportedTargets: readonly AppearanceMaterialTarget[];
  shadow?: number;
  glow?: number;
  glowColor?: string;
  secondaryGlow?: number;
  blur?: number;
  opacity?: number;
  textShadowLayers?: string;
  innerShadow?: string;
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
  "secondaryGlow",
] as const;

const GLYPH_KEYS = [
  "materialPreset",
  "gradientFill",
  "shadow",
  "glow",
  "glowColor",
  "secondaryGlow",
  "outlineWidth",
  "outlineColor",
  "glyphEffect",
  "textShadowLayers",
] as const;

const ALL_SURFACE: AppearanceMaterialTarget[] = ["surface", "icon_backing", "text_box", "background"];
const ALL_GLYPH: AppearanceMaterialTarget[] = ["glyph", "icon_artwork"];
const SURFACE_AND_GLYPH: AppearanceMaterialTarget[] = [...ALL_SURFACE, ...ALL_GLYPH];

function recipe(
  id: string,
  label: string,
  category: MaterialCategory,
  rest: Omit<MaterialRecipe, "id" | "label" | "category"> = {}
): MaterialRecipe {
  return { id, label, category, supportedTargets: SURFACE_AND_GLYPH, ...rest };
}

export const MATERIAL_CATALOG: readonly MaterialRecipe[] = [
  // BASIC
  recipe("flat", "Flat", "basic", { fill: "#334155", borderWidth: 0, outerShadow: 0, opacity: 1 }),
  recipe("matte", "Matte", "basic", { fill: "#1e293b", outerShadow: 4, opacity: 1 }),
  recipe("soft", "Soft", "basic", { fill: "#334155", outerShadow: 10, opacity: 0.96 }),
  recipe("clean_outline", "Clean outline", "basic", { fill: "transparent", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "solid", textColor: "#f8fafc" }),
  // DIMENSIONAL
  recipe("soft_raised", "Soft raised", "dimensional", { fill: "#334155", outerShadow: 16, highlight: "linear-gradient(180deg,#fff6,#0000 55%)", opacity: 1 }),
  recipe("hard_raised", "Hard raised", "dimensional", { fill: "#1e293b", outerShadow: 24, bevel: true, highlight: "linear-gradient(180deg,#fff8,#0000 40%)", opacity: 1 }),
  recipe("recessed", "Recessed", "dimensional", { fill: "#0f172a", innerShadow: "inset 0 3px 8px rgba(0,0,0,.55)", outerShadow: 0, opacity: 1 }),
  recipe("beveled", "Beveled", "dimensional", { gradient: "linear-gradient(145deg,#ffffff,#94a3b8 45%,#0f172a)", outerShadow: 10, bevel: true }),
  recipe("embossed", "Embossed", "dimensional", { gradient: "linear-gradient(160deg,#f8fafc,#64748b 55%,#0f172a)", emboss: "emboss", outerShadow: 6, glyphShadowLayers: "0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.45)" }),
  recipe("debossed", "Debossed", "dimensional", { gradient: "linear-gradient(200deg,#0f172a,#64748b 50%,#e2e8f0)", emboss: "deboss", innerShadow: "inset 0 2px 4px rgba(0,0,0,.45)", glyphShadowLayers: "inset 0 2px 4px rgba(0,0,0,.45)" }),
  recipe("pressed", "Pressed", "dimensional", { fill: "#0f172a", innerShadow: "inset 0 4px 10px rgba(0,0,0,.6)", outerShadow: 2 }),
  recipe("padded", "Padded", "dimensional", { fill: "#1e293b", outerShadow: 12, borderWidth: 1, borderColor: "#ffffff22" }),
  // GLOSS / GLASS
  recipe("glossy", "Glossy", "glass", { gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 18, textColor: "#ffffff" }),
  recipe("high_gloss", "High gloss", "glass", { gradient: "linear-gradient(180deg,#ffffffaa,#f97316 40%,#9a3412)", shine: true, outerShadow: 22, textColor: "#fff7ed" }),
  recipe("glass", "Glass", "glass", { fill: "#ffffff24", borderWidth: 1, borderColor: "#ffffff80", outerShadow: 16, textColor: "#ffffff" }),
  recipe("frosted_glass", "Frosted glass", "glass", { gradient: "linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.08))", borderWidth: 1, borderColor: "#ffffff55", outerShadow: 28, textColor: "#ffffff" }),
  recipe("clear_glass", "Clear glass", "glass", { fill: "#ffffff0f", borderWidth: 1, borderColor: "#ffffff66", outerShadow: 12, textColor: "#ffffff" }),
  recipe("smoked_glass", "Smoked glass", "glass", { fill: "#0f172a99", borderWidth: 1, borderColor: "#ffffff33", outerShadow: 18, textColor: "#f8fafc" }),
  recipe("tinted_glass", "Tinted glass", "glass", { fill: "#22d3ee33", borderWidth: 1, borderColor: "#67e8f9aa", outerShadow: 16, textColor: "#ecfeff" }),
  // METALLIC
  recipe("chrome", "Chrome", "metallic", { gradient: "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)", outerShadow: 20, textColor: "#111827", artworkFill: "#e2e8f0" }),
  recipe("brushed_silver", "Brushed silver", "metallic", { gradient: "linear-gradient(120deg,#6b7280,#e5e7eb,#9ca3af)", outerShadow: 18, textColor: "#111827", artworkFill: "#cbd5e1" }),
  recipe("polished_silver", "Polished silver", "metallic", { gradient: "linear-gradient(135deg,#111827,#f8fafc 35%,#475569 52%,#fff 72%,#111827)", outerShadow: 24, textColor: "#111827" }),
  recipe("gold", "Gold", "metallic", { gradient: "linear-gradient(120deg,#8a5a00,#ffe169,#b77900)", outerShadow: 20, textColor: "#17100a", artworkFill: "#fbbf24" }),
  recipe("brushed_gold", "Brushed gold", "metallic", { gradient: "linear-gradient(120deg,#713f12,#fbbf24,#a16207,#fde68a)", outerShadow: 18, textColor: "#1c1917" }),
  recipe("rose_gold", "Rose gold", "metallic", { gradient: "linear-gradient(120deg,#9f5f59,#f4c2b8,#a75d56)", outerShadow: 18, textColor: "#2b1110" }),
  recipe("copper", "Copper", "metallic", { gradient: "linear-gradient(120deg,#7c2d12,#fb923c,#9a3412)", outerShadow: 20, textColor: "#fff7ed" }),
  recipe("bronze", "Bronze", "metallic", { gradient: "linear-gradient(120deg,#78350f,#d97706,#92400e)", outerShadow: 18, textColor: "#fffbeb" }),
  recipe("gunmetal", "Gunmetal", "metallic", { gradient: "linear-gradient(120deg,#111827,#64748b,#1f2937)", outerShadow: 18, textColor: "#ffffff" }),
  recipe("black_chrome", "Black chrome", "metallic", { gradient: "linear-gradient(120deg,#030712,#374151,#0f172a,#9ca3af)", outerShadow: 20, textColor: "#f8fafc" }),
  // LIGHT / NEON
  recipe("soft_glow", "Soft glow", "neon", { fill: "#111827", glow: 16, glowColor: "#a5b4fc", textColor: "#e0e7ff", artworkFill: "#a5b4fc" }),
  recipe("neon", "Neon", "neon", { fill: "#111827", borderWidth: 2, borderColor: "#67e8f9", glow: 24, glowColor: "#67e8f9", textColor: "#67e8f9", artworkFill: "#67e8f9" }),
  recipe("neon_edge", "Neon edge", "neon", { fill: "transparent", borderWidth: 2, borderColor: "#22d3ee", glow: 18, glowColor: "#22d3ee", textColor: "#67e8f9", artworkFill: "#22d3ee" }),
  recipe("double_neon", "Double neon", "neon", { fill: "#0b1020", borderWidth: 2, borderColor: "#f0abfc", glow: 18, glowColor: "#f0abfc", secondaryGlow: 32, textColor: "#f5d0fe", artworkFill: "#e879f9" }),
  recipe("tube_neon", "Tube neon", "neon", { gradient: "linear-gradient(90deg,#67e8f9,#a7f3d0)", glow: 28, glowColor: "#67e8f9", textColor: "#ecfeff", artworkFill: "#67e8f9" }),
  recipe("aura", "Aura", "neon", { fill: "#111827", glow: 36, glowColor: "#c4b5fd", secondaryGlow: 48, textColor: "#ede9fe" }),
  recipe("electric", "Electric", "neon", { fill: "#020617", borderWidth: 2, borderColor: "#38bdf8", glow: 22, glowColor: "#38bdf8", secondaryGlow: 40, textColor: "#bae6fd" }),
  recipe("halo", "Halo", "neon", { fill: "#0f172a", glow: 28, glowColor: "#fde68a", textColor: "#fef9c3" }),
  // PHYSICAL / TEXTURE
  recipe("enamel", "Enamel", "texture", { gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 16, textColor: "#ffffff" }),
  recipe("stamped", "Stamped", "texture", { fill: "#334155", texture: "stamped", outerShadow: 4, emboss: "deboss" }),
  recipe("paper", "Paper", "texture", { fill: "#f5f5f4", texture: "paper", outerShadow: 6, textColor: "#1c1917" }),
  recipe("kraft", "Kraft", "texture", { fill: "#d6a77a", texture: "kraft", outerShadow: 8, textColor: "#3b2414" }),
  recipe("linen", "Linen", "texture", { fill: "#e7e5e4", texture: "linen", outerShadow: 6, textColor: "#1c1917" }),
  recipe("leather", "Leather-like", "texture", { fill: "#78350f", texture: "leather", outerShadow: 10, textColor: "#fff7ed" }),
  recipe("brushed_metal", "Brushed metal", "texture", { gradient: "linear-gradient(90deg,#52525b,#d4d4d8,#71717a,#a1a1aa)", texture: "brushed", outerShadow: 14, textColor: "#18181b" }),
  recipe("grain", "Grain", "texture", { fill: "#292524", texture: "grain", outerShadow: 8, textColor: "#fafaf9" }),
  recipe("soft_noise", "Soft noise", "texture", { fill: "#1f2937", texture: "noise", outerShadow: 8, textColor: "#f8fafc" }),
  recipe("holographic", "Holographic", "metallic", { gradient: "linear-gradient(120deg,#f0abfc,#67e8f9,#fde68a,#c4b5fd)", outerShadow: 18, shine: true, textColor: "#111827" }),
  recipe("iridescent", "Iridescent", "metallic", { gradient: "linear-gradient(135deg,#67e8f9,#c084fc,#f472b6,#fde68a)", outerShadow: 16, shine: true, textColor: "#0f172a" }),
  recipe("subtle_texture", "Subtle texture", "texture", { fill: "#1f2937", texture: "noise", outerShadow: 8, textColor: "#f8fafc" }),
] as const;

export const EFFECT_RECIPES: readonly EffectRecipe[] = [
  { id: "none", label: "None", supportedTargets: SURFACE_AND_GLYPH, shadow: 0, glow: 0, secondaryGlow: 0, blur: 0 },
  { id: "soft_shadow", label: "Soft Shadow", supportedTargets: SURFACE_AND_GLYPH, shadow: 14 },
  { id: "deep_shadow", label: "Deep Shadow", supportedTargets: SURFACE_AND_GLYPH, shadow: 28 },
  { id: "floating", label: "Floating", supportedTargets: ALL_SURFACE, shadow: 36 },
  { id: "soft_glow", label: "Soft Glow", supportedTargets: SURFACE_AND_GLYPH, glow: 16 },
  { id: "neon_edge", label: "Neon Edge", supportedTargets: SURFACE_AND_GLYPH, glow: 18, glowColor: "#22d3ee" },
  { id: "double_neon", label: "Double Neon", supportedTargets: SURFACE_AND_GLYPH, glow: 16, secondaryGlow: 32, glowColor: "#f0abfc" },
  { id: "aura", label: "Aura", supportedTargets: SURFACE_AND_GLYPH, glow: 36, secondaryGlow: 48, glowColor: "#c4b5fd" },
  { id: "electric", label: "Electric", supportedTargets: SURFACE_AND_GLYPH, glow: 22, secondaryGlow: 40, glowColor: "#38bdf8" },
  { id: "inner_glow", label: "Inner Glow", supportedTargets: ALL_SURFACE, glow: 12, innerShadow: "inset 0 0 18px rgba(103,232,249,.55)" },
  { id: "outline_glow", label: "Outline Glow", supportedTargets: SURFACE_AND_GLYPH, glow: 14, glowColor: "#fde68a" },
  { id: "gloss_highlight", label: "Gloss Highlight", supportedTargets: ALL_SURFACE, shadow: 12 },
  { id: "dimensional_edge", label: "Dimensional Edge", supportedTargets: ALL_SURFACE, shadow: 16, textShadowLayers: "0 1px 0 rgba(255,255,255,.35),0 -1px 0 rgba(0,0,0,.4)" },
] as const;

export const MATERIAL_UI_CATEGORIES = [
  { id: "basic", label: "Basic" },
  { id: "dimensional", label: "Dimensional" },
  { id: "glass", label: "Glass" },
  { id: "metallic", label: "Metallic" },
  { id: "neon", label: "Light / Neon" },
  { id: "texture", label: "Physical / Texture" },
] as const;

export function normalizeMaterialCategory(category: MaterialCategory): MaterialCategory {
  if (category === "flat") return "basic";
  if (category === "raised" || category === "recessed") return "dimensional";
  if (category === "enamel") return "texture";
  return category;
}

export function getMaterialRecipe(id: string | null | undefined): MaterialRecipe | null {
  if (!id) return null;
  const normalized = normalizeMaterialId(id);
  return (
    MATERIAL_CATALOG.find((item) => item.id === normalized) ||
    MATERIAL_CATALOG.find((item) => item.id === id) ||
    MATERIAL_CATALOG.find((item) => item.id.replaceAll("_", "-") === id) ||
    null
  );
}

export function getEffectRecipe(id: string | null | undefined): EffectRecipe | null {
  if (!id) return null;
  return EFFECT_RECIPES.find((item) => item.id === id || item.id === id.replaceAll("-", "_")) || null;
}

/** Alias map from legacy Badge/Button/glyph insertion ids → catalog ids. */
export function normalizeMaterialId(id: string): string {
  const map: Record<string, string> = {
    "rose-gold": "rose_gold",
    "frosted-glass": "frosted_glass",
    "clear-glass": "clear_glass",
    "high-gloss": "high_gloss",
    "soft-raised": "soft_raised",
    "hard-raised": "hard_raised",
    "neon-edge": "neon_edge",
    "double-neon": "double_neon",
    "tube-neon": "tube_neon",
    "brushed-silver": "brushed_silver",
    "brushed-gold": "brushed_gold",
    "black-chrome": "black_chrome",
    "soft-glow": "soft_glow",
    "clean-outline": "clean_outline",
    silver: "brushed_silver",
    gold_foil: "gold",
    polished_chrome: "chrome",
    neon_tube: "tube_neon",
    metallic: "chrome",
    outline: "clean_outline",
    sticker: "glossy",
    bevel: "beveled",
    emboss: "embossed",
    deboss: "debossed",
    textured: "subtle_texture",
    depth_extrusion: "hard_raised",
    layered_shadow: "soft_raised",
    inner_shadow: "recessed",
    "leather-like": "leather",
  };
  return map[id] || id.replaceAll("-", "_");
}

export function materialsForTarget(target: AppearanceMaterialTarget): MaterialRecipe[] {
  return MATERIAL_CATALOG.filter((item) => {
    const targets = item.supportedTargets || SURFACE_AND_GLYPH;
    return targets.includes(target);
  });
}

export function materialsByCategory(category: MaterialCategory): MaterialRecipe[] {
  const normalized = normalizeMaterialCategory(category);
  return MATERIAL_CATALOG.filter((item) => normalizeMaterialCategory(item.category) === normalized);
}

export function effectsForTarget(target: AppearanceMaterialTarget): EffectRecipe[] {
  return EFFECT_RECIPES.filter((item) => item.supportedTargets.includes(target));
}

function clearKeys(props: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const next = { ...props };
  for (const key of keys) next[key] = undefined;
  return next;
}

function applyRecipeFill(
  next: Record<string, unknown>,
  recipe: MaterialRecipe,
  options: { asButtonSurface?: boolean; boxPrefix?: boolean }
): void {
  const gradient = recipe.gradient;
  if (options.boxPrefix) {
    if (gradient) {
      next.boxGradient = gradient;
      next.boxFill = undefined;
    } else if (recipe.fill !== undefined) {
      next.boxFill = recipe.fill;
      next.boxGradient = undefined;
    }
    return;
  }
  if (gradient) {
    next.gradientFill = gradient;
    next.fill = undefined;
    next.buttonSurfaceKind = options.asButtonSurface ? "gradient" : undefined;
    next.surfaceFillKind = "gradient";
    const stops = gradient.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g) || [];
    if (stops[0]) next.gradientStart = stops[0];
    if (stops[1]) next.gradientEnd = stops[1];
  } else if (recipe.fill !== undefined) {
    next.fill = recipe.fill;
    next.gradientFill = undefined;
    next.buttonSurfaceKind = options.asButtonSurface ? "solid" : undefined;
    next.surfaceFillKind = "solid";
  }
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
  return applyMaterialRecipe("surface", materialId, props, options);
}

export function applyGlyphMaterial(
  props: Record<string, unknown>,
  materialId: string | null
): Record<string, unknown> {
  return applyMaterialRecipe("glyph", materialId, props);
}

export function applyMaterialRecipe(
  target: AppearanceMaterialTarget,
  materialId: string | null,
  props: Record<string, unknown>,
  options: { preserveTextColor?: boolean; asButtonSurface?: boolean } = {}
): Record<string, unknown> {
  if (target === "glyph") {
    const next = clearKeys(props, GLYPH_KEYS);
    if (!materialId || materialId === "none") return next;
    const recipe = getMaterialRecipe(materialId);
    if (!recipe) return next;
    next.materialPreset = recipe.id;
    if (recipe.gradient) next.gradientFill = recipe.gradient;
    else if (recipe.artworkFill || recipe.fill) next.color = recipe.artworkFill || recipe.fill;
    next.shadow = recipe.outerShadow ?? 0;
    next.glow = recipe.glow ?? 0;
    next.glowColor = recipe.glowColor;
    next.secondaryGlow = recipe.secondaryGlow;
    next.glyphEffect = normalizeMaterialCategory(recipe.category) === "neon" ? "neon" : recipe.category;
    if (recipe.glyphShadowLayers) next.textShadowLayers = recipe.glyphShadowLayers;
    else if (recipe.emboss === "emboss" || recipe.bevel) {
      next.textShadowLayers = "0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.45)";
    } else if (recipe.emboss === "deboss") {
      next.textShadowLayers = "inset 0 2px 4px rgba(0,0,0,.45)";
    }
    if (recipe.textColor && !options.preserveTextColor && !recipe.gradient) next.color = recipe.textColor;
    return next;
  }

  if (target === "icon_artwork") {
    const next = { ...props };
    next.materialPreset = undefined;
    next.glow = undefined;
    next.shadow = undefined;
    next.secondaryGlow = undefined;
    next.glowColor = undefined;
    if (!materialId || materialId === "none") return next;
    const recipe = getMaterialRecipe(materialId);
    if (!recipe) return next;
    next.materialPreset = recipe.id;
    const fill = recipe.artworkFill || recipe.textColor || recipe.fill || "#b8ff2c";
    if (recipe.gradient || fill) {
      next.fill = fill === "transparent" ? "#22d3ee" : fill;
      next.stroke = next.fill;
    }
    next.glow = recipe.glow ?? (normalizeMaterialCategory(recipe.category) === "neon" ? 18 : 0);
    next.glowColor = recipe.glowColor || String(next.fill);
    next.shadow = recipe.outerShadow ?? 0;
    next.secondaryGlow = recipe.secondaryGlow;
    next.boxGlow = 0;
    return next;
  }

  if (target === "text_box" || target === "icon_backing") {
    const next = { ...props };
    for (const key of ["boxFill", "boxGradient", "boxShadow", "boxGlow", "materialPreset", "borderWidth", "borderColor", "borderStyle", "innerShadow", "highlight", "shine", "texture"]) {
      next[key] = undefined;
    }
    if (target === "icon_backing") next.backingSurfaceEnabled = true;
    if (!materialId || materialId === "none") {
      if (target === "icon_backing") next.backingSurfaceEnabled = props.backingSurfaceEnabled === true;
      return next;
    }
    const recipe = getMaterialRecipe(materialId);
    if (!recipe) return next;
    next.materialPreset = recipe.id;
    applyRecipeFill(next, recipe, { boxPrefix: true });
    next.borderWidth = recipe.borderWidth ?? 0;
    next.borderColor = recipe.borderColor;
    next.borderStyle = recipe.borderStyle || (recipe.borderWidth ? "solid" : "none");
    if (recipe.radius !== undefined) next.radius = recipe.radius;
    next.boxShadow = recipe.outerShadow ?? 0;
    next.boxGlow = recipe.glow ?? 0;
    next.glowColor = recipe.glowColor;
    next.shine = recipe.shine === true;
    next.innerShadow = recipe.innerShadow;
    next.highlight = recipe.highlight;
    next.texture = recipe.texture;
    return next;
  }

  if (target === "background") {
    const next = clearKeys(props, ["materialPreset", "backgroundColor", "backgroundGradient", "surfaceBackgroundKind", "surfaceShadow", "surfaceGlow", "opacity", "texture"]);
    if (!materialId || materialId === "none") {
      next.surfaceBackgroundKind = "transparent";
      next.backgroundColor = "transparent";
      return next;
    }
    const recipe = getMaterialRecipe(materialId);
    if (!recipe) return next;
    next.materialPreset = recipe.id;
    if (recipe.gradient) {
      next.surfaceBackgroundKind = "gradient";
      next.backgroundGradient = recipe.gradient;
      next.backgroundColor = undefined;
    } else {
      next.surfaceBackgroundKind = "solid";
      next.backgroundColor = recipe.fill || "#0f172a";
    }
    next.surfaceShadow = recipe.outerShadow ? "soft" : "none";
    next.surfaceGlow = recipe.glow ? "soft" : "none";
    next.texture = recipe.texture;
    if (recipe.opacity !== undefined) next.opacity = Math.round(recipe.opacity * 100);
    return next;
  }

  // surface (default)
  const next = clearKeys(props, SURFACE_KEYS);
  if (options.asButtonSurface && props.opacity !== undefined) next.opacity = props.opacity;
  if (!materialId || materialId === "none") {
    next.materialPreset = undefined;
    return next;
  }
  const recipe = getMaterialRecipe(materialId);
  if (!recipe) return next;

  next.materialPreset = recipe.id;
  applyRecipeFill(next, recipe, { asButtonSurface: options.asButtonSurface });
  next.borderWidth = recipe.borderWidth ?? 0;
  next.borderColor = recipe.borderColor;
  next.borderStyle = recipe.borderStyle || (recipe.borderWidth ? "solid" : "none");
  if (recipe.radius !== undefined) next.radius = recipe.radius;
  next.boxShadow = recipe.outerShadow ?? 0;
  next.shadow = recipe.outerShadow ?? 0;
  next.boxGlow = recipe.glow ?? 0;
  next.glow = recipe.glow ?? 0;
  next.glowColor = recipe.glowColor;
  next.secondaryGlow = recipe.secondaryGlow;
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

export function applyEffectRecipe(
  target: AppearanceMaterialTarget,
  effectId: string | null,
  props: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...props };
  const recipe = getEffectRecipe(effectId);
  if (!recipe || recipe.id === "none") {
    if (target === "glyph" || target === "icon_artwork") {
      next.shadow = 0;
      next.glow = 0;
      next.secondaryGlow = 0;
      next.glowColor = undefined;
      next.blur = 0;
      next.textShadowLayers = undefined;
      next.effectPreset = "none";
    } else {
      next.boxShadow = 0;
      next.shadow = 0;
      next.boxGlow = 0;
      next.glow = 0;
      next.secondaryGlow = 0;
      next.glowColor = undefined;
      next.innerShadow = undefined;
      next.effectPreset = "none";
    }
    return next;
  }
  next.effectPreset = recipe.id;
  if (target === "glyph" || target === "icon_artwork") {
    next.shadow = recipe.shadow ?? 0;
    next.glow = recipe.glow ?? 0;
    next.secondaryGlow = recipe.secondaryGlow;
    next.glowColor = recipe.glowColor;
    next.blur = recipe.blur ?? 0;
    if (recipe.textShadowLayers) next.textShadowLayers = recipe.textShadowLayers;
    if (target === "icon_artwork") next.boxGlow = 0;
  } else {
    next.boxShadow = recipe.shadow ?? 0;
    next.shadow = recipe.shadow ?? 0;
    next.boxGlow = recipe.glow ?? 0;
    next.glow = recipe.glow ?? 0;
    next.secondaryGlow = recipe.secondaryGlow;
    next.glowColor = recipe.glowColor;
    if (recipe.innerShadow) next.innerShadow = recipe.innerShadow;
  }
  if (recipe.opacity !== undefined) next.opacity = recipe.opacity;
  return next;
}

export function materialPreviewCss(recipe: MaterialRecipe): string {
  return recipe.gradient || (recipe.fill && recipe.fill !== "transparent" ? recipe.fill : recipe.borderColor || "#334155");
}

export function surfaceShadowCss(props: Record<string, unknown>): string | undefined {
  const shadow = Number(props.boxShadow ?? props.shadow ?? 0);
  const glow = Number(props.boxGlow ?? props.glow ?? 0);
  const secondary = Number(props.secondaryGlow ?? 0);
  const glowColor = String(props.glowColor || "#67e8f9");
  const inner = typeof props.innerShadow === "string" ? props.innerShadow : "";
  const parts = [
    shadow > 0 ? `0 8px ${shadow}px rgba(0,0,0,.4)` : "",
    glow > 0 ? `0 0 ${glow}px ${glowColor}` : "",
    secondary > 0 ? `0 0 ${secondary}px ${glowColor}` : "",
    inner,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/** Compact Aa preview styles for toolbar (glyph + optional Text Box). */
export function aaPreviewStyles(props: Record<string, unknown>): {
  glyphColor: string;
  glyphBackground: string;
  boxBackground: string;
  boxTransparent: boolean;
} {
  const gradient = typeof props.gradientFill === "string" ? props.gradientFill : "";
  const glyphColor = gradient || String(props.color || "#ffffff");
  const boxGradient = typeof props.boxGradient === "string" ? props.boxGradient : "";
  const boxFill = String(props.boxFill || "transparent");
  const boxTransparent = !boxGradient && (boxFill === "transparent" || boxFill === "" || boxFill === "none");
  return {
    glyphColor,
    glyphBackground: gradient || "transparent",
    boxBackground: boxGradient || (boxTransparent ? "transparent" : boxFill),
    boxTransparent,
  };
}
