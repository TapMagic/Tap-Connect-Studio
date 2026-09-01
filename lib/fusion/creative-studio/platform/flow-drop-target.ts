import { compositionChildren, hasCompositionParentAuthority, type CompositionParentId } from "@/lib/fusion/card/composition-parent-authority";
import type { CreativeCompositionBlock } from "../composition";

export const STUDIO_FLOW_DROP_TARGET_CONTRACT = "studioFlowDropTarget@1.0.0" as const;

export type StudioFlowDropTarget = {
  contractId: typeof STUDIO_FLOW_DROP_TARGET_CONTRACT;
  parentId: CompositionParentId;
  index: number;
};

export type StudioFlowDropResolution =
  | { ok: true; target: StudioFlowDropTarget }
  | { ok: false; reason: string };

/** Shared validation for Card and Outline insertion affordances. */
export function resolveFlowDropTarget(
  block: CreativeCompositionBlock,
  nodeId: string,
  parentId: CompositionParentId,
  index: number,
): StudioFlowDropResolution {
  if (!hasCompositionParentAuthority(block)) return { ok: false, reason: "Card flow authority is unavailable." };
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { ok: false, reason: "The dragged object is no longer available." };
  if (node.compositionKind === "container" && parentId !== null) {
    return { ok: false, reason: "Containers remain on the Card Surface." };
  }
  if (parentId !== null) {
    const parent = block.nodes.find((candidate) => candidate.id === parentId);
    if (!parent || parent.compositionKind !== "container" || parent.parentId !== null) {
      return { ok: false, reason: "That location is not a valid Container." };
    }
  }
  const siblings = compositionChildren(block, parentId).filter((candidate) => candidate.id !== nodeId);
  return {
    ok: true,
    target: {
      contractId: STUDIO_FLOW_DROP_TARGET_CONTRACT,
      parentId,
      index: Math.max(0, Math.min(Math.round(index), siblings.length)),
    },
  };
}
