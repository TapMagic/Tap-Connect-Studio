import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { snapCompositionNodes, type CompositionGuide } from "../composition-snap";
import { compositionChildren } from "../../card/composition-parent-authority";
import { compactActionGridLayoutMetrics, compactActionGridNodeProps, readCompactActionGrid } from "./compact-action-grid";
import { requiredChildContentSize, rebaseParentRelativeChildren, type ContentBoxSize } from "../container-resize";

export const STUDIO_LAYERED_REGION_CONTRACT = "studioLayeredRegion@1.0.0" as const;
export type StudioContainerCompositionMode = "flow" | "layered";
export type StudioLayeredResizePolicy = "free" | "width-only" | "governed-aspect";
export type StudioLayeredBoundsPolicy = "constrain" | "allow-overflow";
export type StudioPlacementFrameHeightMode = "tight" | "custom";

function compactGrid(node: CreativeCompositionNode) {
  return readCompactActionGrid(node.props);
}

export function supportsLayeredPlacementFrameHeight(node: CreativeCompositionNode): boolean {
  return !compactGrid(node) && Boolean(node.moduleComposition?.signatureAssembly || node.primitive === "button");
}

export function readLayeredPlacementFrameHeightMode(node: CreativeCompositionNode): StudioPlacementFrameHeightMode {
  // Compact Action Grids own their visual height through tile size, row count,
  // labels, and gaps. Ignore any legacy generic frame-height value so an old
  // Custom setting cannot leave an invisible placement box around the grid.
  if (compactGrid(node)) return "tight";
  if (node.props.placementFrameHeightMode === "custom") return "custom";
  if (node.props.placementFrameHeightMode === "tight") return "tight";
  // Certified/mastered CTA compositions are intrinsically sized. Older plain
  // Buttons predate this authority, so retain their authored frame until the
  // Host explicitly chooses Fit content.
  return node.moduleComposition?.signatureAssembly ? "tight" : "custom";
}

export function layeredResizePolicy(node: CreativeCompositionNode): StudioLayeredResizePolicy {
  if (compactGrid(node)) return "width-only";
  if (node.moduleComposition?.signatureAssembly) return readLayeredPlacementFrameHeightMode(node) === "custom" ? "free" : "governed-aspect";
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
  if (node.primitive === "video") return node.props.aspectLocked === false ? "free" : "governed-aspect";
  if (node.primitive === "button") {
    if (readLayeredPlacementFrameHeightMode(node) === "tight") return "width-only";
    return node.props.aspectLocked === true ? "governed-aspect" : "free";
  }
  if (kind === "divider") return "width-only";
  return "free";
}

export function tightLayeredPlacementHeight(block: CreativeCompositionBlock, node: CreativeCompositionNode): number {
  const parentSize = layeredCompositionParentSizePx(block, node.parentId ?? null);
  const parentWidthPx = parentSize.widthPx;
  const parentHeightPx = parentSize.heightPx;
  const nestedHeightPx = Number(node.moduleComposition?.pageHeightPx);
  const grid = compactGrid(node);
  const visualHeightPx = grid
    ? compactActionGridLayoutMetrics(grid).contentHeightPx
    : node.moduleComposition?.signatureAssembly && Number.isFinite(nestedHeightPx)
    ? node.width * parentWidthPx * (nestedHeightPx / 390)
    : Math.max(20, Number(node.props.visualHeightPx) || Number(node.minHeightPx) || 44);
  return clamp(visualHeightPx / parentHeightPx, .015, 1);
}

