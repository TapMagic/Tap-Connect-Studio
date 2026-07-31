/**
 * Owner-facing semantic status contract.
 *
 * Every operational status surface must answer:
 * 1. What is happening?
 * 2. Is the state good, incomplete, waiting, blocked, or informational?
 * 3. What does it affect?
 * 4. What should the Owner do next?
 *
 * Color is never the only signal — border, icon, label, copy, and action must agree.
 * Green forward-action (--studio-go) stays reserved for Create / next-step CTAs.
 */

export type OwnerStatusSeverity =
  | "success"
  | "attention"
  | "error"
  | "info";

export type OwnerStatusLabel =
  | "Ready"
  | "Healthy"
  | "Complete"
  | "Connected"
  | "Published"
  | "Setup needed"
  | "Review required"
  | "Waiting for approval"
  | "Draft only"
  | "Needs connection"
  | "Credentials required"
  | "Action required"
  | "Failed"
  | "Blocked"
  | "Coming later"
  | "Not included in your plan"
  | "Optional"
  | "Available after connection";

export type OwnerStatusAction = {
  label: string;
  href: string;
  /** When true, opens a new tab and must show ↗ in the label. */
  external?: boolean;
  primary?: boolean;
};

export type OwnerStatusCardModel = {
  id: string;
  title: string;
  severity: OwnerStatusSeverity;
  label: OwnerStatusLabel | string;
  /** Plain-language explanation of the current state. */
  summary: string;
  /** What this state affects for customers or the Owner. */
  consequence?: string;
  /** Optional secondary context (timestamp, provenance). */
  meta?: string;
  actions?: OwnerStatusAction[];
  testId?: string;
};

export const OWNER_STATUS_META: Record<
  OwnerStatusSeverity,
  {
    defaultLabel: OwnerStatusLabel;
    /** CSS custom-property tokens already present in globals */
    token: string;
    frameClass: string;
    iconClass: string;
    pillClass: string;
  }
> = {
  success: {
    defaultLabel: "Ready",
    token: "var(--studio-status-ok)",
    frameClass: "owner-status-frame",
    iconClass: "text-[color:var(--studio-status-ok)]",
    pillClass:
      "border-[color:var(--studio-status-ok)]/35 text-[color:var(--studio-status-ok)]",
  },
  attention: {
    defaultLabel: "Setup needed",
    token: "var(--studio-status-warn)",
    frameClass: "owner-status-frame",
    iconClass: "text-[color:var(--studio-status-warn)]",
    pillClass:
      "border-[color:var(--studio-status-warn)]/40 text-[color:var(--studio-status-warn)]",
  },
  error: {
    defaultLabel: "Action required",
    token: "var(--studio-status-critical)",
    frameClass: "owner-status-frame",
    iconClass: "text-[color:var(--studio-status-critical)]",
    pillClass:
      "border-[color:var(--studio-status-critical)]/40 text-[color:var(--studio-status-critical)]",
  },
  info: {
    defaultLabel: "Optional",
    token: "var(--studio-status-info)",
    frameClass: "owner-status-frame",
    iconClass: "text-[color:var(--studio-status-info)]",
    pillClass:
      "border-[color:var(--studio-status-info)]/35 text-[color:var(--studio-status-info)]",
  },
};

/** Map legacy OperationsConsole severities onto the Owner contract. */
export function ownerSeverityFromOps(
  status: "ok" | "warn" | "critical" | "info" | "neutral"
): OwnerStatusSeverity {
  switch (status) {
    case "ok":
      return "success";
    case "warn":
      return "attention";
    case "critical":
      return "error";
    case "info":
    case "neutral":
    default:
      return "info";
  }
}

export function worstOwnerSeverity(
  severities: OwnerStatusSeverity[]
): OwnerStatusSeverity {
  const rank: Record<OwnerStatusSeverity, number> = {
    error: 3,
    attention: 2,
    info: 1,
    success: 0,
  };
  return severities.reduce<OwnerStatusSeverity>(
    (worst, next) => (rank[next] > rank[worst] ? next : worst),
    "success"
  );
}
