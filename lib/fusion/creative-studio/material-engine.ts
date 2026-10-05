/**
 * Universal Material Engine — shared Appearance recipes with target adapters.
 * Object identity / Shape / wording / Action are never mutated here.
 */

import {
  materialPreviewBackgroundFromRecipe,
  surfaceShadowCss as surfaceShadowCssImpl,
} from "./material-surface";
import { surfacePatternFromTextureToken } from "./patterns";
import { DEFAULT_GRADIENT, normalizeGradient } from "./gradient";
import type { CreativeCompositionBlock } from "./composition";

export { resolveMaterialSurfaceFromProps, resolveMaterialSurfaceFromRecipe, materialSurfaceParityKey } from "./material-surface";
export type { MaterialSurfaceDescriptor, MaterialSurfaceRole } from "./material-surface";

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
  /** Immutable governed image source; authoring adjustments remain non-destructive. */
  sourceMaster?: Readonly<{
    id: string;
    src: string;
    sha256: string;
    width: number;
    height: number;
    fit: "cover" | "contain";
    focalX: number;
    focalY: number;
    scale: number;
    overlayColor: string;
    overlayOpacity: number;
    brightness: number;
    contrast: number;
    saturation: number;
  }>;
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
  recipe("soft_touch", "Soft-touch", "basic", { fill: "#273449", outerShadow: 8, highlight: "linear-gradient(180deg,#ffffff14,#0000 40%)", opacity: 1 }),
  recipe("soft", "Soft", "basic", { fill: "#334155", outerShadow: 10, opacity: 0.96 }),
  recipe("clean_outline", "Clean outline", "basic", { fill: "transparent", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "solid", textColor: "#f8fafc" }),
  // DIMENSIONAL
  recipe("soft_raised", "Soft raised", "dimensional", { fill: "#334155", outerShadow: 16, highlight: "linear-gradient(180deg,#fff6,#0000 55%)", opacity: 1 }),
  recipe("hard_raised", "Hard raised", "dimensional", { fill: "#1e293b", outerShadow: 24, bevel: true, highlight: "linear-gradient(180deg,#fff8,#0000 40%)", opacity: 1 }),
  recipe("raised_resin", "Raised resin", "dimensional", { gradient: "linear-gradient(165deg,#ffffff55 0%,#22c55e 28%,#15803d 72%,#052e16)", shine: true, outerShadow: 20, highlight: "linear-gradient(180deg,#ffffff66,#0000 42%)", borderWidth: 1, borderColor: "#ffffff33", textColor: "#ecfdf5" }),
  recipe("recessed", "Recessed", "dimensional", { fill: "#0f172a", innerShadow: "inset 0 3px 8px rgba(0,0,0,.55)", outerShadow: 0, opacity: 1 }),
  recipe("beveled", "Beveled", "dimensional", { gradient: "linear-gradient(145deg,#ffffff,#94a3b8 45%,#0f172a)", outerShadow: 10, bevel: true }),
  recipe("embossed", "Embossed", "dimensional", { gradient: "linear-gradient(160deg,#f8fafc,#64748b 55%,#0f172a)", emboss: "emboss", outerShadow: 6, glyphShadowLayers: "0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.45)" }),
  recipe("debossed", "Debossed", "dimensional", { gradient: "linear-gradient(200deg,#0f172a,#64748b 50%,#e2e8f0)", emboss: "deboss", innerShadow: "inset 0 2px 4px rgba(0,0,0,.45)", glyphShadowLayers: "inset 0 2px 4px rgba(0,0,0,.45)" }),
  recipe("pressed", "Pressed", "dimensional", { fill: "#0f172a", innerShadow: "inset 0 4px 10px rgba(0,0,0,.6)", outerShadow: 2 }),
  recipe("padded", "Padded", "dimensional", { fill: "#1e293b", outerShadow: 12, borderWidth: 1, borderColor: "#ffffff22" }),
  // GLOSS / GLASS
  recipe("glossy", "Glossy", "glass", { gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 18, textColor: "#ffffff" }),
  recipe("gloss_lacquer", "Gloss lacquer", "glass", { gradient: "linear-gradient(180deg,#ffffffcc 0%,#38bdf8 38%,#0369a1 78%,#0c4a6e)", shine: true, outerShadow: 26, highlight: "linear-gradient(180deg,#ffffff88,#0000 48%)", borderWidth: 1, borderColor: "#ffffff55", textColor: "#f0f9ff" }),
  recipe("high_gloss", "High gloss", "glass", { gradient: "linear-gradient(180deg,#ffffffaa,#f97316 40%,#9a3412)", shine: true, outerShadow: 22, textColor: "#fff7ed" }),
  recipe("glass", "Glass", "glass", { fill: "#ffffff24", borderWidth: 1, borderColor: "#ffffff80", outerShadow: 16, textColor: "#ffffff" }),
  recipe("frosted_glass", "Frosted glass", "glass", { gradient: "linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.08))", borderWidth: 1, borderColor: "#ffffff55", outerShadow: 28, textColor: "#ffffff" }),
  recipe("acrylic", "Acrylic", "glass", { gradient: "linear-gradient(145deg,rgba(255,255,255,.55),rgba(148,163,184,.22) 42%,rgba(15,23,42,.55))", borderWidth: 1, borderColor: "#ffffff77", outerShadow: 22, highlight: "linear-gradient(110deg,#ffffff66 0 18%,#0000 40%)", textColor: "#f8fafc" }),
  recipe("clear_glass", "Clear glass", "glass", { fill: "#ffffff0f", borderWidth: 1, borderColor: "#ffffff66", outerShadow: 12, textColor: "#ffffff" }),
  recipe("smoked_glass", "Smoked glass", "glass", { fill: "#0f172a99", borderWidth: 1, borderColor: "#ffffff33", outerShadow: 18, textColor: "#f8fafc" }),
  recipe("tinted_glass", "Tinted glass", "glass", { fill: "#22d3ee33", borderWidth: 1, borderColor: "#67e8f9aa", outerShadow: 16, textColor: "#ecfeff" }),
  recipe("smoky_black_glass", "Smoky black glass", "glass", { gradient: "radial-gradient(ellipse at 78% 76%,rgba(0,0,0,.58),transparent 38%),radial-gradient(ellipse at 24% 18%,rgba(126,132,143,.22),transparent 34%),linear-gradient(145deg,rgba(50,54,63,.92),rgba(5,7,10,.98) 42%,rgba(18,20,25,.96) 72%,rgba(1,2,4,.99))", borderWidth: 1, borderColor: "#d9b97466", outerShadow: 14, innerShadow: "inset 0 1px 0 rgba(255,255,255,.17),inset 0 -8px 18px rgba(0,0,0,.48)", highlight: "linear-gradient(176deg,rgba(255,255,255,.2),rgba(255,255,255,.025) 28%,rgba(255,255,255,0) 46%),radial-gradient(ellipse at 74% 86%,rgba(190,171,139,.07),transparent 42%)", shine: true, textColor: "#fff7e8" }),
  recipe("burgundy_plum_glass", "Burgundy plum glass", "glass", { gradient: "radial-gradient(circle at 77% 112%,transparent 0 24%,rgba(206,112,157,.11) 24.5% 25%,transparent 25.5% 32%,rgba(206,112,157,.08) 32.5% 33%,transparent 33.5%),radial-gradient(ellipse at 27% 18%,rgba(204,102,151,.22),transparent 37%),linear-gradient(145deg,rgba(105,31,68,.96),rgba(30,5,20,.99) 43%,rgba(70,14,45,.97) 74%,rgba(11,2,8,1))", borderWidth: 1, borderColor: "#e0b66c70", outerShadow: 14, innerShadow: "inset 0 1px 0 rgba(255,220,235,.2),inset 0 -8px 18px rgba(13,0,8,.56)", highlight: "linear-gradient(176deg,rgba(255,220,237,.23),rgba(255,255,255,.025) 30%,rgba(255,255,255,0) 48%),radial-gradient(circle at 76% 110%,transparent 0 34%,rgba(255,187,220,.09) 34.5% 35%,transparent 35.5%)", shine: true, textColor: "#fff2f7" }),
  recipe("frosted_charcoal", "Frosted charcoal", "glass", { gradient: "radial-gradient(ellipse at 28% 20%,rgba(218,225,232,.16),transparent 40%),linear-gradient(145deg,rgba(94,101,110,.94),rgba(31,35,40,.98) 42%,rgba(61,67,74,.96) 72%,rgba(17,19,22,.99))", borderWidth: 1, borderColor: "#e0c48766", outerShadow: 12, innerShadow: "inset 0 1px 0 rgba(255,255,255,.22),inset 0 -7px 16px rgba(0,0,0,.42)", texture: "frosted", highlight: "linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,0) 46%)", textColor: "#f6f7f8" }),
  recipe("deep_blue_glass", "Deep blue glass", "glass", { gradient: "radial-gradient(ellipse at 68% 74%,rgba(20,98,164,.22),transparent 44%),radial-gradient(ellipse at 27% 18%,rgba(78,151,211,.24),transparent 38%),linear-gradient(145deg,rgba(28,75,117,.96),rgba(4,17,32,.99) 42%,rgba(12,43,73,.98) 74%,rgba(1,7,13,1))", borderWidth: 1, borderColor: "#80caff88", outerShadow: 14, innerShadow: "inset 0 1px 0 rgba(190,225,255,.22),inset 0 -8px 18px rgba(0,5,12,.54)", highlight: "linear-gradient(104deg,transparent 44%,rgba(132,203,255,.18) 61%,rgba(255,255,255,.04) 68%,transparent 78%),linear-gradient(176deg,rgba(190,226,255,.22),rgba(255,255,255,.02) 32%,rgba(255,255,255,0) 48%)", shine: true, textColor: "#f0f8ff" }),
  // METALLIC
  recipe("chrome", "Chrome", "metallic", { gradient: "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)", outerShadow: 20, textColor: "#111827", artworkFill: "#e2e8f0" }),
  recipe("brushed_silver", "Brushed silver", "metallic", { gradient: "linear-gradient(120deg,#6b7280,#e5e7eb,#9ca3af)", outerShadow: 18, textColor: "#111827", artworkFill: "#cbd5e1" }),
  recipe("polished_silver", "Polished silver", "metallic", { gradient: "linear-gradient(135deg,#111827,#f8fafc 35%,#475569 52%,#fff 72%,#111827)", outerShadow: 24, textColor: "#111827" }),
  recipe("polished_metal", "Polished metal", "metallic", { gradient: "linear-gradient(125deg,#0f172a,#e2e8f0 32%,#64748b 48%,#f8fafc 62%,#1e293b)", outerShadow: 26, shine: true, highlight: "linear-gradient(100deg,#ffffff88 0 14%,#0000 36%)", textColor: "#0f172a", artworkFill: "#e2e8f0" }),
  recipe("gold", "Gold", "metallic", { gradient: "linear-gradient(120deg,#8a5a00,#ffe169,#b77900)", outerShadow: 20, textColor: "#17100a", artworkFill: "#fbbf24" }),
  recipe("brushed_gold", "Brushed gold", "metallic", { gradient: "linear-gradient(120deg,#713f12,#fbbf24,#a16207,#fde68a)", outerShadow: 18, textColor: "#1c1917" }),
  recipe("aged_brass", "Aged brass", "metallic", { gradient: "linear-gradient(125deg,#261305 0%,#815021 10%,#e9cb82 22%,#694018 35%,#c69349 49%,#4b290f 61%,#e3bc6c 76%,#f2d99b 85%,#6d4119 94%,#211005 100%)", borderWidth: 1, borderColor: "#f3db9b80", outerShadow: 12, innerShadow: "inset 0 2px 1px rgba(255,247,207,.35),inset 0 -5px 9px rgba(38,20,6,.58)", texture: "brushed", highlight: "linear-gradient(105deg,rgba(255,242,190,.34),rgba(255,255,255,0) 32%)", bevel: true, textColor: "#211207", artworkFill: "#2b180a" }),
  recipe("rose_gold", "Rose gold", "metallic", { gradient: "linear-gradient(120deg,#9f5f59,#f4c2b8,#a75d56)", outerShadow: 18, textColor: "#2b1110" }),
  recipe("copper", "Copper", "metallic", { gradient: "linear-gradient(120deg,#7c2d12,#fb923c,#9a3412)", outerShadow: 20, textColor: "#fff7ed" }),
  recipe("bronze", "Bronze", "metallic", { gradient: "linear-gradient(120deg,#78350f,#d97706,#92400e)", outerShadow: 18, textColor: "#fffbeb" }),
  recipe("gunmetal", "Gunmetal", "metallic", { gradient: "linear-gradient(120deg,#111827,#64748b,#1f2937)", outerShadow: 18, textColor: "#ffffff" }),
  recipe("black_chrome", "Black chrome", "metallic", { gradient: "linear-gradient(120deg,#030712,#374151,#0f172a,#9ca3af)", outerShadow: 20, textColor: "#f8fafc" }),
  // LIGHT / NEON — fill/border recipes only. Named edge treatments (Neon Edge,
  // Soft Glow, Double Neon, Aura, Electric) live exclusively in EFFECT_RECIPES.
  recipe("neon", "Neon", "neon", { fill: "#111827", borderWidth: 2, borderColor: "#67e8f9", glow: 24, glowColor: "#67e8f9", textColor: "#67e8f9", artworkFill: "#67e8f9" }),
  recipe("tube_neon", "Tube neon", "neon", { gradient: "linear-gradient(90deg,#67e8f9,#a7f3d0)", glow: 28, glowColor: "#67e8f9", textColor: "#ecfeff", artworkFill: "#67e8f9" }),
  recipe("halo", "Halo", "neon", { fill: "#0f172a", glow: 28, glowColor: "#fde68a", textColor: "#fef9c3" }),
  // PHYSICAL / TEXTURE
  recipe("enamel", "Enamel", "texture", { gradient: "linear-gradient(180deg,#fff7,#ef4444 42%,#991b1b)", shine: true, outerShadow: 16, textColor: "#ffffff" }),
  recipe("stamped", "Stamped", "texture", { fill: "#334155", texture: "stamped", outerShadow: 4, emboss: "deboss" }),
  recipe("paper", "Paper", "texture", { fill: "#f5f5f4", texture: "paper", outerShadow: 6, textColor: "#1c1917" }),
  recipe("kraft", "Kraft", "texture", { fill: "#d6a77a", texture: "kraft", outerShadow: 8, textColor: "#3b2414" }),
  recipe("linen", "Linen", "texture", { fill: "#e7e5e4", texture: "linen", outerShadow: 6, textColor: "#1c1917" }),
  recipe("leather", "Leather-like", "texture", { fill: "#78350f", texture: "leather", outerShadow: 10, textColor: "#fff7ed" }),
  recipe("worn_saddle_leather", "Worn Saddle Leather", "texture", {
    supportedTargets: ["surface", "background"],
    fill: "#4a2717",
    outerShadow: 0,
    textColor: "#fff7ed",
    sourceMaster: {
      id: "worn-saddle-leather@1.0.0",
      src: "/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png",
      sha256: "7cfbbc872682b26fdce2b6b9b3c116d0d00cb0c877ebf641c895fb54679a32fc",
      width: 1536,
      height: 1024,
      fit: "cover",
      focalX: .5,
      focalY: .5,
      scale: 1,
      overlayColor: "#1b0b04",
      overlayOpacity: .22,
      brightness: .82,
      contrast: 1.12,
      saturation: .9,
    },
  }),
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
  /** Soft ambient halo — no hard electrical core. */
  { id: "soft_glow", label: "Soft Glow", supportedTargets: SURFACE_AND_GLYPH, glow: 16, glowColor: "#a5b4fc" },
  /** Crisp electrified edge — narrow core + tight glow (not fog). */
  { id: "neon_edge", label: "Neon Edge", supportedTargets: SURFACE_AND_GLYPH, glow: 10, glowColor: "#22d3ee" },
  /** Defined core + near glow + secondary outer layer. */
  { id: "double_neon", label: "Double Neon", supportedTargets: SURFACE_AND_GLYPH, glow: 12, secondaryGlow: 28, glowColor: "#f0abfc" },
  /** Broad diffuse atmospheric halo. */
  { id: "aura", label: "Aura", supportedTargets: SURFACE_AND_GLYPH, glow: 28, secondaryGlow: 48, glowColor: "#c4b5fd" },
  /** High-energy sharp edge — tighter contrast than Neon. */
  { id: "electric", label: "Electric", supportedTargets: SURFACE_AND_GLYPH, glow: 10, secondaryGlow: 22, glowColor: "#38bdf8" },
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
    // Edge treatments are Effects — material aliases collapse to Neon fill recipes.
    "neon-edge": "neon",
    neon_edge: "neon",
    "double-neon": "neon",
    double_neon: "neon",
    "tube-neon": "tube_neon",
    "brushed-silver": "brushed_silver",
    "brushed-gold": "brushed_gold",
    "black-chrome": "black_chrome",
    "soft-glow": "halo",
    soft_glow: "halo",
    aura: "halo",
    electric: "neon",
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
    // Canonical fill authority: full multi-stop gradientFill.
    // gradientStart/End are editor mirrors only — renderers must not reduce to two stops.
    next.gradientFill = gradient;
    next.fill = undefined;
    next.buttonSurfaceKind = options.asButtonSurface ? "gradient" : undefined;
    next.surfaceFillKind = "gradient";
    const stops = gradient.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g) || [];
    if (stops[0]) next.gradientStart = stops[0];
    if (stops[1]) next.gradientEnd = stops[stops.length - 1] || stops[1];
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
    if (recipe.sourceMaster) {
      next.materialPreset = recipe.id;
      next.surfaceBackgroundKind = "image";
      next.backgroundImageUrl = recipe.sourceMaster.src;
      next.backgroundFit = recipe.sourceMaster.fit;
      next.focalX = recipe.sourceMaster.focalX;
      next.focalY = recipe.sourceMaster.focalY;
      next.imageScale = recipe.sourceMaster.scale;
      next.overlayColor = recipe.sourceMaster.overlayColor;
      next.overlayOpacity = recipe.sourceMaster.overlayOpacity;
      next.brightness = recipe.sourceMaster.brightness;
      next.contrast = recipe.sourceMaster.contrast;
      next.saturation = recipe.sourceMaster.saturation;
      return next;
    }
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

  if (recipe.sourceMaster) {
    const source = recipe.sourceMaster;
    const visualPlane = {
      kind: "image" as const,
      image: { src: source.src, fit: source.fit, focalX: source.focalX, focalY: source.focalY, opacity: 1 },
      overlay: { color: source.overlayColor, opacity: source.overlayOpacity },
    };
    next.materialPreset = recipe.id;
    next.backgroundImageUrl = source.src;
    next.backgroundFit = source.fit;
    next.focalX = source.focalX;
    next.focalY = source.focalY;
    next.brightness = source.brightness;
    next.contrast = source.contrast;
    next.saturation = source.saturation;
    next.overlayColor = source.overlayColor;
    next.overlayOpacity = source.overlayOpacity;
    next.imageOpacity = 1;
    next.visualPlane = visualPlane;
    next.surfaceTreatment = {
      contractId: "studioSurfaceCapability@1.0.0",
      treatment: "image",
      mediaUrl: source.src,
      overlayOpacity: source.overlayOpacity,
      imageOpacity: 1,
      brightness: source.brightness,
      tint: source.overlayColor,
      fit: source.fit,
      focalX: source.focalX,
      focalY: source.focalY,
      blurPx: 0,
      radiusPx: Number(props.radius ?? 16),
      borderWidthPx: Number(props.borderWidth ?? 0),
      borderColor: String(props.borderColor ?? "transparent"),
      opacity: Number(props.opacity ?? 1),
      shadowPx: Number(props.boxShadow ?? 0),
      visualPlane,
    };
    return next;
  }

  next.materialPreset = recipe.id;
  // Material props become the surface authority — null (not undefined) so
  // JSON history / patchProps actually clears a stale Container Visual Plane.
  next.visualPlane = null;
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
  // Target-aware neon defaults so Neon Edge is crisp without Fine tune.
  if (recipe.id === "neon_edge") {
    next.coreBrightness = 1.15;
    next.edgeWidth = 1.25;
    next.auraIntensity = 0.4;
  } else if (recipe.id === "double_neon") {
    next.coreBrightness = 1.1;
    next.edgeWidth = 1.35;
    next.auraIntensity = 0.55;
  } else if (recipe.id === "electric") {
    next.coreBrightness = 1.25;
    next.edgeWidth = 0.9;
    next.auraIntensity = 0.35;
  } else if (recipe.id === "aura") {
    next.auraIntensity = 0.7;
    next.coreBrightness = 0.6;
  } else if (recipe.id === "soft_glow") {
    next.auraIntensity = 0.45;
    next.coreBrightness = 0.5;
  }
  if (recipe.opacity !== undefined) next.opacity = recipe.opacity;
  return next;
}

