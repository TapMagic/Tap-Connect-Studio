/**
 * Versioned AutopilotPlan contract (F0).
 * Pure validation + status transitions. No execution, UI, or model calls.
 */

import type { HumanIntervention } from "./intervention";
import { validateHumanIntervention } from "./intervention";

export const AUTOPILOT_PLAN_SCHEMA_VERSION = "1.0.0" as const;

export type AutopilotPlanStatus =
  | "draft"
  | "ready_for_review"
  | "approved"
  | "applying"
  | "active"
  | "paused"
  | "stopped"
  | "rolled_back";

export type PlanAudience = {
  summary: string;
  segments?: string[];
  contactTypes?: string[];
  estimatedReach?: number;
};

export type ObjectMutationKind =
  | "create"
  | "update"
  | "project"
  | "bind"
  | "prepare_distribution"
  | "gate"
  | "measure"
  | "forbid";

export type ObjectMutationTarget =
  | "campaign"
  | "campaign.offer_coupon"
  | "card.spotlight"
  | "distribution.email"
  | "distribution.tapcast"
  | "guardian"
  | "consent"
  | "insights"
  | "wallet"
  | "tapflow"
  | "taploop"
  | "provider.live";

export type ObjectMutation = {
  id: string;
  kind: ObjectMutationKind;
  target: ObjectMutationTarget;
  /** Human-readable description of the mutation intent */
  description: string;
  /** When true, mutation is forbidden by recipe/policy (must not execute) */
  prohibited?: boolean;
  /** Declares ownership / projection role for Offer Fuse encoding */
  ownership?: "authoritative" | "projection" | "variant" | "gate" | "measure" | "forbidden";
  payload?: Record<string, unknown>;
};

export type MissingInformation = {
  key: string;
  explanation: string;
  relatedFactId?: string;
  relatedInterventionCode?: string;
};

export type CostEstimate = {
  currency: "USD";
  amount: number;
  basis: string;
};

export type RiskEstimate = {
  level: "low" | "medium" | "high";
  rationale: string;
};

export type ApprovalRequirement = {
  id: string;
  level: string;
  reason: string;
  scope?: string;
  blocking: boolean;
};

export type PlanSchedule = {
  timezone?: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
};

export type SuccessMetric = {
  id: string;
  name: string;
  /** Event or measure key (e.g. card.offer.claimed) */
  measure: string;
  target?: number;
};

export type PlanFallback = {
  strategy: string;
  description: string;
};

export type PlanRollback = {
  strategy: string;
  description: string;
};

export type AutopilotPlan = {
  id: string;
  schemaVersion: string;
  recipeId: string;
  recipeVersion: string;
  objective: string;
  strategy: string;
  reason: string;
  audience: PlanAudience;
  journeySummary: string;
  objectMutations: ObjectMutation[];
  factsUsed: string[];
  assumptions: string[];
  missingInformation: MissingInformation[];
  providersRequired: string[];
  costEstimate: CostEstimate;
  riskEstimate: RiskEstimate;
  approvalsRequired: ApprovalRequirement[];
  schedule: PlanSchedule;
  successMetrics: SuccessMetric[];
  fallback: PlanFallback;
  rollback: PlanRollback;
  policyAutoApproved: string[];
  humanInterventions: HumanIntervention[];
  status: AutopilotPlanStatus;
  createdAt: string;
  updatedAt: string;
  /** Monotonic plan revision within a lineage */
  planVersion?: number;
  supersedesPlanId?: string | null;
};

export type PlanAction =
  | { type: "submit_for_review" }
  | { type: "approve" }
  | { type: "return_to_draft" }
  | { type: "start_apply" }
  | { type: "mark_active" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "rollback" };

export type PlanTransitionResult =
  | { ok: true; status: AutopilotPlanStatus; previousStatus: AutopilotPlanStatus }
  | { ok: false; code: "invalid_transition"; message: string };

