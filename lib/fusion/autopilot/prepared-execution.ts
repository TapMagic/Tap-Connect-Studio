/**
 * Versioned prepared-outcome execution contract (F2).
 * References an approved AutopilotPlan — does not invent a parallel plan type.
 * Draft-only: no live publish / send / spend.
 */

import type { HumanIntervention } from "./intervention";
import { validateHumanIntervention } from "./intervention";

export const PREPARED_EXECUTION_SCHEMA_VERSION = "1.0.0" as const;

export type PreparedExecutionStatus =
  | "pending"
  | "preparing"
  | "prepared"
  | "needs_attention"
  | "failed"
  | "rolled_back"
  | "superseded";

export type PreparedObjectKind =
  | "campaign_draft"
  | "offer_coupon_facts"
  | "card_spotlight_projection"
  | "distribution_package"
  | "insights_goals";

export type PreparedObjectRole =
  | "authoritative"
  | "projection"
  | "variant"
  | "measure"
  | "gate";

export type PreparedObjectStatus =
  | "pending"
  | "prepared"
  | "skipped"
  | "failed"
  | "rolled_back";

export type PreparedObject = {
  id: string;
  kind: PreparedObjectKind;
  role: PreparedObjectRole;
  /** Host-safe short label */
  label: string;
  objectRef?: string;
  mutationId?: string;
  priorState?: Record<string, unknown> | null;
  draftState?: Record<string, unknown> | null;
  status: PreparedObjectStatus;
  warning?: string;
};

export type SourceFactRef = {
  id: string;
  kind: string;
  fingerprint?: string;
  ownership?: "authoritative" | "derived";
};

export type ApprovalRef = {
  id: string;
  level: string;
  /** Host-safe reason */
  reason: string;
  blocking: boolean;
};

export type ComponentReadiness = {
  component: PreparedObjectKind | "plan" | "policy" | "features";
  ready: boolean;
  detail: string;
};

export type PreparedReadiness = {
  /** Outcome-level host-facing readiness key */
  outcome:
    | "ready_to_prepare"
    | "preparing"
    | "prepared"
    | "needs_one_detail"
    | "ready_for_final_approval"
    | "cannot_continue_safely"
    | "stale_prepare_again"
    | "undone";
  components: ComponentReadiness[];
  stale: boolean;
  /**
   * F2 prepare leaves this false until F3 opens final approval.
   * F3 may set true when the prepared outcome may receive Make it live.
   */
  goLiveAvailable: boolean;
};

export type ReversibleAction = {
  id: string;
  kind:
    | "restore_spotlight_section"
    | "discard_distribution_package"
    | "discard_insights_goals"
    | "restore_campaign_draft_snapshot"
    | "clear_execution_bind";
  description: string;
  targetObjectId: string;
  undoPayload: Record<string, unknown>;
};

export type RollbackState = {
  status: "not_started" | "in_progress" | "completed" | "failed" | "partial";
  restoredObjectIds: string[];
  failedObjectIds: string[];
  message?: string;
  completedAt?: string;
};

export type AuditRef = {
  id: string;
  action: PreparedAuditAction;
  at: string;
  summary: string;
  detail?: Record<string, unknown>;
};

export type PreparedAuditAction =
  | "plan_approved"
  | "preparation_started"
  | "object_draft_prepared"
  | "projection_prepared"
  | "distribution_draft_prepared"
  | "insights_goal_prepared"
  | "preparation_completed"
  | "preparation_failed"
  | "rollback_requested"
  | "rollback_completed"
  | "rollback_failed"
  | "manual_takeover"
  | "marked_stale"
  | "reprepare_started";

export type PreviewRef = {
  id: string;
  surface:
    | "card_spotlight"
    | "confirmation"
    | "keep_card"
    | "ask_question"
    | "email_mock"
    | "tapcast_mock"
    | "insights_attribution";
  title: string;
  description: string;
  draftObjectId?: string;
};

export type PreparedFailure = {
  code:
    | "plan_not_approved"
    | "recipe_version_mismatch"
    | "missing_authoritative_fact"
    | "contradiction"
    | "stale_fact"
    | "campaign_unavailable"
    | "card_unavailable"
    | "spotlight_bind_conflict"
    | "distribution_preparation_failed"
    | "insights_goal_preparation_failed"
    | "feature_disabled"
    | "policy_approval_missing"
    | "rollback_failed"
    | "partial_failure"
    | "live_action_prohibited";
  message: string;
  intervention?: HumanIntervention;
  partialPreparedObjectIds?: string[];
};

