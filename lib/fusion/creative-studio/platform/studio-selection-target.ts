import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import type { SelectionRef } from "../selection-ref";
import { hasCompositionParentAuthority } from "@/lib/fusion/card/composition-parent-authority";
import { positionCapabilities, type StudioPositionProperty } from "./position-capability";

export const STUDIO_SELECTION_TARGET_CONTRACT = "studioSelectionTarget@1.0.0" as const;

export type StudioSelectionSemanticKind =
  | "card-surface"
  | "flow-container"
  | "flow-module"
  | "curated-system"
  | "freeform-object"
  | "none";

export type StudioSelectionCapability =
  | "edit-content"
  | "edit-action"
  | "edit-appearance"
  | "position"
  | "move-directly"
  | "duplicate"
  | "delete";

export type StudioSelectionTarget = Readonly<{
  contract: typeof STUDIO_SELECTION_TARGET_CONTRACT;
  selection: SelectionRef;
  semanticKind: StudioSelectionSemanticKind;
  objectId: string | null;
  parentId: string | null;
  node: CreativeCompositionNode | null;
  block: CreativeCompositionBlock | null;
  ownership: "card-flow" | "curated-recipe" | "freeform" | "none";
  capabilities: readonly StudioSelectionCapability[];
  position: readonly StudioPositionProperty[];
}>;

export function resolveStudioSelectionTarget(input: {
  selection: SelectionRef;
  root?: CreativeCompositionBlock | null;
  selectedNode?: CreativeCompositionNode | null;
  selectedBlock?: CreativeCompositionBlock | null;
}): StudioSelectionTarget {
  const { selection, root = null, selectedNode = null, selectedBlock = null } = input;
  // A freshly chosen Outline/canvas object outranks the previously selected
  // Card Surface. The legacy selection ref may lag one render behind the
  // canonical composition selection and must not hide object controls.
  if (!selectedNode && (selection.targetLevel === "card-root" || selection.objectKind === "root_surface")) {
    return target(selection, "card-surface", null, root, "card-flow", ["edit-appearance"], []);
  }
  if (!selectedNode) return target(selection, "none", null, null, "none", [], []);

  const rootNode = root?.nodes.find((node) => node.id === selectedNode.id) ?? null;
  if (rootNode && root && hasCompositionParentAuthority(root)) {
    if (rootNode.moduleComposition?.signatureAssembly) {
      return target(selection, "curated-system", rootNode, root, "curated-recipe",
        ["edit-content", "position", "move-directly", "duplicate", "delete"],
        positionCapabilities(root, rootNode));
    }
    const kind = rootNode.compositionKind === "container" ? "flow-container" : "flow-module";
    const capabilities: StudioSelectionCapability[] = ["position", "move-directly", "duplicate", "delete"];
    if (rootNode.primitive === "button") capabilities.unshift("edit-content", "edit-action", "edit-appearance");
    else capabilities.unshift("edit-content", "edit-appearance");
    return target(selection, kind, rootNode, root, "card-flow", capabilities, positionCapabilities(root, rootNode));
  }

  if (selectedBlock) {
    const capabilities: StudioSelectionCapability[] = ["edit-content", "edit-appearance", "position", "move-directly", "duplicate", "delete"];
    if (selectedNode.primitive === "button") capabilities.splice(1, 0, "edit-action");
    return target(selection, "freeform-object", selectedNode, selectedBlock, "freeform", capabilities, positionCapabilities(selectedBlock, selectedNode));
  }
  return target(selection, "none", null, null, "none", [], []);
}

function target(
  selection: SelectionRef,
  semanticKind: StudioSelectionSemanticKind,
  node: CreativeCompositionNode | null,
  block: CreativeCompositionBlock | null,
  ownership: StudioSelectionTarget["ownership"],
  capabilities: readonly StudioSelectionCapability[],
  position: readonly StudioPositionProperty[],
): StudioSelectionTarget {
  return Object.freeze({
    contract: STUDIO_SELECTION_TARGET_CONTRACT,
    selection,
    semanticKind,
    objectId: node?.id ?? (semanticKind === "card-surface" ? selection.objectId : null),
    parentId: node?.parentId ?? null,
    node,
    block,
    ownership,
    capabilities: Object.freeze([...capabilities]),
    position: Object.freeze([...position]),
  });
}
