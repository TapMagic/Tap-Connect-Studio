/**
 * Honest Studio workspace readiness — never green-light from outbox emptiness alone.
 * Benchmarks: Stripe / Vercel / Cloudflare admin status language (§3.14 GLOBAL_QUALITY_STANDARDS).
 */

export type WorkspaceStatusTone = "setup" | "attention" | "healthy";

export type WorkspaceStatusInput = {
  /** Incomplete first-tap setup steps (brand / campaign / device / assign). */
  setupIncomplete: number;
  setupTotal: number;
  /** Failed FusionOutboxEvent count for this business. */
  outboxFailed: number;
  /** Operator-visible publish/assign failures surfaced as studio.operator.* dead letters. */
  operatorFailures?: number;
  /** Critical Tap Point health count (optional). */
  criticalTapPoints?: number;
};

export type WorkspaceStatus = {
  label: string;
  tone: WorkspaceStatusTone;
  /** Badge / notifications count (failures only — not setup debt). */
  alertCount: number;
  reasons: string[];
  /** Primary remediation destination. */
  href: string;
};

/**
 * Pure status derivation for top-bar chrome and Home decision queue.
 * Priority: operational failures → setup incomplete → healthy.
 * Never returns the dishonest phrase "Studio ready".
 */
export function computeWorkspaceStatus(input: WorkspaceStatusInput): WorkspaceStatus {
  const operatorFailures = input.operatorFailures ?? 0;
  const critical = input.criticalTapPoints ?? 0;
  const failureCount = input.outboxFailed + operatorFailures;
  const alertCount = failureCount + (critical > 0 ? critical : 0);
  const reasons: string[] = [];

  if (input.outboxFailed > 0) {
    reasons.push(
      `${input.outboxFailed} failed delivery job${input.outboxFailed === 1 ? "" : "s"}`
    );
  }
  if (operatorFailures > 0) {
    reasons.push(
      `${operatorFailures} publish/assign failure${operatorFailures === 1 ? "" : "s"}`
    );
  }
  if (critical > 0) {
    reasons.push(`${critical} critical Tap Point${critical === 1 ? "" : "s"}`);
  }
  if (input.setupIncomplete > 0) {
    reasons.push(
      `${input.setupIncomplete} of ${input.setupTotal} first-tap setup steps remaining`
    );
  }

  if (failureCount > 0 || critical > 0) {
    return {
      label: "Attention needed",
      tone: "attention",
      alertCount: Math.max(alertCount, 1),
      reasons,
      href:
        input.outboxFailed > 0 || operatorFailures > 0
          ? "/dashboard#decision-queue"
          : "/dashboard/tap-points",
    };
  }

  if (input.setupIncomplete > 0) {
    return {
      label: "Setup incomplete",
      tone: "setup",
      alertCount: 0,
      reasons,
      href: "/dashboard#readiness",
    };
  }

  return {
    label: "Workspace healthy",
    tone: "healthy",
    alertCount: 0,
    reasons: ["First-tap setup complete · no failed delivery jobs"],
    href: "/dashboard",
  };
}

/** Setup steps shared by Home checklist and top-bar readiness (single source). */
export type FirstTapSetupFlags = {
  hasBrand: boolean;
  hasCampaign: boolean;
  hasDevice: boolean;
  hasLiveAssignment: boolean;
};

export function firstTapSetupProgress(flags: FirstTapSetupFlags): {
  incomplete: number;
  total: number;
  steps: { id: string; label: string; href: string; done: boolean }[];
} {
  const steps = [
    {
      id: "brand",
      label: "Add logo & brand colors",
      href: "/dashboard/brand/edit",
      done: flags.hasBrand,
    },
    {
      id: "campaign",
      label: "Create your first campaign",
      href: "/dashboard/workbench",
      done: flags.hasCampaign,
    },
    {
      id: "device",
      label: "Create a device slot",
      href: "/dashboard/devices",
      done: flags.hasDevice,
    },
    {
      id: "assign",
      label: "Assign a live campaign",
      href: "/dashboard/devices",
      done: flags.hasLiveAssignment,
    },
  ];
  const incomplete = steps.filter((s) => !s.done).length;
  return { incomplete, total: steps.length, steps };
}