export type ManualControlState = {
  active: boolean;
  frozenAt?: string;
  openedEditor?: string;
  note: string;
};

export type PreparedHostSummary = {
  onCard: string;
  audience: string;
  when: string;
  customerCanDo: string;
  followUp: string;
  measured: string;
  stillNeedsApproval: string;
  afterGoLive: string;
};

export type PreparedExecution = {
  executionId: string;
  schemaVersion: string;
  planId: string;
  planVersion: number;
  recipeId: string;
  recipeVersion: string;
  status: PreparedExecutionStatus;
  createdAt: string;
  updatedAt: string;
  preparedObjects: PreparedObject[];
  sourceFacts: SourceFactRef[];
  approvalsSatisfied: ApprovalRef[];
  approvalsOutstanding: ApprovalRef[];
  warnings: string[];
  readiness: PreparedReadiness;
  reversibleActions: ReversibleAction[];
  rollbackState: RollbackState;
  auditRefs: AuditRef[];
  previewRefs: PreviewRef[];
  failure: PreparedFailure | null;
  nextSafeAction: string;
  /** Fingerprints for stale detection */
  planFingerprint: string;
  factsFingerprint: string;
  hostSummary: PreparedHostSummary | null;
  hostStateLabel: string;
  hostStateDetail: string;
  honestyStatement: string;
  /** Local Campaign/Card publish only — never email/social send */
  livePublish: boolean;
  liveSend: false;
  liveSpend: false;
  customerContactOccurred: false;
  providerLiveAction: false;
  manualControl: ManualControlState;
  interventions: HumanIntervention[];
};

export type PreparedExecutionAction =
  | { type: "start_prepare" }
  | { type: "mark_prepared" }
  | { type: "mark_needs_attention" }
  | { type: "mark_failed" }
  | { type: "rollback" }
  | { type: "mark_rolled_back" }
  | { type: "supersede" };

const EXECUTION_TRANSITIONS: Record<
  PreparedExecutionStatus,
  Partial<Record<PreparedExecutionAction["type"], PreparedExecutionStatus>>
> = {
  pending: {
    start_prepare: "preparing",
    mark_failed: "failed",
    supersede: "superseded",
  },
  preparing: {
    mark_prepared: "prepared",
    mark_needs_attention: "needs_attention",
    mark_failed: "failed",
    rollback: "rolled_back",
  },
  prepared: {
    mark_needs_attention: "needs_attention",
    rollback: "rolled_back",
    supersede: "superseded",
    mark_failed: "failed",
  },
  needs_attention: {
    start_prepare: "preparing",
    rollback: "rolled_back",
    mark_failed: "failed",
    supersede: "superseded",
  },
  failed: {
    start_prepare: "preparing",
    supersede: "superseded",
  },
  rolled_back: {
    start_prepare: "preparing",
    supersede: "superseded",
  },
  superseded: {},
};

export function transitionPreparedExecution(
  current: PreparedExecutionStatus,
  action: PreparedExecutionAction
):
  | { ok: true; status: PreparedExecutionStatus; previousStatus: PreparedExecutionStatus }
  | { ok: false; code: "invalid_transition"; message: string } {
  const next = EXECUTION_TRANSITIONS[current]?.[action.type];
  if (!next) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `Cannot ${action.type} from prepared-execution status ${current}`,
    };
  }
  return { ok: true, status: next, previousStatus: current };
}

export function canTransitionPreparedExecution(
  current: PreparedExecutionStatus,
  action: PreparedExecutionAction
): boolean {
  return transitionPreparedExecution(current, action).ok;
}

export type PreparedExecutionValidationResult =
  | { ok: true; execution: PreparedExecution }
  | { ok: false; errors: string[] };

