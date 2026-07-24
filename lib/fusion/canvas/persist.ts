/**
 * Prisma-backed TapCanvas persistence — source of truth on isolated fusion DB.
 * Unit tests without DATABASE_URL continue to use in-memory store.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import type { Prisma } from "@prisma/client";
import type {
  AutomationProposal,
  CanvasAuditEntry,
  CanvasEdge,
  CanvasMode,
  CanvasNode,
  CanvasVersion,
  TapCanvas,
} from "./types";
import {
  getCanvas,
  listCanvases,
  listVersions,
  listProposals,
  listCanvasAudit,
  upsertCanvas,
  pushVersion,
  upsertProposal,
  appendCanvasAudit,
  getProposal,
  getVersion,
  memPushComment,
  memListComments,
  memPushApproval,
  memListApprovals,
  memResolveApproval,
  type MemCanvasApproval,
  type MemCanvasComment,
} from "./store";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function canvasPersistenceEnabled(): boolean {
  return isIsolatedFusionDatabaseConfigured();
}

function graphFromCanvas(canvas: TapCanvas) {
  return { nodes: canvas.nodes, edges: canvas.edges };
}

function canvasFromRow(row: {
  id: string;
  businessId: string;
  name: string;
  mode: string;
  version: number;
  graph: unknown;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TapCanvas {
  const graph = (row.graph ?? { nodes: [], edges: [] }) as {
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
  };
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    mode: row.mode as CanvasMode,
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

export async function persistCanvasDocument(canvas: TapCanvas): Promise<void> {
  if (!canvasPersistenceEnabled()) return;

  const graph = graphFromCanvas(canvas);
  await prisma.tapCanvasDocument.upsert({
    where: { id: canvas.id },
    create: {
      id: canvas.id,
      businessId: canvas.businessId,
      name: canvas.name,
      mode: canvas.mode,
      version: canvas.version,
      graph: asJson(graph),
      metadata: asJson({}),
      archivedAt: canvas.archivedAt ? new Date(canvas.archivedAt) : null,
    },
    update: {
      name: canvas.name,
      mode: canvas.mode,
      version: canvas.version,
      graph: asJson(graph),
      archivedAt: canvas.archivedAt ? new Date(canvas.archivedAt) : null,
      updatedAt: new Date(),
    },
  });

  // Sync normalized item / connector / frame / binding rows
  await prisma.canvasItem.deleteMany({ where: { documentId: canvas.id } });
  await prisma.canvasConnector.deleteMany({ where: { documentId: canvas.id } });
  await prisma.canvasFrame.deleteMany({ where: { documentId: canvas.id } });
  await prisma.canvasObjectBinding.deleteMany({ where: { documentId: canvas.id } });
  await prisma.canvasExternalWorkItemProjection.deleteMany({
    where: { documentId: canvas.id },
  });

  if (canvas.nodes.length) {
    await prisma.canvasItem.createMany({
      data: canvas.nodes.map((n) => ({
        id: `ci_${n.id}`,
        documentId: canvas.id,
        nodeId: n.id,
        kind: n.kind,
        label: n.label,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        sketch: Boolean(n.sketch),
        data: asJson(n.data ?? {}),
        liveStatus: n.liveStatus,
      })),
    });
    const frames = canvas.nodes.filter((n) => n.kind === "frame");
    if (frames.length) {
      await prisma.canvasFrame.createMany({
        data: frames.map((n) => ({
          id: `cf_${n.id}`,
          documentId: canvas.id,
          nodeId: n.id,
          label: n.label,
          x: n.x,
          y: n.y,
          width: n.width ?? 320,
          height: n.height ?? 200,
          data: asJson(n.data ?? {}),
        })),
      });
    }
    const bindings = canvas.nodes.filter((n) => n.linked);
    if (bindings.length) {
      await prisma.canvasObjectBinding.createMany({
        data: bindings.map((n) => ({
          id: `cb_${n.id}`,
          documentId: canvas.id,
          nodeId: n.id,
          objectType: n.linked!.type,
          objectId: n.linked!.id,
          provider: n.linked!.provider,
        })),
      });
    }
    const ewis = canvas.nodes.filter(
      (n) => n.kind === "external_work_item" && n.linked?.id
    );
    if (ewis.length) {
      await prisma.canvasExternalWorkItemProjection.createMany({
        data: ewis.map((n) => ({
          id: `cewi_${n.id}`,
          documentId: canvas.id,
          nodeId: n.id,
          workItemId: n.linked!.id,
          provider: n.linked!.provider ?? "unknown",
          title: n.label,
          status: n.liveStatus,
          syncStatus: (n.data?.syncStatus as string) ?? null,
        })),
      });
    }
  }

  if (canvas.edges.length) {
    await prisma.canvasConnector.createMany({
      data: canvas.edges.map((e) => ({
        id: `cc_${e.id}`,
        documentId: canvas.id,
        edgeId: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        kind: e.kind ?? "flow",
        sketch: Boolean(e.sketch),
        data: asJson(e.data ?? {}),
      })),
    });
  }
}

export async function persistCanvasVersion(v: CanvasVersion): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  await prisma.canvasVersionRecord.upsert({
    where: {
      documentId_version: { documentId: v.canvasId, version: v.version },
    },
    create: {
      id: v.id,
      documentId: v.canvasId,
      version: v.version,
      label: v.label,
      snapshot: asJson(v.snapshot),
      createdBy: v.createdBy,
    },
    update: {
      label: v.label,
      snapshot: asJson(v.snapshot),
    },
  });
}

export async function persistCanvasProposal(p: AutomationProposal): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  await prisma.canvasProposal.upsert({
    where: { id: p.id },
    create: {
      id: p.id,
      documentId: p.canvasId,
      title: p.title,
      description: p.description,
      severity: p.severity,
      status: p.status,
      proposedPatch: asJson(p.proposedPatch),
      evidence: asJson([]),
      confidence: 0.7,
      resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
    },
    update: {
      title: p.title,
      description: p.description,
      severity: p.severity,
      status: p.status,
      proposedPatch: asJson(p.proposedPatch),
      resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
    },
  });
}

export async function persistCanvasAudit(entry: CanvasAuditEntry): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  await prisma.canvasAuditLog.upsert({
    where: { id: entry.id },
    create: {
      id: entry.id,
      documentId: entry.canvasId,
      action: entry.action,
      detail: asJson(entry.detail),
      createdAt: new Date(entry.at),
    },
    update: {
      action: entry.action,
      detail: asJson(entry.detail),
    },
  });
}

/** Load a proposal (and its canvas session) from Prisma when memory is cold. */
export async function hydrateProposalSession(
  proposalId: string,
  businessId: string
): Promise<AutomationProposal | null> {
  if (!canvasPersistenceEnabled()) {
    return getProposal(proposalId) ?? null;
  }
  const row = await prisma.canvasProposal.findUnique({ where: { id: proposalId } });
  if (!row) return getProposal(proposalId) ?? null;
  const canvas = await hydrateCanvasSession(row.documentId, businessId);
  if (!canvas) return null;
  return getProposal(proposalId) ?? null;
}

