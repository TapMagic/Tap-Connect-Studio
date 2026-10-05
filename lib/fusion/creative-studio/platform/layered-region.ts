import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { snapCompositionNodes, type CompositionGuide } from "../composition-snap";
import { compositionChildren } from "../../card/composition-parent-authority";

export const STUDIO_LAYERED_REGION_CONTRACT = "studioLayeredRegion@1.0.0" as const;
export type StudioContainerCompositionMode = "flow" | "layered";
export type StudioLayeredResizePolicy = "free" | "width-only" | "governed-aspect";

export function layeredResizePolicy(node: CreativeCompositionNode): StudioLayeredResizePolicy {
  if (node.moduleComposition?.signatureAssembly) return "governed-aspect";
  const kind = String(node.props.elementKind || node.primitive);
  if (node.primitive === "text") return String(node.props.textHeightMode || "auto") === "auto" ? "width-only" : "free";
  if (node.primitive === "image" && kind !== "map") {
    // An intrinsic Image preserves its authored aspect. Once the Host chooses
    // a framed crop/fill treatment, the frame is independently resizable and
    // the existing fit/focal authority governs image content inside it.
    if (node.props.aspectLocked === true) return "governed-aspect";
    const fit = String(node.props.fit || node.props.imageFit || "contain");
    return fit === "cover" || fit === "fill" || node.props.cropEnabled === true ? "free" : "governed-aspect";
  }
  if (node.primitive === "video") return "governed-aspect";
  if (node.primitive === "button" || kind === "divider") return "width-only";
  return "free";
}

export type StudioRectangularResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function allowedLayeredResizeHandles(node: CreativeCompositionNode): readonly StudioRectangularResizeHandle[] {
  const policy = layeredResizePolicy(node);
  if (policy === "width-only") return ["e", "w"];
  if (policy === "governed-aspect") return ["nw", "ne", "se", "sw"];
  return ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
}

export function readContainerCompositionMode(node: CreativeCompositionNode): StudioContainerCompositionMode {
  return node.compositionKind === "container" && node.props.layout === "layered" ? "layered" : "flow";
}

export function isLayeredContainer(node: CreativeCompositionNode | null | undefined): boolean {
  return Boolean(node && readContainerCompositionMode(node) === "layered");
}

export function isCardSurfaceLayered(block: CreativeCompositionBlock): boolean {
  return block.compositionMode?.mode === "layered";
}

export function isLayeredCompositionParent(block: CreativeCompositionBlock, parentId: string | null): boolean {
  if (parentId === null) return isCardSurfaceLayered(block);
  return isLayeredContainer(block.nodes.find((node) => node.id === parentId));
}

export type StudioPlacementFrame = { x?: number; y?: number; width: number; height: number };

/**
 * Resolves insertion geometry against the destination parent itself. This is
 * the single boundary between Add/drag-drop and canonical layered geometry;
 * a nested Container must never inherit root sibling occupancy or flow sizing.
 */
export function placeNodeInCompositionParent(
  block: CreativeCompositionBlock,
  node: CreativeCompositionNode,
  parentId: string | null,
  requested?: StudioPlacementFrame,
): CreativeCompositionNode {
  if (!isLayeredCompositionParent(block, parentId)) return { ...node, parentId };
  const parent = parentId ? block.nodes.find((candidate) => candidate.id === parentId) : null;
  const parentHeightPx = parent ? Math.max(180, Number(parent.props.layeredHeightPx) || 360) : Math.max(240, block.compositionMode?.layeredHeightPx ?? 620);
  const fallback = layeredDefaultSize(node, parentHeightPx);
  const width = clamp(requested?.width ?? fallback.width, .08, .96);
  const height = clamp(requested?.height ?? fallback.height, .04, .9);
  const siblings = compositionChildren(block, parentId).filter((candidate) => candidate.visible !== false);
  const explicit = typeof requested?.x === "number" && typeof requested?.y === "number";
  const placement = explicit
    ? { x: clamp(requested!.x!, 0, 1 - width), y: clamp(requested!.y!, 0, 1 - height) }
    : findLayeredOpening(width, height, siblings);
  return {
    ...node,
    parentId,
    ...placement,
    width,
    height,
    // Layered parent-authority coordinates are a visual top-left frame. Anchor
    // is an explicit responsive choice, not an alternate interpretation of x/y.
    anchor: node.anchor ?? "top-left",
    zIndex: siblings.reduce((highest, candidate) => Math.max(highest, candidate.zIndex || 1), 0) + 1,
  };
}

