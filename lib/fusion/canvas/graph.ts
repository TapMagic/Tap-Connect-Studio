/**
 * Shared TapCanvas graph engine — Guided + Expert share this one graph.
 */

import { nanoid } from "nanoid";
import type {
  CanvasEdge,
  CanvasMode,
  CanvasNode,
  CanvasObjectKind,
  TapCanvas,
} from "./types";
import {
  appendCanvasAudit,
  getCanvas,
  listVersions,
  pushVersion,
  upsertCanvas,
} from "./store";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";

function now() {
  return new Date().toISOString();
}

export function createCanvas(opts: {
  businessId: string;
  name: string;
  mode?: CanvasMode;
}): TapCanvas {
  const canvas: TapCanvas = {
    id: `canvas_${nanoid(10)}`,
    businessId: opts.businessId,
    name: opts.name,
    mode: opts.mode ?? "sketch",
    nodes: [],
    edges: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  };
  upsertCanvas(canvas);
  snapshotVersion(canvas, "initial");
  appendCanvasAudit({
    canvasId: canvas.id,
    action: "canvas.created",
    detail: { name: canvas.name, mode: canvas.mode },
  });
  void enqueueOutboxSync(
    "canvas.created",
    createGovernedEvent({
      name: "canvas.created",
      businessId: opts.businessId,
      aggregateType: "TapCanvas",
      aggregateId: canvas.id,
      correlationId: nanoid(10),
      payload: { name: canvas.name, mode: canvas.mode },
    })
  );
  return canvas;
}

export function setCanvasMode(canvasId: string, mode: CanvasMode): TapCanvas {
  const canvas = requireCanvas(canvasId);
  canvas.mode = mode;
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  appendCanvasAudit({
    canvasId,
    action: "canvas.mode_changed",
    detail: { mode },
  });
  return canvas;
}

