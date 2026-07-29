/**
 * Creative Composition Block — typed model + operations.
 *
 * Bounded freeform surface inside a Card section for intentional compositions
 * (text over image, framed media, coupon artwork) without converting the whole
 * Card into an unrestricted fixed-pixel canvas.
 */

import { nanoid } from "nanoid";

export type CreativeCompositionPrimitive =
  | "text"
  | "button"
  | "image"
  | "frame"
  | "shape"
  | "border"
  | "group"
  | "background";

export type CreativeCompositionAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

/** Registered vector masks for Frame primitives (safe curated set — no arbitrary SVG upload). */
export type FrameMaskId =
  | "rectangle"
  | "rounded"
  | "circle"
  | "oval"
  | "arch"
  | "badge"
  | "ticket"
  | "shield"
  | "star"
  | "polygon"
  | "organic"
  | "shirt";

export const FRAME_MASK_CATALOG: {
  id: FrameMaskId;
  label: string;
  /** SVG path in 0–100 viewBox coordinates */
  path: string;
}[] = [
  {
    id: "rectangle",
    label: "Rectangle",
    path: "M0 0 H100 V100 H0 Z",
  },
  {
    id: "rounded",
    label: "Rounded",
    path: "M12 0 H88 Q100 0 100 12 V88 Q100 100 88 100 H12 Q0 100 0 88 V12 Q0 0 12 0 Z",
  },
  {
    id: "circle",
    label: "Circle",
    path: "M50 0 A50 50 0 1 1 49.9 0 Z",
  },
  {
    id: "oval",
    label: "Oval",
    path: "M50 5 A40 45 0 1 1 49.9 5 Z",
  },
  {
    id: "arch",
    label: "Arch",
    path: "M10 100 V45 A40 40 0 0 1 90 45 V100 Z",
  },
  {
    id: "badge",
    label: "Badge",
    path: "M50 2 L62 28 L90 32 L70 52 L75 80 L50 68 L25 80 L30 52 L10 32 L38 28 Z",
  },
  {
    id: "ticket",
    label: "Ticket",
    path: "M0 15 H100 V85 H0 V70 A8 8 0 0 1 0 50 A8 8 0 0 1 0 30 Z",
  },
  {
    id: "shield",
    label: "Shield",
    path: "M50 2 L92 18 V48 C92 72 70 90 50 98 C30 90 8 72 8 48 V18 Z",
  },
  {
    id: "star",
    label: "Star",
    path: "M50 4 L61 38 L96 38 L68 58 L79 92 L50 72 L21 92 L32 58 L4 38 L39 38 Z",
  },
  {
    id: "polygon",
    label: "Polygon",
    path: "M50 4 L90 28 L90 72 L50 96 L10 72 L10 28 Z",
  },
  {
    id: "organic",
    label: "Organic",
    path: "M28 18 C42 4 62 8 74 22 C92 28 96 48 86 64 C94 78 78 94 58 90 C42 98 22 88 16 70 C4 58 8 34 28 18 Z",
  },
  {
    id: "shirt",
    label: "Shirt",
    path: "M35 8 L50 18 L65 8 L88 22 L78 38 L72 32 V92 H28 V32 L22 38 L12 22 Z",
  },
];

export function frameMaskPath(id: FrameMaskId | string | undefined): string {
  const found = FRAME_MASK_CATALOG.find((m) => m.id === id);
  return found?.path ?? FRAME_MASK_CATALOG[0].path;
}

export type CreativeCompositionNode = {
  id: string;
  primitive: CreativeCompositionPrimitive;
  /** Relative position within the composition (0–1). */
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  groupId?: string | null;
  anchor?: CreativeCompositionAnchor;
  widthPct?: number;
  heightPct?: number;
  minWidthPx?: number;
  maxWidthPx?: number;
  props: Record<string, unknown>;
};

export type CreativeCompositionBlock = {
  version: 1;
  id: string;
  label: string;
  nodes: CreativeCompositionNode[];
  background?: {
    kind: "solid" | "gradient" | "image" | "none";
    value?: string;
  };
  mobileFallback: "stack" | "scale" | "hide_decorative";
  safeAreaPaddingPx?: number;
};

