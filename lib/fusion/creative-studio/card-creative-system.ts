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
  { id: "sparkles", label: "Sparkles", category: "Decorative" },
  { id: "map-pin", label: "Map pin", category: "Map & location" },
  { id: "phone", label: "Phone", category: "Actions" },
  { id: "mail", label: "Email", category: "Actions" },
  { id: "arrow-up-right", label: "Open link", category: "Actions" },
  { id: "heart", label: "Heart", category: "Social" },
  { id: "star", label: "Star", category: "Promotional" },
  { id: "ticket", label: "Ticket", category: "Promotional" },
  { id: "tag", label: "Tag", category: "Promotional" },
] as const;

export type MotionPreset =
  | "none" | "subtle_pulse" | "glow_pulse" | "soft_float" | "gentle_bounce"
  | "shimmer" | "highlight_sweep" | "fade_in" | "slide_in" | "scale_in"
  | "badge_pop" | "icon_ring" | "neon_flicker" | "slow_rotation";

export type MotionSettings = {
  preset: MotionPreset;
  intensity: number;
  speedSeconds: number;
  delaySeconds: number;
  play: "once" | "gentle_repeat" | "interaction";
};

export const MOTION_PRESETS: ReadonlyArray<{ id: MotionPreset; label: string }> = [
  { id: "none", label: "None" }, { id: "subtle_pulse", label: "Subtle pulse" },
  { id: "glow_pulse", label: "Glow pulse" }, { id: "soft_float", label: "Soft float" },
  { id: "gentle_bounce", label: "Gentle bounce" }, { id: "shimmer", label: "Shimmer" },
  { id: "highlight_sweep", label: "Highlight sweep" }, { id: "fade_in", label: "Fade in" },
  { id: "slide_in", label: "Slide in" }, { id: "scale_in", label: "Scale in" },
  { id: "badge_pop", label: "Badge pop" }, { id: "icon_ring", label: "Icon ring" },
  { id: "neon_flicker", label: "Neon flicker" }, { id: "slow_rotation", label: "Slow decorative rotation" },
];

export const MATERIAL_PRESETS = [
  { id: "brushed_silver", label: "Brushed silver", gradient: "linear-gradient(120deg,#737b84,#f8fafc 45%,#8b949e)", shadow: 18 },
  { id: "polished_chrome", label: "Polished chrome", gradient: "linear-gradient(135deg,#111827,#f8fafc 35%,#475569 52%,#fff 72%,#111827)", shadow: 24 },
  { id: "gold_foil", label: "Gold foil", gradient: "linear-gradient(120deg,#7c4a03,#facc15 38%,#fff2a8 52%,#a16207)", shadow: 20 },
  { id: "rose_gold", label: "Rose gold", gradient: "linear-gradient(120deg,#7f3f45,#f4c7bd 45%,#9f5f62)", shadow: 18 },
  { id: "copper", label: "Copper", gradient: "linear-gradient(120deg,#6f2f1b,#e89b65 45%,#7c2d12)", shadow: 20 },
  { id: "gunmetal", label: "Gunmetal", gradient: "linear-gradient(120deg,#111827,#6b7280 48%,#1f2937)", shadow: 18 },
  { id: "frosted_glass", label: "Frosted glass", gradient: "linear-gradient(135deg,rgba(255,255,255,.38),rgba(255,255,255,.08))", shadow: 28 },
  { id: "neon_tube", label: "Neon tube", gradient: "linear-gradient(90deg,#67e8f9,#a7f3d0)", shadow: 32 },
] as const;

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
    props: {
      ...node.props,
      materialPreset: preset.id,
      gradientFill: preset.gradient,
      shadow: preset.shadow,
    },
  };
}
