/**
 * Shared spatial layout helpers for TapFlow and TapCanvas visual boards.
 * Pure functions — no DOM dependency.
 */

export type Point = { x: number; y: number };

export type LayoutNode = {
  id: string;
  width?: number;
  height?: number;
};

export type LayoutEdge = {
  id: string;
  from: string;
  to: string;
};

const DEFAULT_W = 180;
const DEFAULT_H = 64;
const H_GAP = 72;
const V_GAP = 56;
const SNAP = 16;

export function snapPoint(p: Point, grid = SNAP): Point {
  return {
    x: Math.round(p.x / grid) * grid,
    y: Math.round(p.y / grid) * grid,
  };
}

export function alignGuides(
  moving: Point,
  others: Point[],
  threshold = 6
): { point: Point; guides: Array<{ axis: "x" | "y"; value: number }> } {
  let x = moving.x;
  let y = moving.y;
  const guides: Array<{ axis: "x" | "y"; value: number }> = [];
  for (const o of others) {
    if (Math.abs(moving.x - o.x) <= threshold) {
      x = o.x;
      guides.push({ axis: "x", value: o.x });
    }
    if (Math.abs(moving.y - o.y) <= threshold) {
      y = o.y;
      guides.push({ axis: "y", value: o.y });
    }
  }
  return { point: { x, y }, guides };
}

/**
 * Layered left-to-right auto-layout from entry (or first node).
 * Deterministic for the same graph topology.
 */
export function autoLayoutGraph(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  opts?: { entryId?: string; origin?: Point }
): Record<string, Point> {
  const origin = opts?.origin ?? { x: 48, y: 48 };
  const positions: Record<string, Point> = {};
  if (nodes.length === 0) return positions;

  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    const list = outgoing.get(e.from) ?? [];
    list.push(e.to);
    outgoing.set(e.from, list);
  }

  const entry =
    (opts?.entryId && nodes.find((n) => n.id === opts.entryId)?.id) ||
    nodes[0]!.id;

  const depth = new Map<string, number>();
  const queue: string[] = [entry];
  depth.set(entry, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const to of outgoing.get(id) ?? []) {
      if (!depth.has(to)) {
        depth.set(to, d + 1);
        queue.push(to);
      }
    }
  }

  // Unreached nodes sit after the max depth
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      maxDepth += 1;
      depth.set(n.id, maxDepth);
    }
  }

  const columns = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const col = columns.get(d) ?? [];
    col.push(n.id);
    columns.set(d, col);
  }

  for (const [d, ids] of columns) {
    ids.forEach((id, row) => {
      const node = nodes.find((n) => n.id === id);
      const w = node?.width ?? DEFAULT_W;
      const h = node?.height ?? DEFAULT_H;
      positions[id] = {
        x: origin.x + d * (w + H_GAP),
        y: origin.y + row * (h + V_GAP),
      };
    });
  }

  return positions;
}

/** SVG path for an orthogonal-ish cubic edge with arrow tip target. */
export function edgePath(
  from: Point,
  to: Point,
  nodeW = DEFAULT_W,
  nodeH = DEFAULT_H
): string {
  const start = { x: from.x + nodeW, y: from.y + nodeH / 2 };
  const end = { x: to.x, y: to.y + nodeH / 2 };
  const midX = (start.x + end.x) / 2;
  return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
}

export function edgeLabelPoint(
  from: Point,
  to: Point,
  nodeW = DEFAULT_W,
  nodeH = DEFAULT_H
): Point {
  const start = { x: from.x + nodeW, y: from.y + nodeH / 2 };
  const end = { x: to.x, y: to.y + nodeH / 2 };
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 10 };
}

export const GRAPH_NODE_SIZE = { width: DEFAULT_W, height: DEFAULT_H };
export const GRAPH_SNAP = SNAP;
