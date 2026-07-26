/**
 * Host-facing plain-language states for F3 live activation + observation.
 * Primary UI must not expose wiring, mutations, policy enums, or internal IDs.
 */

import type {
  LiveActivation,
  LiveActivationStatus,
  LiveHostSummary,
} from "./live-activation";
import {
  assertNoForbiddenPrimaryTerminology,
  FORBIDDEN_PRIMARY_TERMS,
} from "./plain-language";

export const F3_HONESTY_STATEMENT =
  "Your offer is live on Tap Connect. Email and social are prepared but have not been sent." as const;

export const F3_EXTERNAL_BOUNDARY =
  "Email and social are prepared but have not been sent." as const;

export const F3_PRE_APPROVAL_FAILURE_NOTE =
  "If activation cannot finish, Autopilot restores the previous Card and Campaign state and leaves this outcome ready to try again." as const;

export const F3_FORBIDDEN_PRIMARY_TERMS = [
  ...FORBIDDEN_PRIMARY_TERMS,
  "activationId",
  "activationKey",
  "preparedExecutionId",
  "preparedObjects",
  "objectMutations",
  "fingerprints",
  "auditRefs",
  "resolver",
  "schemaVersion",
  "distributionSent",
  "SpotlightSection",
] as const;

export function liveStatusHostCopy(status: LiveActivationStatus): {
  label: string;
  detail: string;
} {
  switch (status) {
    case "pending_approval":
      return {
        label: "Ready",
        detail: "Your offer is ready. Approve once, then make it live.",
      };
    case "activating":
      return {
        label: "Making it live",
        detail: "Autopilot is turning on your offer.",
      };
    case "live":
      return {
        label: "Live",
        detail: "Your offer is live.",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        detail: "Your offer is scheduled — it is not live yet.",
      };
    case "paused":
      return {
        label: "Paused",
        detail: "Your offer is on hold. Resume when you are ready.",
      };
    case "stopped":
      return {
        label: "Stopped",
        detail: "Your offer is no longer shown to customers.",
      };
    case "rolled_back":
      return {
        label: "Undone",
        detail: "Go-live was undone. Your previous Card and Campaign settings were restored.",
      };
    case "failed":
      return {
        label: "Could not go live",
        detail: "Your offer could not be made live. Nothing was left half-live.",
      };
    case "manual_control":
      return {
        label: "Manual control",
        detail: "Autopilot is frozen for this outcome. Continue in the editor.",
      };
  }
}

export function buildLiveHostSummary(input: {
  entryPathCount: number;
  entryKind: "tap_point" | "card_first" | "mixed";
  scheduleLabel: string;
  metricsLabel: string;
  needsAttention: string;
}): LiveHostSummary {
  const whereLive =
    input.entryKind === "card_first"
      ? "Live on your Card"
      : input.entryKind === "mixed"
        ? `Live on your Card and ${input.entryPathCount} Tap Point${input.entryPathCount === 1 ? "" : "s"}`
        : input.entryPathCount > 0
          ? `Live at ${input.entryPathCount} Tap Point${input.entryPathCount === 1 ? "" : "s"}`
          : "Live on your Card";

  return {
    whereLive,
    schedule: input.scheduleLabel,
    measured: input.metricsLabel,
    needsAttention: input.needsAttention || "Nothing needs you right now.",
    externalBoundary: F3_EXTERNAL_BOUNDARY,
  };
}

export function buildFinalApprovalCopy(input: {
  offerTitle: string;
  audience: string;
  where: string;
  when: string;
  measured: string;
  excludeSend: boolean;
}): {
  readyTitle: string;
  whatCustomersSee: string;
  whoFor: string;
  whereAppears: string;
  when: string;
  whatMeasured: string;
  notIncluded: string;
  ifActivationFails: string;
  approvalLabel: string;
  primaryAction: string;
} {
  return {
    readyTitle: "Your offer is ready",
    whatCustomersSee: input.offerTitle,
    whoFor: input.audience,
    whereAppears: input.where,
    when: input.when,
    whatMeasured: input.measured,
    notIncluded: input.excludeSend
      ? "Email and social are prepared but will not be sent when you make this live."
      : "Nothing extra is excluded.",
    ifActivationFails: F3_PRE_APPROVAL_FAILURE_NOTE,
    approvalLabel: "Make this live",
    primaryAction: "Make it live",
  };
}

export function assertLivePrimaryCopySafe(
  texts: string[]
): ReturnType<typeof assertNoForbiddenPrimaryTerminology> {
  const base = assertNoForbiddenPrimaryTerminology(texts);
  if (!base.ok) return base;
  const extra = [...F3_FORBIDDEN_PRIMARY_TERMS].filter(
    (t) => !(FORBIDDEN_PRIMARY_TERMS as readonly string[]).includes(t)
  );
  const hits: Array<{ text: string; terms: string[] }> = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    const terms = extra.filter((t) => lower.includes(t.toLowerCase()));
    if (terms.length) hits.push({ text, terms });
  }
  return hits.length ? { ok: false, hits } : { ok: true };
}

export function primaryCopyFromActivation(activation: LiveActivation): string[] {
  const summary = activation.hostSummary;
  return [
    activation.hostStateLabel,
    activation.hostStateDetail,
    activation.nextSafeAction,
    activation.honestyStatement,
    summary?.whereLive,
    summary?.schedule,
    summary?.measured,
    summary?.needsAttention,
    summary?.externalBoundary,
    activation.failure?.message,
    activation.failure?.nextAction,
  ].filter((t): t is string => Boolean(t?.trim()));
}