/**
 * Material tile fill — identical authority to applied Button/Badge surfaces.
 * Overlay layers (highlight/shine) are rendered by MaterialSurfaceLayers.
 */
export function materialPreviewCss(recipe: MaterialRecipe): string {
  if (recipe.sourceMaster) return `linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.08)),url("${recipe.sourceMaster.src}") center/cover`;
  return materialPreviewBackgroundFromRecipe(recipe);
}

type CompositionBackground = NonNullable<CreativeCompositionBlock["background"]>;

function expandHexColor(color: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  return null;
}

/**
 * Card / Page Background Material adapter — durable Visual Plane fields plus
 * materialPreset so Edit → Save → Reload → Preview re-resolve the same recipe.
 */
export function compositionBackgroundFromMaterialRecipe(
  recipe: MaterialRecipe
): CompositionBackground {
  const meta = {
    materialPreset: recipe.id,
    highlight: recipe.highlight,
    shine: recipe.shine === true,
  };

  if (recipe.sourceMaster) {
    const source = recipe.sourceMaster;
    return {
      kind: "image",
      source: "local",
      opacity: 1,
      saturation: source.saturation,
      brightness: 1,
      contrast: 1,
      image: {
        src: source.src,
        fit: source.fit,
        focalX: source.focalX,
        focalY: source.focalY,
        scale: source.scale,
        repeat: "no-repeat",
        blur: 0,
        brightness: source.brightness,
        contrast: source.contrast,
        overlayColor: source.overlayColor,
        overlayOpacity: source.overlayOpacity,
        decorative: true,
        alt: "",
      },
      ...meta,
    };
  }

  if (recipe.texture) {
    const pattern = surfacePatternFromTextureToken(recipe.texture, {
      background: recipe.fill || "#1f2937",
      opacity: 0.32,
    });
    if (pattern) {
      return {
        kind: pattern.kind === "texture" ? "texture" : "pattern",
        pattern,
        value: recipe.gradient || recipe.fill,
        ...meta,
      };
    }
  }

  if (recipe.gradient) {
    const colors = recipe.gradient.match(/#[0-9a-fA-F]{3,8}/g) || [];
    const hexStops = colors
      .map((color) => expandHexColor(color.length <= 4 ? color : color.slice(0, 7)))
      .filter((color): color is string => Boolean(color));
    const stops =
      hexStops.length >= 2
        ? hexStops.map((color, index, arr) => ({
            id: `m-${index}`,
            color,
            position: Math.round((index / Math.max(1, arr.length - 1)) * 100),
            opacity: 1,
          }))
        : DEFAULT_GRADIENT.stops;
    return {
      kind: "gradient",
      value: recipe.gradient,
      gradient: normalizeGradient({
        ...DEFAULT_GRADIENT,
        kind: "linear",
        angle: 135,
        stops,
      }),
      ...meta,
    };
  }

  return {
    kind: "solid",
    value: recipe.fill || "#0f172a",
    ...meta,
  };
}

/** Rehydrate Material props for page-background shared surface resolution. */
export function materialPropsFromCompositionBackground(
  background: CompositionBackground | undefined | null
): Record<string, unknown> | null {
  if (!background?.materialPreset) return null;
  const recipe = getMaterialRecipe(background.materialPreset);
  if (recipe) {
    if (recipe.sourceMaster) return null;
    return {
      materialPreset: recipe.id,
      fill: recipe.fill,
      gradientFill: recipe.gradient,
      highlight: recipe.highlight ?? background.highlight,
      shine: recipe.shine === true || background.shine === true,
      texture: recipe.texture,
      borderWidth: recipe.borderWidth ?? 0,
      borderColor: recipe.borderColor,
      borderStyle: recipe.borderStyle || (recipe.borderWidth ? "solid" : "none"),
      boxShadow: recipe.outerShadow ?? 0,
      boxGlow: recipe.glow ?? 0,
      glowColor: recipe.glowColor,
      innerShadow: recipe.innerShadow,
      opacity: recipe.opacity ?? 1,
      surfaceFillKind: recipe.gradient ? "gradient" : "solid",
      buttonSurfaceKind: recipe.gradient ? "gradient" : "solid",
    };
  }
  return {
    materialPreset: background.materialPreset,
    highlight: background.highlight,
    shine: background.shine === true,
    fill: background.kind === "solid" ? background.value : background.pattern?.background,
    gradientFill:
      background.kind === "gradient"
        ? background.value || undefined
        : undefined,
    texture:
      background.kind === "texture" || background.kind === "pattern"
        ? background.pattern?.id
        : undefined,
    opacity: background.opacity ?? 1,
  };
}

export function surfaceShadowCss(props: Record<string, unknown>): string | undefined {
  return surfaceShadowCssImpl(props);
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
