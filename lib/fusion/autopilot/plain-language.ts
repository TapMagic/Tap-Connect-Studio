/**
 * Plain-language translations for Autopilot host surfaces (F1).
 * Primary UI must not expose contract terminology.
 */

import type { ApprovalRequirement } from "./plan";
import type { HumanIntervention, HumanInterventionCode } from "./intervention";
import type { ApprovalLevel } from "./approval-policy";

/** Terms that must not appear in primary host-facing copy */
export const FORBIDDEN_PRIMARY_TERMS = [
  "recipeId",
  "recipeVersion",
  "schemaVersion",
  "objectMutations",
  "factsUsed",
  "policyAutoApproved",
  "interventionCode",
  "KnowledgeFact",
  "AutopilotPlan",
  "projection fingerprint",
  "offerFactsFingerprint",
  "provider capability",
  "review_before_publish",
  "review_before_send",
  "review_before_spend",
  "fully_automatic",
  "automatic_within_limits",
  "mandatory_human",
  "provider_unavailable",
  "missing_fact",
  "low_confidence",
  "consent_required",
  "policy_prohibited",
  "card.offer.measurable",
] as const;

export function containsForbiddenPrimaryTerminology(text: string): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_PRIMARY_TERMS) {
    if (lower.includes(term.toLowerCase())) hits.push(term);
  }
  return hits;
}

export function assertNoForbiddenPrimaryTerminology(
  texts: string[]
): { ok: true } | { ok: false; hits: Array<{ text: string; terms: string[] }> } {
  const hits: Array<{ text: string; terms: string[] }> = [];
  for (const text of texts) {
    const terms = containsForbiddenPrimaryTerminology(text);
    if (terms.length) hits.push({ text, terms });
  }
  return hits.length ? { ok: false, hits } : { ok: true };
}

const INTERVENTION_HOST_COPY: Record<
  HumanInterventionCode,
  { title: string; detail?: string }
> = {
  missing_fact: {
    title: "One detail is still needed",
    detail: "Autopilot will not invent business facts.",
  },
  contradiction: {
    title: "Two details disagree",
    detail: "Resolve the conflict before continuing.",
  },
  low_confidence: {
    title: "Please confirm this detail",
    detail: "Confidence is too low to use it automatically.",
  },
  stale_fact: {
    title: "Please re-check this detail",
    detail: "It may be out of date.",
  },
  consent_required: {
    title: "This customer group cannot receive this follow-up under your current permissions",
  },
  publish_approval: {
    title: "Review before this appears on your Card",
  },
  send_approval: {
    title: "Review before customers are contacted",
  },
  spend_approval: {
    title: "This action is outside your current spending limit",
  },
  budget_limit: {
    title: "This action is outside your current spending limit",
  },
  provider_unavailable: {
    title: "Email is not connected yet. Your Card offer can still be prepared",
  },
  policy_prohibited: {
    title: "This step is not allowed under your current settings",
  },
  recovery_failed: {
    title: "Autopilot could not recover safely",
    detail: "Take manual control or start over.",
  },
  role_permission_required: {
    title: "Your role needs permission for this step",
  },
  host_requested_review: {
    title: "You asked to review this before continuing",
  },
};

export function plainInterventionTitle(code: HumanInterventionCode): string {
  return INTERVENTION_HOST_COPY[code]?.title ?? "Something needs your attention";
}

export function plainInterventionDetail(intervention: HumanIntervention): string {
  const mapped = INTERVENTION_HOST_COPY[intervention.code];
  // Prefer host-safe explanation when already plain; fall back to mapped detail
  if (intervention.explanation && !containsForbiddenPrimaryTerminology(intervention.explanation).length) {
    return intervention.explanation;
  }
  return mapped?.detail ?? plainInterventionTitle(intervention.code);
}

export function plainApprovalLevel(level: string): string {
  switch (level as ApprovalLevel | string) {
    case "fully_automatic":
    case "automatic_within_limits":
      return "No approval needed yet";
    case "review_before_publish":
      return "Review before this appears on your Card";
    case "review_before_send":
      return "Review before customers are contacted";
    case "review_before_spend":
    case "budget_limit":
      return "This action is outside your current spending limit";
    case "mandatory_human":
      return "Needs your review before continuing";
    case "prohibited":
      return "This step is not allowed under your current settings";
    default:
      return "Needs your review before continuing";
  }
}

export type GroupedPlainApproval = {
  id: string;
  label: string;
  detail?: string;
  blocking: boolean;
  /** Underlying approval requirement ids (advanced only) */
  sourceIds: string[];
};

/**
 * Group mutation-level approvals into meaningful outcome buckets.
 */
export function groupApprovalsForHost(
  approvals: ApprovalRequirement[]
): GroupedPlainApproval[] {
  const buckets = new Map<string, GroupedPlainApproval>();

  for (const a of approvals) {
    const label = plainApprovalLevel(a.level);
    const key = `${a.level}:${label}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.sourceIds.push(a.id);
      existing.blocking = existing.blocking || a.blocking;
      continue;
    }
    buckets.set(key, {
      id: `group_${a.level}`,
      label,
      detail:
        a.level === "prohibited" && a.scope === "provider"
          ? "Email is not connected yet. Your Card offer can still be prepared."
          : undefined,
      blocking: a.blocking,
      sourceIds: [a.id],
    });
  }

  // Prefer provider unavailable wording when live providers are prohibited
  return Array.from(buckets.values()).map((g) => {
    if (g.label.includes("not allowed") && g.sourceIds.some((id) => id.startsWith("provider_"))) {
      return {
        ...g,
        label: "Email is not connected yet. Your Card offer can still be prepared",
        detail: "Follow-up stays prepared locally until email is connected.",
      };
    }
    return g;
  });
}

export function experienceStateLabel(
  state:
    | "preparing"
    | "needs_detail"
    | "ready_to_review"
    | "approved_locally"
    | "cannot_continue"
    | "provider_unavailable"
    | "feature_disabled"
): string {
  switch (state) {
    case "preparing":
      return "Preparing";
    case "needs_detail":
      return "Needs one detail";
    case "ready_to_review":
      return "Ready to review";
    case "approved_locally":
      return "Approved locally";
    case "cannot_continue":
      return "Cannot continue safely";
    case "provider_unavailable":
      return "Provider unavailable";
    case "feature_disabled":
      return "Feature disabled";
  }
}
