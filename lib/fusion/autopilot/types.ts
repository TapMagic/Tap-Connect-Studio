/**
 * Autopilot / Automation Team — modes and proposal contracts + state machine.
 */

export type AutopilotMode =
  | "disabled"
  | "draft"
  | "recommend"
  | "auto_apply"
  | "internal_only";

export type AutopilotProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "partial"
  | "superseded"
  | "undone";

export type AutopilotProposal = {
  id: string;
  businessId?: string;
  recipeId: string;
  /** Recipe semver stamped at generation time */
  recipeVersion?: string;
  mode: AutopilotMode;
  status: AutopilotProposalStatus;
  prompt: string;
  summary: string;
  artifacts: AutopilotArtifact[];
  warnings: string[];
  acceptedArtifactKinds?: string[];
  previousStatus?: AutopilotProposalStatus | null;
  actorId?: string | null;
  createdAt: string;
  updatedAt?: string;
  decidedAt?: string | null;
  /** When artifacts were applied to the editor (distinct from accept) */
  appliedAt?: string | null;
  /** Monotonic revision within a business+recipe lineage */
  revision?: number;
  /** Prior proposal this one supersedes (compare / versioning) */
  supersedesId?: string | null;
};

export type AutopilotArtifact = {
  kind: "campaign_draft" | "copy_block" | "theme" | "schedule_hint";
  label: string;
  payload: Record<string, unknown>;
};

export const AUTOPILOT_MODE_LABELS: Record<AutopilotMode, string> = {
  disabled: "Disabled",
  draft: "Draft only",
  recommend: "Recommend (review required)",
  auto_apply: "Auto-apply (trusted workspace)",
  internal_only: "Internal operator only",
};

export function resolveAutopilotMode(
  overrideMode?: AutopilotMode | null,
  featureEnabled = false
): AutopilotMode {
  if (!featureEnabled) return "disabled";
  return overrideMode ?? "recommend";
}

export function modeAllowsGeneration(mode: AutopilotMode): boolean {
  return mode !== "disabled";
}

export function modeAutoApplies(mode: AutopilotMode): boolean {
  return mode === "auto_apply" || mode === "internal_only";
}

/** Pure state-machine transitions for proposal lifecycle */
export type ProposalAction =
  | { type: "accept" }
  | { type: "reject" }
  | { type: "partial"; artifactKinds: string[] }
  | { type: "undo" }
  | { type: "supersede" };

export type ProposalTransitionResult =
  | { ok: true; status: AutopilotProposalStatus; previousStatus: AutopilotProposalStatus }
  | { ok: false; code: "invalid_transition"; message: string };

export function transitionProposal(
  current: AutopilotProposalStatus,
  action: ProposalAction
): ProposalTransitionResult {
  switch (action.type) {
    case "accept":
      if (current !== "pending" && current !== "undone" && current !== "partial") {
        return {
          ok: false,
          code: "invalid_transition",
          message: `Cannot accept from status ${current}`,
        };
      }
      return { ok: true, status: "accepted", previousStatus: current };

    case "reject":
      if (current !== "pending" && current !== "undone" && current !== "partial") {
        return {
          ok: false,
          code: "invalid_transition",
          message: `Cannot reject from status ${current}`,
        };
      }
      return { ok: true, status: "rejected", previousStatus: current };

    case "partial":
      if (current !== "pending" && current !== "undone") {
        return {
          ok: false,
          code: "invalid_transition",
          message: `Cannot partially accept from status ${current}`,
        };
      }
      if (!action.artifactKinds.length) {
        return {
          ok: false,
          code: "invalid_transition",
          message: "Partial accept requires at least one artifact kind",
        };
      }
      return { ok: true, status: "partial", previousStatus: current };

    case "undo":
      if (
        current !== "accepted" &&
        current !== "rejected" &&
        current !== "partial"
      ) {
        return {
          ok: false,
          code: "invalid_transition",
          message: `Cannot undo from status ${current}`,
        };
      }
      return { ok: true, status: "undone", previousStatus: current };

    case "supersede":
      if (current === "superseded") {
        return {
          ok: false,
          code: "invalid_transition",
          message: "Already superseded",
        };
      }
      return { ok: true, status: "superseded", previousStatus: current };

    default:
      return { ok: false, code: "invalid_transition", message: "Unknown action" };
  }
}

export function canApplyArtifacts(status: AutopilotProposalStatus): boolean {
  return status === "accepted" || status === "partial";
}

/** Governed accept → apply → undo audit steps (PlatformAuditEvent action names) */
export type ProposalGovernanceAction =
  | "autopilot.proposal.create"
  | "autopilot.proposal.accept"
  | "autopilot.proposal.reject"
  | "autopilot.proposal.partial"
  | "autopilot.proposal.undo"
  | "autopilot.proposal.apply"
  | "autopilot.proposal.undo_apply"
  | "autopilot.proposal.supersede";

export type ProposalAuditEntry = {
  proposalId: string;
  action: ProposalGovernanceAction;
  from?: AutopilotProposalStatus;
  to?: AutopilotProposalStatus;
  actorId?: string | null;
  at: string;
  metadata?: Record<string, unknown>;
};
