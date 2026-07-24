/**
 * TapFlow-in-canvas lifecycle bridge — same JourneyDraft / FlowDefinition engine as Journeys workspace.
 * Create/configure/validate/simulate/save/version/publish/activate/execute/recover/pause/resume
 * all operate on the linked JourneyDraft. Planning bind stays DRAFT until explicit lifecycle actions.
 */

import { prisma } from "@/lib/db";
import type { JourneyLifecycleStatus, Prisma } from "@prisma/client";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { buildJourneyAnalyticsOverlay } from "@/lib/fusion/journey/analytics";
import {
  lifecycleRequiresFeature,
  lifecycleRequiresValidation,
  transitionJourneyLifecycle,
  type JourneyLifecycleAction,
} from "@/lib/fusion/journey/lifecycle";
import {
  planJourneyRecovery,
  recoverJourneyDryRun,
  type RecoveryPatch,
} from "@/lib/fusion/journey/recovery";
import {
  executeJourneyDryRun,
  SAMPLE_VISITOR,
  type DryRunResult,
  type VisitorContext,
} from "@/lib/fusion/journey/runtime";
import { simulatePath } from "@/lib/fusion/journey/simulation";
import {
  createEmptyJourney,
  type JourneyDefinition,
} from "@/lib/fusion/journey/types";
import { journeyIsValid, validateJourney } from "@/lib/fusion/journey/validation";
import { addNode, requireCanvas, updateNode } from "./graph";
import { flushCanvasState, persistCanvasDocument } from "./persist";
import { appendCanvasAudit } from "./store";
import type { TapCanvas } from "./types";

export type TapflowFromCanvasResult = {
  ok: boolean;
  canvas: TapCanvas;
  nodeId: string;
  journeyDraftId: string;
  lifecycleStatus: JourneyLifecycleStatus | "DRAFT";
  persistence: "prisma" | "memory_stub";
  simulate?: { path: string[]; stub?: boolean; dryRun?: DryRunResult };
  message: string;
};

async function featureOn(featureId: string): Promise<boolean> {
  const overrides = toResolveOverrides(await listFeatureOverrides());
  return isFeatureEnabled(featureId, { overrides });
}

function readDefinition(raw: unknown): JourneyDefinition {
  return raw as JourneyDefinition;
}

function findTapflowNode(canvas: TapCanvas, nodeId?: string, journeyDraftId?: string) {
  if (nodeId) return canvas.nodes.find((n) => n.id === nodeId);
  if (journeyDraftId) {
    return canvas.nodes.find(
      (n) =>
        n.kind === "tapflow" &&
        (n.linked?.id === journeyDraftId || n.data?.journeyDraftId === journeyDraftId)
    );
  }
  return canvas.nodes.find((n) => n.kind === "tapflow");
}

function syncNodeLifecycle(
  canvasId: string,
  nodeId: string,
  patch: Record<string, unknown>
) {
  const canvas = requireCanvas(canvasId);
  const node = canvas.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  updateNode(canvasId, nodeId, {
    data: {
      ...(node.data ?? {}),
      ...patch,
    },
    liveStatus: typeof patch.lifecycleStatus === "string" ? patch.lifecycleStatus : node.liveStatus,
  });
}