export function setCardSurfaceCompositionMode(
  block: CreativeCompositionBlock,
  mode: StudioContainerCompositionMode,
): CreativeCompositionBlock {
  const roots = block.nodes.filter((node) => node.parentId === null).sort((a, b) => (a.siblingOrder ?? 0) - (b.siblingOrder ?? 0));
  const initialized = block.compositionMode?.layeredPlacementInitialized === true;
  const heightPx = block.compositionMode?.layeredHeightPx ?? 620;
  const seeded = new Map<string, Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "anchor">>();
  if (mode === "layered" && !initialized) {
    const occupied: CreativeCompositionNode[] = [];
    for (const node of roots) {
      const frame = spatialSeed(node, heightPx, occupied);
      seeded.set(node.id, frame);
      occupied.push({ ...node, ...frame });
    }
  }
  return {
    ...block,
    compositionMode: {
      version: 1,
      mode,
      layeredHeightPx: heightPx,
      layeredPlacementInitialized: initialized || mode === "layered",
    },
    nodes: mode === "flow" ? block.nodes : block.nodes.map((node) => {
      if (node.parentId !== null) return node;
      if (!initialized) return { ...node, ...seeded.get(node.id), zIndex: Math.max(1, node.zIndex || 1) };
      const width = clamp(Number.isFinite(node.width) ? node.width : .84, .12, .94);
      const height = clamp(Number.isFinite(node.height) ? node.height : .16, .06, .82);
      return { ...node, x: clamp(node.x, 0, 1 - width), y: clamp(node.y, 0, 1 - height), width, height, zIndex: Math.max(1, node.zIndex || 1) };
    }),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Enables bounded local composition without changing the Card's root Flow authority.
 * Existing membership and sibling order remain canonical; only local geometry is seeded.
 */
export function setContainerCompositionMode(
  block: CreativeCompositionBlock,
  containerId: string,
  mode: StudioContainerCompositionMode,
): CreativeCompositionBlock {
  const container = block.nodes.find((node) => node.id === containerId && node.compositionKind === "container");
  if (!container) return block;
  const children = block.nodes
    .filter((node) => node.parentId === containerId)
    .sort((a, b) => (a.siblingOrder ?? 0) - (b.siblingOrder ?? 0));
  const initialized = container.props.layeredPlacementInitialized === true;
  const heightPx = Number(container.props.layeredHeightPx) || 360;
  const seeded = new Map<string, Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "anchor">>();
  if (mode === "layered" && !initialized) {
    const occupied: CreativeCompositionNode[] = [];
    for (const child of children) {
      const frame = spatialSeed(child, heightPx, occupied);
      seeded.set(child.id, frame);
      occupied.push({ ...child, ...frame });
    }
  }
  return {
    ...block,
    nodes: block.nodes.map((node) => {
      if (node.id === containerId) {
        return { ...node, props: { ...node.props, layout: mode, layeredHeightPx: heightPx, layeredPlacementInitialized: initialized || mode === "layered" } };
      }
      if (mode !== "layered" || node.parentId !== containerId) return node;
      if (!initialized) return { ...node, ...seeded.get(node.id), zIndex: Math.max(1, node.zIndex || 1) };
      const width = clamp(Number.isFinite(node.width) ? node.width : .84, .12, .92);
      const height = clamp(Number.isFinite(node.height) ? node.height : .18, .06, .9);
      return {
        ...node,
        x: clamp(node.x, 0, 1 - width),
        y: clamp(node.y, 0, 1 - height),
        width,
        height,
        zIndex: Math.max(1, Number.isFinite(node.zIndex) ? node.zIndex : 1),
      };
    }),
  };
}

export function moveLayeredNode(
  block: CreativeCompositionBlock,
  nodeId: string,
  patch: Partial<Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "zIndex">>,
): CreativeCompositionBlock {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  const parent = node?.parentId ? block.nodes.find((candidate) => candidate.id === node.parentId) : null;
  if (!node || !(isLayeredContainer(parent) || (node.parentId === null && isCardSurfaceLayered(block)))) return block;
  const width = clamp(patch.width ?? node.width, .08, 1);
  const height = clamp(patch.height ?? node.height, .04, 1);
  return {
    ...block,
    nodes: block.nodes.map((candidate) => candidate.id === nodeId ? {
      ...candidate,
      width,
      height,
      x: clamp(patch.x ?? node.x, 0, 1 - width),
      y: clamp(patch.y ?? node.y, 0, 1 - height),
      zIndex: Math.max(1, Math.round(patch.zIndex ?? node.zIndex)),
    } : candidate),
  };
}

export function snapLayeredNode(input: {
  block: CreativeCompositionBlock;
  nodeId: string;
  patch: Partial<Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "zIndex">>;
  threshold?: number;
  grid?: number;
  safeMargin?: number;
}): { block: CreativeCompositionBlock; guides: CompositionGuide[] } {
  const moved = moveLayeredNode(input.block, input.nodeId, input.patch);
  const node = moved.nodes.find((candidate) => candidate.id === input.nodeId);
  if (!node) return { block: moved, guides: [] };
  const siblings = moved.nodes.filter((candidate) => candidate.parentId === node.parentId);
  const snapped = snapCompositionNodes({
    nodes: siblings,
    movingIds: [node.id],
    threshold: input.threshold,
    grid: input.grid,
    safeMargin: input.safeMargin,
  });
  const byId = new Map(snapped.nodes.map((candidate) => [candidate.id, candidate]));
  return {
    block: { ...moved, nodes: moved.nodes.map((candidate) => byId.get(candidate.id) ?? candidate) },
    guides: snapped.guides,
  };
}

export function snapLayeredResize(input: {
  block: CreativeCompositionBlock;
  nodeId: string;
  frame: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">;
  handle: StudioRectangularResizeHandle;
  threshold?: number;
  grid?: number;
  safeMargin?: number;
}): { frame: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">; guides: CompositionGuide[] } {
  const node = input.block.nodes.find((candidate) => candidate.id === input.nodeId);
  if (!node) return { frame: input.frame, guides: [] };
  const siblings = input.block.nodes.filter((candidate) => candidate.id !== node.id && candidate.parentId === node.parentId && candidate.visible !== false);
  const threshold = input.threshold ?? .012;
  const grid = input.grid ?? .025;
  const safe = Math.max(0, Math.min(.2, input.safeMargin ?? .03));
  const candidates = (axis: "x" | "y") => {
    const values = siblings.flatMap((candidate) => axis === "x"
      ? [candidate.x, candidate.x + candidate.width / 2, candidate.x + candidate.width]
      : [candidate.y, candidate.y + candidate.height / 2, candidate.y + candidate.height]);
    return [...values, 0, safe, .5, 1 - safe, 1];
  };
  const nearest = (value: number, axis: "x" | "y") => {
    const options = [...candidates(axis).map((target) => ({ target, kind: target === safe || target === 1 - safe ? "safe-margin" as const : target === .5 ? "center" as const : "edge" as const })), { target: Math.round(value / grid) * grid, kind: "grid" as const }]
      .map((candidate) => ({ ...candidate, distance: Math.abs(candidate.target - value) }))
      .filter((candidate) => candidate.distance <= threshold)
      .sort((left, right) => left.distance - right.distance)[0];
    return options;
  };
  let { x, y, width, height } = input.frame;
  const right = x + width;
  const bottom = y + height;
  const west = input.handle.includes("w");
  const east = input.handle.includes("e");
  const north = input.handle.includes("n");
  const south = input.handle.includes("s");
  const guides: CompositionGuide[] = [];
  if (west || east) {
    const edge = west ? x : right;
    const match = nearest(edge, "x");
    if (match) {
      if (west) { x = Math.min(right - .02, match.target); width = right - x; }
      else width = Math.max(.02, match.target - x);
      guides.push({ axis: "x", value: match.target, kind: match.kind });
    }
  }
  if (north || south) {
    const edge = north ? y : bottom;
    const match = nearest(edge, "y");
    if (match) {
      if (north) { y = Math.min(bottom - .02, match.target); height = bottom - y; }
      else height = Math.max(.02, match.target - y);
      guides.push({ axis: "y", value: match.target, kind: match.kind });
    }
  }
  x = Math.max(0, Math.min(1 - width, x));
  y = Math.max(0, Math.min(1 - height, y));
  width = Math.max(.02, Math.min(1 - x, width));
  height = Math.max(.02, Math.min(1 - y, height));
  return { frame: { x, y, width, height }, guides };
}

export type LayeredZCommand = "backward" | "forward" | "back" | "front";

export function reorderLayeredNodeZ(
  block: CreativeCompositionBlock,
  nodeId: string,
  command: LayeredZCommand,
): CreativeCompositionBlock {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return block;
  const siblings = block.nodes
    .filter((candidate) => candidate.parentId === node.parentId)
    .sort((a, b) => a.zIndex - b.zIndex || (a.siblingOrder ?? 0) - (b.siblingOrder ?? 0));
  const index = siblings.findIndex((candidate) => candidate.id === nodeId);
  if (index < 0) return block;
  const next = [...siblings];
  if (command === "front") next.push(...next.splice(index, 1));
  else if (command === "back") next.unshift(...next.splice(index, 1));
  else if (command === "forward" && index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]];
  else if (command === "backward" && index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]];
  const z = new Map(next.map((candidate, order) => [candidate.id, order + 1]));
  return { ...block, nodes: block.nodes.map((candidate) => z.has(candidate.id) ? { ...candidate, zIndex: z.get(candidate.id)! } : candidate) };
}