export const CREATIVE_COMPOSITION_BLOCK_ID = "card.creative_composition" as const;

export function createEmptyCreativeComposition(
  id = "composition-1"
): CreativeCompositionBlock {
  return {
    version: 1,
    id,
    label: "Creative Composition",
    nodes: [],
    background: { kind: "none" },
    mobileFallback: "scale",
    safeAreaPaddingPx: 12,
  };
}

/** Starter composition: framed image + overlay text (Owner walkthrough seed). */
export function createStarterCreativeComposition(
  id = `composition-${nanoid(6)}`
): CreativeCompositionBlock {
  const imageId = `node-${nanoid(6)}`;
  const frameId = `node-${nanoid(6)}`;
  const textId = `node-${nanoid(6)}`;
  return {
    version: 1,
    id,
    label: "Creative Composition",
    background: { kind: "solid", value: "#0b0f19" },
    mobileFallback: "scale",
    safeAreaPaddingPx: 12,
    nodes: [
      {
        id: imageId,
        primitive: "image",
        x: 0.08,
        y: 0.08,
        width: 0.84,
        height: 0.7,
        zIndex: 1,
        visible: true,
        props: {
          src: "/marketing/use-cases/boutiques.jpg",
          alt: "Composition image",
          fit: "cover",
          opacity: 1,
        },
      },
      {
        id: frameId,
        primitive: "frame",
        x: 0.2,
        y: 0.12,
        width: 0.6,
        height: 0.55,
        zIndex: 2,
        visible: true,
        props: {
          mask: "rounded" satisfies FrameMaskId,
          mediaSrc: "/tap-connect-logo.png",
          fit: "cover",
          focalX: 0.5,
          focalY: 0.5,
          borderWidth: 2,
          borderColor: "#ffffff",
          alt: "Framed media",
        },
      },
      {
        id: textId,
        primitive: "text",
        x: 0.1,
        y: 0.72,
        width: 0.8,
        height: 0.2,
        zIndex: 3,
        visible: true,
        props: {
          text: "Your headline",
          color: "#f8fafc",
          fontSize: 22,
          fontFamily: "Inter, system-ui, sans-serif",
          align: "center",
          fontWeight: 700,
        },
      },
    ],
  };
}

export function sortCompositionNodes(
  nodes: CreativeCompositionNode[]
): CreativeCompositionNode[] {
  return [...nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

export function compositionAppliesMobileFallback(input: {
  editMode?: boolean;
  forceMobileFallback?: boolean;
}): boolean {
  return !input.editMode && Boolean(input.forceMobileFallback);
}

export function parseCreativeComposition(
  raw: unknown
): CreativeCompositionBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.nodes)) return null;
  return {
    version: 1,
    id: typeof o.id === "string" ? o.id : "composition",
    label: typeof o.label === "string" ? o.label : "Creative Composition",
    nodes: o.nodes as CreativeCompositionNode[],
    background:
      o.background && typeof o.background === "object"
        ? (o.background as CreativeCompositionBlock["background"])
        : { kind: "none" },
    mobileFallback:
      o.mobileFallback === "stack" ||
      o.mobileFallback === "scale" ||
      o.mobileFallback === "hide_decorative"
        ? o.mobileFallback
        : "scale",
    safeAreaPaddingPx:
      typeof o.safeAreaPaddingPx === "number" ? o.safeAreaPaddingPx : 12,
  };
}

function renumberZ(nodes: CreativeCompositionNode[]): CreativeCompositionNode[] {
  // Preserve caller order (already arranged); only rewrite zIndex values.
  return nodes.map((n, i) => ({ ...n, zIndex: i + 1 }));
}

export function bringForward(
  nodes: CreativeCompositionNode[],
  id: string
): CreativeCompositionNode[] {
  const sorted = sortCompositionNodes(nodes);
  const i = sorted.findIndex((n) => n.id === id);
  if (i < 0 || i >= sorted.length - 1) return nodes;
  const next = [...sorted];
  [next[i], next[i + 1]] = [next[i + 1], next[i]];
  return renumberZ(next);
}

