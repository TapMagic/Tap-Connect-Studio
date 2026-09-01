import { nanoid } from "nanoid";
import type {
  CreativeCompositionBlock,
  CreativeCompositionNode,
} from "@/lib/fusion/creative-studio/composition";

export type CompositionParentId = string | null;

export type CompositionAuthorityIssue = {
  code:
    | "authority_missing"
    | "kind_missing"
    | "parent_missing"
    | "nested_container"
    | "invalid_parent"
    | "cycle"
    | "duplicate_order";
  nodeId?: string;
  message: string;
};

export type CompositionAuthorityResult =
  | { ok: true; block: CreativeCompositionBlock; selectedNodeId?: string }
  | { ok: false; issues: CompositionAuthorityIssue[] };

export function hasCompositionParentAuthority(
  block: CreativeCompositionBlock | null | undefined,
): block is CreativeCompositionBlock & {
  parentAuthority: NonNullable<CreativeCompositionBlock["parentAuthority"]>;
} {
  return block?.parentAuthority?.version === 1 && block.parentAuthority.layout === "flow";
}

/**
 * Deliberate migration entry. It preserves every node byte-for-byte except for
 * adding the new membership fields. Callers must choose when a legacy flat
 * composition is ready to become a flow composition; renderers never migrate
 * silently.
 */
export function establishCompositionParentAuthority(
  block: CreativeCompositionBlock,
  options: { cardGapPx?: number } = {},
): CreativeCompositionBlock {
  if (block.signatureAssembly) {
    throw new Error("Curated compiler output must be adapted into one outer Module before Card flow authority is enabled.");
  }
  if (hasCompositionParentAuthority(block)) return normalizeSiblingOrder(block);
  return normalizeSiblingOrder({
    ...block,
    parentAuthority: {
      version: 1,
      layout: "flow",
      cardGapPx: Math.max(0, Math.round(options.cardGapPx ?? 16)),
    },
    nodes: block.nodes.map((node) => ({
      ...node,
      compositionKind: "module" as const,
      parentId: null,
      siblingOrder: node.zIndex,
    })),
  });
}

export function validateCompositionParentAuthority(
  block: CreativeCompositionBlock,
): CompositionAuthorityIssue[] {
  if (!hasCompositionParentAuthority(block)) {
    return [{ code: "authority_missing", message: "Composition parent authority is not enabled." }];
  }
  const issues: CompositionAuthorityIssue[] = [];
  const byId = new Map(block.nodes.map((node) => [node.id, node]));
  const orders = new Map<string, Set<number>>();
  for (const node of block.nodes) {
    if (node.compositionKind !== "container" && node.compositionKind !== "module") {
      issues.push({ code: "kind_missing", nodeId: node.id, message: `${node.id} has no canonical composition kind.` });
      continue;
    }
    if (node.parentId === undefined || !Number.isFinite(node.siblingOrder)) {
      issues.push({ code: "parent_missing", nodeId: node.id, message: `${node.id} has incomplete parent/order membership.` });
      continue;
    }
    if (node.compositionKind === "container" && node.parentId !== null) {
      issues.push({ code: "nested_container", nodeId: node.id, message: "Containers can only be direct children of the Card Surface." });
    }
    if (node.parentId !== null) {
      const parent = byId.get(node.parentId);
      if (!parent || parent.compositionKind !== "container" || parent.parentId !== null) {
        issues.push({ code: "invalid_parent", nodeId: node.id, message: `${node.id} references an invalid Container parent.` });
      }
    }
    const key = node.parentId ?? "__card_surface__";
    const siblingOrders = orders.get(key) ?? new Set<number>();
    if (siblingOrders.has(node.siblingOrder!)) {
      issues.push({ code: "duplicate_order", nodeId: node.id, message: `${node.id} duplicates a sibling order.` });
    }
    siblingOrders.add(node.siblingOrder!);
    orders.set(key, siblingOrders);
  }
  const reportedCycles = new Set<string>();
  for (const node of block.nodes) {
    const visited = new Set<string>();
    let current: CreativeCompositionNode | undefined = node;
    while (current?.parentId) {
      if (visited.has(current.id)) {
        const cycleKey = [...visited].sort().join(":");
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          issues.push({ code: "cycle", nodeId: node.id, message: "Composition membership contains a parent cycle." });
        }
        break;
      }
      visited.add(current.id);
      current = byId.get(current.parentId);
    }
  }
  return issues;
}

