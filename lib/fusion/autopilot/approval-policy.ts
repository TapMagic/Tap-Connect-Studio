/**
 * Deterministic Approval Policy Engine (F0).
 * Core truth, policy, and simulation must not depend on a model.
 */

import type { AutopilotPlan, ApprovalRequirement, ObjectMutation } from "./plan";
import { createHumanIntervention, type HumanIntervention } from "./intervention";

export type ApprovalLevel =
  | "fully_automatic"
  | "automatic_within_limits"
  | "review_before_publish"
  | "review_before_send"
  | "review_before_spend"
  | "mandatory_human"
  | "prohibited";

export type ApprovalPolicyScope = {
  recipeId?: string;
  channel?: string;
  audience?: string;
  /** Max automatic spend in USD; above → review_before_spend or prohibited */
  costCeilingUsd?: number;
  /** Hard spend ceiling; at/above → prohibited when enforceHardCeiling */
  hardCostCeilingUsd?: number;
  enforceHardCeiling?: boolean;
  maxDiscountPercent?: number;
  location?: string;
  maxRisk?: "low" | "medium" | "high";
  contactType?: string;
  businessRole?: string;
  /** F0: live provider actions are always prohibited */
  allowLiveProviders?: boolean;
};

export type ApprovalPolicy = {
  id: string;
  name: string;
  /** Default level when no rule matches */
  defaultLevel: ApprovalLevel;
  scope: ApprovalPolicyScope;
  /** Per-mutation-target overrides */
  targetLevels?: Partial<Record<ObjectMutation["target"], ApprovalLevel>>;
};

export type DecideApprovalsResult = {
  approvalsRequired: ApprovalRequirement[];
  interventions: HumanIntervention[];
  autoApproved: string[];
  prohibited: string[];
};

const RISK_RANK: Record<"low" | "medium" | "high", number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const CARD_OFFER_MEASURABLE_POLICY: ApprovalPolicy = {
  id: "policy.card.offer.measurable.default",
  name: "Default policy for card.offer.measurable",
  defaultLevel: "automatic_within_limits",
  scope: {
    recipeId: "card.offer.measurable",
    costCeilingUsd: 0,
    hardCostCeilingUsd: 25,
    enforceHardCeiling: true,
    maxDiscountPercent: 0,
    maxRisk: "medium",
    allowLiveProviders: false,
  },
  targetLevels: {
    "campaign.offer_coupon": "review_before_publish",
    campaign: "review_before_publish",
    "card.spotlight": "automatic_within_limits",
    "distribution.email": "review_before_send",
    "distribution.tapcast": "review_before_publish",
    guardian: "mandatory_human",
    consent: "mandatory_human",
    insights: "fully_automatic",
    wallet: "prohibited",
    tapflow: "prohibited",
    taploop: "prohibited",
    "provider.live": "prohibited",
  },
};

function levelToApproval(
  mutation: ObjectMutation,
  level: ApprovalLevel,
  reason: string
): ApprovalRequirement | null {
  if (level === "fully_automatic" || level === "automatic_within_limits") {
    return null;
  }
  if (level === "prohibited") {
    return {
      id: `prohibit_${mutation.id}`,
      level,
      reason,
      scope: mutation.target,
      blocking: true,
    };
  }
  return {
    id: `approve_${mutation.id}_${level}`,
    level,
    reason,
    scope: mutation.target,
    blocking: true,
  };
}

function inventsPriceOrDiscount(mutation: ObjectMutation): boolean {
  const payload = mutation.payload ?? {};
  if (payload.inventPrice === true || payload.inventDiscount === true) return true;
  if (payload.priceSource === "autopilot_invented") return true;
  if (payload.discountSource === "autopilot_invented") return true;
  return false;
}

function isCustomerContactSend(mutation: ObjectMutation): boolean {
  const payload = mutation.payload ?? {};
  // Prepared/mock distribution packages are not customer-contact sends until explicitly marked.
  if (payload.deferred === true || payload.liveSend === false) {
    return payload.customerContact === true || payload.send === true;
  }
  if (mutation.target === "distribution.email") {
    return payload.customerContact !== false;
  }
  if (payload.customerContact === true) return true;
  if (payload.send === true && mutation.target !== "distribution.tapcast") {
    return true;
  }
  return false;
}

function hasValidConsentPath(mutation: ObjectMutation): boolean {
  return mutation.payload?.consentPathValid === true;
}

