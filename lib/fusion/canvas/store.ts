/**
 * In-memory TapCanvas working set.
 * Isolated DB (tapconnect_fusion_dev) is authoritative via persist.ts — hydrate/flush at API boundary.
 * Unit tests without DATABASE_URL use memory only.
 */

import type {
  AutomationProposal,
  CanvasAuditEntry,
  CanvasVersion,
  TapCanvas,
} from "./types";

export type MemCanvasComment = {
  id: string;
  documentId: string;
  body: string;
  nodeId?: string | null;
  authorId?: string | null;
  createdAt: string;
};

export type MemCanvasApproval = {
  id: string;
  documentId: string;
  subjectType: string;
  subjectId: string;
  status: "pending" | "approved" | "rejected" | "invalidated";
  workItemId?: string | null;
  decidedAt?: string | null;
  createdAt: string;
};

const canvases = new Map<string, TapCanvas>();
const versions: CanvasVersion[] = [];
const proposals: AutomationProposal[] = [];
const audit: CanvasAuditEntry[] = [];
const commentsByDoc = new Map<string, MemCanvasComment[]>();
const approvalsByDoc = new Map<string, MemCanvasApproval[]>();

export function resetCanvasMemory() {
  canvases.clear();
  versions.length = 0;
  proposals.length = 0;
  audit.length = 0;
  commentsByDoc.clear();
  approvalsByDoc.clear();
}

export function memPushComment(row: MemCanvasComment): MemCanvasComment {
  const list = commentsByDoc.get(row.documentId) ?? [];
  list.push(row);
  commentsByDoc.set(row.documentId, list);
  return row;
}

export function memListComments(documentId: string): MemCanvasComment[] {
  return [...(commentsByDoc.get(documentId) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function memPushApproval(row: MemCanvasApproval): MemCanvasApproval {
  const list = approvalsByDoc.get(row.documentId) ?? [];
  list.push(row);
  approvalsByDoc.set(row.documentId, list);
  return row;
}

export function memListApprovals(documentId: string): MemCanvasApproval[] {
  return [...(approvalsByDoc.get(documentId) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function memResolveApproval(
  approvalId: string,
  decision: "approved" | "rejected"
): MemCanvasApproval | null {
  for (const [, list] of approvalsByDoc) {
    const row = list.find((a) => a.id === approvalId);
    if (!row) continue;
    if (row.status !== "pending") return row;
    row.status = decision;
    row.decidedAt = new Date().toISOString();
    return row;
  }
  return null;
}

export function upsertCanvas(canvas: TapCanvas): TapCanvas {
  canvases.set(canvas.id, canvas);
  return canvas;
}

export function getCanvas(id: string): TapCanvas | undefined {
  return canvases.get(id);
}

export function listCanvases(businessId: string): TapCanvas[] {
  return [...canvases.values()]
    .filter((c) => c.businessId === businessId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteCanvas(id: string): boolean {
  return canvases.delete(id);
}

export function pushVersion(v: CanvasVersion): CanvasVersion {
  versions.push(v);
  return v;
}

export function listVersions(canvasId: string): CanvasVersion[] {
  return versions
    .filter((v) => v.canvasId === canvasId)
    .sort((a, b) => b.version - a.version);
}

export function getVersion(id: string): CanvasVersion | undefined {
  return versions.find((v) => v.id === id);
}

export function upsertProposal(p: AutomationProposal): AutomationProposal {
  const idx = proposals.findIndex((x) => x.id === p.id);
  if (idx >= 0) proposals[idx] = p;
  else proposals.push(p);
  return p;
}

export function getProposal(id: string): AutomationProposal | undefined {
  return proposals.find((p) => p.id === id);
}

export function listProposals(
  canvasId: string,
  status?: AutomationProposal["status"]
): AutomationProposal[] {
  return proposals.filter(
    (p) => p.canvasId === canvasId && (!status || p.status === status)
  );
}

export function appendCanvasAudit(entry: Omit<CanvasAuditEntry, "id" | "at"> & { id?: string; at?: string }) {
  const row: CanvasAuditEntry = {
    id: entry.id ?? `caud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    canvasId: entry.canvasId,
    action: entry.action,
    detail: entry.detail,
    at: entry.at ?? new Date().toISOString(),
  };
  audit.push(row);
  return row;
}

export function listCanvasAudit(canvasId: string, limit = 50): CanvasAuditEntry[] {
  return audit
    .filter((a) => a.canvasId === canvasId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
