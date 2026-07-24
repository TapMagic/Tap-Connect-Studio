/**
 * Inbox operator audit + analytics — local mock ledger for Guardian / TapCase surfaces.
 * Complements governed outbox events; does not replace persistence.
 */

export type InboxAuditEntry = {
  id: string;
  businessId: string;
  at: string;
  action: string;
  threadId?: string;
  caseId?: string;
  workItemId?: string;
  code?: string;
  detail?: string;
};

export type InboxAnalyticsSummary = {
  threads: number;
  openThreads: number;
  replies: number;
  guardianBlocks: number;
  cases: number;
  attachments: number;
  workItems: number;
  timelineEvents: number;
};

const auditLog: InboxAuditEntry[] = [];
const counters = new Map<string, InboxAnalyticsSummary>();

function emptySummary(): InboxAnalyticsSummary {
  return {
    threads: 0,
    openThreads: 0,
    replies: 0,
    guardianBlocks: 0,
    cases: 0,
    attachments: 0,
    workItems: 0,
    timelineEvents: 0,
  };
}

function bump(businessId: string, field: keyof InboxAnalyticsSummary, by = 1) {
  const cur = counters.get(businessId) ?? emptySummary();
  cur[field] = (cur[field] ?? 0) + by;
  counters.set(businessId, cur);
}

export function appendInboxAudit(input: {
  businessId: string;
  action: string;
  threadId?: string;
  caseId?: string;
  workItemId?: string;
  code?: string;
  detail?: string;
}): InboxAuditEntry {
  const entry: InboxAuditEntry = {
    id: `ia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    businessId: input.businessId,
    at: new Date().toISOString(),
    action: input.action,
    threadId: input.threadId,
    caseId: input.caseId,
    workItemId: input.workItemId,
    code: input.code,
    detail: input.detail,
  };
  auditLog.unshift(entry);
  if (auditLog.length > 500) auditLog.length = 500;

  switch (input.action) {
    case "thread_created":
      bump(input.businessId, "threads");
      bump(input.businessId, "openThreads");
      break;
    case "reply_sent":
      bump(input.businessId, "replies");
      break;
    case "guardian_blocked":
      bump(input.businessId, "guardianBlocks");
      break;
    case "case_opened":
      bump(input.businessId, "cases");
      break;
    case "attachment_added":
      bump(input.businessId, "attachments");
      break;
    case "work_item_created":
      bump(input.businessId, "workItems");
      break;
    case "timeline_recorded":
      bump(input.businessId, "timelineEvents");
      break;
    case "thread_closed":
      bump(input.businessId, "openThreads", -1);
      break;
    case "thread_reopened":
      bump(input.businessId, "openThreads");
      break;
    default:
      break;
  }

  return entry;
}

export function listInboxAudit(businessId: string, limit = 40): InboxAuditEntry[] {
  return auditLog.filter((e) => e.businessId === businessId).slice(0, limit);
}

export function summarizeInboxAnalytics(businessId: string): InboxAnalyticsSummary {
  return { ...(counters.get(businessId) ?? emptySummary()) };
}

/** Test helper */
export function resetInboxOperatorAudit(): void {
  auditLog.length = 0;
  counters.clear();
}
