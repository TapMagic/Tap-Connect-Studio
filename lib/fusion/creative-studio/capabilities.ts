import type { CreativeCompositionNode } from "./composition";

export type CreativeCapability =
  | "content" | "text" | "appearance" | "surface" | "media" | "transform"
  | "layout" | "motion" | "action" | "setup" | "fields" | "gallery"
  | "resize_policy" | "children" | "data_binding" | "responsive"
  | "visibility" | "accessibility" | "tracking" | "states" | "ai_context";

export type ObjectFamily =
  | "card_root" | "text" | "image" | "logo" | "icon" | "shape" | "divider"
  | "badge" | "button" | "coupon" | "ticket" | "map" | "gallery" | "form"
  | "container" | "group" | "qr" | "video" | "utility";

export type ObjectCapabilityDefinition = {
  objectKind: ObjectFamily;
  targetLevels: readonly ("root" | "parent" | "child")[];
  toolbarCommands: readonly string[];
  editDrawerSections: readonly CreativeCapability[];
  resizePolicies: readonly string[];
  appearanceSections: readonly string[];
  contentEditor: "none" | "text" | "media" | "icon" | "component" | "fields" | "gallery";
  actionSupport: boolean;
  motionSupport: boolean;
  childSelection: boolean;
  resetSupport: readonly string[];
};

const COMMON = ["transform", "responsive", "visibility", "accessibility", "tracking"] as const;
const definition = (
  objectKind: ObjectFamily,
  toolbarCommands: string[],
  editDrawerSections: CreativeCapability[],
  options: Partial<ObjectCapabilityDefinition> = {},
): ObjectCapabilityDefinition => ({
  objectKind,
  targetLevels: objectKind === "card_root" ? ["root"] : ["parent"],
  toolbarCommands,
  editDrawerSections,
  resizePolicies: ["free"],
  appearanceSections: ["opacity"],
  contentEditor: "none",
  actionSupport: editDrawerSections.includes("action"),
  motionSupport: editDrawerSections.includes("motion"),
  childSelection: false,
  resetSupport: ["appearance", "transform"],
  ...options,
});

