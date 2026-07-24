/**
 * Build mode — promote selected sketch nodes → real TapConnect object stubs
 * with confirmation, warnings, undo via version restore.
 */

import { nanoid } from "nanoid";
import { addNode, bumpVersion, requireCanvas, restoreVersion, updateNode } from "./graph";
import { appendCanvasAudit } from "./store";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import type {
  CanvasObjectKind,
  LinkedObjectRef,
  PromotionResult,
  PromotionWarning,
  TapCanvas,
} from "./types";
import { SKETCH_ONLY_KINDS } from "./types";

const PROMOTE_KIND_MAP: Partial<Record<CanvasObjectKind, CanvasObjectKind>> = {
  sticky: "campaign",
  note: "card",
  frame: "campaign_group",
};

function synthesizeObjectId(kind: CanvasObjectKind): string {
  return `${kind}_${nanoid(10)}`;
}

export function previewPromotion(
  canvasId: string,
  nodeIds: string[]
): { warnings: PromotionWarning[]; promotable: string[] } {
  const canvas = requireCanvas(canvasId);
  const warnings: PromotionWarning[] = [];
  const promotable: string[] = [];

  for (const id of nodeIds) {
    const node = canvas.nodes.find((n) => n.id === id);
    if (!node) {
      warnings.push({ code: "missing_facts", message: `Node ${id} not found`, nodeId: id });
      continue;
    }
    if (!node.sketch && node.linked) {
      warnings.push({
        code: "unlinked_sketch",
        message: `${node.label} already linked — skip or re-link`,
        nodeId: id,
      });
      continue;
    }
    if (SKETCH_ONLY_KINDS.has(node.kind) || node.sketch) {
      promotable.push(id);
      if (!node.label.trim()) {
        warnings.push({
          code: "missing_facts",
          message: "Label required before promotion",
          nodeId: id,
        });
      }
      if (node.kind === "external_work_item" || node.data?.needsProvider) {
        warnings.push({
          code: "provider_required",
          message: "External work provider must be connected (mock OK)",
          nodeId: id,
          alternatives: ["Use Productivity mock adapter", "Connect monday/Asana in Settings"],
        });
      }
      if (node.data?.needsCredentials) {
        warnings.push({
          code: "missing_credentials",
          message: "Live credentials missing — mock path available",
          nodeId: id,
        });
      }
      if (node.data?.guardianBlocked) {
        warnings.push({
          code: "guardian_block",
          message: String(node.data.guardianReason ?? "Channel Guardian blocked this action"),
          nodeId: id,
          alternatives: (node.data.alternatives as string[]) ?? ["Use transactional purpose", "Collect consent"],
        });
      }
      if (node.data?.scheduleConflict) {
        warnings.push({
          code: "schedule_conflict",
          message: "Schedule overlaps an existing Campaign Group slot",
          nodeId: id,
        });
      }
    }
  }

  return { warnings, promotable };
}

/**
 * Promote selected sketch nodes. Requires confirm=true.
 * Creates stub authoritative object ids + optional ExternalWorkItem approval tasks.
 */
export function promoteSketchNodes(opts: {
  canvasId: string;
  nodeIds: string[];
  confirm: boolean;
  createApprovalTasks?: boolean;
  businessId?: string;
}): PromotionResult {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.mode !== "build" && canvas.mode !== "sketch") {
    // Allow promote from sketch or build; switch to build
  }
  canvas.mode = "build";

  const preview = previewPromotion(opts.canvasId, opts.nodeIds);
  if (!opts.confirm) {
    return {
      ok: false,
      canvas,
      promoted: [],
      warnings: [
        ...preview.warnings,
        {
          code: "missing_facts",
          message: "Confirmation required — set confirm=true to promote",
        },
      ],
      undoVersionId: "",
    };
  }

  const undoVersionId = bumpVersion(canvas, "pre-promote");
  const promoted: LinkedObjectRef[] = [];

  for (const id of opts.nodeIds) {
    const node = canvas.nodes.find((n) => n.id === id);
    if (!node || !preview.promotable.includes(id)) continue;

    const targetKind =
      (node.data?.promoteTo as CanvasObjectKind | undefined) ??
      PROMOTE_KIND_MAP[node.kind] ??
      (node.kind === "sticky" ? "campaign" : "card");

    const objectId = synthesizeObjectId(targetKind);
    const linked: LinkedObjectRef = { type: targetKind, id: objectId };

    updateNode(opts.canvasId, id, {
      label: node.label,
      linked,
      data: {
        ...node.data,
        executes: true,
        promotedAt: new Date().toISOString(),
        authority: "tapconnect",
      },
    });
    // Clear sketch flag after promotion
    const fresh = requireCanvas(opts.canvasId);
    const n = fresh.nodes.find((x) => x.id === id)!;
    n.sketch = false;
    n.kind = targetKind;
    n.updatedAt = new Date().toISOString();

    // Clear sketch edges connected to this node for flow semantics
    for (const e of fresh.edges) {
      if ((e.source === id || e.target === id) && e.sketch) {
        e.sketch = false;
        e.kind = "flow";
      }
    }

    promoted.push(linked);

    if (opts.createApprovalTasks && opts.businessId) {
      const task = createExternalWorkItem({
        provider: "monday",
        businessId: opts.businessId,
        title: `Approve promotion: ${node.label}`,
        description: `TapCanvas promoted sketch → ${targetKind}:${objectId}`,
        sourceType: "campaign_approval",
        sourceId: objectId,
        priority: "normal",
      });
      if (task.ok) {
        addExternalWorkNode(opts.canvasId, task.data.id, task.data.title, task.data.provider);
      }
    }
  }

  bumpVersion(requireCanvas(opts.canvasId), "post-promote");
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "canvas.promoted",
    detail: { promoted, warnings: preview.warnings },
  });

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    promoted,
    warnings: preview.warnings,
    undoVersionId,
  };
}

function addExternalWorkNode(
  canvasId: string,
  workItemId: string,
  title: string,
  provider: string
) {
  addNode(canvasId, {
    kind: "external_work_item",
    label: title,
    sketch: false,
    linked: { type: "external_work_item", id: workItemId, provider },
    data: { executes: true, provider },
  });
}

export function undoPromotion(canvasId: string, undoVersionId: string): TapCanvas {
  return restoreVersion(canvasId, undoVersionId);
}