export function addNode(
  canvasId: string,
  input: {
    kind: CanvasObjectKind;
    label: string;
    x?: number;
    y?: number;
    sketch?: boolean;
    data?: Record<string, unknown>;
    linked?: CanvasNode["linked"];
  }
): { canvas: TapCanvas; node: CanvasNode } {
  const canvas = requireCanvas(canvasId);
  const node: CanvasNode = {
    id: `node_${nanoid(8)}`,
    kind: input.kind,
    label: input.label,
    x: input.x ?? 40 + canvas.nodes.length * 24,
    y: input.y ?? 40 + canvas.nodes.length * 16,
    sketch: input.sketch ?? ["note", "sticky", "frame", "connector_label"].includes(input.kind),
    data: input.data,
    linked: input.linked ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  canvas.nodes.push(node);
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  appendCanvasAudit({
    canvasId,
    action: "node.added",
    detail: { nodeId: node.id, kind: node.kind, sketch: node.sketch },
  });
  return { canvas, node };
}

export function updateNode(
  canvasId: string,
  nodeId: string,
  patch: Partial<Pick<CanvasNode, "label" | "x" | "y" | "data" | "liveStatus" | "warnings" | "linked">>
): { canvas: TapCanvas; node: CanvasNode } {
  const canvas = requireCanvas(canvasId);
  const node = canvas.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  Object.assign(node, patch, { updatedAt: now() });
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  appendCanvasAudit({
    canvasId,
    action: "node.updated",
    detail: { nodeId, patch },
  });
  return { canvas, node };
}

export function removeNode(canvasId: string, nodeId: string): TapCanvas {
  const canvas = requireCanvas(canvasId);
  canvas.nodes = canvas.nodes.filter((n) => n.id !== nodeId);
  canvas.edges = canvas.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  appendCanvasAudit({ canvasId, action: "node.removed", detail: { nodeId } });
  return canvas;
}

export function addEdge(
  canvasId: string,
  input: {
    source: string;
    target: string;
    label?: string;
    kind?: CanvasEdge["kind"];
    sketch?: boolean;
  }
): { canvas: TapCanvas; edge: CanvasEdge } {
  const canvas = requireCanvas(canvasId);
  if (!canvas.nodes.some((n) => n.id === input.source)) {
    throw new Error(`Source node missing: ${input.source}`);
  }
  if (!canvas.nodes.some((n) => n.id === input.target)) {
    throw new Error(`Target node missing: ${input.target}`);
  }
  const edge: CanvasEdge = {
    id: `edge_${nanoid(8)}`,
    source: input.source,
    target: input.target,
    label: input.label,
    kind: input.kind ?? (input.sketch ? "sketch" : "flow"),
    sketch: input.sketch ?? false,
  };
  canvas.edges.push(edge);
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  appendCanvasAudit({
    canvasId,
    action: "edge.added",
    detail: { edgeId: edge.id, sketch: edge.sketch },
  });
  return { canvas, edge };
}

export function snapshotVersion(canvas: TapCanvas, label: string): string {
  const versionId = `cver_${nanoid(10)}`;
  pushVersion({
    id: versionId,
    canvasId: canvas.id,
    version: canvas.version,
    label,
    snapshot: {
      nodes: structuredClone(canvas.nodes),
      edges: structuredClone(canvas.edges),
      mode: canvas.mode,
    },
    createdAt: now(),
  });
  return versionId;
}

export function bumpVersion(canvas: TapCanvas, label: string): string {
  canvas.version += 1;
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  return snapshotVersion(canvas, label);
}

export function restoreVersion(canvasId: string, versionId: string): TapCanvas {
  const canvas = requireCanvas(canvasId);
  const v = listVersions(canvasId).find((x) => x.id === versionId);
  if (!v) throw new Error(`Version not found: ${versionId}`);
  canvas.nodes = structuredClone(v.snapshot.nodes);
  canvas.edges = structuredClone(v.snapshot.edges);
  canvas.mode = v.snapshot.mode;
  canvas.version += 1;
  canvas.updatedAt = now();
  upsertCanvas(canvas);
  snapshotVersion(canvas, `restore:${v.label}`);
  appendCanvasAudit({
    canvasId,
    action: "canvas.restored",
    detail: { fromVersionId: versionId, fromVersion: v.version },
  });
  return canvas;
}

export type CanvasVersionDiff = {
  leftVersionId: string;
  rightVersionId: string;
  leftLabel: string;
  rightLabel: string;
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesChanged: string[];
  edgesAdded: string[];
  edgesRemoved: string[];
  modeChanged: boolean;
};

/** Structural compare of two version snapshots (labels/ids only — not visual diff). */
export function compareCanvasVersions(
  canvasId: string,
  leftVersionId: string,
  rightVersionId: string
): CanvasVersionDiff {
  const left = listVersions(canvasId).find((x) => x.id === leftVersionId);
  const right = listVersions(canvasId).find((x) => x.id === rightVersionId);
  if (!left || !right) throw new Error("One or both versions not found");

  const leftNodeIds = new Set(left.snapshot.nodes.map((n) => n.id));
  const rightNodeIds = new Set(right.snapshot.nodes.map((n) => n.id));
  const leftEdgeIds = new Set(left.snapshot.edges.map((e) => e.id));
  const rightEdgeIds = new Set(right.snapshot.edges.map((e) => e.id));

  const nodesAdded = [...rightNodeIds].filter((id) => !leftNodeIds.has(id));
  const nodesRemoved = [...leftNodeIds].filter((id) => !rightNodeIds.has(id));
  const nodesChanged: string[] = [];
  for (const n of right.snapshot.nodes) {
    if (!leftNodeIds.has(n.id)) continue;
    const prior = left.snapshot.nodes.find((x) => x.id === n.id)!;
    if (
      prior.label !== n.label ||
      prior.kind !== n.kind ||
      Boolean(prior.sketch) !== Boolean(n.sketch) ||
      prior.liveStatus !== n.liveStatus
    ) {
      nodesChanged.push(n.id);
    }
  }

  return {
    leftVersionId,
    rightVersionId,
    leftLabel: left.label,
    rightLabel: right.label,
    nodesAdded,
    nodesRemoved,
    nodesChanged,
    edgesAdded: [...rightEdgeIds].filter((id) => !leftEdgeIds.has(id)),
    edgesRemoved: [...leftEdgeIds].filter((id) => !rightEdgeIds.has(id)),
    modeChanged: left.snapshot.mode !== right.snapshot.mode,
  };
}

export function requireCanvas(id: string): TapCanvas {
  const c = getCanvas(id);
  if (!c) throw new Error(`Canvas not found: ${id}`);
  return c;
}

export function getOpenInTapCanvasHref(opts: {
  objectType: string;
  objectId: string;
  canvasId?: string;
}): string {
  const q = new URLSearchParams({
    linkType: opts.objectType,
    linkId: opts.objectId,
  });
  if (opts.canvasId) q.set("canvasId", opts.canvasId);
  return `/dashboard/experiences/canvas?${q.toString()}`;
}