export function compositionChildren(
  block: CreativeCompositionBlock,
  parentId: CompositionParentId,
): CreativeCompositionNode[] {
  if (!hasCompositionParentAuthority(block)) return [];
  return block.nodes
    .filter((node) => node.parentId === parentId)
    .sort((left, right) => (left.siblingOrder ?? 0) - (right.siblingOrder ?? 0));
}

export function normalizeSiblingOrder(
  block: CreativeCompositionBlock,
): CreativeCompositionBlock {
  if (!hasCompositionParentAuthority(block)) return block;
  const parents = new Set<CompositionParentId>([null]);
  for (const node of block.nodes) if (node.compositionKind === "container") parents.add(node.id);
  const membership = new Map<string, { parentId: CompositionParentId; siblingOrder: number }>();
  for (const parentId of parents) {
    block.nodes
      .filter((node) => node.parentId === parentId)
      .sort((left, right) => (left.siblingOrder ?? left.zIndex) - (right.siblingOrder ?? right.zIndex))
      .forEach((node, siblingOrder) => membership.set(node.id, { parentId, siblingOrder }));
  }
  return {
    ...block,
    nodes: block.nodes.map((node) => {
      const next = membership.get(node.id);
      return next ? { ...node, ...next } : node;
    }),
  };
}

function commit(block: CreativeCompositionBlock): CompositionAuthorityResult {
  const normalized = normalizeSiblingOrder(block);
  const issues = validateCompositionParentAuthority(normalized);
  return issues.length ? { ok: false, issues } : { ok: true, block: normalized };
}

function duplicateHostedComposition(block: CreativeCompositionBlock): CreativeCompositionBlock {
  const copy = structuredClone(block);
  const blockId = `composition-${nanoid(8)}`;
  const nodeIds = new Map(copy.nodes.map((node) => [node.id, `node-${nanoid(8)}`]));
  const actionIds = new Map(copy.signatureAssembly?.input.actions.map((action) => [action.id, `action-${nanoid(8)}`]) ?? []);
  const signatureAssembly = copy.signatureAssembly ? {
    ...copy.signatureAssembly,
    input: {
      ...copy.signatureAssembly.input,
      actions: copy.signatureAssembly.input.actions.map((action) => ({
        ...action,
        id: actionIds.get(action.id)!,
        analyticsId: action.analyticsId ? `${action.analyticsId}-copy-${nanoid(4)}` : action.analyticsId,
      })),
    },
  } : undefined;
  return {
    ...copy,
    id: blockId,
    signatureAssembly,
    nodes: copy.nodes.map((node) => ({
      ...node,
      id: nodeIds.get(node.id)!,
      groupId: node.groupId ? nodeIds.get(node.groupId) ?? node.groupId : node.groupId,
      parentId: node.parentId ? nodeIds.get(node.parentId) ?? node.parentId : node.parentId,
      props: {
        ...node.props,
        signatureAssemblyInstanceId: typeof node.props.signatureAssemblyInstanceId === "string" ? blockId : node.props.signatureAssemblyInstanceId,
        signatureActionId: typeof node.props.signatureActionId === "string" ? actionIds.get(node.props.signatureActionId) ?? node.props.signatureActionId : node.props.signatureActionId,
      },
      moduleComposition: node.moduleComposition ? duplicateHostedComposition(node.moduleComposition) : undefined,
    })),
  };
}

