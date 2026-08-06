import { nanoid } from "nanoid";
import type {
  CreativeCompositionBlock,
  CreativeCompositionNode,
} from "./composition";

export const BADGE_WORDING = [
  "SALE", "NEW", "DISCOUNT", "LIMITED", "TONIGHT ONLY", "VIP",
  "FEATURED", "MEMBER DEAL", "STAFF PICK", "SOLD OUT", "CLAIM NOW", "CUSTOM",
] as const;

export const BADGE_SHAPES = [
  "pill", "circle", "square", "burst", "starburst", "ribbon", "corner_ribbon",
  "seal", "sticker", "ticket", "flag", "tag",
] as const;

export const ICON_LIBRARY = [
  { id: "sparkles", label: "Sparkles", category: "Promotional" },
  { id: "map-pin", label: "Map pin", category: "Maps" },
  { id: "phone", label: "Phone", category: "Communication" },
  { id: "mail", label: "Email", category: "Communication" },
  { id: "arrow-up-right", label: "Open link", category: "Actions" },
  { id: "heart", label: "Heart", category: "Social" },
  { id: "star", label: "Star", category: "Promotional" },
  { id: "ticket", label: "Ticket", category: "Commerce" },
  { id: "tag", label: "Tag", category: "Commerce" },
] as const;

export type MotionPreset =
  | "none" | "subtle_pulse" | "glow_pulse" | "soft_float" | "gentle_bounce"
  | "wiggle" | "ripple" | "entrance_pop" | "shimmer" | "highlight_sweep" | "shine_sweep"
  | "fade_in" | "slide_in" | "scale_in" | "badge_pop" | "icon_ring"
  | "neon_flicker" | "slow_rotation";

export type MotionSettings = {
  preset: MotionPreset;
  intensity: number;
  speedSeconds: number;
  delaySeconds: number;
  play: "once" | "gentle_repeat" | "interaction";
};

export const MOTION_PRESETS: ReadonlyArray<{ id: MotionPreset; label: string }> = [
  { id: "none", label: "None" }, { id: "subtle_pulse", label: "Pulse" },
  { id: "glow_pulse", label: "Glow pulse" }, { id: "soft_float", label: "Soft float" },
  { id: "gentle_bounce", label: "Bounce" }, { id: "wiggle", label: "Wiggle" },
  { id: "shimmer", label: "Shimmer" }, { id: "shine_sweep", label: "Shine sweep" },
  { id: "ripple", label: "Ripple" }, { id: "entrance_pop", label: "Entrance pop" },
  { id: "highlight_sweep", label: "Highlight sweep" }, { id: "fade_in", label: "Fade in" },
  { id: "slide_in", label: "Slide in" }, { id: "scale_in", label: "Scale in" },
  { id: "badge_pop", label: "Badge pop" }, { id: "icon_ring", label: "Icon ring" },
  { id: "neon_flicker", label: "Neon flicker" }, { id: "slow_rotation", label: "Slow decorative rotation" },
];

export const MATERIAL_PRESETS = [
  { id: "brushed_silver", label: "Brushed silver", gradient: "linear-gradient(120deg,#737b84,#f8fafc 45%,#8b949e)", shadow: 18, effect: "metallic" },
  { id: "polished_chrome", label: "Polished chrome", gradient: "linear-gradient(135deg,#111827,#f8fafc 35%,#475569 52%,#fff 72%,#111827)", shadow: 24, effect: "metallic" },
  { id: "gold_foil", label: "Gold foil", gradient: "linear-gradient(120deg,#7c4a03,#facc15 38%,#fff2a8 52%,#a16207)", shadow: 20, effect: "metallic" },
  { id: "rose_gold", label: "Rose gold", gradient: "linear-gradient(120deg,#7f3f45,#f4c7bd 45%,#9f5f62)", shadow: 18, effect: "metallic" },
  { id: "copper", label: "Copper", gradient: "linear-gradient(120deg,#6f2f1b,#e89b65 45%,#7c2d12)", shadow: 20, effect: "metallic" },
  { id: "gunmetal", label: "Gunmetal", gradient: "linear-gradient(120deg,#111827,#6b7280 48%,#1f2937)", shadow: 18, effect: "metallic" },
  { id: "frosted_glass", label: "Frosted glass", gradient: "linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.08))", shadow: 28, effect: "glossy" },
  { id: "neon_tube", label: "Neon tube", gradient: "linear-gradient(90deg,#67e8f9,#a7f3d0)", shadow: 32, effect: "neon" },
  { id: "bevel", label: "Bevel", gradient: "linear-gradient(145deg,#ffffff,#94a3b8 45%,#0f172a)", shadow: 10, effect: "bevel" },
  { id: "emboss", label: "Emboss", gradient: "linear-gradient(160deg,#f8fafc,#64748b 55%,#0f172a)", shadow: 6, effect: "emboss" },
  { id: "deboss", label: "Deboss", gradient: "linear-gradient(200deg,#0f172a,#64748b 50%,#e2e8f0)", shadow: 4, effect: "deboss" },
  { id: "depth_extrusion", label: "Depth / extrusion", gradient: "linear-gradient(120deg,#111827,#38bdf8)", shadow: 28, effect: "depth" },
  { id: "layered_shadow", label: "Layered shadow", gradient: "", shadow: 36, effect: "layered_shadow" },
  { id: "inner_shadow", label: "Inner shadow", gradient: "", shadow: 12, effect: "inner_shadow" },
  { id: "textured", label: "Textured", gradient: "repeating-linear-gradient(45deg,#111827,#111827 2px,#1f2937 2px,#1f2937 4px)", shadow: 8, effect: "texture" },
] as const;

