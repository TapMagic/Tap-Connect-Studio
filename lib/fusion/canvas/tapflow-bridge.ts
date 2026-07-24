/**
 * TapFlow-in-canvas lifecycle bridge — creates/binds JourneyDraft (DRAFT) to a tapflow node.
 * Does not publish or activate live journeys (not OWNER-READY).
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createEmptyJourney } from "@/lib/fusion/journey/types";
import { transitionJourneyLifecycle } from "@/lib/fusion/journey/lifecycle";
import { simulatePath } from "@/lib/fusion/journey/simulation";
import { addNode, requireCanvas, updateNode } from "./graph";
import { flushCanvasState, persistCanvasDocument } from "./persist";
import { appendCanvasAudit } from "./store";
import type { TapCanvas } from "./types";

export type TapflowFromCanvasResult = {
  ok: boolean;
  canvas: TapCanvas;
  nodeId: string;
  journeyDraftId: string;
  lifecycleStatus: "DRAFT";
  persistence: "prisma" | "memory_stub";
  simulate?: { path: string[]; stub: true };
  message: string;
};

export async function createTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  name?: string;
  nodeId?: string;
  simulate?: boolean;
}): Promise<TapflowFromCanvasResult> {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.businessId !== opts.businessId) {
    throw new Error("Canvas business mismatch");
  }

  const name = opts.name?.trim() || `TapFlow from ${canvas.name}`;
  const definition = createEmptyJourney(name);

  // Intentionally remain DRAFT — publish/activate stay outside this bridge (not OWNER-READY).
  // Confirm lifecycle helper still allows DRAFT→publish as the next legal step.
  const nextPublish = transitionJourneyLifecycle("DRAFT", "publish");
  if (!nextPublish.ok) {
    throw new Error("Journey lifecycle unexpectedly blocks DRAFT publish path");
  }

  let journeyDraftId: string;
  let persistence: "prisma" | "memory_stub";

  if (isIsolatedFusionDatabaseConfigured()) {
    const draft = await prisma.journeyDraft.create({
      data: {
        businessId: opts.businessId,
        name,
        definition: definition as object,
        schemaVersion: definition.schemaVersion ?? 1,
        status: "DRAFT",
      },
    });
    journeyDraftId = draft.id;
    persistence = "prisma";
  } else {
    journeyDraftId = `jd_mem_${Date.now().toString(36)}`;
    persistence = "memory_stub";
  }

  let nodeId = opts.nodeId;
  if (nodeId) {
    const existing = canvas.nodes.find((n) => n.id === nodeId);
    if (!existing) throw new Error("Node not found");
    updateNode(opts.canvasId, nodeId, {
      kind: "tapflow",
      label: name,
      sketch: false,
      linked: { type: "journey_draft", id: journeyDraftId },
      data: {
        ...(existing.data ?? {}),
        journeyDraftId,
        lifecycleStatus: "DRAFT",
        authority: "tapconnect",
        executes: false,
        note: "Bound JourneyDraft stays DRAFT until publish/activate outside this bridge",
      },
    });
  } else {
    const added = addNode(opts.canvasId, {
      kind: "tapflow",
      label: name,
      sketch: false,
      linked: { type: "journey_draft", id: journeyDraftId },
      data: {
        journeyDraftId,
        lifecycleStatus: "DRAFT",
        authority: "tapconnect",
        executes: false,
        note: "Bound JourneyDraft stays DRAFT until publish/activate outside this bridge",
      },
    });
    nodeId = added.node.id;
  }

  const fresh = requireCanvas(opts.canvasId);
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.bound",
    detail: {
      nodeId,
      journeyDraftId,
      lifecycleStatus: "DRAFT",
      persistence,
    },
  });

  if (persistence === "prisma") {
    await persistCanvasDocument(fresh);
    await flushCanvasState(fresh.id);
  }

  let simulate: TapflowFromCanvasResult["simulate"];
  if (opts.simulate) {
    simulate = { path: simulatePath(definition), stub: true };
  }

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    nodeId,
    journeyDraftId,
    lifecycleStatus: "DRAFT",
    persistence,
    simulate,
    message:
      persistence === "prisma"
        ? "JourneyDraft (DRAFT) created and linked to TapCanvas tapflow node"
        : "Memory stub JourneyDraft linked — isolated DB required for persistence",
  };
}

/** Alias for bind_tapflow action */
export const bindTapflowFromCanvas = createTapflowFromCanvas;