export async function createTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  name?: string;
  nodeId?: string;
  simulate?: boolean;
  /** Rich definition — defaults to createEmptyJourney */
  definition?: JourneyDefinition;
}): Promise<TapflowFromCanvasResult> {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.businessId !== opts.businessId) {
    throw new Error("Canvas business mismatch");
  }

  const name = opts.name?.trim() || `TapFlow from ${canvas.name}`;
  const definition = opts.definition ?? createEmptyJourney(name);

  // Confirm DRAFT→publish remains a legal next step in the shared FSM
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
  const dataPayload = {
    journeyDraftId,
    lifecycleStatus: "DRAFT" as const,
    authority: "tapconnect",
    executes: false,
    planningOnly: true,
    note: "Bound JourneyDraft stays DRAFT until publish/activate via tapflow_* actions",
  };

  if (nodeId) {
    const existing = canvas.nodes.find((n) => n.id === nodeId);
    if (!existing) throw new Error("Node not found");
    updateNode(opts.canvasId, nodeId, {
      label: name,
      linked: { type: "journey_draft", id: journeyDraftId },
      data: { ...(existing.data ?? {}), ...dataPayload },
    });
    const n = requireCanvas(opts.canvasId).nodes.find((x) => x.id === nodeId)!;
    n.kind = "tapflow";
    n.sketch = false;
  } else {
    const added = addNode(opts.canvasId, {
      kind: "tapflow",
      label: name,
      sketch: false,
      linked: { type: "journey_draft", id: journeyDraftId },
      data: dataPayload,
    });
    nodeId = added.node.id;
  }

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
    await persistCanvasDocument(requireCanvas(opts.canvasId));
    await flushCanvasState(opts.canvasId);
  }

  let simulate: TapflowFromCanvasResult["simulate"];
  if (opts.simulate) {
    const dryRun = executeJourneyDryRun(definition, SAMPLE_VISITOR, { requireValid: false });
    simulate = {
      path: dryRun.path.length ? dryRun.path : simulatePath(definition),
      stub: false,
      dryRun,
    };
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

export const bindTapflowFromCanvas = createTapflowFromCanvas;

export async function configureTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  definition: JourneyDefinition;
  name?: string;
  nodeId?: string;
}): Promise<{
  ok: boolean;
  canvas: TapCanvas;
  journeyDraftId: string;
  validation: ReturnType<typeof validateJourney>;
  persistence: "prisma" | "memory_stub";
  message: string;
}> {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.businessId !== opts.businessId) throw new Error("Canvas business mismatch");

  const validation = validateJourney(opts.definition);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: false,
      canvas,
      journeyDraftId: opts.journeyDraftId,
      validation,
      persistence: "memory_stub",
      message: "Isolated DB required to save TapFlow definition",
    };
  }

  const updated = await prisma.journeyDraft.updateMany({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
    data: {
      name: opts.name?.trim() || opts.definition.name,
      definition: opts.definition as object,
      schemaVersion: opts.definition.schemaVersion ?? 1,
    },
  });
  if (updated.count === 0) {
    return {
      ok: false,
      canvas,
      journeyDraftId: opts.journeyDraftId,
      validation,
      persistence: "prisma",
      message: "JourneyDraft not found",
    };
  }

  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      journeyDraftId: opts.journeyDraftId,
      configuredAt: new Date().toISOString(),
      validationErrorCount: validation.filter((v) => v.severity === "error").length,
    });
  }

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.configured",
    detail: { journeyDraftId: opts.journeyDraftId, validation },
  });
  await persistCanvasDocument(requireCanvas(opts.canvasId));
  await flushCanvasState(opts.canvasId);

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    journeyDraftId: opts.journeyDraftId,
    validation,
    persistence: "prisma",
    message: "TapFlow definition saved on JourneyDraft",
  };
}

export async function validateTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  nodeId?: string;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: false,
      valid: false,
      issues: [{ severity: "error" as const, code: "no_db", message: "Isolated DB required" }],
      canvas,
      message: "Isolated DB required",
    };
  }
  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return {
      ok: false,
      valid: false,
      issues: [{ severity: "error" as const, code: "not_found", message: "Draft not found" }],
      canvas,
      message: "JourneyDraft not found",
    };
  }
  const definition = readDefinition(draft.definition);
  const issues = validateJourney(definition);
  const valid = journeyIsValid(definition);
  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      lastValidatedAt: new Date().toISOString(),
      valid,
      validationErrorCount: issues.filter((i) => i.severity === "error").length,
    });
  }
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.validated",
    detail: { journeyDraftId: opts.journeyDraftId, valid, issues },
  });
  return {
    ok: true,
    valid,
    issues,
    canvas: requireCanvas(opts.canvasId),
    definition,
    message: valid ? "Journey valid" : "Journey has validation errors",
  };
}

