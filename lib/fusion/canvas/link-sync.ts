/**
 * Bidirectional linking: TapConnect object change → node update;
 * node edit → confirm → authoritative update + audit + events.
 * ExternalWorkItem is first-class.
 */

import { nanoid } from "nanoid";
import { addNode, requireCanvas, updateNode } from "./graph";
import { appendCanvasAudit, listCanvases } from "./store";
import {
  getWorkItem,
  upsertWorkItem,
} from "@/lib/fusion/connectors/productivity/store";
import type { ExternalWorkItem } from "@/lib/fusion/connectors/productivity/types";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { CanvasObjectKind, LinkedObjectRef, TapCanvas } from "./types";

export function linkNodeToObject(
  canvasId: string,
  nodeId: string,
  ref: LinkedObjectRef
): TapCanvas {
  updateNode(canvasId, nodeId, {
    linked: ref,
    data: { authority: "tapconnect", linkedAt: new Date().toISOString() },
  });
  const canvas = requireCanvas(canvasId);
  const node = canvas.nodes.find((n) => n.id === nodeId);
  if (node) {
    node.sketch = false;
    node.kind = ref.type === "journey_draft" ? "tapflow" : ref.type;
  }
  appendCanvasAudit({
    canvasId,
    action: "link.created",
    detail: { nodeId, ref },
  });
  void enqueueOutboxSync(
    "canvas.link.created",
    createGovernedEvent({
      name: "canvas.link.created",
      businessId: canvas.businessId,
      aggregateType: "TapCanvas",
      aggregateId: canvasId,
      correlationId: nanoid(10),
      payload: { nodeId, ref },
    })
  );
  return requireCanvas(canvasId);
}

/** Authoritative object changed → update linked projection nodes */
export function syncNodesFromObject(opts: {
  businessId: string;
  objectType: CanvasObjectKind;
  objectId: string;
  patch: { label?: string; status?: string; data?: Record<string, unknown> };
}): { updatedNodeIds: string[] } {
  const canvases = listCanvases(opts.businessId);
  const updatedNodeIds: string[] = [];

  for (const canvas of canvases) {
    for (const node of canvas.nodes) {
      if (
        node.linked?.type === opts.objectType &&
        node.linked.id === opts.objectId
      ) {
        updateNode(canvas.id, node.id, {
          label: opts.patch.label ?? node.label,
          liveStatus: opts.patch.status ?? node.liveStatus,
          data: { ...node.data, ...opts.patch.data, syncedFromObjectAt: new Date().toISOString() },
        });
        updatedNodeIds.push(node.id);
        appendCanvasAudit({
          canvasId: canvas.id,
          action: "link.synced_from_object",
          detail: { nodeId: node.id, objectType: opts.objectType, objectId: opts.objectId },
        });
      }
    }
  }
  return { updatedNodeIds };
}

/**
 * Node edit → requires confirm before mutating authoritative object.
 * For ExternalWorkItem, updates the productivity store when confirmed.
 */
export function applyNodeEditToAuthoritative(opts: {
  canvasId: string;
  nodeId: string;
  patch: { label?: string; status?: string; description?: string };
  confirm: boolean;
}): {
  ok: boolean;
  error?: string;
  workItem?: ExternalWorkItem;
  canvas?: TapCanvas;
} {
  const canvas = requireCanvas(opts.canvasId);
  const node = canvas.nodes.find((n) => n.id === opts.nodeId);
  if (!node) return { ok: false, error: "Node not found" };
  if (!node.linked) return { ok: false, error: "Node is not linked to an authoritative object" };
  if (!opts.confirm) {
    return {
      ok: false,
      error: "Confirmation required before updating authoritative object",
    };
  }

  if (node.linked.type === "external_work_item") {
    const item = getWorkItem(node.linked.id);
    if (!item) return { ok: false, error: "ExternalWorkItem not found" };
    const updated: ExternalWorkItem = {
      ...item,
      title: opts.patch.label ?? item.title,
      status: opts.patch.status ?? item.status,
      description: opts.patch.description ?? item.description,
      updatedAt: new Date().toISOString(),
    };
    upsertWorkItem(updated);
    updateNode(opts.canvasId, opts.nodeId, {
      label: updated.title,
      liveStatus: updated.status,
    });
    appendCanvasAudit({
      canvasId: opts.canvasId,
      action: "link.synced_to_object",
      detail: {
        nodeId: opts.nodeId,
        workItemId: updated.id,
        confirm: true,
      },
    });
    void enqueueOutboxSync(
      "canvas.link.synced_to_object",
      createGovernedEvent({
        name: "canvas.link.synced_to_object",
        businessId: canvas.businessId,
        aggregateType: "ExternalWorkItem",
        aggregateId: updated.id,
        correlationId: nanoid(10),
        payload: { canvasId: opts.canvasId, nodeId: opts.nodeId },
      })
    );
    return { ok: true, workItem: updated, canvas: requireCanvas(opts.canvasId) };
  }

  // Stub authoritative update for other types (campaign/card/etc.)
  updateNode(opts.canvasId, opts.nodeId, {
    label: opts.patch.label ?? node.label,
    liveStatus: opts.patch.status ?? node.liveStatus,
    data: {
      ...node.data,
      authoritativePatch: opts.patch,
      lastAuthoritativeSyncAt: new Date().toISOString(),
    },
  });
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "link.synced_to_object",
    detail: {
      nodeId: opts.nodeId,
      objectType: node.linked.type,
      objectId: node.linked.id,
      confirm: true,
      stub: true,
    },
  });
  return { ok: true, canvas: requireCanvas(opts.canvasId) };
}

/** Ensure ExternalWorkItem appears as a first-class canvas node */
export function ensureExternalWorkItemNode(opts: {
  canvasId: string;
  workItem: ExternalWorkItem;
}): TapCanvas {
  const canvas = requireCanvas(opts.canvasId);
  const existing = canvas.nodes.find(
    (n) =>
      n.linked?.type === "external_work_item" && n.linked.id === opts.workItem.id
  );
  if (existing) {
    updateNode(opts.canvasId, existing.id, {
      label: opts.workItem.title,
      liveStatus: opts.workItem.status,
    });
    return requireCanvas(opts.canvasId);
  }
  addNode(opts.canvasId, {
    kind: "external_work_item",
    label: opts.workItem.title,
    sketch: false,
    linked: {
      type: "external_work_item",
      id: opts.workItem.id,
      provider: opts.workItem.provider,
    },
    data: {
      provider: opts.workItem.provider,
      syncStatus: opts.workItem.syncStatus,
      executes: true,
    },
  });
  return requireCanvas(opts.canvasId);
}

/** Sync work item status changes into all linked canvas nodes */
export function syncExternalWorkItemToNodes(workItem: ExternalWorkItem) {
  if (!workItem.businessId) return { updatedNodeIds: [] as string[] };
  return syncNodesFromObject({
    businessId: workItem.businessId,
    objectType: "external_work_item",
    objectId: workItem.id,
    patch: {
      label: workItem.title,
      status: workItem.status,
      data: { syncStatus: workItem.syncStatus, provider: workItem.provider },
    },
  });
}
