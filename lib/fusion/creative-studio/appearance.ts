import type { TapCardSection } from "@/lib/brand/tap-card";
import type { CreativeCompositionNode } from "./composition";

export type AppearanceTarget = "text" | "image" | "section" | "button" | "badge" | "gallery" | "map" | "component";
export type AppearanceGroup = "fill" | "text" | "border_corners" | "shadow_glow" | "materials_effects" | "image_adjustments" | "states" | "opacity" | "reset";

export const APPEARANCE_GROUPS: Record<AppearanceTarget, readonly AppearanceGroup[]> = {
  text: ["text", "shadow_glow", "materials_effects", "opacity", "reset"],
  image: ["image_adjustments", "border_corners", "shadow_glow", "opacity", "reset"],
  section: ["fill", "border_corners", "shadow_glow", "materials_effects", "opacity", "reset"],
  button: ["fill", "border_corners", "shadow_glow", "materials_effects", "states", "opacity", "reset"],
  badge: ["fill", "border_corners", "shadow_glow", "materials_effects", "opacity", "reset"],
  gallery: ["border_corners", "shadow_glow", "opacity", "reset"],
  map: ["fill", "border_corners", "shadow_glow", "opacity", "reset"],
  component: ["fill", "border_corners", "shadow_glow", "opacity", "reset"],
};

export function appearanceTargetForNode(node: CreativeCompositionNode): AppearanceTarget {
  const kind = String(node.props.elementKind || "");
  if (kind === "badge") return "badge";
  if (kind === "map") return "map";
  if (kind === "gallery" || node.props.componentKind === "gallery") return "gallery";
  if (node.primitive === "text") return "text";
  if (node.primitive === "button") return "button";
  if (node.primitive === "image" || node.primitive === "frame") return "image";
  return "component";
}

const NODE_APPEARANCE_KEYS = new Set([
  "fill", "gradientFill", "materialPreset", "boxFill", "boxGradient", "boxBorder", "boxRadius", "boxShadow",
  "outlineWidth", "outlineColor", "shadow", "glow", "glowColor", "borderWidth", "borderColor", "radius",
  "boxGlow", "surfaceOpacity", "opacity", "buttonSurfaceKind", "gradientStart", "gradientEnd", "gradientAngle",
  "backgroundImageUrl", "shine", "brightness", "contrast", "saturation", "blur", "grayscale", "sepia",
]);

export function resetNodeAppearance(node: CreativeCompositionNode): CreativeCompositionNode {
  const props = Object.fromEntries(Object.entries(node.props).filter(([key]) => !NODE_APPEARANCE_KEYS.has(key)));
  return { ...node, props: { ...props, opacity: 1, borderWidth: 0, materialPreset: undefined, motionPreset: node.props.motionPreset } };
}

export function resetSectionAppearance(section: TapCardSection): TapCardSection {
  if (section.insertedPreset) {
    return {
      ...section,
      ...(structuredClone(section.insertedPreset.section) as Partial<TapCardSection>),
      composition: section.composition ? { ...section.composition, nodes: structuredClone(section.insertedPreset.nodes) } : section.composition,
    };
  }
  return {
    ...section,
    surfaceBackgroundKind: "transparent",
    backgroundColor: "transparent",
    backgroundImageUrl: undefined,
    surfaceBorderWidthPx: 0,
    surfaceRadiusPx: 0,
    surfaceShadow: "none",
    surfaceGlow: "none",
    opacity: 100,
  };
}
