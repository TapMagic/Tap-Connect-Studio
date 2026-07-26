/**
 * TapCase status transitions + operator-facing labels.
 * Extends WAITING with waitKind metadata (customer | internal).
 * READY_TO_CLOSE maps to RESOLVED with metadata.readyToClose.
 */

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";

export type CaseAction =
  | "assign"
  | "start"
  | "wait"
  | "wait_customer"
  | "wait_internal"
  | "resolve"
  | "ready_to_close"
  | "close"
  | "reopen";

export type CaseWaitKind = "customer" | "internal";

export type CaseTransitionExplain = {
  action: CaseAction;
  label: string;
  explanation: string;
  nextStatus: CaseStatus;
  setsWaitKind?: CaseWaitKind;
  setsReadyToClose?: boolean;
};

const TRANSITIONS: Record<CaseAction, Partial<Record<CaseStatus, CaseStatus>>> = {
  assign: { OPEN: "IN_PROGRESS" },
  start: { OPEN: "IN_PROGRESS", WAITING: "IN_PROGRESS" },
  wait: { OPEN: "WAITING", IN_PROGRESS: "WAITING" },
  wait_customer: { OPEN: "WAITING", IN_PROGRESS: "WAITING" },
  wait_internal: { OPEN: "WAITING", IN_PROGRESS: "WAITING" },
  resolve: { OPEN: "RESOLVED", IN_PROGRESS: "RESOLVED", WAITING: "RESOLVED" },
  ready_to_close: { OPEN: "RESOLVED", IN_PROGRESS: "RESOLVED", WAITING: "RESOLVED" },
  close: {
    OPEN: "CLOSED",
    IN_PROGRESS: "CLOSED",
    WAITING: "CLOSED",
    RESOLVED: "CLOSED",
  },
  reopen: { CLOSED: "OPEN", RESOLVED: "OPEN" },
};

export const CASE_ACTION_COPY: Record<
  CaseAction,
  { label: string; explanation: string }
> = {
  assign: {
    label: "Assign",
    explanation: "Give this case an owner and move it into active work.",
  },
  start: {
    label: "Start work",
    explanation: "Mark that someone is actively handling this case.",
  },
  wait: {
    label: "Waiting for customer",
    explanation: "Pause while you wait for the customer’s reply.",
  },
  wait_customer: {
    label: "Waiting for customer",
    explanation: "Pause SLA while you wait for the customer’s reply.",
  },
  wait_internal: {
    label: "Waiting internally",
    explanation: "Waiting on another teammate or system — not the customer.",
  },
  resolve: {
    label: "Resolve",
    explanation: "Issue addressed — customer may still need a closing confirmation.",
  },
  ready_to_close: {
    label: "Ready to close",
    explanation: "External work or checks finished — safe to close when confirmed.",
  },
  close: {
    label: "Close",
    explanation: "Archive the case. You can reopen later if needed.",
  },
  reopen: {
    label: "Reopen",
    explanation: "Bring a resolved or closed case back to New / open work.",
  },
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: "New",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
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
    return {
      ok: false,
      error: `Cannot ${CASE_ACTION_COPY[action]?.label ?? action} while status is ${CASE_STATUS_LABEL[status]}`,
    };
  }
  return { ok: true, status: next };
}

export function isCaseTerminal(status: CaseStatus): boolean {
  return status === "CLOSED";
}

export function allowedCaseActions(status: CaseStatus): CaseAction[] {
  /** Prefer explicit wait_customer/wait_internal in UI; keep `wait` for API parity. */
  const actions: CaseAction[] = [
    "assign",
    "start",
    "wait",
    "wait_customer",
    "wait_internal",
    "resolve",
    "ready_to_close",
    "close",
    "reopen",
  ];
  return actions.filter((action) => canCaseTransition(status, action));
}

/** Operator-facing actions (hide legacy `wait` when wait_customer is available). */
export function allowedCaseActionsForUi(status: CaseStatus): CaseAction[] {
  return allowedCaseActions(status).filter((a) => a !== "wait");
}

export function explainCaseTransitions(status: CaseStatus): CaseTransitionExplain[] {
  return allowedCaseActions(status).map((action) => {
    const next = TRANSITIONS[action]![status]!;
    const copy = CASE_ACTION_COPY[action];
    return {
      action,
      label: copy.label,
      explanation: copy.explanation,
      nextStatus: next,
      setsWaitKind:
        action === "wait_customer"
          ? "customer"
          : action === "wait_internal"
            ? "internal"
            : undefined,
      setsReadyToClose: action === "ready_to_close",
    };
  });
}

/** Operator queue buckets — map status + metadata without new Prisma enums. */
export type CaseQueueView =
  | "new"
  | "assigned_to_me"
  | "waiting_customer"
  | "waiting_internal"
  | "sent_external"
  | "overdue"
  | "ready_to_close"
  | "resolved"
  | "closed";

export const CASE_QUEUE_VIEWS: {
  id: CaseQueueView;
  label: string;
  help: string;
}[] = [
  { id: "new", label: "New", help: "Unassigned open cases" },
  { id: "assigned_to_me", label: "Assigned to me", help: "Cases you own" },
  {
    id: "waiting_customer",
    label: "Waiting on customer",
    help: "Paused for the customer’s reply",
  },
  {
    id: "waiting_internal",
    label: "Waiting internally",
    help: "Waiting on a teammate or system",
  },
  {
    id: "sent_external",
    label: "Sent to external work system",
    help: "Linked to monday.com / Asana / etc.",
  },
  { id: "overdue", label: "Overdue", help: "Past due date or SLA" },
  {
    id: "ready_to_close",
    label: "Ready to close",
    help: "Checks done — confirm and close",
  },
  { id: "resolved", label: "Resolved", help: "Issue addressed" },
  { id: "closed", label: "Closed", help: "Archived cases" },
];

export type CaseQueueMeta = {
  waitKind?: CaseWaitKind;
  readyToClose?: boolean;
  dueAt?: string | null;
  externalWork?: { provider?: string; externalId?: string } | null;
  assigneeId?: string | null;
  currentUserId?: string | null;
};

export function caseMatchesQueueView(
  status: CaseStatus,
  view: CaseQueueView,
  meta: CaseQueueMeta
): boolean {
  const now = Date.now();
  const overdue =
    Boolean(meta.dueAt) && new Date(meta.dueAt!).getTime() < now && status !== "CLOSED";

  switch (view) {
    case "new":
      return status === "OPEN" && !meta.assigneeId;
    case "assigned_to_me":
      return Boolean(meta.assigneeId && meta.assigneeId === meta.currentUserId);
    case "waiting_customer":
      return status === "WAITING" && meta.waitKind !== "internal";
    case "waiting_internal":
      return status === "WAITING" && meta.waitKind === "internal";
    case "sent_external":
      return Boolean(meta.externalWork?.externalId || meta.externalWork?.provider);
    case "overdue":
      return overdue;
    case "ready_to_close":
      return status === "RESOLVED" && meta.readyToClose === true;
    case "resolved":
      return status === "RESOLVED";
    case "closed":
      return status === "CLOSED";
    default:
      return false;
  }
}
