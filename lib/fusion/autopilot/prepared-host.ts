/**
 * Host-facing plain-language states for F2 prepared execution.
 * Primary UI must not expose wiring, mutations, or policy codes.
 */

import type {
  PreparedExecution,
  PreparedExecutionStatus,
  PreparedHostSummary,
  PreparedReadiness,
} from "./prepared-execution";
import {
  assertNoForbiddenPrimaryTerminology,
  FORBIDDEN_PRIMARY_TERMS,
} from "./plain-language";

export const F2_HONESTY_STATEMENT =
  "Prepared locally — not published, not sent, and no customers were contacted." as const;

export const F2_FORBIDDEN_PRIMARY_TERMS = [
  ...FORBIDDEN_PRIMARY_TERMS,
  "preparedObjects",
  "reversibleActions",
  "objectMutations",
  "executionId",
  "rollbackState",
  "auditRefs",
  "factsFingerprint",
  "planFingerprint",
  "mutationId",
  "schemaVersion",
] as const;

export function preparedStatusHostCopy(status: PreparedExecutionStatus): {
  label: string;
  detail: string;
} {
  switch (status) {
    case "pending":
      return {
        label: "Ready to prepare",
        detail: "Approve preparation to build your Card offer drafts.",
      };
    case "preparing":
      return {
        label: "Preparing",
        detail: "Autopilot is preparing your Card offer.",
      };
    case "prepared":
      return {
        label: "Prepared",
        detail: "Your offer is prepared and ready to go live.",
      };
    case "needs_attention":
      return {
        label: "Needs one detail",
        detail: "One detail still needs you before this can go live.",
      };
    case "failed":
      return {
        label: "Could not prepare",
        detail: "Autopilot could not safely prepare the offer. Nothing was published.",
      };
    case "rolled_back":
      return {
        label: "Undone",
        detail: "The prepared changes were undone.",
      };
    case "superseded":
      return {
        label: "Replaced",
        detail: "A newer preparation replaced this one.",
      };
  }
}

export function readinessHostLabel(outcome: PreparedReadiness["outcome"]): string {
  switch (outcome) {
    case "ready_to_prepare":
      return "Ready to prepare";
    case "preparing":
      return "Preparing";
    case "prepared":
      return "Prepared";
    case "needs_one_detail":
      return "Needs one detail";
    case "ready_for_final_approval":
      return "Ready for final approval";
    case "cannot_continue_safely":
      return "Cannot continue safely";
    case "stale_prepare_again":
      return "Stale — prepare again";
    case "undone":
      return "Undone";
  }
}

export function buildPreparedHostSummary(input: {
  offerTitle: string;
  offerDescription?: string;
  audience: string;
  when: string;
  keepCardAvailable: boolean;
  askQuestionAvailable: boolean;
  emailPrepared: boolean;
  tapcastPrepared: boolean;
  emailDeferred: boolean;
  metrics: string[];
  outstandingApprovals: string[];
}): PreparedHostSummary {
  const canDoBits = [
    "See the offer on your Card",
    "Claim or save it",
    input.keepCardAvailable ? "Keep Card for later" : null,
    input.askQuestionAvailable ? "Ask a Question" : null,
  ].filter(Boolean) as string[];

  const followUp = input.emailDeferred
    ? "Follow-up email is drafted locally and waits until email is connected and approved."
    : input.emailPrepared
      ? "A follow-up email draft is prepared — not sent."
      : "No customer follow-up is queued.";

  const stillNeeds =
    input.outstandingApprovals.length > 0
      ? input.outstandingApprovals.join(" · ")
      : "Final go-live approval (coming later) — nothing goes live in this step.";

  return {
    onCard: input.offerDescription
      ? `${input.offerTitle} — ${input.offerDescription}`
      : input.offerTitle,
    audience: input.audience,
    when: input.when || "When you choose to go live",
    customerCanDo: canDoBits.join(" · "),
    followUp: input.tapcastPrepared
      ? `${followUp} A TapCast draft is also prepared (not published).`
      : followUp,
    measured: input.metrics.length
      ? input.metrics.join(", ")
      : "Views, claims, Keep Card, and follow-up readiness",
    stillNeedsApproval: stillNeeds,
    afterGoLive:
      "When go live is available after final approval, the Card Spotlight will show this offer and Insights will start counting responses. Nothing is live yet.",
  };
}

export function assertPreparedPrimaryCopySafe(
  texts: string[]
): ReturnType<typeof assertNoForbiddenPrimaryTerminology> {
  return assertNoForbiddenPrimaryTerminology(texts);
}

export function primaryCopyFromExecution(execution: PreparedExecution): string[] {
  const summary = execution.hostSummary;
  return [
    execution.hostStateLabel,
    execution.hostStateDetail,
    execution.nextSafeAction,
    execution.honestyStatement,
    summary?.onCard,
    summary?.audience,
    summary?.when,
    summary?.customerCanDo,
    summary?.followUp,
    summary?.measured,
    summary?.stillNeedsApproval,
    summary?.afterGoLive,
    ...execution.warnings,
    ...execution.previewRefs.map((p) => `${p.title} ${p.description}`),
  ].filter((t): t is string => Boolean(t?.trim()));
}
