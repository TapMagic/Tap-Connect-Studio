import { rebaseParentRelativeChildren } from "../creative-studio/container-resize";
import { expandSelectionToGroups } from "../creative-studio/composition";
import { isGroupContentScope } from "../creative-studio/group-authority";
import { nanoid } from "nanoid";
import { isLayeredCompositionParent, layeredCompositionParentSizePx, layeredParentRotation } from "../creative-studio/platform/layered-region";
import type {
  CreativeCompositionBlock,
  CreativeCompositionGroup,
  CreativeCompositionNode,
} from "@/lib/fusion/creative-studio/composition";

export type CompositionParentId = string | null;

export type CompositionAuthorityIssue = {
  code:
    | "authority_missing"
    | "kind_missing"
    | "parent_missing"
    | "nested_container"
    | "nesting_depth"
    | "invalid_parent"
    | "cycle"
    | "duplicate_order";
  nodeId?: string;
  message: string;
};

/** Card Surface is depth 0; authored Containers may nest three levels below it. */
export const MAX_COMPOSITION_CONTAINER_DEPTH = 3;

export function compositionContainerDepth(
  block: CreativeCompositionBlock,
  containerId: string,
): number {
  const byId = new Map(block.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let depth = 0;
  let current = byId.get(containerId);
  while (current?.compositionKind === "container") {
    if (visited.has(current.id)) return Number.POSITIVE_INFINITY;
    visited.add(current.id);
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

export type CompositionAuthorityResult =
  | { ok: true; block: CreativeCompositionBlock; selectedNodeId?: string; selectedNodeIds?: string[]; notices?: string[] }
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
    if (node.parentId !== null) {
      const parent = byId.get(node.parentId);
      if (!parent || parent.compositionKind !== "container") {
        issues.push({ code: "invalid_parent", nodeId: node.id, message: `${node.id} references an invalid Container parent.` });
      }
    }
    if (node.compositionKind === "container" && compositionContainerDepth(block, node.id) > MAX_COMPOSITION_CONTAINER_DEPTH) {
      issues.push({ code: "nesting_depth", nodeId: node.id, message: `Containers support at most ${MAX_COMPOSITION_CONTAINER_DEPTH} authored levels below the Card Surface.` });
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
  const groupIds = new Map((copy.groups ?? []).map((group) => [group.id, `group-${nanoid(6)}`]));
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
    groups: copy.groups?.map((group) => ({
      ...group,
      id: groupIds.get(group.id)!,
      parentId: group.parentId ? nodeIds.get(group.parentId) ?? group.parentId : null,
    })),
    nodes: copy.nodes.map((node) => ({
      ...node,
      id: nodeIds.get(node.id)!,
      groupId: node.groupId ? groupIds.get(node.groupId) ?? node.groupId : node.groupId,
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

function isCompositionBlock(value: unknown): value is CreativeCompositionBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<CreativeCompositionBlock>;
  return candidate.version === 1 && typeof candidate.id === "string" && Array.isArray(candidate.nodes);
}

function duplicateNodeProps(props: Record<string, unknown>): Record<string, unknown> {
  const copied = structuredClone(props);
  if (typeof copied.analyticsId === "string") copied.analyticsId = `${copied.analyticsId}:copy:${nanoid(5)}`;
  if (typeof copied.trackingId === "string") copied.trackingId = `${copied.trackingId}:copy:${nanoid(5)}`;
  if (isCompositionBlock(copied.contentComposition)) copied.contentComposition = duplicateHostedComposition(copied.contentComposition);
  if (Array.isArray(copied.mapActions)) {
    copied.mapActions = copied.mapActions.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const action = value as Record<string, unknown>;
      return {
        ...action,
        actionId: `map-action-${nanoid(8)}`,
        analyticsId: typeof action.analyticsId === "string" ? `${action.analyticsId}:copy:${nanoid(5)}` : action.analyticsId,
      };
    });
  }
  const compactGrid = copied.compactActionGrid;
  if (compactGrid && typeof compactGrid === "object" && !Array.isArray(compactGrid)) {
    const grid = compactGrid as Record<string, unknown>;
    copied.compactActionGrid = {
      ...grid,
      componentId: `compact-grid-${nanoid(8)}`,
      analyticsId: typeof grid.analyticsId === "string" ? `${grid.analyticsId}:copy:${nanoid(5)}` : grid.analyticsId,
      tiles: Array.isArray(grid.tiles) ? grid.tiles.map((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return value;
        const tile = value as Record<string, unknown>;
        return {
          ...tile,
          componentId: `compact-tile-${nanoid(8)}`,
          actionId: `action-${nanoid(8)}`,
          analyticsId: typeof tile.analyticsId === "string" ? `${tile.analyticsId}:copy:${nanoid(5)}` : tile.analyticsId,
        };
      }) : grid.tiles,
    };
  }
  return copied;
}

export type CompositionNodeClipboardPayload = {
  version: 1;
  rootId: string;
  rootIds?: string[];
  sourceParent?: { id?: string | null; blockId?: string; widthPx: number; heightPx: number; rotationDeg: number; layered: boolean };
  label: string;
  nodes: CreativeCompositionNode[];
  groups: CreativeCompositionGroup[];
};

/** Captures one canonical Module or a complete Container subtree for page-aware paste. */
export function copyCompositionNodeSubtree(
  block: CreativeCompositionBlock,
  nodeId: string | string[],
  parentSize?: { widthPx: number; heightPx: number },
  renderedFrames?: Record<string, { widthPx: number; heightPx: number }>,
): CompositionNodeClipboardPayload | null {
  if (!hasCompositionParentAuthority(block)) return null;
  const ids = Array.isArray(nodeId) ? nodeId : [nodeId];
  const parentScopeIds = ids.filter((id) => {
    const node = block.nodes.find((candidate) => candidate.id === id);
    return node && !node.props.groupContentEditing && !isGroupContentScope(block.nodes, node.groupId);
  });
  const requested = new Set([...ids, ...expandSelectionToGroups(block.nodes, parentScopeIds)]);
  const roots = block.nodes.filter((node) => requested.has(node.id) && !(() => { let id = node.parentId; while (id) { if (requested.has(id)) return true; id = block.nodes.find((n) => n.id === id)?.parentId; } return false; })());
  roots.sort((a, b) => (a.siblingOrder ?? 0) - (b.siblingOrder ?? 0));
  const root = roots[0];
  if (!root || roots.some((node) => node.parentId !== root.parentId)) return null;
  const included = new Set<string>(roots.map((node) => node.id));
  const ordered: CreativeCompositionNode[] = [];
  const collect = (parentId: string) => {
    for (const child of compositionChildren(block, parentId)) {
      included.add(child.id);
      ordered.push(child);
      if (child.compositionKind === "container") collect(child.id);
    }
  };
  for (const node of roots) { ordered.push(node); if (node.compositionKind === "container") collect(node.id); }
  const groupIds = new Set(ordered.flatMap((node) => node.groupId ? [node.groupId] : []));
  return {
    version: 1,
    rootId: root.id,
    rootIds: roots.map((node) => node.id),
    sourceParent: { id: root.parentId ?? null, blockId: block.id, ...(parentSize ?? layeredCompositionParentSizePx(block, root.parentId ?? null)), rotationDeg: layeredParentRotation(block, root.parentId ?? null), layered: isLayeredCompositionParent(block, root.parentId ?? null) },
    label: roots.length > 1 ? `${roots.length} objects` : root.name || (root.compositionKind === "container" ? "Container" : "Module"),
    nodes: structuredClone(ordered.map((node) => {
      const frame = renderedFrames?.[node.id];
      if (!frame || !roots.includes(node) || isLayeredCompositionParent(block, node.parentId ?? null)) return node;
      const size = parentSize ?? layeredCompositionParentSizePx(block, node.parentId ?? null);
      return { ...node, width: frame.widthPx / size.widthPx, height: frame.heightPx / size.heightPx };
    })),
    groups: structuredClone((block.groups ?? []).filter((group) => groupIds.has(group.id) && (group.parentId === root.parentId || included.has(group.parentId!)) && block.nodes.filter((node) => node.groupId === group.id).every((node) => included.has(node.id)))),
  };
}

/** Pastes a copied subtree through the same parent/order authority used by Add and Outline. */
export function pasteCompositionNodeSubtree(
  block: CreativeCompositionBlock,
  payload: CompositionNodeClipboardPayload,
  parentId: CompositionParentId,
  insertionIndex?: number,
  destinationSize?: { widthPx: number; heightPx: number },
): CompositionAuthorityResult {
  if (!hasCompositionParentAuthority(block)) return commit(block);
  const sourceRoot = payload.nodes.find((node) => node.id === payload.rootId);
  if (!sourceRoot) return { ok: false, issues: [{ code: "invalid_parent", message: "The copied composition object is incomplete." }] };
  const rootIds = new Set(payload.rootIds ?? [payload.rootId]);
  const roots = payload.nodes.filter((node) => rootIds.has(node.id));
  if (!roots.length || roots.some((node) => ![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0)) return { ok: false, issues: [{ code: "invalid_parent", message: "The copied selection has invalid geometry. Copy it again before pasting." }] };
  const notices: string[] = [];
  const size = destinationSize ?? layeredCompositionParentSizePx(block, parentId);
  const sourceSize = payload.sourceParent ?? size;
  const destinationLayered = isLayeredCompositionParent(block, parentId);
  const rotation = (payload.sourceParent?.rotationDeg ?? 0) - layeredParentRotation(block, parentId);
  const angle = rotation * Math.PI / 180;
  const frames = roots.map((node) => {
    const cx = (node.x + node.width / 2) * sourceSize.widthPx, cy = (node.y + node.height / 2) * sourceSize.heightPx;
    const width = node.width * sourceSize.widthPx, height = node.height * sourceSize.heightPx;
    const x = cx * Math.cos(angle) - cy * Math.sin(angle) - width / 2;
    const y = cx * Math.sin(angle) + cy * Math.cos(angle) - height / 2;
    const localAngle = destinationLayered ? ((payload.sourceParent?.layered === false ? 0 : node.rotationDeg || 0) + rotation) * Math.PI / 180 : 0;
    const boundsWidth = Math.max(width, Math.abs(width * Math.cos(localAngle)) + Math.abs(height * Math.sin(localAngle)));
    const boundsHeight = Math.max(height, Math.abs(width * Math.sin(localAngle)) + Math.abs(height * Math.cos(localAngle)));
    return { id: node.id, x, y, width, height, left: x + (width - boundsWidth) / 2, top: y + (height - boundsHeight) / 2, right: x + (width + boundsWidth) / 2, bottom: y + (height + boundsHeight) / 2 };
  });
  const left = Math.min(...frames.map((f) => f.left)), top = Math.min(...frames.map((f) => f.top));
  const width = Math.max(...frames.map((f) => f.right)) - left;
  const height = Math.max(...frames.map((f) => f.bottom)) - top;
  const fit = destinationLayered ? Math.min(1, size.widthPx / width, size.heightPx / height) : Math.min(1, size.widthPx / width);
  const sameParent = payload.sourceParent?.blockId === block.id && payload.sourceParent.id === parentId;
  // A new destination has its own origin. Never interpret a source page Y as
  // destination placement. Repeated paste uses the immutable payload, not the last copy.
  const originX = Math.max(0, Math.min(size.widthPx - width * fit, sameParent ? left + 12 : 12));
  const originY = Math.max(0, Math.min(size.heightPx - height * fit, sameParent ? top + 12 : 12));
  if (fit < 1) notices.push(`Pasted at ${Math.round(fit * 100)}% to fit this parent; relative sizes and spacing were scaled together. Resize the parent for more space.`);
  if (!destinationLayered && payload.sourceParent?.layered) notices.push("Pasted into Flow: layout order controls positioning; Layered placement is retained for a reversible return.");
  const idMap = new Map(payload.nodes.map((node) => [node.id, `${node.compositionKind === "container" ? "container" : "module"}-${nanoid(8)}`]));
  const groupMap = new Map(payload.groups.map((group) => [group.id, `group-${nanoid(8)}`]));
  const maxZ = block.nodes.reduce((maximum, node) => Math.max(maximum, node.zIndex), 0);
  let current: CreativeCompositionBlock = block;
  for (const [offset, source] of payload.nodes.entries()) {
    const isRoot = rootIds.has(source.id);
    const rootIndex = [...rootIds].indexOf(source.id);
    const at = isRoot && insertionIndex !== undefined ? insertionIndex + rootIndex : undefined;
    const targetParentId = isRoot ? parentId : source.parentId ? idMap.get(source.parentId) ?? parentId : parentId;
    const copied: CreativeCompositionNode = {
      ...structuredClone(source),
      id: idMap.get(source.id)!,
      parentId: targetParentId,
      siblingOrder: isRoot ? at ?? compositionChildren(current, parentId).length : source.siblingOrder,
      zIndex: maxZ + offset + 1,
      locked: false,
      groupId: source.groupId ? groupMap.get(source.groupId) ?? null : source.groupId,
      name: isRoot ? `${source.name || (source.compositionKind === "container" ? "Container" : "Module")} copy` : source.name,
      props: duplicateNodeProps(source.props),
      moduleComposition: source.moduleComposition ? duplicateHostedComposition(source.moduleComposition) : undefined,
    };
    const frame = frames.find((entry) => entry.id === source.id);
    if (isRoot && frame && destinationLayered) {
      Object.assign(copied, { x: (originX + (frame.x - left) * fit) / size.widthPx, y: (originY + (frame.y - top) * fit) / size.heightPx,
        width: frame.width * fit / size.widthPx, height: frame.height * fit / size.heightPx, rotationDeg: (payload.sourceParent?.layered === false ? 0 : source.rotationDeg || 0) + rotation });
    }
    if (isRoot && frame && !destinationLayered) {
      const percent = frame.width * fit / size.widthPx * 100;
      copied.props = { ...copied.props, flowWidthPercent: percent, flowAlignment: "start",
        ...(copied.compositionKind === "container" ? { widthPercent: percent } : {}) };
      copied.minHeightPx = frame.height * fit;
    }
    const added = copied.compositionKind === "container"
      ? insertCompositionContainer(current, copied, isRoot ? at : undefined)
      : insertCompositionModule(current, copied, targetParentId, isRoot ? at : undefined);
    if (!added.ok) return added;
    current = added.block;
  }
  const groups = payload.groups.map((group) => ({
    ...structuredClone(group),
    id: groupMap.get(group.id)!,
    parentId: group.parentId ? idMap.get(group.parentId) ?? parentId : parentId,
    name: `${group.name || "Group"} copy`,
    locked: false,
  }));
  const result = commit({ ...current, groups: [...(current.groups ?? []), ...groups] });
  return result.ok ? { ...result, selectedNodeId: idMap.get(payload.rootId), selectedNodeIds: [...rootIds].map((id) => idMap.get(id)!), notices } : result;
}

export function insertCompositionModule(
  block: CreativeCompositionBlock,
  node: CreativeCompositionNode,
  parentId: CompositionParentId = null,
  index?: number,
): CompositionAuthorityResult {
  if (!hasCompositionParentAuthority(block)) return commit(block);
  const parent = parentId === null ? null : block.nodes.find((candidate) => candidate.id === parentId);
  if (parentId !== null && (!parent || parent.compositionKind !== "container")) {
    return { ok: false, issues: [{ code: "invalid_parent", nodeId: node.id, message: "The requested insertion target is not a canonical Container." }] };
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
  const parentId = container.parentId ?? null;
  const parent = parentId ? block.nodes.find((candidate) => candidate.id === parentId) : null;
  if (parentId && (!parent || parent.compositionKind !== "container")) {
    return {
      ok: false,
      issues: [{
        code: "invalid_parent",
        nodeId: container.id,
        message: "The requested Container parent is not available.",
      }],
    };
  }
  if (parentId && compositionContainerDepth(block, parentId) >= MAX_COMPOSITION_CONTAINER_DEPTH) {
    return {
      ok: false,
      issues: [{
        code: "nesting_depth",
        nodeId: container.id,
        message: `Containers support at most ${MAX_COMPOSITION_CONTAINER_DEPTH} authored levels below the Card Surface.`,
      }],
    };
  }
  const siblings = compositionChildren(block, parentId);
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
        parentId,
        siblingOrder: at,
        props: {
          ...container.props,
          componentKind: "container",
          elementKind: "container",
          layout: container.props.layout ?? "flow",
          autoHeight: container.props.autoHeight ?? true,
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

/** Reparents a Module or Container while preserving canonical identity and responsive geometry. */
export function reparentCompositionNode(
  block: CreativeCompositionBlock,
  nodeId: string,
  parentId: CompositionParentId,
  index?: number,
): CompositionAuthorityResult {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Composition node was not found." }] };
  if (nodeId === parentId) return { ok: false, issues: [{ code: "cycle", nodeId, message: "A Container cannot contain itself." }] };
  if (node.compositionKind === "module") return reparentCompositionModule(block, nodeId, parentId, index);
  if (node.compositionKind !== "container") return { ok: false, issues: [{ code: "invalid_parent", nodeId, message: "Only canonical Modules and Containers can change parent." }] };
  let cursor = parentId ? block.nodes.find((candidate) => candidate.id === parentId) : undefined;
  while (cursor) {
    if (cursor.id === nodeId) return { ok: false, issues: [{ code: "cycle", nodeId, message: "A Container cannot move inside one of its descendants." }] };
    cursor = cursor.parentId ? block.nodes.find((candidate) => candidate.id === cursor!.parentId) : undefined;
  }
  const descendants = new Set<string>();
  const collect = (containerId: string) => {
    for (const child of block.nodes.filter((candidate) => candidate.parentId === containerId && candidate.compositionKind === "container")) {
      descendants.add(child.id);
      collect(child.id);
    }
  };
  collect(nodeId);
  const targetDepth = parentId ? compositionContainerDepth(block, parentId) : 0;
  const subtreeDepth = Math.max(1, ...[nodeId, ...descendants].map((id) => compositionContainerDepth(block, id) - compositionContainerDepth(block, nodeId) + 1));
  if (targetDepth + subtreeDepth > MAX_COMPOSITION_CONTAINER_DEPTH) {
    return { ok: false, issues: [{ code: "nesting_depth", nodeId, message: `That move would exceed ${MAX_COMPOSITION_CONTAINER_DEPTH} Container levels.` }] };
  }
  const without = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((candidate) => candidate.id !== nodeId) });
  return insertCompositionContainer(without, { ...node, parentId }, index);
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
  const selected = block.nodes.filter((node) => moduleIds.includes(node.id));
  if (!selected.length || selected.length !== moduleIds.length || selected.some((node) => node.compositionKind !== "module")) {
    return { ok: false, issues: [{ code: "invalid_parent", message: "Wrap requires compatible sibling Modules." }] };
  }
  const parentId = selected[0]?.parentId ?? null;
  if (selected.some((node) => (node.parentId ?? null) !== parentId)) return { ok: false, issues: [{ code: "invalid_parent", message: "Wrap requires Modules from one parent." }] };
  const siblings = compositionChildren(block, parentId);
  if (container.parentId !== undefined && container.parentId !== null && container.parentId !== parentId) return { ok: false, issues: [{ code: "invalid_parent", message: "The new Container must share the selected Modules' parent." }] };
  const indices = selected.map((node) => siblings.findIndex((sibling) => sibling.id === node.id)).sort((a, b) => a - b);
  if (indices.some((value, position) => position > 0 && value !== indices[position - 1]! + 1)) {
    return { ok: false, issues: [{ code: "invalid_parent", message: "Wrap requires contiguous sibling Modules." }] };
  }
  const insertionIndex = indices[0]!;
  const selectedSet = new Set(moduleIds);
  const base = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((node) => !selectedSet.has(node.id)) });
  const inserted = insertCompositionContainer(base, { ...container, parentId }, insertionIndex);
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
  const targetParentId = container.parentId ?? null;
  let current = normalizeSiblingOrder({ ...block, nodes: block.nodes.filter((node) => node.id !== containerId && node.parentId !== containerId) });
  for (const [offset, child] of children.entries()) {
    const added = child.compositionKind === "container"
      ? insertCompositionContainer(current, { ...child, parentId: targetParentId }, insertionIndex + offset)
      : insertCompositionModule(current, child, targetParentId, insertionIndex + offset);
    if (!added.ok) return added;
    current = added.block;
  }
  const movedGroupIds = new Set(children.flatMap((child) => child.groupId ? [child.groupId] : []));
  if (movedGroupIds.size) current = { ...current, groups: (current.groups ?? []).map((group) => movedGroupIds.has(group.id) ? { ...group, parentId: targetParentId } : group) };
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
    let changed = true;
    while (changed) {
      changed = false;
      for (const child of block.nodes) if (child.parentId && remove.has(child.parentId) && !remove.has(child.id)) { remove.add(child.id); changed = true; }
    }
  }
  const nodes = block.nodes.filter((candidate) => !remove.has(candidate.id));
  const liveGroupIds = new Set(nodes.flatMap((candidate) => candidate.groupId ? [candidate.groupId] : []));
  return commit({ ...block, nodes, groups: (block.groups ?? []).filter((group) => liveGroupIds.has(group.id)) });
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
  const descendants: CreativeCompositionNode[] = [];
  const collect = (parentId: string) => {
    for (const child of compositionChildren(block, parentId)) {
      descendants.push(child);
      if (child.compositionKind === "container") collect(child.id);
    }
  };
  collect(node.id);
  const idMap = new Map<string, string>([[node.id, copyId], ...descendants.map((child) => [child.id, `${child.compositionKind === "container" ? "container" : "module"}-${nanoid(8)}`] as const)]);
  const groupIds = new Map<string, string>();
  for (const child of descendants) if (child.groupId && !groupIds.has(child.groupId)) groupIds.set(child.groupId, `group-${nanoid(6)}`);
  for (const child of descendants) {
    const copiedChild = structuredClone(child);
    copiedChild.id = idMap.get(child.id)!;
    copiedChild.parentId = child.parentId ? idMap.get(child.parentId) ?? child.parentId : null;
    copiedChild.groupId = child.groupId ? groupIds.get(child.groupId) ?? child.groupId : child.groupId;
    copiedChild.name = `${child.name || (child.compositionKind === "container" ? "Container" : "Module")} copy`;
    copiedChild.moduleComposition = child.moduleComposition ? duplicateHostedComposition(child.moduleComposition) : undefined;
    const added = copiedChild.compositionKind === "container"
      ? insertCompositionContainer(current, copiedChild)
      : insertCompositionModule(current, copiedChild, copiedChild.parentId ?? null);
    if (!added.ok) return added;
    current = added.block;
  }
  if (block.groups?.length && groupIds.size) {
    current = {
      ...current,
      groups: [
        ...(current.groups ?? []),
        ...block.groups.filter((group) => groupIds.has(group.id)).map((group) => ({
          ...structuredClone(group),
          id: groupIds.get(group.id)!,
          name: `${group.name || "Group"} copy`,
          parentId: group.parentId ? idMap.get(group.parentId) ?? group.parentId : null,
        })),
      ],
    };
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
      widthPercent: 100,
      minWidthPx: 0,
      maxWidthPx: 1200,
      contentFit: "fit_content",
      clipContent: false,
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

/** Explicit fit command for Flow content inside a bounded Placement frame.
 * Renderer observations supply required height; parent authority owns the mutation.
 * Grow ancestor planes while retaining every existing child's physical placement.
 */
export function expandFlowPasteDestination(
  block: CreativeCompositionBlock,
  parentId: string,
  requiredOuterHeightPx: number,
  sizeOf: (parentId: string | null) => { widthPx: number; heightPx: number },
): CompositionAuthorityResult {
  let next = block;
  let id: string | null = parentId;
  let required = Math.ceil(requiredOuterHeightPx);
  while (id !== null) {
    const node = next.nodes.find((candidate) => candidate.id === id);
    if (!node || node.compositionKind !== "container" || node.locked) return { ok: false, issues: [{ code: "invalid_parent", message: "Resize or unlock the destination Container before pasting." }] };
    const parent = node.parentId ?? null;
    const size = sizeOf(parent);
    const absolute = isLayeredCompositionParent(next, parent);
    const oldContent = sizeOf(node.id).heightPx;
    const padding = Math.max(0, Number(node.props.padding) || 0) * 2;
    const oldHeight = absolute ? node.height * size.heightPx : oldContent + padding;
    const height = Math.max(oldHeight, required);
    const newContent = Math.max(1, height - padding);
    next = { ...next, nodes: next.nodes.map((candidate) => candidate.id === id
      ? absolute ? { ...candidate, height: height / size.heightPx } : { ...candidate, props: { ...candidate.props, ...(candidate.props.contentFit === "fixed" ? { heightPx: height } : { minHeightPx: height }) } }
      : candidate) };
    if (isLayeredCompositionParent(next, id)) {
      const widthPx = sizeOf(id).widthPx;
      next = { ...next, nodes: rebaseParentRelativeChildren(next.nodes, id, { widthPx, heightPx: oldContent }, { widthPx, heightPx: newContent }) };
    }
    if (!absolute) break; // Auto Flow ancestors participate in native reflow.
    const angle = (Number(node.rotationDeg) || 0) * Math.PI / 180;
    const rotatedHeight = Math.abs(node.width * size.widthPx * Math.sin(angle)) + Math.abs(height * Math.cos(angle));
    const bottom = node.y * size.heightPx + height / 2 + rotatedHeight / 2;
    if (bottom <= size.heightPx) break;
    if (parent === null) {
      const newHeight = Math.ceil(bottom + 12);
      if (newHeight > 1600) return { ok: false, issues: [{ code: "invalid_parent", message: "This paste would exceed the 1600px Layered page limit. Choose another Container or reduce the copied selection." }] };
      next = { ...next, compositionMode: { ...next.compositionMode!, layeredHeightPx: newHeight },
        explicitMinimumHeightPx: Math.max(next.explicitMinimumHeightPx ?? 0, newHeight + (next.safeAreaPaddingPx ?? 12) * 2),
        nodes: rebaseParentRelativeChildren(next.nodes, null, size, { ...size, heightPx: newHeight }) };
      break;
    }
    const ancestor = next.nodes.find((candidate) => candidate.id === parent)!;
    required = bottom + Math.max(0, Number(ancestor.props.padding) || 0) * 2;
    id = parent;
  }
  return commit(next);
}