export function setLayeredPlacementFrameHeightMode(
  block: CreativeCompositionBlock,
  nodeId: string,
  mode: StudioPlacementFrameHeightMode,
): CreativeCompositionBlock {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || !supportsLayeredPlacementFrameHeight(node)) return block;
  const height = mode === "tight" ? tightLayeredPlacementHeight(block, node) : node.height;
  return {
    ...block,
    nodes: block.nodes.map((candidate) => candidate.id === nodeId ? {
      ...candidate,
      height,
      y: layeredBoundsPolicy(block, candidate.parentId ?? null) === "allow-overflow"
        ? candidate.y
        : clamp(candidate.y, 0, 1 - height),
      props: { ...candidate.props, placementFrameHeightMode: mode },
    } : candidate),
  };
}

/**
 * Resolves legacy Layered action frames through the current placement recipe.
 * This is intentionally a geometry projection: it neither changes the nested
 * visual master nor lets its accessibility target become layout size.
 */
export function resolveTightLayeredPlacementFrames(block: CreativeCompositionBlock): CreativeCompositionBlock {
  let changed = false;
  const nodes = block.nodes.map((node) => {
    if (!(compactGrid(node) || supportsLayeredPlacementFrameHeight(node))
      || readLayeredPlacementFrameHeightMode(node) !== "tight"
      || !isLayeredCompositionParent(block, node.parentId ?? null)) return node;
    const height = tightLayeredPlacementHeight(block, node);
    const y = layeredBoundsPolicy(block, node.parentId ?? null) === "allow-overflow" ? node.y : clamp(node.y, 0, 1 - height);
    if (Math.abs(node.height - height) < .000001 && node.props.placementFrameHeightMode === "tight" && y === node.y) return node;
    changed = true;
    return { ...node, height, y, props: { ...node.props, placementFrameHeightMode: "tight" } };
  });
  return changed ? { ...block, nodes } : block;
}

export type StudioRectangularResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function allowedLayeredResizeHandles(node: CreativeCompositionNode): readonly StudioRectangularResizeHandle[] {
  const policy = layeredResizePolicy(node);
  if (policy === "width-only") return ["e", "w"];
  if (policy === "governed-aspect") return ["nw", "ne", "se", "sw"];
  return ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
}

