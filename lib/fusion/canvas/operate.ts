/**
 * Operate mode — live operational overlay after publish (mock/live as available).
 */

import { requireCanvas, updateNode } from "./graph";
import { getWorkItem, listWorkItems } from "@/lib/fusion/connectors/productivity/store";
import type { TapCanvas } from "./types";
import { appendCanvasAudit } from "./store";

export type OperateOverlay = {
  canvasId: string;
  nodes: Array<{
    nodeId: string;
    kind: string;
    liveStatus: string;
    detail?: string;
  }>;
  externalTasks: Array<{
    workItemId: string;
    title: string;
    status?: string;
    syncStatus?: string;
  }>;
  campaigns: Array<{ nodeId: string; status: string }>;
  waits: Array<{ nodeId: string; until?: string }>;
  blocks: Array<{ nodeId: string; reason: string }>;
};

export function refreshOperateOverlay(canvasId: string, businessId?: string): OperateOverlay {
  const canvas = requireCanvas(canvasId);
  canvas.mode = "operate";

  const overlay: OperateOverlay = {
    canvasId,
    nodes: [],
    externalTasks: [],
    campaigns: [],
    waits: [],
    blocks: [],
  };

  for (const node of canvas.nodes) {
    if (node.sketch) {
      updateNode(canvasId, node.id, {
        liveStatus: "sketch_non_executing",
        warnings: ["Sketch objects do not execute in Operate"],
      });
      overlay.nodes.push({
        nodeId: node.id,
        kind: node.kind,
        liveStatus: "sketch_non_executing",
      });
      continue;
    }

    let liveStatus = "idle";
    let detail: string | undefined;

    if (node.kind === "external_work_item" && node.linked?.id) {
      const item = getWorkItem(node.linked.id);
      liveStatus = item?.status ?? "pending";
      detail = item?.syncStatus;
      if (item) {
        overlay.externalTasks.push({
          workItemId: item.id,
          title: item.title,
          status: item.status,
          syncStatus: item.syncStatus,
        });
      }
    } else if (node.kind === "campaign" || node.kind === "campaign_group") {
      liveStatus = (node.data?.status as string) ?? "draft";
      overlay.campaigns.push({ nodeId: node.id, status: liveStatus });
    } else if (node.kind === "wait") {
      liveStatus = "waiting";
      overlay.waits.push({
        nodeId: node.id,
        until: node.data?.until as string | undefined,
      });
    } else if (node.kind === "action" && node.data?.guardianBlocked) {
      liveStatus = "blocked";
      const reason = String(node.data.guardianReason ?? "guardian");
      overlay.blocks.push({ nodeId: node.id, reason });
    } else if (node.linked) {
      liveStatus = "linked";
    }

    updateNode(canvasId, node.id, { liveStatus });
    overlay.nodes.push({ nodeId: node.id, kind: node.kind, liveStatus, detail });
  }

  if (businessId) {
    const extras = listWorkItems({ businessId, limit: 20 });
    for (const item of extras) {
      if (!overlay.externalTasks.some((t) => t.workItemId === item.id)) {
        overlay.externalTasks.push({
          workItemId: item.id,
          title: item.title,
          status: item.status,
          syncStatus: item.syncStatus,
        });
      }
    }
  }

  appendCanvasAudit({
    canvasId,
    action: "operate.refreshed",
    detail: {
      nodeCount: overlay.nodes.length,
      tasks: overlay.externalTasks.length,
      blocks: overlay.blocks.length,
    },
  });

  return overlay;
}

export function getOperateSummary(canvas: TapCanvas) {
  return {
    mode: canvas.mode,
    linkedCount: canvas.nodes.filter((n) => n.linked).length,
    sketchCount: canvas.nodes.filter((n) => n.sketch).length,
    blockedCount: canvas.nodes.filter((n) => n.liveStatus === "blocked").length,
  };
}
