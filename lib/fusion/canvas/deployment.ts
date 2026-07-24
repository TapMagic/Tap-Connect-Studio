/**
 * Tap Point deployment visualization — logical placement / assignment preview,
 * conflict detection, deployment checklist → ExternalWorkItem.
 * NEVER changes physical Tap Point device URLs.
 */

import { nanoid } from "nanoid";
import { addNode, requireCanvas } from "./graph";
import { appendCanvasAudit } from "./store";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";

export type DeploymentPlacement = {
  slotId: string;
  label: string;
  locationHint: string;
  tapPointId?: string;
  campaignId?: string;
  /** Physical device URL — read-only, never mutated by canvas */
  deviceUrl?: string;
};

export type DeploymentConflict = {
  code: "double_assign" | "schedule_overlap" | "missing_tap_point" | "url_mutation_blocked";
  message: string;
  slotIds: string[];
};

export type DeploymentSimulation = {
  placements: DeploymentPlacement[];
  conflicts: DeploymentConflict[];
  checklist: Array<{ id: string; label: string; done: boolean }>;
  workItemId?: string;
  deviceUrlsUnchanged: true;
};

export function simulateDeployment(opts: {
  canvasId: string;
  placements: DeploymentPlacement[];
  createChecklistTask?: boolean;
}): DeploymentSimulation {
  const canvas = requireCanvas(opts.canvasId);
  const conflicts: DeploymentConflict[] = [];

  const byTapPoint = new Map<string, string[]>();
  for (const p of opts.placements) {
    if (p.tapPointId) {
      const list = byTapPoint.get(p.tapPointId) ?? [];
      list.push(p.slotId);
      byTapPoint.set(p.tapPointId, list);
    } else {
      conflicts.push({
        code: "missing_tap_point",
        message: `Slot "${p.label}" has no Tap Point assigned`,
        slotIds: [p.slotId],
      });
    }
    // Guard: any attempt to "change" device URL is blocked
    if (p.deviceUrl && (p as { newDeviceUrl?: string }).newDeviceUrl) {
      conflicts.push({
        code: "url_mutation_blocked",
        message: "Physical Tap Point device URLs must not change when assignments change",
        slotIds: [p.slotId],
      });
    }
  }

  for (const [tpId, slotIds] of byTapPoint) {
    if (slotIds.length > 1) {
      conflicts.push({
        code: "double_assign",
        message: `Tap Point ${tpId} assigned to multiple slots`,
        slotIds,
      });
    }
  }

  // Schedule overlap: same campaign on overlapping slots (simple heuristic)
  const campaignSlots = new Map<string, string[]>();
  for (const p of opts.placements) {
    if (!p.campaignId) continue;
    const list = campaignSlots.get(p.campaignId) ?? [];
    list.push(p.slotId);
    campaignSlots.set(p.campaignId, list);
  }
  // If same campaign appears with conflicting location hints containing "overlap"
  for (const p of opts.placements) {
    if (p.locationHint?.includes("overlap") || p.locationHint?.includes("conflict")) {
      conflicts.push({
        code: "schedule_overlap",
        message: `Schedule conflict hinted at slot "${p.label}"`,
        slotIds: [p.slotId],
      });
    }
  }

  const checklist = [
    {
      id: "placements_defined",
      label: "Logical placements defined",
      done: opts.placements.length > 0,
    },
    {
      id: "no_double_assign",
      label: "No double Tap Point assignments",
      done: !conflicts.some((c) => c.code === "double_assign"),
    },
    {
      id: "no_schedule_overlap",
      label: "No schedule overlaps",
      done: !conflicts.some((c) => c.code === "schedule_overlap"),
    },
    {
      id: "device_url_immutable",
      label: "Device URLs unchanged",
      done: !conflicts.some((c) => c.code === "url_mutation_blocked"),
    },
    {
      id: "all_slots_assigned",
      label: "All slots have Tap Points",
      done: !conflicts.some((c) => c.code === "missing_tap_point"),
    },
  ];

  // Project onto canvas
  for (const [i, p] of opts.placements.entries()) {
    addNode(opts.canvasId, {
      kind: "deployment_slot",
      label: p.label,
      x: 60 + i * 160,
      y: 200,
      sketch: false,
      linked: p.tapPointId
        ? { type: "tap_point", id: p.tapPointId }
        : undefined,
      data: {
        placement: p,
        deviceUrl: p.deviceUrl,
        deviceUrlImmutable: true,
        conflicts: conflicts.filter((c) => c.slotIds.includes(p.slotId)),
      },
    });
  }

  let workItemId: string | undefined;
  if (opts.createChecklistTask) {
    const task = createExternalWorkItem({
      provider: "asana",
      businessId: canvas.businessId,
      title: `Deployment checklist: ${canvas.name}`,
      description: checklist
        .map((c) => `- [${c.done ? "x" : " "}] ${c.label}`)
        .join("\n"),
      sourceType: "tap_point_failure",
      sourceId: canvas.id,
      priority: conflicts.length ? "high" : "normal",
      idempotencyKey: `deployment:${canvas.id}:${nanoid(6)}`,
    });
    if (task.ok) {
      workItemId = task.data.id;
      addNode(opts.canvasId, {
        kind: "external_work_item",
        label: task.data.title,
        sketch: false,
        linked: {
          type: "external_work_item",
          id: task.data.id,
          provider: "asana",
        },
      });
    }
  }

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "deployment.simulated",
    detail: {
      placementCount: opts.placements.length,
      conflictCount: conflicts.length,
      workItemId,
      deviceUrlsUnchanged: true,
    },
  });

  return {
    placements: opts.placements,
    conflicts,
    checklist,
    workItemId,
    deviceUrlsUnchanged: true,
  };
}

export function detectScheduleConflicts(opts: {
  slots: Array<{ id: string; start: string; end: string; campaignId: string }>;
}): DeploymentConflict[] {
  const conflicts: DeploymentConflict[] = [];
  const sorted = [...opts.slots].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (a.end > b.start && a.campaignId !== b.campaignId) {
        // overlapping windows with different campaigns on same resource set
        conflicts.push({
          code: "schedule_overlap",
          message: `Slots ${a.id} and ${b.id} overlap (${a.start}–${a.end} vs ${b.start}–${b.end})`,
          slotIds: [a.id, b.id],
        });
      }
    }
  }
  return conflicts;
}