function isPresentationDraft(mutation: ObjectMutation): boolean {
  return (
    mutation.ownership === "projection" ||
    mutation.kind === "project" ||
    mutation.target === "card.spotlight" ||
    (mutation.payload?.presentationOnly === true)
  );
}

function isPublishMutation(mutation: ObjectMutation): boolean {
  return (
    mutation.payload?.publish === true ||
    mutation.target === "campaign" ||
    mutation.target === "campaign.offer_coupon" ||
    (mutation.target === "card.spotlight" && mutation.payload?.publish === true)
  );
}

/**
 * decideApprovals(plan, policy) → approvalsRequired[]
 * Deterministic; no model dependency.
 */
export function decideApprovals(
  plan: AutopilotPlan,
  policy: ApprovalPolicy = CARD_OFFER_MEASURABLE_POLICY
): DecideApprovalsResult {
  const approvalsRequired: ApprovalRequirement[] = [];
  const interventions: HumanIntervention[] = [];
  const autoApproved: string[] = [];
  const prohibited: string[] = [];

  const cost = plan.costEstimate?.amount ?? 0;
  const hard = policy.scope.hardCostCeilingUsd;
  const soft = policy.scope.costCeilingUsd ?? 0;

  if (hard != null && policy.scope.enforceHardCeiling && cost >= hard) {
    const req: ApprovalRequirement = {
      id: "budget_hard_ceiling",
      level: "prohibited",
      reason: `Cost ${cost} exceeds hard ceiling ${hard}`,
      scope: "cost",
      blocking: true,
    };
    approvalsRequired.push(req);
    prohibited.push(req.id);
    interventions.push(
      createHumanIntervention({
        code: "budget_limit",
        affectedObjectOrStep: "costEstimate",
        explanation: req.reason,
      })
    );
  } else if (cost > soft) {
    const req: ApprovalRequirement = {
      id: "budget_soft_ceiling",
      level: "review_before_spend",
      reason: `Cost ${cost} exceeds automatic spend limit ${soft}`,
      scope: "cost",
      blocking: true,
    };
    approvalsRequired.push(req);
    interventions.push(
      createHumanIntervention({
        code: "spend_approval",
        affectedObjectOrStep: "costEstimate",
        explanation: req.reason,
      })
    );
  }

  if (
    policy.scope.maxRisk &&
    RISK_RANK[plan.riskEstimate.level] > RISK_RANK[policy.scope.maxRisk]
  ) {
    const req: ApprovalRequirement = {
      id: "risk_exceeds_policy",
      level: "mandatory_human",
      reason: `Plan risk ${plan.riskEstimate.level} exceeds policy max ${policy.scope.maxRisk}`,
      scope: "risk",
      blocking: true,
    };
    approvalsRequired.push(req);
    interventions.push(
      createHumanIntervention({
        code: "host_requested_review",
        affectedObjectOrStep: "riskEstimate",
        explanation: req.reason,
      })
    );
  }

  for (const mutation of plan.objectMutations) {
    if (mutation.prohibited || mutation.ownership === "forbidden") {
      const req: ApprovalRequirement = {
        id: `forbid_${mutation.id}`,
        level: "prohibited",
        reason: mutation.description || `Mutation ${mutation.id} is forbidden`,
        scope: mutation.target,
        blocking: true,
      };
      approvalsRequired.push(req);
      prohibited.push(mutation.id);
      interventions.push(
        createHumanIntervention({
          code: "policy_prohibited",
          affectedObjectOrStep: mutation.id,
          explanation: req.reason,
        })
      );
      continue;
    }

    if (inventsPriceOrDiscount(mutation)) {
      const req: ApprovalRequirement = {
        id: `invent_price_${mutation.id}`,
        level: "prohibited",
        reason: "Autopilot may not invent price or discount facts",
        scope: mutation.target,
        blocking: true,
      };
      approvalsRequired.push(req);
      prohibited.push(mutation.id);
      interventions.push(
        createHumanIntervention({
          code: "policy_prohibited",
          affectedObjectOrStep: mutation.id,
          explanation: req.reason,
        })
      );
      continue;
    }

    if (mutation.target === "provider.live" || mutation.payload?.liveProvider === true) {
      if (!policy.scope.allowLiveProviders) {
        const req: ApprovalRequirement = {
          id: `live_provider_${mutation.id}`,
          level: "prohibited",
          reason: "Live provider actions are prohibited in F0",
          scope: mutation.target,
          blocking: true,
        };
        approvalsRequired.push(req);
        prohibited.push(mutation.id);
        interventions.push(
          createHumanIntervention({
            code: "provider_unavailable",
            affectedObjectOrStep: mutation.id,
            explanation: req.reason,
            blocking: true,
          })
        );
        continue;
      }
    }

    if (isCustomerContactSend(mutation) && !hasValidConsentPath(mutation)) {
      const req: ApprovalRequirement = {
        id: `consent_${mutation.id}`,
        level: "prohibited",
        reason: "Send without valid consent path is prohibited",
        scope: mutation.target,
        blocking: true,
      };
      approvalsRequired.push(req);
      prohibited.push(mutation.id);
      interventions.push(
        createHumanIntervention({
          code: "consent_required",
          affectedObjectOrStep: mutation.id,
          explanation: req.reason,
        })
      );
      continue;
    }

    let level: ApprovalLevel =
      policy.targetLevels?.[mutation.target] ?? policy.defaultLevel;

    // Rule overrides (product defaults)
    if (isPresentationDraft(mutation) && level !== "prohibited") {
      level = "automatic_within_limits";
    }
    if (isPublishMutation(mutation) && level !== "prohibited") {
      level = "review_before_publish";
    }
    if (isCustomerContactSend(mutation) && level !== "prohibited") {
      level = "review_before_send";
    }
    // Mock/deferred distribution preparation is not a customer contact yet
    if (
      level !== "prohibited" &&
      (mutation.payload?.deferred === true ||
        (mutation.payload?.mock === true &&
          mutation.payload?.liveSend === false &&
          mutation.payload?.customerContact !== true &&
          mutation.payload?.livePublish !== true))
    ) {
      level = "automatic_within_limits";
    }

    const reason = `Policy ${policy.id} → ${level} for ${mutation.target}`;
    const req = levelToApproval(mutation, level, reason);
    if (!req) {
      autoApproved.push(mutation.id);
      continue;
    }

    approvalsRequired.push(req);
    if (level === "prohibited") {
      prohibited.push(mutation.id);
      interventions.push(
        createHumanIntervention({
          code: "policy_prohibited",
          affectedObjectOrStep: mutation.id,
          explanation: reason,
        })
      );
    } else if (level === "review_before_publish") {
      interventions.push(
        createHumanIntervention({
          code: "publish_approval",
          affectedObjectOrStep: mutation.id,
          explanation: reason,
        })
      );
    } else if (level === "review_before_send") {
      interventions.push(
        createHumanIntervention({
          code: "send_approval",
          affectedObjectOrStep: mutation.id,
          explanation: reason,
        })
      );
    } else if (level === "review_before_spend") {
      interventions.push(
        createHumanIntervention({
          code: "spend_approval",
          affectedObjectOrStep: mutation.id,
          explanation: reason,
        })
      );
    } else if (level === "mandatory_human") {
      interventions.push(
        createHumanIntervention({
          code: "role_permission_required",
          affectedObjectOrStep: mutation.id,
          explanation: reason,
        })
      );
    }
  }

  // Providers required that look like live integrations are prohibited in F0
  for (const provider of plan.providersRequired) {
    if (provider === "none" || provider.startsWith("mock.")) continue;
    if (!policy.scope.allowLiveProviders) {
      const req: ApprovalRequirement = {
        id: `provider_${provider}`,
        level: "prohibited",
        reason: `Live provider “${provider}” is prohibited in F0`,
        scope: "provider",
        blocking: true,
      };
      approvalsRequired.push(req);
      prohibited.push(provider);
      interventions.push(
        createHumanIntervention({
          code: "provider_unavailable",
          affectedObjectOrStep: provider,
          explanation: req.reason,
        })
      );
    }
  }

  return { approvalsRequired, interventions, autoApproved, prohibited };
}

export function defaultPolicyForRecipe(recipeId: string): ApprovalPolicy {
  if (recipeId === "card.offer.measurable") return CARD_OFFER_MEASURABLE_POLICY;
  return {
    id: `policy.${recipeId}.default`,
    name: `Default policy for ${recipeId}`,
    defaultLevel: "mandatory_human",
    scope: { recipeId, allowLiveProviders: false, costCeilingUsd: 0 },
  };
}