const PLAN_TRANSITIONS: Record<AutopilotPlanStatus, Partial<Record<PlanAction["type"], AutopilotPlanStatus>>> = {
  draft: {
    submit_for_review: "ready_for_review",
  },
  ready_for_review: {
    approve: "approved",
    return_to_draft: "draft",
  },
  approved: {
    start_apply: "applying",
    return_to_draft: "draft",
  },
  applying: {
    mark_active: "active",
    rollback: "rolled_back",
  },
  active: {
    pause: "paused",
    stop: "stopped",
    rollback: "rolled_back",
  },
  paused: {
    resume: "active",
    stop: "stopped",
    rollback: "rolled_back",
  },
  stopped: {},
  rolled_back: {},
};

export function transitionPlan(
  current: AutopilotPlanStatus,
  action: PlanAction
): PlanTransitionResult {
  const next = PLAN_TRANSITIONS[current]?.[action.type];
  if (!next) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `Cannot ${action.type} from status ${current}`,
    };
  }
  return { ok: true, status: next, previousStatus: current };
}

export function canTransitionPlan(current: AutopilotPlanStatus, action: PlanAction): boolean {
  return transitionPlan(current, action).ok;
}

export type PlanValidationResult =
  | { ok: true; plan: AutopilotPlan }
  | { ok: false; errors: string[] };

const REQUIRED_STRING_FIELDS: Array<keyof AutopilotPlan> = [
  "id",
  "schemaVersion",
  "recipeId",
  "recipeVersion",
  "objective",
  "strategy",
  "reason",
  "journeySummary",
  "createdAt",
  "updatedAt",
];

export function validateAutopilotPlan(plan: AutopilotPlan): PlanValidationResult {
  const errors: string[] = [];

  for (const key of REQUIRED_STRING_FIELDS) {
    const value = plan[key];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`AutopilotPlan.${key} is required`);
    }
  }

  if (!plan.audience || typeof plan.audience.summary !== "string" || !plan.audience.summary.trim()) {
    errors.push("AutopilotPlan.audience.summary is required");
  }
  if (!Array.isArray(plan.objectMutations)) {
    errors.push("AutopilotPlan.objectMutations must be an array");
  } else {
    for (const m of plan.objectMutations) {
      if (!m.id?.trim()) errors.push("objectMutation.id is required");
      if (!m.kind) errors.push(`objectMutation ${m.id ?? "?"} missing kind`);
      if (!m.target) errors.push(`objectMutation ${m.id ?? "?"} missing target`);
      if (!m.description?.trim()) errors.push(`objectMutation ${m.id ?? "?"} missing description`);
    }
  }
  if (!Array.isArray(plan.factsUsed)) errors.push("AutopilotPlan.factsUsed must be an array");
  if (!Array.isArray(plan.assumptions)) errors.push("AutopilotPlan.assumptions must be an array");
  if (!Array.isArray(plan.missingInformation)) {
    errors.push("AutopilotPlan.missingInformation must be an array");
  }
  if (!Array.isArray(plan.providersRequired)) {
    errors.push("AutopilotPlan.providersRequired must be an array");
  }
  if (!plan.costEstimate || typeof plan.costEstimate.amount !== "number" || plan.costEstimate.amount < 0) {
    errors.push("AutopilotPlan.costEstimate.amount must be a non-negative number");
  }
  if (!plan.riskEstimate?.level) errors.push("AutopilotPlan.riskEstimate.level is required");
  if (!Array.isArray(plan.approvalsRequired)) {
    errors.push("AutopilotPlan.approvalsRequired must be an array");
  }
  if (!plan.schedule || typeof plan.schedule !== "object") {
    errors.push("AutopilotPlan.schedule is required");
  }
  if (!Array.isArray(plan.successMetrics)) {
    errors.push("AutopilotPlan.successMetrics must be an array");
  }
  if (!plan.fallback?.strategy?.trim()) errors.push("AutopilotPlan.fallback.strategy is required");
  if (!plan.rollback?.strategy?.trim()) errors.push("AutopilotPlan.rollback.strategy is required");
  if (!Array.isArray(plan.policyAutoApproved)) {
    errors.push("AutopilotPlan.policyAutoApproved must be an array");
  }
  if (!Array.isArray(plan.humanInterventions)) {
    errors.push("AutopilotPlan.humanInterventions must be an array");
  } else {
    for (const intervention of plan.humanInterventions) {
      const v = validateHumanIntervention(intervention);
      if (!v.ok) errors.push(v.message);
    }
  }

  const statuses: AutopilotPlanStatus[] = [
    "draft",
    "ready_for_review",
    "approved",
    "applying",
    "active",
    "paused",
    "stopped",
    "rolled_back",
  ];
  if (!statuses.includes(plan.status)) {
    errors.push(`Invalid AutopilotPlan.status: ${plan.status}`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, plan };
}