export function validatePreparedExecution(
  execution: PreparedExecution
): PreparedExecutionValidationResult {
  const errors: string[] = [];
  if (!execution.executionId?.trim()) errors.push("executionId is required");
  if (execution.schemaVersion !== PREPARED_EXECUTION_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PREPARED_EXECUTION_SCHEMA_VERSION}`);
  }
  if (!execution.planId?.trim()) errors.push("planId is required");
  if (!execution.recipeId?.trim()) errors.push("recipeId is required");
  if (!execution.recipeVersion?.trim()) errors.push("recipeVersion is required");
  if (!Array.isArray(execution.preparedObjects)) {
    errors.push("preparedObjects must be an array");
  }
  if (!Array.isArray(execution.reversibleActions)) {
    errors.push("reversibleActions must be an array");
  }
  if (!Array.isArray(execution.auditRefs)) errors.push("auditRefs must be an array");
  if (typeof execution.livePublish !== "boolean") {
    errors.push("livePublish must be a boolean");
  }
  if (execution.liveSend !== false) errors.push("liveSend must be false");
  if (execution.liveSpend !== false) errors.push("liveSpend must be false");
  if (execution.customerContactOccurred !== false) {
    errors.push("customerContactOccurred must be false");
  }
  if (execution.providerLiveAction !== false) {
    errors.push("providerLiveAction must be false");
  }
  if (typeof execution.readiness?.goLiveAvailable !== "boolean") {
    errors.push("readiness.goLiveAvailable must be a boolean");
  }
  for (const intervention of execution.interventions ?? []) {
    const v = validateHumanIntervention(intervention);
    if (!v.ok) errors.push(v.message);
  }
  const statuses: PreparedExecutionStatus[] = [
    "pending",
    "preparing",
    "prepared",
    "needs_attention",
    "failed",
    "rolled_back",
    "superseded",
  ];
  if (!statuses.includes(execution.status)) {
    errors.push(`Invalid status: ${execution.status}`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, execution };
}

/** Stable fingerprint of plan identity + mutations for stale detection */
export function fingerprintPlanForExecution(plan: {
  id: string;
  planVersion?: number;
  recipeId: string;
  recipeVersion: string;
  objective?: string;
  updatedAt?: string;
  objectMutations: Array<{ id: string; kind: string; target: string }>;
  factsUsed: string[];
}): string {
  const mutations = plan.objectMutations
    .map((m) => `${m.id}:${m.kind}:${m.target}`)
    .sort()
    .join("|");
  const facts = [...plan.factsUsed].sort().join(",");
  // Intentionally omit updatedAt — status transitions bump it without changing intent.
  return [
    plan.id,
    String(plan.planVersion ?? 1),
    plan.recipeId,
    plan.recipeVersion,
    (plan.objective ?? "").trim(),
    mutations,
    facts,
  ].join("::");
}

export function fingerprintFactsForExecution(
  facts: Array<{ id: string; kind: string; version?: number; value?: unknown }>
): string {
  return facts
    .map((f) => `${f.id}:${f.kind}:v${f.version ?? 1}:${stableValue(f.value)}`)
    .sort()
    .join("|");
}

function stableValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Stale when the approved plan or authoritative facts changed after preparation.
 * Does not silently overwrite host presentation overrides.
 */
export function detectPreparedExecutionStale(input: {
  execution: PreparedExecution;
  currentPlanFingerprint: string;
  currentFactsFingerprint: string;
}): { stale: boolean; reason?: string } {
  if (input.execution.status === "rolled_back" || input.execution.status === "superseded") {
    return { stale: false };
  }
  if (input.execution.planFingerprint !== input.currentPlanFingerprint) {
    return {
      stale: true,
      reason: "Your goal or plan changed since this was prepared.",
    };
  }
  if (input.execution.factsFingerprint !== input.currentFactsFingerprint) {
    return {
      stale: true,
      reason: "Offer details changed since this was prepared.",
    };
  }
  return { stale: false };
}

export function emptyRollbackState(): RollbackState {
  return {
    status: "not_started",
    restoredObjectIds: [],
    failedObjectIds: [],
  };
}

export function createAuditRef(input: {
  action: PreparedAuditAction;
  summary: string;
  detail?: Record<string, unknown>;
  now?: Date;
  id?: string;
}): AuditRef {
  const now = input.now ?? new Date();
  return {
    id: input.id ?? `audit_${input.action}_${now.getTime().toString(36)}`,
    action: input.action,
    at: now.toISOString(),
    summary: input.summary,
    detail: input.detail,
  };
}