export async function simulateTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  visitor?: VisitorContext;
  nodeId?: string;
  /** Force a fail path for proof (guardian block) */
  forceFail?: boolean;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: false,
      canvas,
      message: "Isolated DB required",
      dryRun: null as DryRunResult | null,
    };
  }
  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return { ok: false, canvas, message: "JourneyDraft not found", dryRun: null };
  }
  const definition = readDefinition(draft.definition);
  const visitor: VisitorContext = opts.forceFail
    ? {
        ...(opts.visitor ?? SAMPLE_VISITOR),
        consent: { email: false, sms: false, marketing: false },
      }
    : opts.visitor ?? SAMPLE_VISITOR;

  // Inject a message node temporarily only when forceFail and graph has none — prefer real graph
  let runDef = definition;
  if (opts.forceFail && !definition.nodes.some((n) => n.type === "message" || n.type === "email")) {
    const mid = "msg_force_fail";
    const exit = definition.nodes.find((n) => n.type === "exit");
    const entry = definition.nodes.find((n) => n.type === "trigger" || n.type === "entry_tap");
    runDef = {
      ...definition,
      nodes: [
        ...definition.nodes.filter((n) => n.type !== "exit"),
        {
          id: mid,
          type: "email",
          label: "Proof email",
          config: { requiresConsent: true },
          position: { x: 240, y: 120 },
        },
        ...(exit ? [exit] : []),
      ],
      edges: entry
        ? [
            { id: "e_ff1", from: entry.id, to: mid },
            ...(exit ? [{ id: "e_ff2", from: mid, to: exit.id }] : []),
          ]
        : definition.edges,
    };
  }

  const dryRun = executeJourneyDryRun(runDef, visitor, { requireValid: false });
  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      lastSimulateAt: new Date().toISOString(),
      lastSimulatePath: dryRun.path,
      lastSimulateOk: dryRun.ok && dryRun.completed,
      lastBlockedAt: dryRun.blockedAt,
      nodeLiveState: dryRun.events.map((e) => ({
        nodeId: e.nodeId,
        action: e.action,
        blocked: e.blocked,
      })),
    });
  }
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.simulated",
    detail: {
      journeyDraftId: opts.journeyDraftId,
      path: dryRun.path,
      completed: dryRun.completed,
      blockedAt: dryRun.blockedAt,
    },
  });
  await persistCanvasDocument(requireCanvas(opts.canvasId));
  await flushCanvasState(opts.canvasId);

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    dryRun,
    recovery: planJourneyRecovery(dryRun),
    message: dryRun.completed ? "Simulate completed" : "Simulate blocked or incomplete",
  };
}

export async function lifecycleTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  action: JourneyLifecycleAction;
  nodeId?: string;
  actorId?: string;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.businessId !== opts.businessId) throw new Error("Canvas business mismatch");

  if (!(await featureOn("canvas.tapcanvas"))) {
    return {
      ok: false,
      status: 503 as const,
      feature: "canvas.tapcanvas",
      message: "canvas.tapcanvas kill-switch — TapCanvas TapFlow lifecycle blocked",
      canvas,
    };
  }

  if (lifecycleRequiresFeature(opts.action) && !(await featureOn("journey.tapflow"))) {
    return {
      ok: false,
      status: 503 as const,
      feature: "journey.tapflow",
      message: "journey.tapflow disabled — publish/activate/resume blocked from TapCanvas",
      canvas,
    };
  }

  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: false,
      status: 400 as const,
      message: "Isolated DB required",
      canvas,
    };
  }

  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return { ok: false, status: 404 as const, message: "JourneyDraft not found", canvas };
  }

  const definition = readDefinition(draft.definition);
  if (lifecycleRequiresValidation(opts.action) && !journeyIsValid(definition)) {
    return {
      ok: false,
      status: 400 as const,
      message: "Fix validation errors before publish/activate/resume",
      canvas,
      issues: validateJourney(definition),
    };
  }

  const transition = transitionJourneyLifecycle(draft.status, opts.action);
  if (!transition.ok) {
    return { ok: false, status: 400 as const, message: transition.message, canvas };
  }

  const now = new Date();
  const data: Prisma.JourneyDraftUpdateInput = { status: transition.status };
  if (transition.timestamps.publishedAt) data.publishedAt = now;
  if (transition.timestamps.activatedAt) data.activatedAt = now;
  if (transition.timestamps.pausedAt) data.pausedAt = now;

  const updated = await prisma.journeyDraft.update({
    where: { id: draft.id },
    data,
  });

  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      lifecycleStatus: updated.status,
      executes: updated.status === "ACTIVE",
      planningOnly: updated.status === "DRAFT" || updated.status === "PUBLISHED",
      publishedAt: updated.publishedAt?.toISOString(),
      activatedAt: updated.activatedAt?.toISOString(),
      pausedAt: updated.pausedAt?.toISOString(),
    });
  }

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: `tapflow.${opts.action}`,
    detail: {
      journeyDraftId: opts.journeyDraftId,
      status: updated.status,
      previousStatus: transition.previousStatus,
      actorId: opts.actorId,
    },
  });

  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId: opts.businessId,
        actorType: "USER",
        actorId: opts.actorId ?? "canvas",
        action: `journey.${opts.action}`,
        resourceType: "journey_draft",
        resourceId: draft.id,
        correlationId: `canvas_${opts.canvasId}_${Date.now()}`,
        metadata: {
          via: "tapcanvas",
          status: updated.status,
          previousStatus: transition.previousStatus,
        },
      },
    });
  } catch {
    /* optional mid-migrate */
  }

  await persistCanvasDocument(requireCanvas(opts.canvasId));
  await flushCanvasState(opts.canvasId);

  return {
    ok: true,
    status: 200 as const,
    canvas: requireCanvas(opts.canvasId),
    draft: {
      id: updated.id,
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      activatedAt: updated.activatedAt?.toISOString() ?? null,
      pausedAt: updated.pausedAt?.toISOString() ?? null,
    },
    message: `TapFlow ${opts.action} → ${updated.status}`,
  };
}

