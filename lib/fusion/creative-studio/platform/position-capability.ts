import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { hasCompositionParentAuthority } from "@/lib/fusion/card/composition-parent-authority";
import { isCardSurfaceLayered, isLayeredContainer } from "./layered-region";

export const STUDIO_POSITION_CAPABILITY_CONTRACT = "studioPositionCapability@1.0.0" as const;
export type StudioPositionProperty = "parent" | "flow-order" | "width" | "alignment" | "inset" | "x" | "y" | "rotation" | "z-order";

export function positionCapabilities(block: CreativeCompositionBlock, node: CreativeCompositionNode): readonly StudioPositionProperty[] {
  if (hasCompositionParentAuthority(block)) {
    const parent = node.parentId ? block.nodes.find((candidate) => candidate.id === node.parentId) : null;
    const layered = node.parentId === null ? isCardSurfaceLayered(block) : isLayeredContainer(parent);
    if (layered) return ["parent", "x", "y", "width", "alignment", "z-order"];
    return ["parent", "flow-order", "width", "alignment", "inset"];
  }
  return ["x", "y", "width", "alignment", "rotation", "z-order"];
}