export function sendBackward(
  nodes: CreativeCompositionNode[],
  id: string
): CreativeCompositionNode[] {
  const sorted = sortCompositionNodes(nodes);
  const i = sorted.findIndex((n) => n.id === id);
  if (i <= 0) return nodes;
  const next = [...sorted];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return renumberZ(next);
}

export function bringToFront(
  nodes: CreativeCompositionNode[],
  id: string
): CreativeCompositionNode[] {
  const sorted = sortCompositionNodes(nodes);
  const i = sorted.findIndex((n) => n.id === id);
  if (i < 0 || i === sorted.length - 1) return nodes;
  const [item] = sorted.splice(i, 1);
  sorted.push(item);
  return renumberZ(sorted);
}

export function sendToBack(
  nodes: CreativeCompositionNode[],
  id: string
): CreativeCompositionNode[] {
  const sorted = sortCompositionNodes(nodes);
  const i = sorted.findIndex((n) => n.id === id);
  if (i <= 0) return nodes;
  const [item] = sorted.splice(i, 1);
  sorted.unshift(item);
  return renumberZ(sorted);
}

export function setNodeLocked(
  nodes: CreativeCompositionNode[],
  ids: string[],
  locked: boolean
): CreativeCompositionNode[] {
  const set = new Set(ids);
  return nodes.map((n) => (set.has(n.id) ? { ...n, locked } : n));
}

export function groupNodes(
  nodes: CreativeCompositionNode[],
  ids: string[],
  groupId = `group-${nanoid(6)}`
): CreativeCompositionNode[] {
  const set = new Set(ids);
  return nodes.map((n) => (set.has(n.id) ? { ...n, groupId } : n));
}

export function ungroupNodes(
  nodes: CreativeCompositionNode[],
  groupId: string
): CreativeCompositionNode[] {
  return nodes.map((n) =>
    n.groupId === groupId ? { ...n, groupId: null } : n
  );
}

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export function alignNodes(
  nodes: CreativeCompositionNode[],
  ids: string[],
  mode: AlignMode
): CreativeCompositionNode[] {
  const set = new Set(ids);
  const targets = nodes.filter((n) => set.has(n.id) && !n.locked);
  if (targets.length < 2) return nodes;
  const minX = Math.min(...targets.map((n) => n.x));
  const maxX = Math.max(...targets.map((n) => n.x + n.width));
  const minY = Math.min(...targets.map((n) => n.y));
  const maxY = Math.max(...targets.map((n) => n.y + n.height));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return nodes.map((n) => {
    if (!set.has(n.id) || n.locked) return n;
    switch (mode) {
      case "left":
        return { ...n, x: minX };
      case "right":
        return { ...n, x: maxX - n.width };
      case "center":
        return { ...n, x: midX - n.width / 2 };
      case "top":
        return { ...n, y: minY };
      case "bottom":
        return { ...n, y: maxY - n.height };
      case "middle":
        return { ...n, y: midY - n.height / 2 };
      default:
        return n;
    }
  });
}

export function distributeNodes(
  nodes: CreativeCompositionNode[],
  ids: string[],
  axis: "horizontal" | "vertical"
): CreativeCompositionNode[] {
  const set = new Set(ids);
  const targets = [...nodes.filter((n) => set.has(n.id) && !n.locked)].sort(
    (a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y)
  );
  if (targets.length < 3) return nodes;
  if (axis === "horizontal") {
    const first = targets[0];
    const last = targets[targets.length - 1];
    const span =
      last.x + last.width - first.x - targets.reduce((s, n) => s + n.width, 0);
    const gap = span / (targets.length - 1);
    let cursor = first.x;
    const positions = new Map<string, number>();
    for (const t of targets) {
      positions.set(t.id, cursor);
      cursor += t.width + gap;
    }
    return nodes.map((n) =>
      positions.has(n.id) ? { ...n, x: positions.get(n.id)! } : n
    );
  }
  const first = targets[0];
  const last = targets[targets.length - 1];
  const span =
    last.y + last.height - first.y - targets.reduce((s, n) => s + n.height, 0);
  const gap = span / (targets.length - 1);
  let cursor = first.y;
  const positions = new Map<string, number>();
  for (const t of targets) {
    positions.set(t.id, cursor);
    cursor += t.height + gap;
  }
  return nodes.map((n) =>
    positions.has(n.id) ? { ...n, y: positions.get(n.id)! } : n
  );
}

