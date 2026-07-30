/**
 * Owner-facing language vs Platform Admin / engineering readiness language.
 *
 * Owners see capability, availability, state meaning, and next action.
 * Engineering classifications stay in Platform Admin, readiness diagnostics, and docs.
 */

import type { DisplayReadiness } from "@/lib/fusion/readiness/display-status";
import type { OwnerStatusSeverity } from "@/lib/fusion/ux/owner-status";

export type OwnerReadinessPresentation = {
  label: string;
  severity: OwnerStatusSeverity;
  nextHint: string;
};

/** Owner badges for nav / workspace readiness — never engineering ledger prose. */
export const OWNER_DISPLAY_READINESS: Record<
  DisplayReadiness,
  OwnerReadinessPresentation
> = {
  owner_ready: {
    label: "Ready",
    severity: "success",
    nextHint: "Available for normal Owner use.",
  },
  verified_credentials_required: {
    label: "Credentials required",
    severity: "info",
    nextHint: "Connect this provider under Settings to use live delivery.",
  },
  functional_final_verification_required: {
    label: "Available",
    severity: "info",
    nextHint: "You can use this area; some advanced checks may still be finishing.",
  },
  integrated_incomplete_workflow: {
    label: "Setup needed",
    severity: "attention",
    nextHint: "Finish the remaining setup steps to use the full workflow.",
  },
  development: {
    label: "Coming later",
    severity: "info",
    nextHint: "Not included in the current Owner workflow yet.",
  },
  blocked: {
    label: "Blocked",
    severity: "error",
    nextHint: "Something must be fixed before this can continue.",
  },
  disabled: {
    label: "Not included in your plan",
    severity: "info",
    nextHint: "This capability is off for this workspace.",
  },
};

export function ownerReadinessForDisplay(
  display: DisplayReadiness
): OwnerReadinessPresentation {
  return OWNER_DISPLAY_READINESS[display];
}

/**
 * Maturity labels shown on Owner hubs (Experiences support cards, etc.).
 * Prefer outcome language over provider/engineering jargon.
 */
export function ownerMaturityLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  switch (key) {
    case "owner_ready":
    case "owner-ready":
    case "ready":
      return "Ready";
    case "functional":
    case "functional — final verification required":
    case "functional_final_verification_required":
      return "Available";
    case "provider-gated":
    case "verified_needs_credentials":
    case "verified — credentials required":
      return "Needs connection";
    case "legacy":
    case "whiteboard (legacy)":
      return "Coming later";
    case "placeholder":
    case "not shipped":
    case "scaffolded":
    case "development":
    case "experimental":
      return "Coming later";
    case "mock/test":
    case "mock":
      return "Draft only";
    case "beta":
      return "Review required";
    default:
      return raw;
  }
}

/** Banned / discouraged Owner-facing phrases → preferred replacements. */
export const OWNER_LANGUAGE_REPLACEMENTS: Array<{
  from: RegExp | string;
  to: string;
}> = [
  { from: /Make and ship around the Card/gi, to: "Create and run experiences around the Card" },
  { from: /Labs stay demoted\.?/gi, to: "Extra tools stay in More until they are ready." },
  { from: /\bCalm\b/g, to: "Nothing needs your attention" },
  { from: /Nothing blocked — failures appear here with a recovery path\.?/gi, to: "Nothing needs your attention. No approvals, failed deliveries, or publishing issues are blocking your work." },
  { from: /Unresolved decisions/gi, to: "Items that need your review" },
  { from: /Delivery and publish failures with a recovery path\.?/gi, to: "Approvals, failed deliveries, and publishing issues that need a next step." },
  { from: /Fleet workspace/gi, to: "Open Tap Point workspace" },
  { from: /No Tap Points connected/gi, to: "Tap Points not connected yet" },
  { from: /provider-gated/gi, to: "needs connection" },
  { from: /mock adapter/gi, to: "test delivery path" },
  { from: /Whiteboard \(legacy\)/gi, to: "Campaign planning board" },
  { from: /not shipped/gi, to: "coming later" },
  { from: /same workbench/gi, to: "same workspace" },
  { from: /readiness surface/gi, to: "setup status" },
  { from: /bridge rollout/gi, to: "connection setup" },
];

export function applyOwnerLanguage(input: string): string {
  let next = input;
  for (const rule of OWNER_LANGUAGE_REPLACEMENTS) {
    next = next.replace(rule.from, rule.to);
  }
  return next;
}