export async function executeTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  visitor?: VisitorContext;
  nodeId?: string;
  retry?: boolean;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return { ok: false, message: "Isolated DB required", canvas, dryRun: null as DryRunResult | null };
  }

  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return { ok: false, message: "JourneyDraft not found", canvas, dryRun: null };
  }

  // Live queue execute only when ACTIVE + feature on; otherwise dry-run with honest note
  const canLive =
    draft.status === "ACTIVE" && (await featureOn("journey.tapflow"));
  const definition = readDefinition(draft.definition);
  const dryRun = executeJourneyDryRun(
    definition,
    opts.visitor ?? SAMPLE_VISITOR,
    { requireValid: false }
  );

  const historyEntry = {
    at: new Date().toISOString(),
    path: dryRun.path,
    completed: dryRun.completed,
    blockedAt: dryRun.blockedAt,
    mode: canLive ? "active_dry_run" : "draft_dry_run",
    retry: Boolean(opts.retry),
  };

  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    const prev = Array.isArray(node.data?.executionHistory)
      ? (node.data!.executionHistory as unknown[])
      : [];
    syncNodeLifecycle(opts.canvasId, node.id, {
      lastExecuteAt: historyEntry.at,
      lastExecuteOk: dryRun.completed,
      executionHistory: [...prev, historyEntry].slice(-20),
      nodeLiveState: dryRun.events.map((e) => ({
        nodeId: e.nodeId,
        label: e.label,
        action: e.action,
        blocked: e.blocked,
      })),
      liveExecuteQueued: false,
      liveExecuteNote: canLive
        ? "ACTIVE journey — dry-run recorded; live visitor executor remains feature/provider gated"
        : "Execute recorded as dry-run — activate + journey.tapflow required for live queue",
    });
  }

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: opts.retry ? "tapflow.execute.retry" : "tapflow.execute",
    detail: historyEntry,
  });
  await persistCanvasDocument(requireCanvas(opts.canvasId));
  await flushCanvasState(opts.canvasId);

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    dryRun,
    recovery: planJourneyRecovery(dryRun),
    analytics: buildJourneyAnalyticsOverlay(definition, [
      {
        journeyName: definition.name,
        status: dryRun.completed ? "completed" : "blocked",
        path: dryRun.path,
        dryRun: true,
      },
    ]),
    message: dryRun.completed
      ? "Execute dry-run completed"
      : "Execute dry-run blocked — use recover/retry",
  };
}

export async function recoverTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  patch?: RecoveryPatch;
  nodeId?: string;
}) {
  const sim = await simulateTapflowFromCanvas({
    businessId: opts.businessId,
    canvasId: opts.canvasId,
    journeyDraftId: opts.journeyDraftId,
    nodeId: opts.nodeId,
    forceFail: true,
  });
  if (!sim.ok || !sim.dryRun) return { ...sim, recovered: null as DryRunResult | null };

  const plan = planJourneyRecovery(sim.dryRun);
  const patch = opts.patch ?? plan.suggestedPatch;
  if (!isIsolatedFusionDatabaseConfigured()) {
    return { ok: false, message: "Isolated DB required", canvas: sim.canvas, recovered: null };
  }
  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return { ok: false, message: "JourneyDraft not found", canvas: sim.canvas, recovered: null };
  }
  const definition = readDefinition(draft.definition);
  const recovered = recoverJourneyDryRun(definition, sim.dryRun, patch);
  const node = findTapflowNode(sim.canvas, opts.nodeId, opts.journeyDraftId);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      lastRecoverAt: new Date().toISOString(),
      lastRecoverOk: recovered.completed,
      recoveryPlan: plan,
    });
  }
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.recovered",
    detail: { journeyDraftId: opts.journeyDraftId, completed: recovered.completed, patch },
  });
  await persistCanvasDocument(requireCanvas(opts.canvasId));
  await flushCanvasState(opts.canvasId);

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    plan,
    recovered,
    message: recovered.completed ? "Recovery dry-run completed" : "Recovery still blocked",
  };
}

