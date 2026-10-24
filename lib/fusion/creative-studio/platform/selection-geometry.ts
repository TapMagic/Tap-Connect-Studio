import {
  alignNodes,
  alignNodesToCanvas,
  distributeNodes,
  tidyNodes,
  type AlignMode,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
} from "../composition";
import { applyLayeredResize, layeredCompositionParentSizePx, isLayeredCompositionParent, layeredResizePolicy } from "./layered-region";

import { computeGroupUnionBounds, compositionGroupSpace, isGroupContentScope, resizeCompositionGroupInBlock, synchronizeCompositionGroups } from "../group-authority";
import type { ContentBoxSize } from "../container-resize";

export const STUDIO_SELECTION_GEOMETRY_CONTRACT = "studioSelectionGeometry@1.0.0" as const;

export type StudioSelectionGeometryOperation =
  | { kind: "align"; mode: AlignMode }
  | { kind: "align-parent"; mode: AlignMode }
  | { kind: "distribute"; axis: "horizontal" | "vertical" }
  | { kind: "match"; mode: "width" | "height" | "both" }
  | { kind: "tidy" };

export type StudioSelectionCompatibility = {
  compatible: boolean;
  reason: string | null;
  nodes: CreativeCompositionNode[];
  parentId: string | null;
};

export function selectionGeometryCompatibility(
  block: CreativeCompositionBlock,
  ids: readonly string[],
): StudioSelectionCompatibility {
  const requested = new Set(ids);
  const nodes = block.nodes.filter((node) => requested.has(node.id));
  if (nodes.length !== requested.size) return { compatible: false, reason: "Some selected objects are no longer available.", nodes, parentId: null };
  if (nodes.length < 2) return { compatible: false, reason: "Select at least two objects.", nodes, parentId: nodes[0]?.parentId ?? null };
  const parents = new Set(nodes.map((node) => node.parentId ?? null));
  if (parents.size !== 1) return { compatible: false, reason: "Choose sibling objects inside the same Card Surface or Container.", nodes, parentId: null };
  const parentId = nodes[0]?.parentId ?? null;
  if (!isLayeredCompositionParent(block, parentId)) {
    return { compatible: false, reason: "Arrange tools require a Layered Card Surface or Container.", nodes, parentId };
  }
  if (nodes.some((node) => node.locked)) return { compatible: false, reason: "Unlock every selected object before arranging the selection.", nodes, parentId: nodes[0]?.parentId ?? null };
  return { compatible: true, reason: null, nodes, parentId };
}

export function selectionOperationAvailability(
  block: CreativeCompositionBlock,
  ids: readonly string[],
  operation: StudioSelectionGeometryOperation,
): { enabled: boolean; reason: string | null } {
  const base = selectionGeometryCompatibility(block, ids);
  if (!base.compatible) return { enabled: false, reason: base.reason };
  if (operation.kind === "distribute" && base.nodes.length < 3) return { enabled: false, reason: "Distribution needs at least three compatible sibling objects." };
  if (operation.kind === "match") {
    const result = matchSelectionFrames(block, ids, operation.mode);
    return { enabled: !result.reason, reason: result.reason };
  }
  return { enabled: true, reason: null };
}

export function applySelectionGeometryOperation(
  block: CreativeCompositionBlock,
  ids: readonly string[],
  operation: StudioSelectionGeometryOperation,
  sizeOf?: (parentId: string | null) => ContentBoxSize,
): CreativeCompositionBlock {
  if (!selectionOperationAvailability(block, ids, operation).enabled) return block;
  if (operation.kind === "match") return matchSelectionFrames(block, ids, operation.mode, sizeOf).block;
  const selectedIds = [...ids];
  const nodes = operation.kind === "align"
    ? alignNodes(block.nodes, selectedIds, operation.mode)
    : operation.kind === "align-parent"
      ? alignNodesToCanvas(block.nodes, selectedIds, operation.mode)
      : operation.kind === "distribute"
        ? distributeNodes(block.nodes, selectedIds, operation.axis)
        : tidyNodes(block.nodes, selectedIds);
  return nodes === block.nodes ? block : { ...block, nodes };
}

export function selectionOperationHistoryLabel(operation: StudioSelectionGeometryOperation): string {
  if (operation.kind === "align") return `Aligned selection ${operation.mode}`;
  if (operation.kind === "align-parent") return `Aligned selection to parent ${operation.mode}`;
  if (operation.kind === "distribute") return `Distributed selection ${operation.axis}`;
  if (operation.kind === "match") return `Matched selection ${operation.mode}`;
  return "Tidied selection";
}

/** Same-parent matching resolves the visible reference from selection order,
 * treating a Group as one target. Every mutation goes through its existing authority.
 */
function matchSelectionFrames(block: CreativeCompositionBlock, ids: readonly string[], mode: "width" | "height" | "both", sizeOf = (id: string | null) => layeredCompositionParentSizePx(block, id)) {
  const targets = [...new Map(ids.flatMap(id => {
    const node = block.nodes.find(n => n.id === id);
    if (!node) return [];
    const groupId = node.groupId && !isGroupContentScope(block.nodes, node.groupId) ? node.groupId : null;
    const bounds = groupId ? computeGroupUnionBounds(block.nodes, groupId, true, compositionGroupSpace(block, groupId)) : null;
    return [[groupId || id, { node, groupId, x: bounds?.left ?? node.x, y: bounds?.top ?? node.y, width: bounds?.width ?? node.width, height: bounds?.height ?? node.height }] as const];
  })).values()];
  const reject = (reason: string) => ({ block, reason });
  if (targets.length < 2) return reject("Select two objects or Groups; a Group is one matching target.");
  const reference = targets[0];
  let next = block;
  for (const target of targets.slice(1)) {
    const policy = target.groupId ? "free" : layeredResizePolicy(target.node);
    let width = mode === "height" ? target.width : reference.width;
    let height = mode === "width" ? target.height : reference.height;
    if (policy === "width-only" && mode !== "width") return reject("This target has content-governed height. Match Width instead.");
    if (policy === "governed-aspect") {
      if (mode === "both" && Math.abs(width / target.width - height / target.height) > .00001) return reject("Matching both dimensions would distort a governed aspect ratio. Match one dimension instead.");
      const scale = mode === "height" ? height / target.height : width / target.width;
      width = target.width * scale; height = target.height * scale;
    }
    next = target.groupId
      ? resizeCompositionGroupInBlock(next, target.groupId, { left: target.x, top: target.y, width, height })
      : applyLayeredResize(next, target.node.id, { x: target.x, y: target.y, width, height }, sizeOf);
    const effective = target.groupId ? computeGroupUnionBounds(next.nodes, target.groupId, true, compositionGroupSpace(next, target.groupId)) : next.nodes.find(n => n.id === target.node.id);
    if (!effective || Math.abs(("left" in effective ? effective.left : effective.x) - target.x) > .00001 || Math.abs(("top" in effective ? effective.top : effective.y) - target.y) > .00001 || Math.abs(effective.width - width) > .00001 || Math.abs(effective.height - height) > .00001) return reject("The requested match exceeds a target’s frame or child constraints. Resize its parent or adjust bounds first.");
  }
  return { block: synchronizeCompositionGroups(next), reason: null };
}