/**
 * Plans remain interpretable after recipe versions change when major versions match.
 * Patch/minor recipe bumps are compatible; major bumps require explicit remapping.
 */
export function isPlanCompatibleWithRecipeVersion(
  planRecipeVersion: string,
  currentRecipeVersion: string
): { compatible: boolean; reason: string } {
  const parse = (v: string) => {
    const parts = v.trim().split(".").map((p) => Number.parseInt(p, 10));
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
    return { major: parts[0], minor: parts[1] ?? 0, patch: parts[2] ?? 0 };
  };
  const plan = parse(planRecipeVersion);
  const current = parse(currentRecipeVersion);
  if (!plan || !current) {
    return { compatible: false, reason: "Invalid semver for plan or recipe version" };
  }
  if (plan.major !== current.major) {
    return {
      compatible: false,
      reason: `Major recipe version changed (${planRecipeVersion} → ${currentRecipeVersion}); remapping required`,
    };
  }
  return {
    compatible: true,
    reason: `Plan recipe ${planRecipeVersion} remains interpretable under recipe ${currentRecipeVersion}`,
  };
}

/**
 * Supersede creates a new draft plan revision that points at the prior plan.
 * Does not mutate the prior plan's applied history fields in place.
 */
export function supersedePlan(
  prior: AutopilotPlan,
  patch: Partial<
    Pick<
      AutopilotPlan,
      | "objective"
      | "strategy"
      | "reason"
      | "audience"
      | "journeySummary"
      | "objectMutations"
      | "factsUsed"
      | "assumptions"
      | "missingInformation"
      | "providersRequired"
      | "costEstimate"
      | "riskEstimate"
      | "approvalsRequired"
      | "schedule"
      | "successMetrics"
      | "fallback"
      | "rollback"
      | "policyAutoApproved"
      | "humanInterventions"
      | "recipeVersion"
    >
  >,
  opts: { newId: string; now?: Date }
): AutopilotPlan {
  const now = (opts.now ?? new Date()).toISOString();
  return {
    ...prior,
    ...patch,
    id: opts.newId,
    schemaVersion: prior.schemaVersion || AUTOPILOT_PLAN_SCHEMA_VERSION,
    status: "draft",
    planVersion: (prior.planVersion ?? 1) + 1,
    supersedesPlanId: prior.id,
    createdAt: now,
    updatedAt: now,
    approvalsRequired: patch.approvalsRequired ?? [],
    policyAutoApproved: patch.policyAutoApproved ?? [],
    humanInterventions: patch.humanInterventions ?? [],
    missingInformation: patch.missingInformation ?? prior.missingInformation,
  };
}

export function applyPlanTransition(
  plan: AutopilotPlan,
  action: PlanAction,
  now = new Date()
): { ok: true; plan: AutopilotPlan } | { ok: false; code: "invalid_transition"; message: string } {
  const result = transitionPlan(plan.status, action);
  if (!result.ok) return result;
  return {
    ok: true,
    plan: {
      ...plan,
      status: result.status,
      updatedAt: now.toISOString(),
    },
  };
}

/** Live plan statuses that block silent fact deletion */
export const LIVE_PLAN_STATUSES: ReadonlySet<AutopilotPlanStatus> = new Set([
  "approved",
  "applying",
  "active",
  "paused",
]);

export function isLivePlanStatus(status: AutopilotPlanStatus): boolean {
  return LIVE_PLAN_STATUSES.has(status);
}
