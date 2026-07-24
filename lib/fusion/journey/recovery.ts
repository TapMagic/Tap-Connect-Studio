/**
 * TapFlow failure recovery — resume a blocked dry-run with patched visitor context.
 * Live visitor executor uses pause/resume/retry on JourneyExecution (see live.ts).
 */

import type { JourneyDefinition } from "./types";
import {
  executeJourneyDryRun,
  type DryRunResult,
  type VisitorContext,
} from "./runtime";

export type RecoveryPatch = {
  /** Merge into visitor consent */
  consent?: Partial<NonNullable<VisitorContext["consent"]>>;
  /** Merge attributes */
  attributes?: Record<string, unknown>;
  preferBranch?: string;
  /** Skip guardian blocks once (operator override for dry-run only) */
  operatorBypassGuardian?: boolean;
};

export type RecoveryPlan = {
  blockedAt?: string;
  reason: string;
  suggestedPatch: RecoveryPatch;
  canAutoRecover: boolean;
};

export function planJourneyRecovery(result: DryRunResult): RecoveryPlan {
  if (result.completed) {
    return {
      reason: "Run already completed",
      suggestedPatch: {},
      canAutoRecover: false,
    };
  }
  const issue = result.issues[0] ?? "incomplete";
  const blockedAt = result.blockedAt;
  const suggestedPatch: RecoveryPatch = {};

  if (/consent/i.test(issue) || /Guardian/i.test(issue)) {
    suggestedPatch.consent = { email: true, marketing: true, sms: true };
    suggestedPatch.operatorBypassGuardian = true;
    return {
      blockedAt,
      reason: issue,
      suggestedPatch,
      canAutoRecover: true,
    };
  }
  if (/Cycle/i.test(issue)) {
    return {
      blockedAt,
      reason: issue,
      suggestedPatch: {},
      canAutoRecover: false,
    };
  }
  if (/Did not reach exit|Incomplete/i.test(issue)) {
    suggestedPatch.preferBranch = "true";
    return {
      blockedAt,
      reason: issue,
      suggestedPatch,
      canAutoRecover: Boolean(blockedAt),
    };
  }
  return {
    blockedAt,
    reason: issue,
    suggestedPatch: { preferBranch: "true" },
    canAutoRecover: Boolean(blockedAt),
  };
}

/**
 * Re-run from the start with patched visitor (full replay). Partial mid-graph resume
 * is modeled as preferBranch + consent overrides until live executor stores checkpoints.
 */
export function recoverJourneyDryRun(
  def: JourneyDefinition,
  prior: DryRunResult,
  patch: RecoveryPatch = planJourneyRecovery(prior).suggestedPatch
): DryRunResult {
  const visitor: VisitorContext = {
    ...prior.visitor,
    consent: { ...prior.visitor.consent, ...patch.consent },
    attributes: { ...prior.visitor.attributes, ...patch.attributes },
    preferBranch: patch.preferBranch ?? prior.visitor.preferBranch,
  };
  if (patch.operatorBypassGuardian) {
    visitor.consent = { email: true, sms: true, marketing: true };
  }
  return executeJourneyDryRun(def, visitor, { requireValid: false });
}
