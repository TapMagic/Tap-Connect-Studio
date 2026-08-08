/**
 * Resolved EditorContext — single authority for selection mode, scope, target, and capability.
 * Canvas, toolbar, drawer, mutation, and renderer must agree on this resolution.
 */

import type { CreativeCompositionNode } from "./composition";
import { objectFamilyForNode, type ObjectFamily } from "./capabilities";
import {
  groupMembers,
  isGroupContentEditing,
  isGroupContentScope,
  isGroupParentSelection,
  resolveActiveGroupId,
} from "./group-authority";
import {
  isComponentParent,
  isContainerNode,
  resolveContainerParent,
  selectionModeForNode,
} from "./selection-mode";

/** Explicit mutually exclusive selection modes. */
export type EditorSelectionMode =
  | "NONE"
  | "SINGLE_OBJECT"
  | "MULTI_SELECTION"
  | "GROUP_PARENT"
  | "GROUP_CONTENT"
  | "COMPONENT_PARENT"
  | "COMPONENT_CONTENT"
  | "CARD_ROOT";

export type EditorContext = {
  selectionMode: EditorSelectionMode;
  selectedTargets: string[];
  parentTarget: string | null;
  childTarget: string | null;
  activeScope: "root" | "parent" | "content" | "group" | "group_content" | "multi" | "none";
  objectFamily: ObjectFamily | "card_root" | "group" | "multi" | "none";
  capability: string | null;
  groupId: string | null;
  /** True when Group parent chrome must be the only object toolbar. */
  exclusiveGroupToolbar: boolean;
  /** True when content scope is active but Owner has not chosen a child yet. */
  awaitingContentChild: boolean;
};

export function resolveEditorContext(input: {
  nodes: readonly CreativeCompositionNode[];
  selectedIds: readonly string[];
  explicitCardRootSelected?: boolean;
  selectedCapability?: string | null;
}): EditorContext {
  const selectedIds = [...input.selectedIds];
  const capability = input.selectedCapability ?? null;

  if (!selectedIds.length) {
    if (input.explicitCardRootSelected) {
      return {
        selectionMode: "CARD_ROOT",
        selectedTargets: [],
        parentTarget: null,
        childTarget: null,
        activeScope: "root",
        objectFamily: "card_root",
        capability,
        groupId: null,
        exclusiveGroupToolbar: false,
        awaitingContentChild: false,
      };
    }
    return {
      selectionMode: "NONE",
      selectedTargets: [],
      parentTarget: null,
      childTarget: null,
      activeScope: "none",
      objectFamily: "none",
      capability,
      groupId: null,
      exclusiveGroupToolbar: false,
      awaitingContentChild: false,
    };
  }

  const groupId = resolveActiveGroupId(input.nodes, selectedIds);
  const contentScopeGroupId =
    groupId ||
    (() => {
      const first = input.nodes.find((node) => selectedIds.includes(node.id));
      return first?.groupId && isGroupContentScope(input.nodes, first.groupId) ? first.groupId : null;
    })();

  if (contentScopeGroupId && isGroupContentScope(input.nodes, contentScopeGroupId)) {
    const activeChild = isGroupContentEditing(input.nodes, selectedIds)
      ? selectedIds[0] ?? null
      : null;
    const awaiting = !activeChild;
    return {
      selectionMode: "GROUP_CONTENT",
      selectedTargets: selectedIds,
      parentTarget: contentScopeGroupId,
      childTarget: activeChild,
      activeScope: "group_content",
      objectFamily: activeChild
        ? objectFamilyForNode(input.nodes.find((n) => n.id === activeChild) || { primitive: "shape", props: {} })
        : "group",
      capability,
      groupId: contentScopeGroupId,
      exclusiveGroupToolbar: false,
      awaitingContentChild: awaiting,
    };
  }

  if (groupId && isGroupParentSelection(input.nodes, selectedIds)) {
    return {
      selectionMode: "GROUP_PARENT",
      selectedTargets: groupMembers(input.nodes, groupId).map((n) => n.id),
      parentTarget: groupId,
      childTarget: null,
      activeScope: "group",
      objectFamily: "group",
      capability,
      groupId,
      exclusiveGroupToolbar: true,
      awaitingContentChild: false,
    };
  }

  if (selectedIds.length > 1) {
    return {
      selectionMode: "MULTI_SELECTION",
      selectedTargets: selectedIds,
      parentTarget: null,
      childTarget: null,
      activeScope: "multi",
      objectFamily: "multi",
      capability,
      groupId: null,
      exclusiveGroupToolbar: false,
      awaitingContentChild: false,
    };
  }

  const node = input.nodes.find((candidate) => candidate.id === selectedIds[0]);
  if (!node) {
    return {
      selectionMode: "NONE",
      selectedTargets: [],
      parentTarget: null,
      childTarget: null,
      activeScope: "none",
      objectFamily: "none",
      capability,
      groupId: null,
      exclusiveGroupToolbar: false,
      awaitingContentChild: false,
    };
  }

  const containerParent = resolveContainerParent(input.nodes, node.id);
  if (containerParent && containerParent.id !== node.id && selectionModeForNode(containerParent) === "content") {
    return {
      selectionMode: "COMPONENT_CONTENT",
      selectedTargets: [node.id],
      parentTarget: containerParent.id,
      childTarget: node.id,
      activeScope: "content",
      objectFamily: objectFamilyForNode(node),
      capability,
      groupId: null,
      exclusiveGroupToolbar: false,
      awaitingContentChild: false,
    };
  }

  if (isComponentParent(node) || isContainerNode(node)) {
    const contentMode = selectionModeForNode(node) === "content";
    const childId = String(node.props.activeButtonContentNodeId || node.props.activeComponentContentNodeId || "");
    return {
      selectionMode: contentMode ? "COMPONENT_CONTENT" : "COMPONENT_PARENT",
      selectedTargets: [node.id],
      parentTarget: node.id,
      childTarget: contentMode && childId ? childId : null,
      activeScope: contentMode ? "content" : "parent",
      objectFamily: objectFamilyForNode(node),
      capability,
      groupId: null,
      exclusiveGroupToolbar: false,
      awaitingContentChild: contentMode && !childId,
    };
  }

  return {
    selectionMode: "SINGLE_OBJECT",
    selectedTargets: [node.id],
    parentTarget: containerParent?.id ?? null,
    childTarget: null,
    activeScope: "parent",
    objectFamily: objectFamilyForNode(node),
    capability,
    groupId: null,
    exclusiveGroupToolbar: false,
    awaitingContentChild: false,
  };
}

/** Toolbar chrome family allowed for the resolved mode — never stack Group + object family. */
export function toolbarChromeForContext(ctx: EditorContext): "none" | "group_parent" | "group_content_awaiting" | "object" | "multi" | "card_root" {
  switch (ctx.selectionMode) {
    case "NONE":
      return "none";
    case "CARD_ROOT":
      return "card_root";
    case "GROUP_PARENT":
      return "group_parent";
    case "GROUP_CONTENT":
      return ctx.awaitingContentChild ? "group_content_awaiting" : "object";
    case "MULTI_SELECTION":
      return "multi";
    default:
      return "object";
  }
}