export function insertCompositionModule(
  block: CreativeCompositionBlock,
  node: CreativeCompositionNode,
  parentId: CompositionParentId = null,
  index?: number,
): CompositionAuthorityResult {
  if (!hasCompositionParentAuthority(block)) return commit(block);
  const parent = parentId === null ? null : block.nodes.find((candidate) => candidate.id === parentId);
  if (parentId !== null && (!parent || parent.compositionKind !== "container" || parent.parentId !== null)) {
    return { ok: false, issues: [{ code: "invalid_parent", nodeId: node.id, message: "The requested insertion target is not a Card-level Container." }] };
  }
  const siblings = compositionChildren(block, parentId);
  const at = Math.max(0, Math.min(index ?? siblings.length, siblings.length));
  const shifted = new Map(siblings.slice(at).map((sibling) => [sibling.id, (sibling.siblingOrder ?? 0) + 1]));
  return commit({
    ...block,
    nodes: [
      ...block.nodes.map((candidate) => shifted.has(candidate.id) ? { ...candidate, siblingOrder: shifted.get(candidate.id)! } : candidate),
      { ...node, compositionKind: "module", parentId, siblingOrder: at },
    ],
  });
}

export function insertCompositionContainer(
  block: CreativeCompositionBlock,
  container: CreativeCompositionNode,
  index?: number,
): CompositionAuthorityResult {
  if (!hasCompositionParentAuthority(block)) return commit(block);
  if (container.parentId !== null && container.parentId !== undefined) {
    return {
      ok: false,
      issues: [{
        code: "nested_container",
        nodeId: container.id,
        message: "Containers can only be inserted directly on the Card Surface.",
      }],
    };
  }
  const siblings = compositionChildren(block, null);
  const at = Math.max(0, Math.min(index ?? siblings.length, siblings.length));
  const shifted = new Map(siblings.slice(at).map((sibling) => [sibling.id, (sibling.siblingOrder ?? 0) + 1]));
  return commit({
    ...block,
    nodes: [
      ...block.nodes.map((candidate) => shifted.has(candidate.id) ? { ...candidate, siblingOrder: shifted.get(candidate.id)! } : candidate),
      {
        ...container,
        primitive: "frame",
        compositionKind: "container",
        parentId: null,
        siblingOrder: at,
        props: {
          ...container.props,
          componentKind: "container",
          elementKind: "container",
          layout: "flow",
          autoHeight: true,
        },
      },
    ],
  });
}

export function reparentCompositionModule(
  block: CreativeCompositionBlock,
  moduleId: string,
  parentId: CompositionParentId,
  index?: number,
): CompositionAuthorityResult {
  const compositionModule = block.nodes.find((node) => node.id === moduleId);
  if (!compositionModule || compositionModule.compositionKind !== "module") {
    return { ok: false, issues: [{ code: "invalid_parent", nodeId: moduleId, message: "Only Modules can change composition parent." }] };
  }
  const without = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((node) => node.id !== moduleId) });
  return insertCompositionModule(without, compositionModule, parentId, index);
}

export function reorderCompositionNode(
  block: CreativeCompositionBlock,
  nodeId: string,
  index: number,
): CompositionAuthorityResult {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Composition node was not found." }] };
  if (node.compositionKind === "container") {
    const without = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((candidate) => candidate.id !== nodeId) });
    return insertCompositionContainer(without, node, index);
  }
  return reparentCompositionModule(block, nodeId, node.parentId ?? null, index);
}

export function wrapCompositionModules(
  block: CreativeCompositionBlock,
  moduleIds: string[],
  container: CreativeCompositionNode,
): CompositionAuthorityResult {
  const selected = compositionChildren(block, null).filter((node) => moduleIds.includes(node.id));
  if (!selected.length || selected.length !== moduleIds.length || selected.some((node) => node.compositionKind !== "module")) {
    return { ok: false, issues: [{ code: "invalid_parent", message: "Wrap requires direct Card Surface Modules." }] };
  }
  const indices = selected.map((node) => node.siblingOrder ?? -1).sort((a, b) => a - b);
  if (indices.some((value, position) => position > 0 && value !== indices[position - 1]! + 1)) {
    return { ok: false, issues: [{ code: "invalid_parent", message: "Wrap requires contiguous sibling Modules." }] };
  }
  const insertionIndex = indices[0]!;
  const selectedSet = new Set(moduleIds);
  const base = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((node) => !selectedSet.has(node.id)) });
  const inserted = insertCompositionContainer(base, container, insertionIndex);
  if (!inserted.ok) return inserted;
  let current = inserted.block;
  for (const compositionModule of selected) {
    const added = insertCompositionModule(current, compositionModule, container.id);
    if (!added.ok) return added;
    current = added.block;
  }
  return { ok: true, block: current, selectedNodeId: container.id };
}

