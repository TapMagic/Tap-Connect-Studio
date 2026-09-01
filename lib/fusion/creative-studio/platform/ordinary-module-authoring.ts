import type { CreativeCompositionNode } from "../composition";
import { resolveStudioControlAvailability, type StudioControlAvailability } from "./control-availability";

export const STUDIO_ORDINARY_MODULE_CONTRACT = "studioOrdinaryModuleAuthoring@1.0.0" as const;
export type OrdinaryModuleKind = "text" | "image" | "button" | "divider";
export type OrdinaryCapabilityGroup = "content" | "action" | "text" | "icon" | "surface" | "edge" | "spacing" | "position" | "accessibility";

const GROUPS: Record<OrdinaryModuleKind, readonly OrdinaryCapabilityGroup[]> = {
  text: ["content", "text", "spacing", "position"],
  image: ["content", "surface", "edge", "spacing", "position", "accessibility"],
  button: ["content", "action", "text", "icon", "surface", "edge", "spacing", "position", "accessibility"],
  divider: ["surface", "edge", "spacing", "position", "accessibility"],
};

export type OrdinaryModuleCapability = Readonly<{
  contractId: typeof STUDIO_ORDINARY_MODULE_CONTRACT;
  kind: OrdinaryModuleKind;
  groups: readonly OrdinaryCapabilityGroup[];
  controls: Readonly<Record<string, StudioControlAvailability>>;
}>;

export function ordinaryModuleKind(node: CreativeCompositionNode): OrdinaryModuleKind | null {
  const kind = String(node.props.elementKind || node.primitive);
  if (kind === "divider" || node.primitive === "border") return "divider";
  if (node.primitive === "text" || node.primitive === "image" || node.primitive === "button") return node.primitive;
  return null;
}

export function resolveOrdinaryModuleCapability(node: CreativeCompositionNode): OrdinaryModuleCapability | null {
  const kind = ordinaryModuleKind(node);
  if (!kind || node.moduleComposition?.signatureAssembly) return null;
  const direct = (availability: StudioControlAvailability["availability"] = "enabled", disabledReason?: string, dependency?: string) =>
    resolveStudioControlAvailability({ availability, disabledReason, dependency, governance: "direct" });
  const controls: Record<string, StudioControlAvailability> = {};
  for (const group of GROUPS[kind]) controls[group] = direct();
  if (kind === "image") {
    const hasImage = Boolean(node.props.src || node.props.mediaSrc);
    controls.imageTreatment = direct(hasImage ? "enabled" : "disabled", hasImage ? undefined : "Choose an image before tuning its presentation.", "image-asset");
  }
  if (kind === "button") {
    const iconOn = node.props.showIcon !== false;
    controls.iconPresentation = direct(iconOn ? "enabled" : "disabled", iconOn ? undefined : "Turn the icon on before changing its placement or color.", "icon-enabled");
  }
  return Object.freeze({ contractId: STUDIO_ORDINARY_MODULE_CONTRACT, kind, groups: GROUPS[kind], controls: Object.freeze(controls) });
}