export function resolveLayeredGeometry(
  node: CreativeCompositionNode,
  parent: { widthPx: number; heightPx: number },
) {
  return {
    xPx: node.x * parent.widthPx,
    yPx: node.y * parent.heightPx,
    widthPx: node.width * parent.widthPx,
    heightPx: node.height * parent.heightPx,
    anchor: node.anchor ?? "top-left",
    zIndex: node.zIndex,
  } as const;
}

function layeredDefaultSize(node: CreativeCompositionNode, parentHeightPx: number) {
  const kind = String(node.props.elementKind || node.primitive);
  const width = node.moduleComposition?.signatureAssembly ? clamp(Number(node.props.flowWidthPercent ?? 92) / 100, .42, .94)
    : node.compositionKind === "container" ? .46
      : kind === "image" || kind === "video" ? .46
        : kind === "text" ? .48
          : kind === "divider" ? .9
            : kind === "button" ? .48
              : clamp(node.width || .46, .2, .94);
  const heightPx = node.compositionKind === "container" ? 220
    : node.moduleComposition?.signatureAssembly ? Math.max(44, Number(node.minHeightPx) || Number(node.props.minimumTouchTargetPx) || 72)
      : kind === "image" || kind === "video" ? 180
        : kind === "text" ? Math.max(44, Number(node.props.textMinHeightPx) || 72)
          : kind === "divider" ? 24
            : 64;
  const height = clamp(heightPx / Math.max(240, parentHeightPx), .04, .82);
  return { width, height };
}