export function layeredMinimumFrameSize(node: CreativeCompositionNode) {
  return { width: .08, height: compactGrid(node) || supportsLayeredPlacementFrameHeight(node) ? .015 : .04 };
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

/** Phone-authoritative content box for normalized Layered geometry. */
export function layeredCompositionParentSizePx(block: CreativeCompositionBlock, parentId: string | null, measuredAncestor?: ContentBoxSize): { widthPx: number; heightPx: number } {
  const rootWidthPx = Math.max(80, 390 - Math.max(0, block.safeAreaPaddingPx ?? 12) * 2);
  if (parentId === null) return { widthPx: rootWidthPx, heightPx: Math.max(240, block.compositionMode?.layeredHeightPx ?? 620) };
  const parent = block.nodes.find((candidate) => candidate.id === parentId);
  if (!parent) return { widthPx: rootWidthPx, heightPx: 360 };
  const ancestor = measuredAncestor ?? layeredCompositionParentSizePx(block, parent.parentId ?? null);
  const padding = Math.max(0, Number(parent.props.padding ?? 16));
  const placedInLayered = isLayeredCompositionParent(block, parent.parentId ?? null);
  const flowWidth = Math.max(20, Math.min(100, Number(parent.props.widthPercent ?? parent.props.flowWidthPercent ?? 100))) / 100;
  const edgeWidth = parent.props.edgeMode === "inset" ? Math.min(ancestor.widthPx * flowWidth, ancestor.widthPx - 24)
    : parent.props.edgeMode === "full_bleed" ? ancestor.widthPx * flowWidth + (block.safeAreaPaddingPx ?? 12) * 2
    : ancestor.widthPx * flowWidth;
  const minWidth = Math.max(0, Number(parent.props.minWidthPx) || 0);
  const frameWidth = placedInLayered ? ancestor.widthPx * parent.width
    : Math.max(minWidth, Math.min(Math.max(minWidth, Number(parent.props.maxWidthPx) || 9999), edgeWidth));
  return {
    widthPx: Math.max(1, frameWidth - padding * 2),
    heightPx: isLayeredCompositionParent(block, parent.parentId ?? null)
      ? Math.max(1, ancestor.heightPx * parent.height - padding * 2)
      : Math.max(180, Number(parent.props.layeredHeightPx) || 360),
  };
}

export function layeredBoundsPolicy(block: CreativeCompositionBlock, parentId: string | null): StudioLayeredBoundsPolicy {
  if (parentId === null) return block.compositionMode?.bounds === "allow-overflow" ? "allow-overflow" : "constrain";
  const parent = block.nodes.find((candidate) => candidate.id === parentId);
  return parent?.props.layeredBounds === "allow-overflow" ? "allow-overflow" : "constrain";
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
  const parentSize = layeredCompositionParentSizePx(block, parentId);
  const fallback = layeredDefaultSize(node, parentSize.heightPx, parentSize.widthPx);
  const width = clamp(requested?.width ?? fallback.width, .08, .96);
  const height = clamp(requested?.height ?? fallback.height, compactGrid(node) || supportsLayeredPlacementFrameHeight(node) ? .015 : .04, .9);
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
  const initialized = block.compositionMode?.layeredPlacementInitialized === true || isCardSurfaceLayered(block);
  const heightPx = block.compositionMode?.layeredHeightPx ?? 620;
  const widthPx = layeredCompositionParentSizePx(block, null).widthPx;
  const seeded = new Map<string, Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "anchor">>();
  if (mode === "layered" && !initialized) {
    const occupied: CreativeCompositionNode[] = [];
    for (const node of roots) {
      const frame = spatialSeed(node, heightPx, occupied, widthPx);
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
      bounds: block.compositionMode?.bounds ?? "constrain",
    },
    nodes: mode === "flow" ? block.nodes : block.nodes.map((node) => {
      if (node.parentId !== null) return node;
      if (!initialized) return { ...node, ...seeded.get(node.id), zIndex: Math.max(1, node.zIndex || 1) };
      return node; // Restoring a mode must not rewrite existing authored placement.
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
  const initialized = container.props.layeredPlacementInitialized === true || isLayeredContainer(container);
  const heightPx = Number(container.props.layeredHeightPx) || 360;
  const widthPx = layeredCompositionParentSizePx(block, containerId).widthPx;
  const seeded = new Map<string, Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "anchor">>();
  if (mode === "layered" && !initialized) {
    const occupied: CreativeCompositionNode[] = [];
    for (const child of children) {
      const frame = spatialSeed(child, heightPx, occupied, widthPx);
      seeded.set(child.id, frame);
      occupied.push({ ...child, ...frame });
    }
  }
  return {
    ...block,
    nodes: block.nodes.map((node) => {
      if (node.id === containerId) {
        return { ...node, props: { ...node.props, layout: mode, layeredHeightPx: heightPx, layeredPlacementInitialized: initialized || mode === "layered", layeredBounds: node.props.layeredBounds === "allow-overflow" ? "allow-overflow" : "constrain" } };
      }
      if (mode !== "layered" || node.parentId !== containerId) return node;
      if (!initialized) return { ...node, ...seeded.get(node.id), zIndex: Math.max(1, node.zIndex || 1) };
      return node; // Keep prior placement, including deliberate overflow and small frames.
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
  if (!node || node.locked || !(isLayeredContainer(parent) || (node.parentId === null && isCardSurfaceLayered(block)))) return block;
  const minimum = layeredMinimumFrameSize(node);
  const width = clamp(patch.width ?? node.width, Math.min(minimum.width, node.width), Math.max(1, node.width));
  const height = clamp(patch.height ?? node.height, Math.min(minimum.height, node.height), Math.max(1, node.height));
  const allowOverflow = layeredBoundsPolicy(block, node.parentId ?? null) === "allow-overflow";
  const grid = compactGrid(node);
  const parentWidthPx = layeredCompositionParentSizePx(block, node.parentId ?? null).widthPx;
  const resizedGridProps = grid && grid.widthMode === "custom" && typeof patch.width === "number"
    ? { ...node.props, ...compactActionGridNodeProps({ ...grid, customWidthPx: Math.round(width * parentWidthPx) }) }
    : node.props;
  return {
    ...block,
    nodes: block.nodes.map((candidate) => candidate.id === nodeId ? {
      ...candidate,
      props: resizedGridProps,
      width,
      height,
      x: allowOverflow ? clamp(patch.x ?? node.x, -1, 2) : clamp(patch.x ?? node.x, 0, 1 - width),
      y: allowOverflow ? clamp(patch.y ?? node.y, -1, 2) : clamp(patch.y ?? node.y, 0, 1 - height),
      zIndex: Math.max(1, Math.round(patch.zIndex ?? node.zIndex)),
    } : candidate),
  };
}

/** Exact Inspector sizing consumes the same resize policy as pointer handles. */
export function resizeLayeredNodeDimension(block: CreativeCompositionBlock, nodeId: string, axis: "width" | "height", value: number, sizeOf?: (parentId: string | null) => ContentBoxSize): CreativeCompositionBlock {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.locked || !Number.isFinite(value)) return block;
  const policy = layeredResizePolicy(node);
  if (policy === "width-only" && axis === "height") return block;
  const minHeight = layeredMinimumFrameSize(node).height;
  if (policy === "governed-aspect") {
    const scale = clamp(value / node[axis], Math.max(.08 / node.width, minHeight / node.height), Math.min(1 / node.width, 1 / node.height));
    return applyLayeredResize(block, nodeId, { ...node, width: node.width * scale, height: node.height * scale }, sizeOf);
  }
  return applyLayeredResize(block, nodeId, { ...node, [axis]: clamp(value, axis === "width" ? .08 : minHeight, 1) }, sizeOf);
}

/** Stop the resize at the parent boundary without translating its fixed edge.
 * Interpolation preserves the opposite local edge for rotated gestures and the
 * aspect ratio for governed frames. Bounds concern Placement, not paint overflow.
 */
export function applyLayeredResize(block: CreativeCompositionBlock, nodeId: string, frame: { x: number; y: number; width: number; height: number }, sizeOf: (parentId: string | null) => ContentBoxSize = id => layeredCompositionParentSizePx(block, id)): CreativeCompositionBlock {
  const node = block.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.locked) return block;
  const preserveChildren = isLayeredContainer(node);
  const parentSize = sizeOf(node.parentId ?? null);
  const oldContent = preserveChildren ? sizeOf(node.id) : null;
  let progress = 1;
  if (oldContent && node.props.clipContent !== true && layeredBoundsPolicy(block, node.id) === "constrain") {
    const required = requiredChildContentSize(block.nodes, node.id, oldContent);
    for (const [available, requested, needed] of [
      [oldContent.widthPx, oldContent.widthPx + (frame.width - node.width) * parentSize.widthPx, required.widthPx],
      [oldContent.heightPx, oldContent.heightPx + (frame.height - node.height) * parentSize.heightPx, required.heightPx],
    ]) {
      const floor = Math.min(available, needed);
      if (requested < floor) progress = Math.min(progress, (available - floor) / Math.max(.00001, available - requested));
    }
  }
  for (const [start, end] of layeredBoundsPolicy(block, node.parentId ?? null) === "allow-overflow" ? [] : [[node.x, frame.x], [node.y, frame.y], [1 - node.x - node.width, 1 - frame.x - frame.width], [1 - node.y - node.height, 1 - frame.y - frame.height]]) {
    if (start >= -1e-9 && end < 0) progress = Math.min(progress, Math.max(0, start) / (start - end));
  }
  const at = (key: "x" | "y" | "width" | "height") => node[key] + (frame[key] - node[key]) * progress;
  const moved = moveLayeredNode(block, nodeId, { x: at("x"), y: at("y"), width: at("width"), height: at("height") });
  if (!oldContent) return moved;
  const next = moved.nodes.find(candidate => candidate.id === nodeId)!;
  const newContent = {
    widthPx: Math.max(1, oldContent.widthPx + (next.width - node.width) * parentSize.widthPx),
    heightPx: Math.max(1, oldContent.heightPx + (next.height - node.height) * parentSize.heightPx),
  };
  return { ...moved, nodes: rebaseParentRelativeChildren(moved.nodes, nodeId, oldContent, newContent) };
}

/** Explicit Flow-width editing changes the frame while retaining its responsive percentage. */
export function resizeFlowContainerWidth(block: CreativeCompositionBlock, id: string, widthPercent: number | undefined,
  sizeOf: (parentId: string | null) => ContentBoxSize = parentId => layeredCompositionParentSizePx(block, parentId)): CreativeCompositionBlock {
  const node = block.nodes.find(candidate => candidate.id === id);
  if (!node || node.locked || !isLayeredContainer(node) || isLayeredCompositionParent(block, node.parentId ?? null)) return block;
  const next = { ...block, nodes: block.nodes.map(candidate => candidate.id === id ? { ...candidate, props: { ...candidate.props, widthPercent } } : candidate) };
  const before = sizeOf(id);
  const after = { ...before, widthPx: layeredCompositionParentSizePx(next, id, sizeOf(node.parentId ?? null)).widthPx };
  if (node.props.clipContent !== true && layeredBoundsPolicy(block, id) === "constrain"
    && after.widthPx < Math.min(before.widthPx, requiredChildContentSize(block.nodes, id, before).widthPx) - .01) return block;
  return { ...next, nodes: rebaseParentRelativeChildren(next.nodes, id, before, after) };
}

/** A Layered Container in Flow owns an explicit internal plane, not its dormant frame. */
export function resizeContainerLayeredPlane(block: CreativeCompositionBlock, id: string, heightPx: number,
  sizeOf: (parentId: string | null) => ContentBoxSize = parentId => layeredCompositionParentSizePx(block, parentId)): CreativeCompositionBlock {
  const node = block.nodes.find(candidate => candidate.id === id);
  if (!node || node.locked || !isLayeredContainer(node) || isLayeredCompositionParent(block, node.parentId ?? null) || !Number.isFinite(heightPx)) return block;
  const before = sizeOf(id);
  const minimum = node.props.clipContent !== true && layeredBoundsPolicy(block, id) === "constrain"
    ? Math.min(before.heightPx, requiredChildContentSize(block.nodes, id, before).heightPx) : 180;
  const after = { ...before, heightPx: Math.max(minimum, clamp(heightPx, 180, 900)) };
  const nodes = block.nodes.map(candidate => candidate.id === id ? { ...candidate, props: { ...candidate.props, layeredHeightPx: after.heightPx } } : candidate);
  return { ...block, nodes: rebaseParentRelativeChildren(nodes, id, before, after) };
}

/** Resize the authored root plane, independently of the public-page minimum. */
export function resizeLayeredPlane(block: CreativeCompositionBlock, heightPx: number): CreativeCompositionBlock {
  if (!isCardSurfaceLayered(block) || !Number.isFinite(heightPx)) return block;
  const before = layeredCompositionParentSizePx(block, null);
  const minimum = layeredBoundsPolicy(block, null) === "constrain"
    ? Math.min(before.heightPx, Math.ceil(requiredChildContentSize(block.nodes, null, before).heightPx)) : 240;
  const after = { ...before, heightPx: Math.max(minimum, clamp(Math.round(heightPx), 240, 1600)) };
  return { ...block, compositionMode: { ...block.compositionMode!, layeredHeightPx: after.heightPx },
    nodes: rebaseParentRelativeChildren(block.nodes, null, before, after) };
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
  const allowOverflow = layeredBoundsPolicy(input.block, node.parentId ?? null) === "allow-overflow";
  if (allowOverflow) {
    x = Math.max(-1, Math.min(2, x));
    y = Math.max(-1, Math.min(2, y));
    width = Math.max(.02, Math.min(2, width));
    height = Math.max(.02, Math.min(2, height));
  } else {
    x = Math.max(0, Math.min(1 - width, x));
    y = Math.max(0, Math.min(1 - height, y));
    width = Math.max(.02, Math.min(1 - x, width));
    height = Math.max(.02, Math.min(1 - y, height));
  }
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

function layeredDefaultSize(node: CreativeCompositionNode, parentHeightPx: number, parentWidthPx = 390) {
  const kind = String(node.props.elementKind || node.primitive);
  const grid = compactGrid(node);
  const gridMetrics = grid ? compactActionGridLayoutMetrics(grid) : null;
  const width = grid
    ? grid.widthMode === "full" ? .94 : clamp((grid.widthMode === "fit_content" ? gridMetrics!.contentWidthPx : grid.customWidthPx) / parentWidthPx, .08, .94)
    : node.moduleComposition?.signatureAssembly ? clamp(Number(node.props.flowWidthPercent ?? 92) / 100, .42, .94)
    : node.compositionKind === "container" ? .46
      : kind === "image" || kind === "video" ? .46
        : kind === "text" ? .48
          : kind === "divider" ? .9
            : kind === "button" ? .48
              : clamp(node.width || .46, .2, .94);
  const heightPx = gridMetrics ? gridMetrics.contentHeightPx
    : node.compositionKind === "container" ? 220
    : node.moduleComposition?.signatureAssembly ? width * 390 * (Math.max(1, Number(node.moduleComposition.pageHeightPx) || Number(node.minHeightPx) || 56) / 390)
      : kind === "image" || kind === "video" ? 180
        : kind === "text" ? Math.max(44, Number(node.props.textMinHeightPx) || 72)
          : kind === "divider" ? 24
            : 64;
  const height = clamp(heightPx / Math.max(240, parentHeightPx), compactGrid(node) || supportsLayeredPlacementFrameHeight(node) ? .015 : .04, .82);
  return { width, height };
}

function spatialSeed(node: CreativeCompositionNode, parentHeightPx: number, occupied: CreativeCompositionNode[], parentWidthPx = 390) {
  const { width, height } = layeredDefaultSize(node, parentHeightPx, parentWidthPx);
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

/** Resize the authored frame in its rotated local axes, keeping the opposite edge fixed. */
export function resizeLayeredPlacement(node: CreativeCompositionNode, handle: StudioRectangularResizeHandle,
  delta: { xPx: number; yPx: number }, parent: { widthPx: number; heightPx: number }, preserveAspect = false) {
  const angle = (node.rotationDeg || 0) * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = (delta.xPx * c + delta.yPx * s) / parent.widthPx;
  const dy = (-delta.xPx * s + delta.yPx * c) / parent.heightPx;
  const west = handle.includes("w"), east = handle.includes("e"), north = handle.includes("n"), south = handle.includes("s");
  const policy = layeredResizePolicy(node);
  const minimum = layeredMinimumFrameSize(node);
  let width = west || east ? Math.max(Math.min(minimum.width, node.width), Math.min(1, node.width + (west ? -dx : dx))) : node.width;
  let height = north || south ? Math.max(Math.min(minimum.height, node.height), Math.min(1, node.height + (north ? -dy : dy))) : node.height;
  if (policy === "width-only") height = node.height;
  if (policy === "governed-aspect" || (preserveAspect && policy === "free" && (west || east) && (north || south))) {
    const scale = Math.abs(dx * parent.widthPx) >= Math.abs(dy * parent.heightPx) ? width / node.width : height / node.height;
    const bounded = Math.max(minimum.width / node.width, minimum.height / node.height, Math.min(scale, 1 / node.width, 1 / node.height));
    width = node.width * bounded; height = node.height * bounded;
  }
  const centerDx = (west ? -1 : east ? 1 : 0) * (width - node.width) * parent.widthPx / 2;
  const centerDy = (north ? -1 : south ? 1 : 0) * (height - node.height) * parent.heightPx / 2;
  return {
    x: node.x + node.width / 2 + (centerDx * c - centerDy * s) / parent.widthPx - width / 2,
    y: node.y + node.height / 2 + (centerDx * s + centerDy * c) / parent.heightPx - height / 2,
    width, height,
  };
}

/** Rotation of the parent coordinate system; dormant Flow rotation is not applied. */
export function layeredParentRotation(block: CreativeCompositionBlock, parentId: string | null): number {
  let rotation = 0;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = block.nodes.find((node) => node.id === parentId);
    if (!parent) break;
    if (isLayeredCompositionParent(block, parent.parentId ?? null)) rotation += parent.rotationDeg || 0;
    parentId = parent.parentId ?? null;
  }
  return rotation;
}

export function layeredScreenVector(block: CreativeCompositionBlock, parentId: string | null,
  delta: { xPx: number; yPx: number }, size: { widthPx: number; heightPx: number }) {
  const angle = layeredParentRotation(block, parentId) * Math.PI / 180;
  return { x: (delta.xPx * Math.cos(angle) + delta.yPx * Math.sin(angle)) / size.widthPx,
    y: (-delta.xPx * Math.sin(angle) + delta.yPx * Math.cos(angle)) / size.heightPx };
}

/** Move eligible roots together. One common constraint fraction preserves relative placement. */
export function translateLayeredSelection(block: CreativeCompositionBlock, ids: readonly string[],
  delta: { xPx: number; yPx: number },
  parentSize: (id: string | null) => { widthPx: number; heightPx: number } = (id) => layeredCompositionParentSizePx(block, id)) {
  const selected = new Set(ids);
  const roots = block.nodes.filter((node) => selected.has(node.id) && !node.locked
    && isLayeredCompositionParent(block, node.parentId ?? null)
    && !(node.groupId && block.nodes.some((other) => other.groupId === node.groupId && other.locked))
    && !(() => { let id = node.parentId; while (id) { if (selected.has(id)) return true; id = block.nodes.find((n) => n.id === id)?.parentId; } return false; })());
  let fraction = 1;
  const vectors = new Map(roots.map((node) => {
    const vector = layeredScreenVector(block, node.parentId ?? null, delta, parentSize(node.parentId ?? null));
    if (layeredBoundsPolicy(block, node.parentId ?? null) === "constrain") {
      for (const [position, extent, amount] of [[node.x, node.width, vector.x], [node.y, node.height, vector.y]]) {
        if (amount > 0) fraction = Math.min(fraction, Math.max(0, 1 - position - extent) / amount);
        if (amount < 0) fraction = Math.min(fraction, Math.max(0, position) / -amount);
      }
    }
    return [node.id, vector] as const;
  }));
  if (!vectors.size || fraction === 0 || (!delta.xPx && !delta.yPx)) return block;
  return { ...block, nodes: block.nodes.map((node) => {
    const vector = vectors.get(node.id);
    return vector ? { ...node, x: node.x + vector.x * fraction, y: node.y + vector.y * fraction } : node;
  }) };
}

/** External pixels are CSS pixels at 100%; only down-fit when the destination needs it. */
export function fitNativeImageSize(native: { widthPx: number; heightPx: number }, parent: { widthPx: number; heightPx: number }) {
  const scale = Math.min(1, parent.widthPx / native.widthPx, parent.heightPx / native.heightPx);
  return { width: native.widthPx * scale / parent.widthPx, height: native.heightPx * scale / parent.heightPx, scale };
}