const GLYPH_EFFECT_KEYS = [
  "materialPreset",
  "gradientFill",
  "shadow",
  "glow",
  "outlineWidth",
  "outlineColor",
  "glyphEffect",
  "textShadowLayers",
] as const;

/**
 * Glyph presets are replacements, not incremental merges. Keeping this law in
 * one pure function prevents an older Neon/Gold field from leaking into the
 * next preset and deliberately leaves text-box appearance untouched.
 */
export function applyGlyphEffect(
  props: Record<string, unknown>,
  presetId: string | null
): Record<string, unknown> {
  const next = { ...props };
  for (const key of GLYPH_EFFECT_KEYS) next[key] = undefined;
  if (!presetId || presetId === "none") return next;
  const preset = MATERIAL_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return next;
  return {
    ...next,
    materialPreset: preset.id,
    gradientFill: preset.gradient || undefined,
    shadow: preset.shadow,
    glyphEffect: preset.effect,
    glow: preset.effect === "neon" ? 24 : undefined,
    textShadowLayers:
      preset.effect === "layered_shadow"
        ? "0 1px 0 rgba(0,0,0,.35),0 4px 8px rgba(0,0,0,.35),0 12px 24px rgba(0,0,0,.28)"
        : preset.effect === "bevel" || preset.effect === "emboss"
          ? "0 1px 0 rgba(255,255,255,.45),0 -1px 0 rgba(0,0,0,.45)"
          : preset.effect === "deboss" || preset.effect === "inner_shadow"
            ? "inset 0 2px 4px rgba(0,0,0,.45)"
            : preset.effect === "depth"
              ? "1px 1px 0 #0f172a,2px 2px 0 #0f172a,3px 3px 0 #0f172a,6px 10px 18px rgba(0,0,0,.45)"
              : undefined,
  };
}

export function defaultMotionSettings(preset: MotionPreset = "none"): MotionSettings {
  return { preset, intensity: 50, speedSeconds: 2.4, delaySeconds: 0, play: "gentle_repeat" };
}

export function saveReusableComposition(input: {
  block: CreativeCompositionBlock;
  name: string;
}): CreativeCompositionBlock {
  const resourceId = `composition-resource-${nanoid(7)}`;
  const revisionId = `revision-${nanoid(7)}`;
  return {
    ...structuredClone(input.block),
    id: resourceId,
    label: input.name.trim() || "Reusable composition",
    resourceRef: { resourceId, revisionId, resourceName: input.name.trim() || "Reusable composition" },
  };
}

export function instantiateReusableComposition(
  resource: CreativeCompositionBlock
): CreativeCompositionBlock {
  const instanceId = `composition-instance-${nanoid(7)}`;
  return {
    ...structuredClone(resource),
    id: instanceId,
    nodes: resource.nodes.map((node) => ({
      ...structuredClone(node),
      id: `node-${nanoid(7)}`,
      groupId: node.groupId ? `${node.groupId}-${instanceId}` : node.groupId,
    })),
    resourceRef: resource.resourceRef,
  };
}

export function applyMaterialPreset(
  node: CreativeCompositionNode,
  presetId: string
): CreativeCompositionNode {
  const preset = MATERIAL_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) return node;
  return {
    ...node,
    props: applyGlyphEffect(node.props, preset.id),
  };
}
