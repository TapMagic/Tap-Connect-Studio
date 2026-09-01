import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { hasCompositionParentAuthority } from "@/lib/fusion/card/composition-parent-authority";

export const STUDIO_POSITION_CAPABILITY_CONTRACT = "studioPositionCapability@1.0.0" as const;
export type StudioPositionProperty = "parent" | "flow-order" | "width" | "alignment" | "inset" | "x" | "y" | "rotation" | "z-order";

export function positionCapabilities(block: CreativeCompositionBlock, node: CreativeCompositionNode): readonly StudioPositionProperty[] {
  if (hasCompositionParentAuthority(block)) {
    return node.compositionKind === "container"
      ? ["flow-order", "width", "alignment", "inset"]
      : ["parent", "flow-order", "width", "alignment", "inset"];
  }
  return ["x", "y", "width", "alignment", "rotation", "z-order"];
}