export async function loadCanvasFromDb(
  id: string,
  businessId: string
): Promise<TapCanvas | null> {
  if (!canvasPersistenceEnabled()) return getCanvas(id) ?? null;
  const row = await prisma.tapCanvasDocument.findFirst({
    where: { id, businessId, archivedAt: null },
  });
  if (!row) return null;
  const canvas = canvasFromRow(row);
  upsertCanvas(canvas);
  return canvas;
}

export async function listCanvasesFromDb(businessId: string): Promise<TapCanvas[]> {
  if (!canvasPersistenceEnabled()) return listCanvases(businessId);
  const rows = await prisma.tapCanvasDocument.findMany({
    where: { businessId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const canvases = rows.map(canvasFromRow);
  for (const c of canvases) upsertCanvas(c);
  return canvases;
}

export async function hydrateCanvasSession(
  canvasId: string,
  businessId: string
): Promise<TapCanvas | null> {
  const canvas = await loadCanvasFromDb(canvasId, businessId);
  if (!canvas) return null;

  if (canvasPersistenceEnabled()) {
    const [versions, proposals, audit] = await Promise.all([
      prisma.canvasVersionRecord.findMany({
        where: { documentId: canvasId },
        orderBy: { version: "desc" },
      }),
      prisma.canvasProposal.findMany({ where: { documentId: canvasId } }),
      prisma.canvasAuditLog.findMany({
        where: { documentId: canvasId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    for (const v of versions) {
      if (getVersion(v.id)) continue;
      pushVersion({
        id: v.id,
        canvasId: v.documentId,
        version: v.version,
        label: v.label,
        snapshot: v.snapshot as CanvasVersion["snapshot"],
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy ?? undefined,
      });
    }
    for (const p of proposals) {
      upsertProposal({
        id: p.id,
        canvasId: p.documentId,
        title: p.title,
        description: p.description,
        severity: p.severity as AutomationProposal["severity"],
        status: p.status as AutomationProposal["status"],
        proposedPatch: p.proposedPatch as AutomationProposal["proposedPatch"],
        createdAt: p.createdAt.toISOString(),
        resolvedAt: p.resolvedAt?.toISOString(),
      });
    }
    for (const a of audit) {
      if (listCanvasAudit(canvasId, 500).some((x) => x.id === a.id)) continue;
      appendCanvasAudit({
        id: a.id,
        canvasId: a.documentId,
        action: a.action,
        detail: (a.detail ?? {}) as Record<string, unknown>,
        at: a.createdAt.toISOString(),
      });
    }
  }

  // Ensure list helpers see hydrated memory
  void listVersions(canvasId);
  void listProposals(canvasId);
  void listCanvasAudit(canvasId);
  return canvas;
}

export async function flushCanvasState(canvasId: string): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  const canvas = getCanvas(canvasId);
  if (!canvas) return;
  await persistCanvasDocument(canvas);
  for (const v of listVersions(canvasId)) {
    await persistCanvasVersion(v);
  }
  for (const p of listProposals(canvasId)) {
    await persistCanvasProposal(p);
  }
  for (const a of listCanvasAudit(canvasId, 200)) {
    await persistCanvasAudit(a);
  }
}

export async function archiveCanvasDocument(
  canvasId: string,
  businessId: string
): Promise<boolean> {
  if (!canvasPersistenceEnabled()) return false;
  const res = await prisma.tapCanvasDocument.updateMany({
    where: { id: canvasId, businessId },
    data: { archivedAt: new Date() },
  });
  return res.count > 0;
}

export async function renameCanvasDocument(
  canvasId: string,
  businessId: string,
  name: string
): Promise<TapCanvas | null> {
  const canvas = await hydrateCanvasSession(canvasId, businessId);
  if (!canvas) return null;
  canvas.name = name;
  canvas.updatedAt = new Date().toISOString();
  upsertCanvas(canvas);
  await persistCanvasDocument(canvas);
  return canvas;
}

export async function duplicateCanvasDocument(
  canvasId: string,
  businessId: string,
  name?: string
): Promise<TapCanvas | null> {
  const src = await hydrateCanvasSession(canvasId, businessId);
  if (!src) return null;
  const copy: TapCanvas = {
    ...src,
    id: `canvas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name ?? `${src.name} (copy)`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    nodes: src.nodes.map((n) => ({ ...n })),
    edges: src.edges.map((e) => ({ ...e })),
  };
  upsertCanvas(copy);
  await persistCanvasDocument(copy);
  return copy;
}

export async function saveExecutionOverlay(
  documentId: string,
  snapshot: Record<string, unknown>
): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  await prisma.canvasExecutionOverlay.create({
    data: {
      id: `ov_${Date.now().toString(36)}`,
      documentId,
      snapshot: asJson(snapshot),
    },
  });
}

export async function saveCanvasIssues(
  documentId: string,
  issues: Array<{
    code: string;
    severity: string;
    message: string;
    nodeId?: string;
    evidence?: Record<string, unknown>;
  }>
): Promise<void> {
  if (!canvasPersistenceEnabled()) return;
  await prisma.canvasIssue.deleteMany({ where: { documentId, resolved: false } });
  if (!issues.length) return;
  await prisma.canvasIssue.createMany({
    data: issues.map((i, idx) => ({
      id: `iss_${documentId}_${idx}_${Date.now().toString(36)}`,
      documentId,
      code: i.code,
      severity: i.severity,
      message: i.message,
      nodeId: i.nodeId,
      evidence: asJson(i.evidence ?? {}),
    })),
  });
}

export type CanvasCommentDto = MemCanvasComment;
export type CanvasApprovalDto = MemCanvasApproval;

export async function addCanvasCommentDb(opts: {
  documentId: string;
  body: string;
  nodeId?: string;
  authorId?: string;
}): Promise<CanvasCommentDto> {
  const id = `cmt_${Date.now().toString(36)}`;
  const createdAt = new Date().toISOString();
  if (!canvasPersistenceEnabled()) {
    return memPushComment({
      id: `cmt_mem_${Date.now().toString(36)}`,
      documentId: opts.documentId,
      body: opts.body,
      nodeId: opts.nodeId ?? null,
      authorId: opts.authorId ?? null,
      createdAt,
    });
  }
  const row = await prisma.canvasComment.create({
    data: {
      id,
      documentId: opts.documentId,
      body: opts.body,
      nodeId: opts.nodeId,
      authorId: opts.authorId,
    },
  });
  return {
    id: row.id,
    documentId: row.documentId,
    body: row.body,
    nodeId: row.nodeId,
    authorId: row.authorId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCanvasCommentsDb(
  documentId: string
): Promise<CanvasCommentDto[]> {
  if (!canvasPersistenceEnabled()) {
    return memListComments(documentId);
  }
  const rows = await prisma.canvasComment.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    body: row.body,
    nodeId: row.nodeId,
    authorId: row.authorId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createCanvasApprovalDb(opts: {
  documentId: string;
  subjectType: string;
  subjectId: string;
  workItemId?: string;
}): Promise<CanvasApprovalDto> {
  const createdAt = new Date().toISOString();
  if (!canvasPersistenceEnabled()) {
    return memPushApproval({
      id: `apr_mem_${Date.now().toString(36)}`,
      documentId: opts.documentId,
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      status: "pending",
      workItemId: opts.workItemId ?? null,
      decidedAt: null,
      createdAt,
    });
  }
  const row = await prisma.canvasApproval.create({
    data: {
      id: `apr_${Date.now().toString(36)}`,
      documentId: opts.documentId,
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      workItemId: opts.workItemId,
    },
  });
  return {
    id: row.id,
    documentId: row.documentId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    status: row.status,
    workItemId: row.workItemId,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCanvasApprovalsDb(
  documentId: string
): Promise<CanvasApprovalDto[]> {
  if (!canvasPersistenceEnabled()) {
    return memListApprovals(documentId);
  }
  const rows = await prisma.canvasApproval.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    status: row.status,
    workItemId: row.workItemId,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function resolveCanvasApprovalDb(opts: {
  approvalId: string;
  documentId: string;
  decision: "approved" | "rejected";
}): Promise<CanvasApprovalDto | null> {
  if (!canvasPersistenceEnabled()) {
    const row = memResolveApproval(opts.approvalId, opts.decision);
    if (!row || row.documentId !== opts.documentId) return null;
    return row;
  }
  const existing = await prisma.canvasApproval.findFirst({
    where: { id: opts.approvalId, documentId: opts.documentId },
  });
  if (!existing) return null;
  if (existing.status !== "pending") {
    return {
      id: existing.id,
      documentId: existing.documentId,
      subjectType: existing.subjectType,
      subjectId: existing.subjectId,
      status: existing.status,
      workItemId: existing.workItemId,
      decidedAt: existing.decidedAt?.toISOString() ?? null,
      createdAt: existing.createdAt.toISOString(),
    };
  }
  const row = await prisma.canvasApproval.update({
    where: { id: opts.approvalId },
    data: {
      status: opts.decision,
      decidedAt: new Date(),
    },
  });
  return {
    id: row.id,
    documentId: row.documentId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    status: row.status,
    workItemId: row.workItemId,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