export function unwrapCompositionContainer(
  block: CreativeCompositionBlock,
  containerId: string,
): CompositionAuthorityResult {
  const container = block.nodes.find((node) => node.id === containerId && node.compositionKind === "container");
  if (!container) return { ok: false, issues: [{ code: "invalid_parent", nodeId: containerId, message: "Container was not found." }] };
  const children = compositionChildren(block, containerId);
  const insertionIndex = container.siblingOrder ?? 0;
  let current = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((node) => node.id !== containerId && node.parentId !== containerId) });
  for (const [offset, child] of children.entries()) {
    const added = insertCompositionModule(current, child, null, insertionIndex + offset);
    if (!added.ok) return added;
    current = added.block;
  }
  return { ok: true, block: current, selectedNodeId: children[0]?.id };
}

export function deleteCompositionNode(
  block: CreativeCompositionBlock,
  nodeId: string,
  options: { deleteContainerContents?: boolean } = {},
): CompositionAuthorityResult {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Composition node was not found." }] };
  if (node.compositionKind === "container" && !options.deleteContainerContents) {
    return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Deleting a Container with its contents requires an explicit destructive confirmation." }] };
  }
  const remove = new Set([nodeId]);
  if (node.compositionKind === "container") {
    for (const child of block.nodes) if (child.parentId === nodeId) remove.add(child.id);
  }
  return commit({ ...block, nodes: block.nodes.filter((candidate) => !remove.has(candidate.id)) });
}

export function duplicateCompositionNode(
  block: CreativeCompositionBlock,
  nodeId: string,
): CompositionAuthorityResult {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Composition node was not found." }] };
  const copyId = `${node.compositionKind === "container" ? "container" : "module"}-${nanoid(8)}`;
  if (node.compositionKind === "module") {
    const copied = structuredClone(node);
    copied.id = copyId;
    copied.name = `${node.name || "Module"} copy`;
    copied.moduleComposition = node.moduleComposition ? duplicateHostedComposition(node.moduleComposition) : undefined;
    const result = insertCompositionModule(block, copied, node.parentId ?? null, (node.siblingOrder ?? 0) + 1);
    return result.ok ? { ...result, selectedNodeId: copyId } : result;
  }
  const copiedContainer = structuredClone(node);
  copiedContainer.id = copyId;
  copiedContainer.name = `${node.name || "Container"} copy`;
  const inserted = insertCompositionContainer(block, copiedContainer, (node.siblingOrder ?? 0) + 1);
  if (!inserted.ok) return inserted;
  let current = inserted.block;
  for (const child of compositionChildren(block, node.id)) {
    const copiedChild = structuredClone(child);
    copiedChild.id = `module-${nanoid(8)}`;
    copiedChild.name = `${child.name || "Module"} copy`;
    const added = insertCompositionModule(current, copiedChild, copyId);
    if (!added.ok) return added;
    current = added.block;
  }
  return { ok: true, block: current, selectedNodeId: copyId };
}

export function createFlowContainerNode(
  name = "Container",
  treatment: "transparent" | "solid" | "smoked_glass" | "image" = "transparent",
): CreativeCompositionNode {
  return {
    id: `container-${nanoid(8)}`,
    primitive: "frame",
    compositionKind: "container",
    parentId: null,
    siblingOrder: 0,
    x: 0,
    y: 0,
    width: 1,
    height: 0.2,
    zIndex: 1,
    name,
    props: {
      componentKind: "container",
      elementKind: "container",
      layout: "flow",
      autoHeight: true,
      padding: 16,
      gap: 12,
      alignment: "stretch",
      containerTreatment: treatment,
      fill: treatment === "solid" ? "#162019" : "transparent",
      radius: 18,
      borderWidth: treatment === "transparent" ? 0 : 1,
      borderColor: "rgba(255,255,255,.12)",
    },
  };
}