function spatialSeed(node: CreativeCompositionNode, parentHeightPx: number, occupied: CreativeCompositionNode[]) {
  const { width, height } = layeredDefaultSize(node, parentHeightPx);
  const placement = findLayeredOpening(width, height, occupied);
  return { ...placement, width, height, anchor: node.anchor ?? "top-left" } as const;
}

function findLayeredOpening(width: number, height: number, occupied: CreativeCompositionNode[]) {
  const maxX = Math.max(0, 1 - width);
  const maxY = Math.max(0, 1 - height);
  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = .03; y <= maxY + .001; y += .06) {
    for (let x = .03; x <= maxX + .001; x += .06) candidates.push({ x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) });
  }
  candidates.push({ x: 0, y: 0 });
  const overlap = (candidate: { x: number; y: number }, other: CreativeCompositionNode) => !(
    candidate.x + width + .015 <= other.x ||
    candidate.x >= other.x + other.width + .015 ||
    candidate.y + height + .015 <= other.y ||
    candidate.y >= other.y + other.height + .015
  );
  const open = candidates.find((candidate) => occupied.every((other) => !overlap(candidate, other)));
  if (open) return open;
  let best = candidates[0] ?? { x: 0, y: 0 };
  let bestArea = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const area = occupied.reduce((total, other) => {
      const intersectionWidth = Math.max(0, Math.min(candidate.x + width, other.x + other.width) - Math.max(candidate.x, other.x));
      const intersectionHeight = Math.max(0, Math.min(candidate.y + height, other.y + other.height) - Math.max(candidate.y, other.y));
      return total + intersectionWidth * intersectionHeight;
    }, 0);
    if (area < bestArea) { best = candidate; bestArea = area; }
  }
  return best;
}
