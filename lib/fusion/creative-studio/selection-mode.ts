import type { CreativeCompositionNode } from "./composition";
import type { CreativeObjectKind, SelectionRef } from "./selection-ref";
import { createSelectionRef } from "./selection-ref";
import { objectFamilyForNode, type ObjectFamily } from "./capabilities";

export type SelectionMode = "parent" | "content";

export type NestedTargetLabel = {
  family: ObjectFamily | "card_root";
  parentLabel: string;
  childLabel: string | null;
  display: string;
};

const CHILD_ROLE_LABELS: Record<string, string> = {
  label: "Label",
  icon: "Icon",
  description: "Description",
  image: "Image",
  badge: "Badge",
  wording: "Wording",
  heading: "Headline",
  subheading: "Subheadline",
  text: "Text",
  terms: "Terms",
  offer_code: "Offer code",
  business_name: "Business name",
  address: "Address",
  hours: "Hours",
  logo: "Logo",
  map: "Map",
  button: "Button",
  gallery: "Gallery",
  form: "Form",
  ticket: "Ticket",
  coupon: "Coupon",
};

export function isContainerNode(node: Pick<CreativeCompositionNode, "props">): boolean {
  return String(node.props.componentKind || "") === "container";
}

export function isComponentParent(node: Pick<CreativeCompositionNode, "primitive" | "props">): boolean {
  const family = objectFamilyForNode(node);
  return (
    family === "container" ||
    family === "button" ||
    family === "badge" ||
    family === "coupon" ||
    family === "ticket" ||
    family === "gallery" ||
    family === "form" ||
    family === "map"
  );
}

export function containerChildIds(nodes: readonly CreativeCompositionNode[], containerId: string): string[] {
  const container = nodes.find((node) => node.id === containerId);
  if (!container || !isContainerNode(container)) return [];
  const declared = Array.isArray(container.props.childIds)
    ? container.props.childIds.filter((id): id is string => typeof id === "string")
    : [];
  if (declared.length) {
    return declared.filter((id) => nodes.some((node) => node.id === id));
  }
  return nodes
    .filter((node) => String(node.props.containerId || "") === containerId)
    .map((node) => node.id);
}

/** True Groups only — Containers must not share selection expansion via groupId. */
export function isTrueGroupMember(node: CreativeCompositionNode): boolean {
  if (!node.groupId) return false;
  if (isContainerNode(node)) return false;
  if (node.props.containerId) return false;
  return true;
}

export function selectionModeForNode(node: Pick<CreativeCompositionNode, "props"> | null | undefined): SelectionMode {
  if (!node) return "parent";
  return node.props.contentEditing === true ? "content" : "parent";
}

export function enterContentMode(node: CreativeCompositionNode): CreativeCompositionNode {
  return {
    ...node,
    props: {
      ...node.props,
      contentEditing: true,
      selectionMode: "content",
    },
  };
}

export function exitContentMode(node: CreativeCompositionNode): CreativeCompositionNode {
  const props = { ...node.props };
  delete props.contentEditing;
  delete props.selectionMode;
  delete props.activeButtonContentNodeId;
  delete props.activeComponentContentNodeId;
  return { ...node, props };
}

export function childRoleLabel(node: Pick<CreativeCompositionNode, "name" | "props" | "primitive">): string {
  const role = String(
    node.props.buttonContentRole ||
      node.props.componentContentRole ||
      node.props.presetChildRole ||
      node.props.elementKind ||
      node.primitive ||
      ""
  );
  if (CHILD_ROLE_LABELS[role]) return CHILD_ROLE_LABELS[role];
  if (node.name?.trim()) return node.name.trim();
  return role || "Element";
}

export function parentDisplayLabel(node: Pick<CreativeCompositionNode, "name" | "props" | "primitive">): string {
  const family = objectFamilyForNode(node);
  if (node.name?.trim() && !node.name.includes("Container")) return node.name.trim();
  const labels: Partial<Record<ObjectFamily, string>> = {
    container: "Container",
    button: "Button",
    badge: "Badge",
    coupon: "Coupon",
    ticket: "Ticket",
    gallery: "Gallery",
    form: "Form",
    map: "Map",
    group: "Group",
    text: "Text",
    icon: "Icon",
    image: "Image",
  };
  return labels[family] || "Element";
}

export function nestedTargetLabel(
  parent: Pick<CreativeCompositionNode, "id" | "name" | "props" | "primitive"> | null,
  child: Pick<CreativeCompositionNode, "id" | "name" | "props" | "primitive"> | null
): NestedTargetLabel {
  if (!parent && !child) {
    return { family: "card_root", parentLabel: "Card root", childLabel: null, display: "Card root" };
  }
  if (parent && child && parent.id !== child.id) {
    const parentLabel = parentDisplayLabel(parent);
    const childLabel = childRoleLabel(child);
    return {
      family: objectFamilyForNode(parent),
      parentLabel,
      childLabel,
      display: `${parentLabel} › ${childLabel}`,
    };
  }
  const target = child || parent!;
  const parentLabel = parentDisplayLabel(target);
  return {
    family: objectFamilyForNode(target),
    parentLabel,
    childLabel: null,
    display: parentLabel,
  };
}

export function resolveContainerParent(
  nodes: readonly CreativeCompositionNode[],
  nodeId: string
): CreativeCompositionNode | null {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (isContainerNode(node)) return node;
  const containerId = String(node.props.containerId || "");
  if (!containerId) return null;
  return nodes.find((candidate) => candidate.id === containerId) || null;
}

export function buildObjectSelectionRef(input: {
  documentId: string;
  pageId: string;
  revision: number;
  selectionGeneration: number;
  node: CreativeCompositionNode;
  parent: CreativeCompositionNode | null;
  childPath?: readonly string[];
}): SelectionRef {
  const isChild = Boolean(input.parent && input.parent.id !== input.node.id);
  const objectKind: CreativeObjectKind = isChild
    ? input.node.props.buttonContentRole || input.node.props.componentContentRole
      ? "button_content"
      : "element"
    : isContainerNode(input.node) || input.node.primitive === "group"
      ? input.node.primitive === "group"
        ? "group"
        : "nested_composition"
      : "element";
  return createSelectionRef({
    documentId: input.documentId,
    pageId: input.pageId,
    revision: input.revision,
    objectKind,
    objectId: input.node.id,
    parentId: input.parent?.id ?? null,
    childPath: input.childPath ?? (isChild ? [input.parent!.id, input.node.id] : [input.node.id]),
    selectionGeneration: input.selectionGeneration,
  });
}
