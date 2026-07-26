/**
 * Structured human-intervention reasons for Autopilot.
 * Never use a generic “needs review” state without a reason code.
 */

export const HUMAN_INTERVENTION_CODES = [
  "missing_fact",
  "contradiction",
  "low_confidence",
  "stale_fact",
  "consent_required",
  "publish_approval",
  "send_approval",
  "spend_approval",
  "budget_limit",
  "provider_unavailable",
  "policy_prohibited",
  "recovery_failed",
  "role_permission_required",
  "host_requested_review",
] as const;

export type HumanInterventionCode = (typeof HUMAN_INTERVENTION_CODES)[number];

export type InterventionSeverity = "info" | "warning" | "blocking" | "critical";

export type HumanIntervention = {
  code: HumanInterventionCode;
  /** Human-readable explanation */
  explanation: string;
  /** Affected object id, mutation id, or plan step key */
  affectedObjectOrStep: string;
  severity: InterventionSeverity;
  /** When true, plan cannot advance past the gated transition */
  blocking: boolean;
  suggestedNextAction: string;
};

export const INTERVENTION_DEFAULTS: Record<
  HumanInterventionCode,
  Pick<HumanIntervention, "severity" | "blocking" | "suggestedNextAction"> & {
    explanationTemplate: string;
  }
> = {
  missing_fact: {
    severity: "blocking",
    blocking: true,
    explanationTemplate: "Required business fact is missing and cannot be invented.",
    suggestedNextAction: "Provide or confirm the missing fact before continuing.",
  },
  contradiction: {
    severity: "blocking",
    blocking: true,
    explanationTemplate: "Confirmed contradiction blocks use of this fact.",
    suggestedNextAction: "Resolve the contradiction and approve a corrected fact version.",
  },
  low_confidence: {
    severity: "warning",
    blocking: true,
    explanationTemplate: "Fact confidence is too low to treat as authoritative.",
    suggestedNextAction: "Verify the fact or mark it as missing information.",
  },
  stale_fact: {
    severity: "warning",
    blocking: false,
    explanationTemplate: "Fact is stale and marked for verification.",
    suggestedNextAction: "Re-verify the fact before publish or send.",
  },
  consent_required: {
    severity: "blocking",
    blocking: true,
    explanationTemplate: "Customer-contact send lacks a valid consent path.",
    suggestedNextAction: "Confirm consent/Guardian path or remove the send step.",
  },
  publish_approval: {
    severity: "warning",
    blocking: true,
    explanationTemplate: "Publish requires human approval per policy.",
    suggestedNextAction: "Review and approve publish before applying.",
  },
  send_approval: {
    severity: "warning",
    blocking: true,
    explanationTemplate: "Customer-contact send requires human approval.",
    suggestedNextAction: "Review message and approve send.",
  },
  spend_approval: {
    severity: "warning",
    blocking: true,
    explanationTemplate: "Spend exceeds automatic limits and needs approval.",
    suggestedNextAction: "Review cost estimate and approve spend, or reduce scope.",
  },
  budget_limit: {
    severity: "blocking",
    blocking: true,
    explanationTemplate: "Plan exceeds the configured budget ceiling.",
    suggestedNextAction: "Reduce cost or raise the budget ceiling with approval.",
  },
  provider_unavailable: {
    severity: "warning",
    blocking: true,
    explanationTemplate: "A required provider is unavailable or not configured.",
    suggestedNextAction: "Configure the provider or choose a fallback path.",
  },
  policy_prohibited: {
    severity: "critical",
    blocking: true,
    explanationTemplate: "This action is prohibited by Autopilot policy.",
    suggestedNextAction: "Remove the prohibited mutation or change the recipe path.",
  },
  recovery_failed: {
    severity: "critical",
    blocking: true,
    explanationTemplate: "Automatic recovery failed and needs human intervention.",
    suggestedNextAction: "Inspect failure details and choose a recovery or rollback action.",
  },
  role_permission_required: {
    severity: "blocking",
    blocking: true,
    explanationTemplate: "Current role lacks permission for this Autopilot action.",
    suggestedNextAction: "Escalate to a role with the required permission.",
  },
  host_requested_review: {
    severity: "info",
    blocking: true,
    explanationTemplate: "Host requested an explicit review before continuing.",
    suggestedNextAction: "Complete host review and approve or revise the plan.",
  },
};

export function createHumanIntervention(input: {
  code: HumanInterventionCode;
  affectedObjectOrStep: string;
  explanation?: string;
  severity?: InterventionSeverity;
  blocking?: boolean;
  suggestedNextAction?: string;
}): HumanIntervention {
  const defaults = INTERVENTION_DEFAULTS[input.code];
  return {
    code: input.code,
    explanation: input.explanation ?? defaults.explanationTemplate,
    affectedObjectOrStep: input.affectedObjectOrStep,
    severity: input.severity ?? defaults.severity,
    blocking: input.blocking ?? defaults.blocking,
    suggestedNextAction: input.suggestedNextAction ?? defaults.suggestedNextAction,
  };
}

export function isValidInterventionCode(code: string): code is HumanInterventionCode {
  return (HUMAN_INTERVENTION_CODES as readonly string[]).includes(code);
}

export function validateHumanIntervention(
  intervention: HumanIntervention
): { ok: true } | { ok: false; message: string } {
  if (!isValidInterventionCode(intervention.code)) {
    return { ok: false, message: `Unknown intervention code: ${intervention.code}` };
  }
  if (!intervention.explanation?.trim()) {
    return { ok: false, message: "Intervention requires a human-readable explanation" };
  }
  if (!intervention.affectedObjectOrStep?.trim()) {
    return { ok: false, message: "Intervention requires affectedObjectOrStep" };
  }
  if (!intervention.suggestedNextAction?.trim()) {
    return { ok: false, message: "Intervention requires suggestedNextAction" };
  }
  return { ok: true };
}

export function hasBlockingInterventions(interventions: HumanIntervention[]): boolean {
  return interventions.some((i) => i.blocking);
}