/** Exact editor contract. UI is generated from this registry; there is no hasEffects fallback. */
export const OBJECT_CAPABILITY_REGISTRY: Readonly<Record<ObjectFamily, ObjectCapabilityDefinition>> = {
  card_root: definition("card_root", ["background.open", "pageSize.open", "guides.open", "appearance.open", "more.open"], ["appearance", "layout", "responsive"], { resizePolicies: ["page-height", "fit-content"], appearanceSections: ["background", "opacity", "overlay"], resetSupport: ["background", "page-size"] }),
  text: definition("text", ["content.edit", "font.open", "fontSize.quick", "bold.toggle", "italic.toggle", "underline.toggle", "color.open", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["content", "text", "appearance", "action", "motion", ...COMMON], { targetLevels: ["parent", "child"], contentEditor: "text", appearanceSections: ["glyph", "outline", "shadow", "glow", "text-box"], resetSupport: ["content", "typography", "appearance", "transform"] }),
  image: definition("image", ["media.replace", "media.cropFit", "media.adjust", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["media", "appearance", "action", "motion", ...COMMON], { contentEditor: "media", appearanceSections: ["frame", "border", "corners", "shadow", "glow", "opacity", "filter"] }),
  logo: definition("logo", ["media.replace", "media.cropFit", "media.adjust", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["media", "appearance", "action", "motion", ...COMMON], { contentEditor: "media", appearanceSections: ["frame", "border", "corners", "shadow", "glow", "opacity"] }),
  icon: definition("icon", ["icon.open", "fill.open", "stroke.open", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["content", "appearance", "action", "motion", ...COMMON], { contentEditor: "icon", appearanceSections: ["fill", "stroke", "stroke-width", "backing-surface", "shadow", "glow", "opacity"] }),
  shape: definition("shape", ["appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["surface", "action", "motion", ...COMMON], { appearanceSections: ["fill", "gradient", "border", "corners", "shadow", "glow", "opacity"] }),
  divider: definition("divider", ["divider.style", "divider.thickness", "color.open", "appearance.open", "motion.open", "transform.position", "more.open"], ["appearance", "motion", ...COMMON], { appearanceSections: ["line-style", "thickness", "length", "color", "gradient", "caps", "opacity", "spacing"] }),
  badge: definition("badge", ["content.edit", "badge.shape", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["content", "text", "surface", "action", "motion", ...COMMON], { contentEditor: "component", childSelection: true, appearanceSections: ["shape", "fill", "material", "border", "shadow", "glow", "shine"], resetSupport: ["content", "appearance", "transform"] }),
  button: definition("button", ["component.editChildren", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["children", "content", "text", "surface", "action", "states", "motion", ...COMMON], { contentEditor: "component", childSelection: true, appearanceSections: ["surface", "states", "border", "corners", "shadow", "glow"], resetSupport: ["content", "appearance", "action", "motion", "transform"] }),
  coupon: definition("coupon", ["component.editChildren", "appearance.open", "resizePolicy.open", "setup.open", "motion.open", "transform.position", "more.open"], ["children", "content", "text", "surface", "resize_policy", "setup", "action", "motion", ...COMMON], { contentEditor: "component", childSelection: true, resizePolicies: ["reflow", "scale", "frame", "fit-content"], appearanceSections: ["surface", "border", "corners", "shadow", "glow"], resetSupport: ["content", "appearance", "resize-policy", "transform", "inserted-preset"] }),
  ticket: definition("ticket", ["component.editChildren", "appearance.open", "resizePolicy.open", "setup.open", "motion.open", "transform.position", "more.open"], ["children", "content", "text", "surface", "resize_policy", "setup", "action", "motion", ...COMMON], { contentEditor: "component", childSelection: true, resizePolicies: ["reflow", "scale", "frame", "fit-content"], appearanceSections: ["surface", "border", "corners", "shadow", "glow"] }),
  map: definition("map", ["map.setup", "appearance.open", "action.open", "transform.position", "more.open"], ["setup", "media", "surface", "action", ...COMMON], { contentEditor: "component", appearanceSections: ["frame", "border", "corners", "shadow", "glow", "opacity"], resetSupport: ["setup", "appearance", "transform"] }),
  gallery: definition("gallery", ["gallery.edit", "layout.open", "appearance.open", "transform.position", "more.open"], ["gallery", "media", "layout", "surface", ...COMMON], { contentEditor: "gallery", childSelection: true, resizePolicies: ["reflow", "frame", "fit-content"], appearanceSections: ["frame", "border", "corners", "gap", "shadow", "opacity"] }),
  form: definition("form", ["form.editFields", "layout.open", "appearance.open", "behavior.open", "transform.position", "more.open"], ["fields", "layout", "surface", "states", ...COMMON], { contentEditor: "fields", childSelection: true, appearanceSections: ["form-surface", "labels", "inputs", "submit", "focus", "error", "success"] }),
  container: definition("container", ["layout.open", "size.open", "appearance.open", "responsive.open", "transform.position", "more.open"], ["layout", "surface", "children", ...COMMON], { contentEditor: "component", childSelection: true, resizePolicies: ["free", "reflow", "fit-content"], appearanceSections: ["fill", "gradient", "media", "pattern", "texture", "material", "border", "corners", "shadow", "glow"] }),
  group: definition("group", ["transform.position", "action.open", "motion.open", "more.open"], ["transform", "action", "motion", ...COMMON], { childSelection: true }),
  qr: definition("qr", ["setup.open", "appearance.open", "action.open", "transform.position", "more.open"], ["setup", "appearance", "action", ...COMMON], { appearanceSections: ["foreground", "background", "quiet-zone", "frame"] }),
  video: definition("video", ["media.replace", "media.cropFit", "appearance.open", "action.open", "motion.open", "transform.position", "more.open"], ["media", "appearance", "action", "motion", ...COMMON], { contentEditor: "media", appearanceSections: ["frame", "border", "corners", "opacity"] }),
  utility: definition("utility", ["setup.open", "visibility.open", "more.open"], ["setup", "visibility", "accessibility"], { resizePolicies: [], appearanceSections: [], resetSupport: ["setup"] }),
};

export function objectFamilyForNode(node: Pick<CreativeCompositionNode, "primitive" | "props">): ObjectFamily {
  const element = String(node.props.elementKind || "");
  const component = String(node.props.componentKind || "");
  if (["coupon", "ticket", "map", "gallery", "form", "container"].includes(component)) return component as ObjectFamily;
  if (node.primitive === "text") return element === "badge" ? "badge" : "text";
  if (node.primitive === "button") return "button";
  if (node.primitive === "group") return "group";
  if (element === "logo" || element === "secondary_logo") return "logo";
  if (element === "icon") return "icon";
  if (element === "divider") return "divider";
  if (element === "badge") return "badge";
  if (element === "map") return "map";
  if (element === "qr_image") return "qr";
  if (element === "video") return "video";
  if (node.primitive === "image" || node.primitive === "frame") return "image";
  return "shape";
}

export function capabilityDefinitionForNode(node: Pick<CreativeCompositionNode, "primitive" | "props">): ObjectCapabilityDefinition {
  return OBJECT_CAPABILITY_REGISTRY[objectFamilyForNode(node)];
}

export function capabilitiesForNode(node: Pick<CreativeCompositionNode, "primitive" | "props">): ReadonlySet<CreativeCapability> {
  return new Set(capabilityDefinitionForNode(node).editDrawerSections);
}

export function supportsCapability(node: Pick<CreativeCompositionNode, "primitive" | "props">, capability: CreativeCapability): boolean {
  return capabilitiesForNode(node).has(capability);
}