export async function analyticsTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  nodeId?: string;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return { ok: false, message: "Isolated DB required", canvas, overlay: null };
  }
  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  if (!draft) {
    return { ok: false, message: "JourneyDraft not found", canvas, overlay: null };
  }
  const definition = readDefinition(draft.definition);
  const node = findTapflowNode(canvas, opts.nodeId, opts.journeyDraftId);
  const runs =
    node && Array.isArray(node.data?.executionHistory)
      ? (node.data!.executionHistory as Array<{ path?: string[]; completed?: boolean }>).map(
          (h, i) => ({
            id: `run_${i}`,
            journeyName: definition.name,
            status: h.completed ? "completed" : "blocked",
            path: h.path ?? [],
            dryRun: true,
          })
        )
      : [];
  const overlay = buildJourneyAnalyticsOverlay(definition, runs);
  if (node) {
    syncNodeLifecycle(opts.canvasId, node.id, {
      analyticsOverlay: overlay,
      analyticsAt: new Date().toISOString(),
    });
  }
  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.analytics",
    detail: { journeyDraftId: opts.journeyDraftId, evidence: overlay.evidence },
  });
  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    overlay,
    message: overlay.note,
  };
}

/** Rollback: pause ACTIVE journey if needed + restore canvas version snapshot. */
export async function rollbackTapflowFromCanvas(opts: {
  businessId: string;
  canvasId: string;
  journeyDraftId: string;
  undoVersionId?: string;
  nodeId?: string;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) {
    return { ok: false, message: "Isolated DB required", canvas };
  }

  const draft = await prisma.journeyDraft.findFirst({
    where: { id: opts.journeyDraftId, businessId: opts.businessId },
  });
  let paused = false;
  if (draft && (draft.status === "ACTIVE" || draft.status === "PUBLISHED")) {
    const life = await lifecycleTapflowFromCanvas({
      businessId: opts.businessId,
      canvasId: opts.canvasId,
      journeyDraftId: opts.journeyDraftId,
      action: "pause",
      nodeId: opts.nodeId,
    });
    paused = Boolean(life.ok);
  }

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "tapflow.rollback",
    detail: {
      journeyDraftId: opts.journeyDraftId,
      paused,
      undoVersionId: opts.undoVersionId,
    },
  });

  return {
    ok: true,
    canvas: requireCanvas(opts.canvasId),
    paused,
    message: paused
      ? "TapFlow paused (rollback). Use restore_version for canvas graph rollback."
      : "Rollback recorded — journey was not ACTIVE/PUBLISHED",
  };
}

/** Enrich operate overlay with TapFlow node live state from linked drafts. */
export async function hydrateTapflowOperateState(opts: {
  businessId: string;
  canvasId: string;
}) {
  const canvas = requireCanvas(opts.canvasId);
  if (!isIsolatedFusionDatabaseConfigured()) return canvas;

  for (const node of canvas.nodes.filter((n) => n.kind === "tapflow")) {
    const draftId =
      (typeof node.data?.journeyDraftId === "string" && node.data.journeyDraftId) ||
      (node.linked?.type === "journey_draft" ? node.linked.id : null);
    if (!draftId) continue;
    const draft = await prisma.journeyDraft.findFirst({
      where: { id: draftId, businessId: opts.businessId },
    });
    if (!draft) continue;
    syncNodeLifecycle(opts.canvasId, node.id, {
      lifecycleStatus: draft.status,
      executes: draft.status === "ACTIVE",
      liveStatus: draft.status,
    });
  }
  return requireCanvas(opts.canvasId);
}