export function createCompositionNode(
  primitive: CreativeCompositionPrimitive,
  partial?: Partial<CreativeCompositionNode>
): CreativeCompositionNode {
  const id = partial?.id || `node-${nanoid(6)}`;
  const defaults: Record<CreativeCompositionPrimitive, CreativeCompositionNode> =
    {
      text: {
        id,
        primitive: "text",
        x: 0.15,
        y: 0.35,
        width: 0.7,
        height: 0.2,
        zIndex: 10,
        visible: true,
        props: {
          text: "New text",
          color: "#f8fafc",
          fontSize: 18,
          fontFamily: "Inter, system-ui, sans-serif",
          align: "center",
          fontWeight: 600,
        },
      },
      image: {
        id,
        primitive: "image",
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.5,
        zIndex: 10,
        visible: true,
        props: { src: "", alt: "Image", fit: "cover", opacity: 1 },
      },
      frame: {
        id,
        primitive: "frame",
        x: 0.2,
        y: 0.15,
        width: 0.6,
        height: 0.5,
        zIndex: 10,
        visible: true,
        props: {
          mask: "shirt" satisfies FrameMaskId,
          mediaSrc: "",
          fit: "cover",
          focalX: 0.5,
          focalY: 0.5,
          borderWidth: 2,
          borderColor: "#ffffff",
          alt: "Framed media",
        },
      },
      shape: {
        id,
        primitive: "shape",
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.35,
        zIndex: 10,
        visible: true,
        props: {
          shape: "rounded",
          fill: "#22c55e",
          opacity: 0.85,
          stroke: "#ffffff",
          strokeWidth: 0,
        },
      },
      border: {
        id,
        primitive: "border",
        x: 0.1,
        y: 0.48,
        width: 0.8,
        height: 0.02,
        zIndex: 10,
        visible: true,
        props: { color: "#ffffff", thickness: 2, style: "solid" },
      },
      button: {
        id,
        primitive: "button",
        x: 0.2,
        y: 0.7,
        width: 0.6,
        height: 0.14,
        zIndex: 10,
        visible: true,
        props: {
          label: "Learn more",
          fill: "#22c55e",
          textColor: "#0b0f19",
          href: "",
        },
      },
      group: {
        id,
        primitive: "group",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        zIndex: 10,
        visible: true,
        props: {},
      },
      background: {
        id,
        primitive: "background",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        zIndex: 0,
        visible: true,
        props: { fill: "#0b0f19" },
      },
    };
  const base = defaults[primitive];
  return {
    ...base,
    ...partial,
    id,
    primitive,
    props: { ...base.props, ...(partial?.props || {}) },
  };
}

/** Reading order for a11y: top-to-bottom, then left-to-right among visible nodes. */
export function accessibleReadingOrder(
  nodes: CreativeCompositionNode[]
): CreativeCompositionNode[] {
  return [...nodes]
    .filter((n) => n.visible !== false)
    .sort(
      (a, b) =>
        a.y - b.y || a.x - b.x || a.zIndex - b.zIndex || a.id.localeCompare(b.id)
    );
}

export function patchCompositionNode(
  block: CreativeCompositionBlock,
  nodeId: string,
  patch: Partial<CreativeCompositionNode>
): CreativeCompositionBlock {
  return {
    ...block,
    nodes: block.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            ...patch,
            props: patch.props ? { ...n.props, ...patch.props } : n.props,
          }
        : n
    ),
  };
}

export function updateCompositionNodes(
  block: CreativeCompositionBlock,
  nodes: CreativeCompositionNode[]
): CreativeCompositionBlock {
  return { ...block, nodes };
}

