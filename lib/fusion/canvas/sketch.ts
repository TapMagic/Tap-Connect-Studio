/**
 * Sketch mode — freeform notes/frames/stickies/connectors.
 * Connected sketch objects do NOT execute.
 */

import { addEdge, addNode, createCanvas } from "./graph";
import type { TapCanvas } from "./types";
import { appendCanvasAudit } from "./store";

export function createSketchBoard(opts: {
  businessId: string;
  name?: string;
}): TapCanvas {
  return createCanvas({
    businessId: opts.businessId,
    name: opts.name ?? "Untitled TapCanvas",
    mode: "sketch",
  });
}

export function addStickyNote(
  canvasId: string,
  label: string,
  opts: { x?: number; y?: number; color?: string } = {}
) {
  return addNode(canvasId, {
    kind: "sticky",
    label,
    x: opts.x,
    y: opts.y,
    sketch: true,
    data: { color: opts.color ?? "lime", executes: false },
  });
}

export function addFrame(
  canvasId: string,
  label: string,
  opts: { x?: number; y?: number } = {}
) {
  return addNode(canvasId, {
    kind: "frame",
    label,
    x: opts.x,
    y: opts.y,
    sketch: true,
    data: { executes: false },
  });
}

export function addSketchNote(
  canvasId: string,
  label: string,
  opts: { x?: number; y?: number } = {}
) {
  return addNode(canvasId, {
    kind: "note",
    label,
    x: opts.x,
    y: opts.y,
    sketch: true,
    data: { executes: false },
  });
}

export function connectSketch(
  canvasId: string,
  source: string,
  target: string,
  label?: string
) {
  const result = addEdge(canvasId, {
    source,
    target,
    label,
    kind: "sketch",
    sketch: true,
  });
  appendCanvasAudit({
    canvasId,
    action: "sketch.connected",
    detail: {
      edgeId: result.edge.id,
      executes: false,
      note: "Sketch connectors never execute until promoted in Build mode",
    },
  });
  return result;
}

export function assertSketchNonExecuting(canvas: TapCanvas): {
  ok: boolean;
  sketchNodeCount: number;
  sketchEdgeCount: number;
} {
  const sketchNodes = canvas.nodes.filter((n) => n.sketch);
  const sketchEdges = canvas.edges.filter((e) => e.sketch);
  return {
    ok: sketchNodes.every((n) => n.data?.executes !== true),
    sketchNodeCount: sketchNodes.length,
    sketchEdgeCount: sketchEdges.length,
  };
}
