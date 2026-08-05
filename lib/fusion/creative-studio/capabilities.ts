import type { CreativeCompositionNode } from "./composition";

export type CreativeCapability =
  | "content"
  | "text"
  | "appearance"
  | "surface"
  | "media"
  | "transform"
  | "layout"
  | "motion"
  | "action"
  | "data_binding"
  | "responsive"
  | "visibility"
  | "accessibility"
  | "tracking"
  | "states"
  | "ai_context";

const BASE: CreativeCapability[] = [
  "transform",
  "appearance",
  "motion",
  "responsive",
  "visibility",
  "accessibility",
  "tracking",
  "ai_context",
];

const TEXT: CreativeCapability[] = ["content", "text", "action", ...BASE];
const MEDIA: CreativeCapability[] = ["media", ...BASE];
const INTERACTIVE_MEDIA: CreativeCapability[] = [...MEDIA, "action", "states"];

/**
 * One registry answers what an object can do. Object labels/presets never create
 * a second implementation of Text, Surface, Motion, Transform, or Action.
 */
export function capabilitiesForNode(
  node: Pick<CreativeCompositionNode, "primitive" | "props">
): ReadonlySet<CreativeCapability> {
  const elementKind = String(node.props.elementKind || "");
  const componentKind = String(node.props.componentKind || "");
  if (componentKind === "gallery") {
    return new Set(["content", "media", "surface", "layout", ...BASE]);
  }
  if (["coupon", "ticket", "form"].includes(componentKind)) {
    return new Set(["content", "text", "surface", "layout", "action", "states", ...BASE]);
  }
  if (node.primitive === "text") return new Set(TEXT);
  if (node.primitive === "button") {
    return new Set([
      "content",
      "text",
      "surface",
      "layout",
      "action",
      "states",
      ...BASE,
    ]);
  }
  if (node.primitive === "image") {
    return new Set(
      ["map", "qr_image", "icon", "logo", "secondary_logo", "badge"].includes(elementKind)
        ? [...INTERACTIVE_MEDIA, "surface"]
        : INTERACTIVE_MEDIA
    );
  }
  if (node.primitive === "shape" || node.primitive === "frame") {
    return new Set(["surface", "action", "states", ...BASE]);
  }
  if (node.primitive === "group") {
    return new Set(["layout", "action", "states", ...BASE]);
  }
  return new Set(BASE);
}

export function supportsCapability(
  node: Pick<CreativeCompositionNode, "primitive" | "props">,
  capability: CreativeCapability
): boolean {
  return capabilitiesForNode(node).has(capability);
}