export function duplicateNodes(
  nodes: CreativeCompositionNode[],
  ids: string[]
): { nodes: CreativeCompositionNode[]; newIds: string[] } {
  const set = new Set(ids);
  const maxZ = nodes.reduce((m, n) => Math.max(m, n.zIndex), 0);
  const newIds: string[] = [];
  const clones: CreativeCompositionNode[] = [];
  let z = maxZ;
  for (const n of nodes) {
    if (!set.has(n.id) || n.locked) continue;
    z += 1;
    const id = `node-${nanoid(6)}`;
    newIds.push(id);
    clones.push({
      ...n,
      id,
      x: Math.min(0.92, n.x + 0.04),
      y: Math.min(0.92, n.y + 0.04),
      zIndex: z,
      locked: false,
      props: { ...n.props },
    });
  }
  return { nodes: [...nodes, ...clones], newIds };
}

export function deleteNodes(
  nodes: CreativeCompositionNode[],
  ids: string[]
): CreativeCompositionNode[] {
  const set = new Set(ids);
  return nodes.filter((n) => !set.has(n.id) || n.locked);
}

/** Expand selection so grouped members move/select together. */
export function expandSelectionToGroups(
  nodes: CreativeCompositionNode[],
  ids: string[]
): string[] {
  const seed = new Set(ids);
  const groupIds = new Set<string>();
  for (const n of nodes) {
    if (seed.has(n.id) && n.groupId) groupIds.add(n.groupId);
  }
  if (!groupIds.size) return [...ids];
  const out = new Set(ids);
  for (const n of nodes) {
    if (n.groupId && groupIds.has(n.groupId)) out.add(n.id);
  }
  return [...out];
}

/** Translate selected (unlocked) nodes by relative deltas, clamped to the surface. */
export function translateNodes(
  nodes: CreativeCompositionNode[],
  ids: string[],
  dx: number,
  dy: number
): CreativeCompositionNode[] {
  const set = new Set(ids);
  const movers = nodes.filter((n) => set.has(n.id) && !n.locked);
  if (!movers.length) return nodes;
  const cdx = Math.min(
    Math.max(dx, -Math.min(...movers.map((n) => n.x))),
    Math.min(...movers.map((n) => 1 - n.x - n.width))
  );
  const cdy = Math.min(
    Math.max(dy, -Math.min(...movers.map((n) => n.y))),
    Math.min(...movers.map((n) => 1 - n.y - n.height))
  );
  return nodes.map((n) => {
    if (!set.has(n.id) || n.locked) return n;
    return {
      ...n,
      x: Math.min(1 - n.width, Math.max(0, n.x + cdx)),
      y: Math.min(1 - n.height, Math.max(0, n.y + cdy)),
    };
  });
}

export type ResolvedNodeBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Resolve proportional box + optional anchor for responsive placement.
 * Storage remains relative 0–1; anchors reinterpret x/y as the anchor point.
 */
export function resolveNodeBox(node: CreativeCompositionNode): ResolvedNodeBox {
  const width = Math.min(
    1,
    Math.max(0.04, node.widthPct != null ? node.widthPct : node.width)
  );
  const height = Math.min(
    1,
    Math.max(0.04, node.heightPct != null ? node.heightPct : node.height)
  );
  const anchor = node.anchor || "top-left";
  let left = node.x;
  let top = node.y;
  if (anchor === "top-right" || anchor === "right" || anchor === "bottom-right") {
    left = node.x - width;
  } else if (
    anchor === "top" ||
    anchor === "center" ||
    anchor === "bottom"
  ) {
    left = node.x - width / 2;
  }
  if (
    anchor === "bottom-left" ||
    anchor === "bottom" ||
    anchor === "bottom-right"
  ) {
    top = node.y - height;
  } else if (
    anchor === "left" ||
    anchor === "center" ||
    anchor === "right"
  ) {
    top = node.y - height / 2;
  }
  return {
    left: Math.min(1 - width, Math.max(0, left)),
    top: Math.min(1 - height, Math.max(0, top)),
    width,
    height,
  };
}
