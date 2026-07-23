/**
 * TapCase status transitions — pure state machine, no I/O.
 */

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

export type CaseAction = "assign" | "start" | "wait" | "resolve" | "close" | "reopen";

const TRANSITIONS: Record<CaseAction, Partial<Record<CaseStatus, CaseStatus>>> = {
  assign: { OPEN: "IN_PROGRESS" },
  start: { OPEN: "IN_PROGRESS" },
  wait: { OPEN: "WAITING", IN_PROGRESS: "WAITING" },
  resolve: { OPEN: "RESOLVED", IN_PROGRESS: "RESOLVED", WAITING: "RESOLVED" },
  close: {
    OPEN: "CLOSED",
    IN_PROGRESS: "CLOSED",
    WAITING: "CLOSED",
    RESOLVED: "CLOSED",
  },
  reopen: { CLOSED: "OPEN", RESOLVED: "OPEN" },
};

export function canCaseTransition(status: CaseStatus, action: CaseAction): boolean {
  return Boolean(TRANSITIONS[action]?.[status]);
}

export function nextCaseStatus(
  status: CaseStatus,
  action: CaseAction
): { ok: true; status: CaseStatus } | { ok: false; error: string } {
  const next = TRANSITIONS[action]?.[status];
  if (!next) {
    return { ok: false, error: `Cannot ${action} case in status ${status}` };
  }
  return { ok: true, status: next };
}

export function isCaseTerminal(status: CaseStatus): boolean {
  return status === "CLOSED";
}

export function allowedCaseActions(status: CaseStatus): CaseAction[] {
  const actions: CaseAction[] = ["assign", "start", "wait", "resolve", "close", "reopen"];
  return actions.filter((action) => canCaseTransition(status, action));
}
