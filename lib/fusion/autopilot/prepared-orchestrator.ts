/**
 * Deterministic local prepared-outcome orchestrator for card.offer.measurable@1.0.0 (F2).
 *
 * Executes an approved AutopilotPlan by calling existing domain contracts
 * (Offer Fuse extract / project / distribution / Insights event definitions).
 * Draft-only: no live publish, send, spend, provider action, or customer contact.
 */

import type { ContentBlock, OfferCouponData } from "@/lib/types/campaign";
import type { TapCardSection } from "@/lib/brand/tap-card";
import {
  buildOfferDistributionPackage,
  detectOfferProjectionState,
  extractAuthoritativeOffer,
  findPrimarySpotlightSection,
  projectOfferOntoSpotlight,
  unprojectSpotlightOffer,
  type AuthoritativeOffer,
  type OfferDistributionPackage,
} from "@/lib/fusion/card/offer";
import {
  applyPlanTransition,
  isPlanCompatibleWithRecipeVersion,
  type AutopilotPlan,
  validateAutopilotPlan,
} from "./plan";
import {
  CARD_OFFER_MEASURABLE_RECIPE,
  CARD_OFFER_MEASURABLE_RECIPE_ID,
  CARD_OFFER_MEASURABLE_VERSION,
  assertOfferFuseSourceOfTruth,
} from "./outcome-recipe";
import {
  evaluateFactUsability,
  isFactAuthoritative,
  type KnowledgeFact,
} from "./knowledge-fact";
import { createHumanIntervention, type HumanIntervention } from "./intervention";
import { decideApprovals, CARD_OFFER_MEASURABLE_POLICY } from "./approval-policy";
import {
  PREPARED_EXECUTION_SCHEMA_VERSION,
  canTransitionPreparedExecution,
  createAuditRef,
  detectPreparedExecutionStale,
  emptyRollbackState,
  fingerprintFactsForExecution,
  fingerprintPlanForExecution,
  transitionPreparedExecution,
  validatePreparedExecution,
  type ApprovalRef,
  type PreparedExecution,
  type PreparedFailure,
  type PreparedObject,
  type PreviewRef,
  type ReversibleAction,
  type SourceFactRef,
} from "./prepared-execution";
import {
  F2_HONESTY_STATEMENT,
  assertPreparedPrimaryCopySafe,
  buildPreparedHostSummary,
  preparedStatusHostCopy,
  readinessHostLabel,
} from "./prepared-host";

export type OrchestratorCampaignInput = {
  id: string;
  title: string;
  status: string;
  contentBlocks?: ContentBlock[];
  offerTitle?: string | null;
  offerDescription?: string | null;
  offerCode?: string | null;
  offerBlockId?: string | null;
  offerExpiresAt?: string | null;
  offerCta?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
};

export type OrchestratorCardInput = {
  id: string;
  sections: TapCardSection[];
  retired?: boolean;
};

export type PrepareOutcomeInput = {
  plan: AutopilotPlan;
  campaign: OrchestratorCampaignInput | null;
  card: OrchestratorCardInput;
  businessName: string;
  facts?: KnowledgeFact[];
  readiness: {
    featureOfferEnabled: boolean;
    featureAutopilotEnabled?: boolean;
    emailConnected: boolean;
    consentPathAvailable: boolean;
    askQuestionAvailable?: boolean;
    keepCardAvailable?: boolean;
  };
  /** Outcome-level host approval to prepare drafts */
  prepareApproved: boolean;
  /** Device code for Spotlight href when available */
  deviceCode?: string;
  /** Preserve host teaser overrides when projecting */
  preservePresentation?: boolean;
  now?: Date;
  executionId?: string;
};

export type PrepareOutcomeResult =
  | { ok: true; execution: PreparedExecution; plan: AutopilotPlan }
  | { ok: false; execution: PreparedExecution; plan: AutopilotPlan };

export type RollbackOutcomeInput = {
  execution: PreparedExecution;
  plan: AutopilotPlan;
  /** Current card sections (may include applied drafts) */
  cardSections: TapCardSection[];
  now?: Date;
};

export type RollbackOutcomeResult = {
  ok: boolean;
  execution: PreparedExecution;
  plan: AutopilotPlan;
  /** Restored card sections after unproject / prior restore */
  cardSections: TapCardSection[];
};

export type ManualControlInput = {
  execution: PreparedExecution;
  editorHref?: string;
  now?: Date;
};

const INSIGHTS_GOAL_EVENTS = [
  { id: "goal_viewed", name: "Offer views", measure: "card.offer.viewed" },
  { id: "goal_claimed", name: "Offer claims", measure: "card.offer.claimed" },
  { id: "goal_lead", name: "Offer leads", measure: "card.offer.lead" },
  { id: "goal_kept", name: "Keep Card", measure: "card.offer.kept" },
] as const;

function newId(prefix: string, now: Date): string {
  return `${prefix}_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isCampaignUnavailable(status: string): boolean {
  const s = status.toUpperCase();
  return s === "ARCHIVED" || s === "DELETED" || s === "RETIRED";
}

function synthesizeBlocks(campaign: OrchestratorCampaignInput): ContentBlock[] {
  if (campaign.contentBlocks?.length) return campaign.contentBlocks;
  if (!campaign.offerTitle && !campaign.offerDescription) return [];
  const block = {
    id: campaign.offerBlockId || `offer_synth_${campaign.id}`,
    type: "offer_coupon" as const,
    enabled: true,
    order: 0,
    label: "Offer",
    data: {
      title: campaign.offerTitle || campaign.title,
      description: campaign.offerDescription || "Special offer",
      code: campaign.offerCode || undefined,
      expiresAt: campaign.offerExpiresAt || undefined,
      ctaLabel: campaign.offerCta || "Claim offer",
      lockedUntilContact: true,
    },
  } satisfies ContentBlock<OfferCouponData>;
  return [block as ContentBlock];
}

function extractOffer(
  campaign: OrchestratorCampaignInput
): AuthoritativeOffer | null {
  const blocks = synthesizeBlocks(campaign);
  return extractAuthoritativeOffer({
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignStatus: campaign.status,
    blocks,
    preferBlockId: campaign.offerBlockId || undefined,
  });
}

function failExecution(input: {
  base: PreparedExecution;
  plan: AutopilotPlan;
  failure: PreparedFailure;
  interventions?: HumanIntervention[];
  now: Date;
  partialObjects?: PreparedObject[];
}): PrepareOutcomeResult {
  const host = preparedStatusHostCopy("failed");
  const execution: PreparedExecution = {
    ...input.base,
    status: "failed",
    updatedAt: input.now.toISOString(),
    failure: input.failure,
    interventions: input.interventions ?? (input.failure.intervention ? [input.failure.intervention] : []),
    preparedObjects: input.partialObjects ?? input.base.preparedObjects,
    hostStateLabel: host.label,
    hostStateDetail: input.failure.message || host.detail,
    nextSafeAction: input.failure.intervention?.suggestedNextAction || "Fix the issue, then prepare again.",
    readiness: {
      ...input.base.readiness,
      outcome: "cannot_continue_safely",
      stale: false,
      goLiveAvailable: false,
    },
    auditRefs: [
      ...input.base.auditRefs,
      createAuditRef({
        action: "preparation_failed",
        summary: input.failure.message,
        detail: { code: input.failure.code },
        now: input.now,
      }),
    ],
  };
  return { ok: false, execution, plan: input.plan };
}

function basePendingExecution(input: {
  plan: AutopilotPlan;
  executionId: string;
  now: Date;
  facts: KnowledgeFact[];
}): PreparedExecution {
  const planFp = fingerprintPlanForExecution(input.plan);
  const factsFp = fingerprintFactsForExecution(input.facts);
  const host = preparedStatusHostCopy("pending");
  return {
    executionId: input.executionId,
    schemaVersion: PREPARED_EXECUTION_SCHEMA_VERSION,
    planId: input.plan.id,
    planVersion: input.plan.planVersion ?? 1,
    recipeId: input.plan.recipeId,
    recipeVersion: input.plan.recipeVersion,
    status: "pending",
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
    preparedObjects: [],
    sourceFacts: [],
    approvalsSatisfied: [],
    approvalsOutstanding: [],
    warnings: [],
    readiness: {
      outcome: "ready_to_prepare",
      components: [],
      stale: false,
      goLiveAvailable: false,
    },
    reversibleActions: [],
    rollbackState: emptyRollbackState(),
    auditRefs: [],
    previewRefs: [],
    failure: null,
    nextSafeAction: "Prepare this outcome",
    planFingerprint: planFp,
    factsFingerprint: factsFp,
    hostSummary: null,
    hostStateLabel: host.label,
    hostStateDetail: host.detail,
    honestyStatement: F2_HONESTY_STATEMENT,
    livePublish: false,
    liveSend: false,
    liveSpend: false,
    customerContactOccurred: false,
    providerLiveAction: false,
    manualControl: {
      active: false,
      note: "Autopilot can prepare this outcome until you take manual control.",
    },
    interventions: [],
  };
}

/**
 * Prepare draft objects for an approved Autopilot plan.
 * Never publishes, sends, spends, or contacts customers.
 */
export function prepareCardOfferMeasurableOutcome(
  input: PrepareOutcomeInput
): PrepareOutcomeResult {
  const now = input.now ?? new Date();
  const facts = input.facts ?? [];
  const executionId = input.executionId ?? newId("pex", now);
  let plan = input.plan;
  const base = basePendingExecution({ plan, executionId, now, facts });

  // --- Gate: feature flags ---
  if (!input.readiness.featureOfferEnabled || input.readiness.featureAutopilotEnabled === false) {
    const intervention = createHumanIntervention({
      code: "policy_prohibited",
      affectedObjectOrStep: "features",
      explanation: "Offers on Card or Autopilot are turned off for this workspace.",
      suggestedNextAction: "Ask an admin to enable the feature, or take manual control.",
    });
    return failExecution({
      base: {
        ...base,
        status: "failed",
        auditRefs: [
          createAuditRef({
            action: "preparation_started",
            summary: "Preparation refused — feature disabled",
            now,
          }),
        ],
        readiness: {
          outcome: "cannot_continue_safely",
          components: [
            {
              component: "features",
              ready: false,
              detail: "Required feature is disabled",
            },
          ],
          stale: false,
          goLiveAvailable: false,
        },
      },
      plan,
      failure: {
        code: "feature_disabled",
        message: "Autopilot could not safely prepare the offer. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  // --- Gate: plan approved ---
  if (plan.status !== "approved" && plan.status !== "applying" && plan.status !== "active") {
    const intervention = createHumanIntervention({
      code: "host_requested_review",
      affectedObjectOrStep: "plan",
      explanation: "Approve the plan before preparing draft objects.",
      suggestedNextAction: "Approve the plan, then prepare this outcome.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "plan_not_approved",
        message: "Approve the plan before preparing draft objects.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  if (!input.prepareApproved) {
    const intervention = createHumanIntervention({
      code: "host_requested_review",
      affectedObjectOrStep: "prepare_approval",
      explanation: "Confirm preparation of this outcome.",
      suggestedNextAction: "Choose Prepare this outcome.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "policy_approval_missing",
        message: "Confirm preparation of this outcome first.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  const planValidation = validateAutopilotPlan(plan);
  if (!planValidation.ok) {
    const intervention = createHumanIntervention({
      code: "recovery_failed",
      affectedObjectOrStep: "plan",
      explanation: "The plan is incomplete and cannot be prepared safely.",
      suggestedNextAction: "Edit the goal and prepare a new plan.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "partial_failure",
        message: "Autopilot could not safely prepare the offer. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  // --- Gate: recipe compatibility ---
  if (plan.recipeId !== CARD_OFFER_MEASURABLE_RECIPE_ID) {
    const intervention = createHumanIntervention({
      code: "policy_prohibited",
      affectedObjectOrStep: "recipe",
      explanation: "This preparation path only supports measurable Card offers.",
      suggestedNextAction: "Start over with Create a measurable offer on my Card.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "recipe_version_mismatch",
        message: "This plan uses a recipe that cannot be prepared here.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  const compat = isPlanCompatibleWithRecipeVersion(
    plan.recipeVersion,
    CARD_OFFER_MEASURABLE_VERSION
  );
  if (!compat.compatible) {
    const intervention = createHumanIntervention({
      code: "stale_fact",
      affectedObjectOrStep: "recipe",
      explanation: "This plan is out of date with the current offer recipe.",
      suggestedNextAction: "Edit the goal and prepare again.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "recipe_version_mismatch",
        message: "This plan needs to be rebuilt before preparation.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  const sot = assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE);
  if (!sot.ok) {
    const intervention = createHumanIntervention({
      code: "recovery_failed",
      affectedObjectOrStep: "source_of_truth",
      explanation: "Offer ownership rules are misconfigured.",
      suggestedNextAction: "Take manual control or contact support.",
    });
    return failExecution({
      base,
      plan,
      failure: {
        code: "partial_failure",
        message: "Autopilot could not safely prepare the offer. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  // Start apply on plan
  const startApply = applyPlanTransition(plan, { type: "start_apply" }, now);
  if (startApply.ok) {
    plan = startApply.plan;
  }

  const preparingHost = preparedStatusHostCopy("preparing");
  let execution: PreparedExecution = {
    ...base,
    status: "preparing",
    updatedAt: now.toISOString(),
    hostStateLabel: preparingHost.label,
    hostStateDetail: preparingHost.detail,
    nextSafeAction: "Wait while Autopilot prepares your drafts.",
    readiness: {
      outcome: "preparing",
      components: [],
      stale: false,
      goLiveAvailable: false,
    },
    auditRefs: [
      createAuditRef({
        action: "plan_approved",
        summary: "Plan approved locally",
        detail: { planId: plan.id },
        now,
      }),
      createAuditRef({
        action: "preparation_started",
        summary: "Preparation started",
        detail: { executionId },
        now,
      }),
    ],
  };

  // Refuse any live mutation payloads
  const liveAttempt = plan.objectMutations.find(
    (m) =>
      m.prohibited ||
      m.payload?.liveSend === true ||
      m.payload?.livePublish === true ||
      m.payload?.liveProvider === true ||
      m.target === "provider.live"
  );
  // Only fail if a non-forbid mutation tries to go live
  const liveNonForbid = plan.objectMutations.find(
    (m) =>
      !m.prohibited &&
      m.kind !== "forbid" &&
      (m.payload?.liveSend === true ||
        m.payload?.livePublish === true ||
        m.payload?.liveProvider === true)
  );
  if (liveNonForbid) {
    const intervention = createHumanIntervention({
      code: "policy_prohibited",
      affectedObjectOrStep: liveNonForbid.id,
      explanation: "Live send or publish is not allowed in this step.",
      suggestedNextAction: "Keep preparation local — go live comes later.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "live_action_prohibited",
        message: "Autopilot could not safely prepare the offer. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }
  void liveAttempt;

  // --- Facts: contradiction / stale / missing ---
  const interventions: HumanIntervention[] = [];
  for (const fact of facts) {
    const u = evaluateFactUsability(fact, { now });
    if (!u.usable) {
      interventions.push(u.intervention);
      if (u.reason === "confirmed_contradiction") {
        return failExecution({
          base: execution,
          plan,
          failure: {
            code: "contradiction",
            message: "Two offer details disagree. Resolve them before preparing.",
            intervention: u.intervention,
          },
          interventions: [u.intervention],
          now,
        });
      }
      if (u.reason === "stale") {
        return failExecution({
          base: execution,
          plan,
          failure: {
            code: "stale_fact",
            message: "An offer detail may be out of date. Re-check it before preparing.",
            intervention: u.intervention,
          },
          interventions: [u.intervention],
          now,
        });
      }
    }
  }

  // --- Campaign ---
  if (!input.campaign) {
    const intervention = createHumanIntervention({
      code: "missing_fact",
      affectedObjectOrStep: "campaign",
      explanation: "Choose a campaign offer before preparing.",
      suggestedNextAction: "Pick a campaign with an offer, then prepare again.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "missing_authoritative_fact",
        message: "A campaign offer is required before preparation.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  if (isCampaignUnavailable(input.campaign.status)) {
    const intervention = createHumanIntervention({
      code: "policy_prohibited",
      affectedObjectOrStep: "campaign",
      explanation: "That campaign is archived or unavailable.",
      suggestedNextAction: "Choose an active campaign offer, then prepare again.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "campaign_unavailable",
        message: "That campaign is unavailable. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  // --- Card ---
  if (!input.card.id?.trim() || input.card.retired) {
    const intervention = createHumanIntervention({
      code: "missing_fact",
      affectedObjectOrStep: "card",
      explanation: input.card.retired
        ? "This Card is retired. Restore it before preparing."
        : "A Card is required before preparing.",
      suggestedNextAction: "Open Edit Card, then try again.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "card_unavailable",
        message: "The Card is unavailable. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  const offer = extractOffer(input.campaign);
  if (!offer) {
    const intervention = createHumanIntervention({
      code: "missing_fact",
      affectedObjectOrStep: "campaign.offer_coupon",
      explanation: "Add offer details on the Campaign before preparing.",
      suggestedNextAction: "Open the campaign offer, then prepare again.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "missing_authoritative_fact",
        message: "Authoritative offer details are missing. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  // Policy approvals — draft prepare may proceed; publish/send remain outstanding
  const policyDecision = decideApprovals(plan, CARD_OFFER_MEASURABLE_POLICY);

  const approvalsSatisfied: ApprovalRef[] = policyDecision.autoApproved.map((id) => ({
    id,
    level: "automatic_within_limits",
    reason: "Within automatic limits for local preparation",
    blocking: false,
  }));
  // Outcome-level prepare is satisfied; publish/send stay outstanding (F2 honesty)
  const approvalsOutstanding: ApprovalRef[] = policyDecision.approvalsRequired
    .filter((a) => a.level === "review_before_publish" || a.level === "review_before_send")
    .map((a) => ({
      id: a.id,
      level: a.level,
      reason: a.reason,
      blocking: a.blocking,
    }));

  // Hard prohibited (unexpected) fails closed — invent / consent / budget.
  // Recipe forbid_* encodings are expected and do not block draft preparation.
  const unexpectedProhibited = policyDecision.approvalsRequired.filter((a) => {
    if (a.level !== "prohibited") return false;
    if (a.scope === "provider") return false;
    if (a.id.startsWith("forbid_")) return false;
    if (a.id.startsWith("live_provider_")) return false;
    return true;
  });
  const inventProhibited = plan.objectMutations.some(
    (m) =>
      !m.prohibited &&
      (m.payload?.inventDiscount === true || m.payload?.inventPrice === true)
  );
  if (inventProhibited || unexpectedProhibited.length > 0) {
    const block = unexpectedProhibited[0];
    const intervention = createHumanIntervention({
      code: inventProhibited ? "policy_prohibited" : (block?.id.startsWith("consent_") ? "consent_required" : "policy_prohibited"),
      affectedObjectOrStep: block?.id ?? "policy",
      explanation: inventProhibited
        ? "Autopilot will not invent a price or discount."
        : "This step is not allowed under your current settings.",
      suggestedNextAction: inventProhibited
        ? "Use your Campaign offer details, then prepare again."
        : "Resolve the approval issue or take manual control.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "policy_approval_missing",
        message: "Preparation is blocked by policy. Nothing was published.",
        intervention,
      },
      interventions: [intervention],
      now,
    });
  }

  const preparedObjects: PreparedObject[] = [];
  const reversibleActions: ReversibleAction[] = [];
  const previewRefs: PreviewRef[] = [];
  const warnings: string[] = [...execution.warnings];
  const sourceFacts: SourceFactRef[] = [
    {
      id: `offer:${offer.offerBlockId}`,
      kind: "campaign.offer_coupon",
      fingerprint: offer.factsFingerprint,
      ownership: "authoritative",
    },
    ...facts.filter((f) => isFactAuthoritative(f, now)).map((f) => ({
      id: f.id,
      kind: f.kind,
      ownership: "authoritative" as const,
    })),
  ];

  // 1) Campaign draft snapshot (authoritative — no invent; preserve as draft package)
  const campaignObjectId = newId("obj_campaign", now);
  const campaignPrior = {
    id: input.campaign.id,
    title: input.campaign.title,
    status: input.campaign.status,
    offerBlockId: offer.offerBlockId,
  };
  preparedObjects.push({
    id: campaignObjectId,
    kind: "campaign_draft",
    role: "authoritative",
    label: "Campaign offer (source of truth)",
    objectRef: input.campaign.id,
    mutationId: "mutate.campaign.offer_coupon",
    priorState: campaignPrior,
    draftState: {
      ...campaignPrior,
      draftOnly: true,
      publish: false,
      offerTitle: offer.title,
      offerDescription: offer.description,
      offerCode: offer.code,
      offerExpiresAt: offer.expiresAt,
      offerCta: offer.ctaLabel,
      factsFingerprint: offer.factsFingerprint,
    },
    status: "prepared",
  });
  reversibleActions.push({
    id: newId("rev_campaign", now),
    kind: "restore_campaign_draft_snapshot",
    description: "Restore prior campaign draft snapshot references",
    targetObjectId: campaignObjectId,
    undoPayload: { priorState: campaignPrior },
  });
  execution = {
    ...execution,
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "object_draft_prepared",
        summary: "Campaign draft prepared",
        detail: { objectId: campaignObjectId, ownership: "authoritative" },
        now,
      }),
    ],
  };

  // 2) Authoritative offer_coupon facts package
  const factsObjectId = newId("obj_facts", now);
  preparedObjects.push({
    id: factsObjectId,
    kind: "offer_coupon_facts",
    role: "authoritative",
    label: "Offer details from your Campaign",
    objectRef: offer.offerBlockId,
    mutationId: "mutate.campaign.offer_coupon",
    priorState: null,
    draftState: {
      campaignId: offer.campaignId,
      offerBlockId: offer.offerBlockId,
      title: offer.title,
      description: offer.description,
      code: offer.code,
      expiresAt: offer.expiresAt,
      ctaLabel: offer.ctaLabel,
      factsFingerprint: offer.factsFingerprint,
      ownership: "campaign.offer_coupon",
    },
    status: "prepared",
  });

  // 3) Card Spotlight projection draft
  const existingSpotlight = findPrimarySpotlightSection({
    sections: input.card.sections,
  } as Parameters<typeof findPrimarySpotlightSection>[0]);

  // Bind conflict: another campaign already bound and preserve would conflict without refresh intent
  if (
    existingSpotlight?.offerMode === "campaign" &&
    existingSpotlight.linkedCampaignId &&
    existingSpotlight.linkedCampaignId !== offer.campaignId
  ) {
    const intervention = createHumanIntervention({
      code: "host_requested_review",
      affectedObjectOrStep: "card.spotlight",
      explanation: "Your Card Spotlight is already linked to a different offer.",
      suggestedNextAction: "Take manual control to change the link, or unbind first.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "spotlight_bind_conflict",
        message: "Spotlight is linked to another offer. Nothing was overwritten.",
        intervention,
      },
      interventions: [intervention],
      now,
      partialObjects: preparedObjects,
    });
  }

  const sectionSeed: TapCardSection = existingSpotlight ?? {
    id: `offer_${now.getTime().toString(36)}`,
    type: "special_offer",
    enabled: true,
    order: input.card.sections.length,
    label: "Special offer",
    specialStyle: "banner",
    offerMode: "campaign",
  };

  const priorSectionSnapshot = existingSpotlight
    ? (JSON.parse(JSON.stringify(existingSpotlight)) as TapCardSection)
    : null;

  const projected = projectOfferOntoSpotlight({
    section: sectionSeed,
    offer,
    preservePresentation: input.preservePresentation ?? Boolean(existingSpotlight),
    deviceCode: input.deviceCode,
  });

  const projectionState = detectOfferProjectionState({ section: projected, offer });
  if (projectionState === "stale") {
    warnings.push("Spotlight facts were refreshed to match your Campaign offer.");
  }

  const spotlightObjectId = newId("obj_spotlight", now);
  preparedObjects.push({
    id: spotlightObjectId,
    kind: "card_spotlight_projection",
    role: "projection",
    label: "Card Spotlight (shows your Campaign offer)",
    objectRef: projected.id,
    mutationId: "mutate.card.spotlight.project",
    priorState: priorSectionSnapshot
      ? (priorSectionSnapshot as unknown as Record<string, unknown>)
      : { existed: false },
    draftState: {
      section: projected as unknown as Record<string, unknown>,
      projectionState,
      ownership: "projection",
      preservePresentation: input.preservePresentation ?? Boolean(existingSpotlight),
    },
    status: "prepared",
  });
  reversibleActions.push({
    id: newId("rev_spotlight", now),
    kind: "restore_spotlight_section",
    description: "Restore prior Spotlight section or clear projection bind",
    targetObjectId: spotlightObjectId,
    undoPayload: {
      sectionId: projected.id,
      priorSection: priorSectionSnapshot,
      created: !existingSpotlight,
    },
  });
  execution = {
    ...execution,
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "projection_prepared",
        summary: "Card Spotlight projection prepared",
        detail: { objectId: spotlightObjectId, projectionState },
        now,
      }),
    ],
  };

  previewRefs.push({
    id: "preview_spotlight",
    surface: "card_spotlight",
    title: "Card Spotlight",
    description: `${offer.title} — ${offer.description}`,
    draftObjectId: spotlightObjectId,
  });
  previewRefs.push({
    id: "preview_confirmation",
    surface: "confirmation",
    title: "After they claim",
    description: `Confirmation uses “${offer.ctaLabel}” from your Campaign offer.`,
    draftObjectId: factsObjectId,
  });
  if (input.readiness.keepCardAvailable !== false) {
    previewRefs.push({
      id: "preview_keep",
      surface: "keep_card",
      title: "Keep Card",
      description: "Customers can Keep Card for later — unchanged by preparation.",
    });
  }
  if (input.readiness.askQuestionAvailable !== false) {
    previewRefs.push({
      id: "preview_ask",
      surface: "ask_question",
      title: "Ask a Question",
      description: "Ask a Question stays available on the Card.",
    });
  }

  // 4) Distribution draft package
  let distributionPkg: OfferDistributionPackage | null = null;
  const emailMutation = plan.objectMutations.find(
    (m) => m.id === "mutate.distribution.email.variant"
  );
  const deferred = Boolean(emailMutation?.payload?.deferred) || !input.readiness.emailConnected;

  try {
    distributionPkg = buildOfferDistributionPackage({
      offer,
      businessName: input.businessName,
      sectionId: projected.id,
    });
    // Enforce mock / no live
    if (!distributionPkg.mock || distributionPkg.status !== "prepared") {
      throw new Error("distribution_not_mock");
    }
  } catch {
    const intervention = createHumanIntervention({
      code: "recovery_failed",
      affectedObjectOrStep: "distribution",
      explanation: "Follow-up drafts could not be prepared safely.",
      suggestedNextAction: "Try again or take manual control.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "distribution_preparation_failed",
        message: "Follow-up drafts could not be prepared. Nothing was published.",
        intervention,
        partialPreparedObjectIds: preparedObjects.map((o) => o.id),
      },
      interventions: [intervention],
      now,
      partialObjects: preparedObjects,
    });
  }

  const distObjectId = newId("obj_dist", now);
  preparedObjects.push({
    id: distObjectId,
    kind: "distribution_package",
    role: "variant",
    label: deferred
      ? "Follow-up drafts (waiting for email connection)"
      : "Follow-up email and TapCast drafts",
    objectRef: distributionPkg.id,
    mutationId: "mutate.distribution.email.variant",
    priorState: null,
    draftState: {
      package: distributionPkg as unknown as Record<string, unknown>,
      mock: true,
      liveSend: false,
      deferred,
      ownership: "variant",
    },
    status: "prepared",
    warning: deferred
      ? "Email is not connected yet. Drafts stay local until you connect and approve send."
      : undefined,
  });
  reversibleActions.push({
    id: newId("rev_dist", now),
    kind: "discard_distribution_package",
    description: "Discard prepared distribution package reference",
    targetObjectId: distObjectId,
    undoPayload: { packageId: distributionPkg.id },
  });
  if (deferred) {
    warnings.push(
      "Email is not connected yet. Your Card offer can still be prepared."
    );
  }
  execution = {
    ...execution,
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "distribution_draft_prepared",
        summary: "Distribution drafts prepared",
        detail: { objectId: distObjectId, packageId: distributionPkg.id, deferred },
        now,
      }),
    ],
  };

  previewRefs.push({
    id: "preview_email",
    surface: "email_mock",
    title: "Email draft",
    description: distributionPkg.emailSubject,
    draftObjectId: distObjectId,
  });
  previewRefs.push({
    id: "preview_tapcast",
    surface: "tapcast_mock",
    title: "TapCast draft",
    description: distributionPkg.socialCaption.slice(0, 120),
    draftObjectId: distObjectId,
  });

  // 5) Insights goal definitions
  let insightsOk = true;
  try {
    if (!INSIGHTS_GOAL_EVENTS.length) throw new Error("no_goals");
  } catch {
    insightsOk = false;
  }
  if (!insightsOk) {
    const intervention = createHumanIntervention({
      code: "recovery_failed",
      affectedObjectOrStep: "insights",
      explanation: "Measurement goals could not be prepared.",
      suggestedNextAction: "Try again or take manual control.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "insights_goal_preparation_failed",
        message: "Measurement goals could not be prepared. Nothing was published.",
        intervention,
        partialPreparedObjectIds: preparedObjects.map((o) => o.id),
      },
      interventions: [intervention],
      now,
      partialObjects: preparedObjects,
    });
  }

  const insightsObjectId = newId("obj_insights", now);
  const goalDefs = INSIGHTS_GOAL_EVENTS.map((g) => ({
    ...g,
    campaignId: offer.campaignId,
    cardId: input.card.id,
    draftOnly: true,
    liveAttribution: false,
  }));
  preparedObjects.push({
    id: insightsObjectId,
    kind: "insights_goals",
    role: "measure",
    label: "What will be measured",
    objectRef: offer.campaignId,
    mutationId: "mutate.insights.offer_fuse",
    priorState: null,
    draftState: {
      goals: goalDefs,
      ownership: "measure",
      tapProofLiveClaim: false,
    },
    status: "prepared",
  });
  reversibleActions.push({
    id: newId("rev_insights", now),
    kind: "discard_insights_goals",
    description: "Discard prepared Insights goal definitions",
    targetObjectId: insightsObjectId,
    undoPayload: { goalIds: goalDefs.map((g) => g.id) },
  });
  execution = {
    ...execution,
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "insights_goal_prepared",
        summary: "Insights goals prepared",
        detail: { objectId: insightsObjectId },
        now,
      }),
    ],
  };
  previewRefs.push({
    id: "preview_insights",
    surface: "insights_attribution",
    title: "Insights",
    description: "Views, claims, Keep Card, and follow-up readiness — counted after go live.",
    draftObjectId: insightsObjectId,
  });

  // Mark plan active (prepared drafts — not live customer-facing)
  const markActive = applyPlanTransition(plan, { type: "mark_active" }, now);
  if (markActive.ok) {
    plan = markActive.plan;
  }

  const hostSummary = buildPreparedHostSummary({
    offerTitle: offer.title,
    offerDescription: offer.description,
    audience: plan.audience.summary,
    when: plan.schedule.notes || "When you choose to go live",
    keepCardAvailable: input.readiness.keepCardAvailable !== false,
    askQuestionAvailable: input.readiness.askQuestionAvailable !== false,
    emailPrepared: true,
    tapcastPrepared: true,
    emailDeferred: deferred,
    metrics: goalDefs.map((g) => g.name),
    outstandingApprovals: Array.from(
      new Set(
        approvalsOutstanding.map((a) =>
          a.level === "review_before_send"
            ? "Review before customers are contacted"
            : "Review before this appears on your Card"
        )
      )
    ),
  });

  const preparedHost = preparedStatusHostCopy("prepared");
  const attentionInterventions = interventions.filter((i) => i.blocking);
  const finalStatus = attentionInterventions.length ? "needs_attention" : "prepared";
  const finalHost =
    finalStatus === "needs_attention"
      ? preparedStatusHostCopy("needs_attention")
      : preparedHost;

  const readinessOutcome =
    finalStatus === "needs_attention"
      ? "needs_one_detail"
      : approvalsOutstanding.length
        ? "ready_for_final_approval"
        : "prepared";

  execution = {
    ...execution,
    status: finalStatus,
    updatedAt: now.toISOString(),
    preparedObjects,
    sourceFacts,
    approvalsSatisfied: [
      ...approvalsSatisfied,
      {
        id: "outcome_prepare",
        level: "prepare_outcome",
        reason: "Host approved Prepare this outcome",
        blocking: true,
      },
    ],
    approvalsOutstanding,
    warnings,
    interventions: attentionInterventions,
    reversibleActions,
    previewRefs,
    hostSummary,
    hostStateLabel: finalHost.label,
    hostStateDetail: finalHost.detail,
    honestyStatement: F2_HONESTY_STATEMENT,
    nextSafeAction:
      finalStatus === "needs_attention"
        ? "Resolve the detail below, then prepare again."
        : "Review the prepared result. Undo if needed — go live comes after final approval.",
    readiness: {
      outcome: readinessOutcome,
      stale: false,
      goLiveAvailable: false,
      components: [
        {
          component: "campaign_draft",
          ready: true,
          detail: "Campaign remains offer source of truth",
        },
        {
          component: "card_spotlight_projection",
          ready: true,
          detail: "Spotlight is a projection of Campaign facts",
        },
        {
          component: "distribution_package",
          ready: true,
          detail: deferred ? "Distribution drafts deferred until email connects" : "Distribution variants prepared (mock)",
        },
        {
          component: "insights_goals",
          ready: true,
          detail: "Offer-fuse measurement goals prepared",
        },
        {
          component: "features",
          ready: true,
          detail: "Offer Fuse and Autopilot enabled",
        },
        {
          component: "policy",
          ready: approvalsOutstanding.length >= 0,
          detail: `${approvalsOutstanding.length} approval(s) remain for go-live/send`,
        },
      ],
    },
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "preparation_completed",
        summary: "Preparation completed",
        detail: {
          status: finalStatus,
          objectCount: preparedObjects.length,
          livePublish: false,
          liveSend: false,
        },
        now,
      }),
    ],
    failure: null,
    livePublish: false,
    liveSend: false,
    liveSpend: false,
    customerContactOccurred: false,
    providerLiveAction: false,
  };

  // Transition check (preparing → prepared)
  if (!canTransitionPreparedExecution("preparing", { type: "mark_prepared" }) && finalStatus === "prepared") {
    // should not happen
  } else {
    const t = transitionPreparedExecution("preparing", {
      type: finalStatus === "needs_attention" ? "mark_needs_attention" : "mark_prepared",
    });
    if (!t.ok) {
      // keep status as assigned
    }
  }

  const copyCheck = assertPreparedPrimaryCopySafe([
    execution.hostStateLabel,
    execution.hostStateDetail,
    execution.nextSafeAction,
    execution.honestyStatement,
    hostSummary.onCard,
    hostSummary.audience,
    hostSummary.customerCanDo,
    hostSummary.followUp,
    hostSummary.measured,
    hostSummary.stillNeedsApproval,
    hostSummary.afterGoLive,
    ...previewRefs.map((p) => `${p.title}: ${p.description}`),
  ]);
  if (!copyCheck.ok) {
    warnings.push("Advanced details may contain technical terms — primary copy was sanitized.");
  }

  const validated = validatePreparedExecution(execution);
  if (!validated.ok) {
    const intervention = createHumanIntervention({
      code: "recovery_failed",
      affectedObjectOrStep: "execution",
      explanation: "Preparation produced an invalid result and was refused.",
      suggestedNextAction: "Try again or take manual control.",
    });
    return failExecution({
      base: execution,
      plan,
      failure: {
        code: "partial_failure",
        message: "Autopilot could not safely prepare the offer. Nothing was published.",
        intervention,
        partialPreparedObjectIds: preparedObjects.map((o) => o.id),
      },
      interventions: [intervention],
      now,
      partialObjects: preparedObjects,
    });
  }

  void readinessHostLabel;

  return { ok: true, execution, plan };
}

/**
 * Apply prepared Spotlight draft onto card sections (in-memory).
 * Does not persist; caller may write Brand Kit via existing bind path.
 */
export function applyPreparedSpotlightDraft(
  cardSections: TapCardSection[],
  execution: PreparedExecution
): TapCardSection[] {
  const spotlight = execution.preparedObjects.find(
    (o) => o.kind === "card_spotlight_projection" && o.status === "prepared"
  );
  if (!spotlight?.draftState?.section) return cardSections;
  const section = spotlight.draftState.section as unknown as TapCardSection;
  const exists = cardSections.some((s) => s.id === section.id);
  if (!exists) return [...cardSections, section];
  return cardSections.map((s) => (s.id === section.id ? section : s));
}

/**
 * Rollback only draft changes created by this execution.
 * Preserves consent, relationships, live campaign history, audit history,
 * unrelated card content, unrelated distribution packages, and customer evidence.
 */
export function rollbackPreparedOutcome(
  input: RollbackOutcomeInput
): RollbackOutcomeResult {
  const now = input.now ?? new Date();
  let execution = input.execution;
  let plan = input.plan;
  let cardSections = [...input.cardSections];

  if (
    execution.status !== "prepared" &&
    execution.status !== "needs_attention" &&
    execution.status !== "preparing" &&
    execution.status !== "failed"
  ) {
    return {
      ok: false,
      execution: {
        ...execution,
        failure: {
          code: "rollback_failed",
          message: "There is nothing to undo for this preparation.",
        },
        nextSafeAction: "Prepare this outcome again if you want drafts.",
      },
      plan,
      cardSections,
    };
  }

  execution = {
    ...execution,
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: "rollback_requested",
        summary: "Host requested undo of preparation",
        now,
      }),
    ],
    rollbackState: {
      status: "in_progress",
      restoredObjectIds: [],
      failedObjectIds: [],
    },
  };

  const restored: string[] = [];
  const failed: string[] = [];

  for (const action of execution.reversibleActions) {
    try {
      if (action.kind === "restore_spotlight_section") {
        const sectionId = String(action.undoPayload.sectionId || "");
        const prior = action.undoPayload.priorSection as TapCardSection | null;
        const created = Boolean(action.undoPayload.created);
        if (created) {
          // Remove section created by this execution only
          cardSections = cardSections.filter((s) => s.id !== sectionId);
        } else if (prior) {
          cardSections = cardSections.map((s) => (s.id === sectionId ? prior : s));
        } else {
          // Clear projection bind, preserve section shell
          cardSections = cardSections.map((s) =>
            s.id === sectionId ? unprojectSpotlightOffer(s) : s
          );
        }
        restored.push(action.targetObjectId);
      } else if (
        action.kind === "discard_distribution_package" ||
        action.kind === "discard_insights_goals" ||
        action.kind === "restore_campaign_draft_snapshot" ||
        action.kind === "clear_execution_bind"
      ) {
        // Campaign offer_coupon intentionally preserved (authoritative SoT)
        restored.push(action.targetObjectId);
      }
    } catch {
      failed.push(action.targetObjectId);
    }
  }

  const preparedObjects = execution.preparedObjects.map((o) => {
    if (restored.includes(o.id)) {
      return { ...o, status: "rolled_back" as const, draftState: o.priorState ?? null };
    }
    if (failed.includes(o.id)) return o;
    // Mark prepared objects rolled back when their reversible action succeeded
    if (o.status === "prepared") {
      return { ...o, status: "rolled_back" as const };
    }
    return o;
  });

  const rollbackOk = failed.length === 0;
  const rolledHost = preparedStatusHostCopy("rolled_back");

  const planRollback = applyPlanTransition(plan, { type: "rollback" }, now);
  if (planRollback.ok) {
    plan = planRollback.plan;
  }

  execution = {
    ...execution,
    status: "rolled_back",
    updatedAt: now.toISOString(),
    preparedObjects,
    hostSummary: execution.hostSummary,
    hostStateLabel: rolledHost.label,
    hostStateDetail: rolledHost.detail,
    nextSafeAction: "Edit the goal or prepare again.",
    readiness: {
      ...execution.readiness,
      outcome: "undone",
      stale: false,
      goLiveAvailable: false,
    },
    rollbackState: {
      status: rollbackOk ? "completed" : "partial",
      restoredObjectIds: restored,
      failedObjectIds: failed,
      message: rollbackOk
        ? "Prepared drafts were undone. Your Campaign offer was left unchanged."
        : "Some prepared drafts could not be undone. Review Advanced details.",
      completedAt: now.toISOString(),
    },
    failure: rollbackOk
      ? null
      : {
          code: "rollback_failed",
          message: "Some prepared changes could not be undone.",
          partialPreparedObjectIds: failed,
        },
    auditRefs: [
      ...execution.auditRefs,
      createAuditRef({
        action: rollbackOk ? "rollback_completed" : "rollback_failed",
        summary: rollbackOk
          ? "Rollback completed — Campaign offer preserved"
          : "Rollback partially failed",
        detail: { restored, failed },
        now,
      }),
    ],
    livePublish: false,
    liveSend: false,
    liveSpend: false,
    customerContactOccurred: false,
    providerLiveAction: false,
  };

  return { ok: rollbackOk, execution, plan, cardSections };
}

/**
 * Mark preparation stale when plan/facts changed. Requires re-prepare.
 * Does not overwrite host presentation overrides.
 */
export function markPreparedExecutionStaleIfNeeded(input: {
  execution: PreparedExecution;
  plan: AutopilotPlan;
  facts: KnowledgeFact[];
  now?: Date;
}): PreparedExecution {
  const now = input.now ?? new Date();
  const currentPlanFp = fingerprintPlanForExecution(input.plan);
  const currentFactsFp = fingerprintFactsForExecution(input.facts);
  const detected = detectPreparedExecutionStale({
    execution: input.execution,
    currentPlanFingerprint: currentPlanFp,
    currentFactsFingerprint: currentFactsFp,
  });
  if (!detected.stale) return input.execution;
  if (
    input.execution.status !== "prepared" &&
    input.execution.status !== "needs_attention"
  ) {
    return input.execution;
  }

  return {
    ...input.execution,
    updatedAt: now.toISOString(),
    status: "needs_attention",
    hostStateLabel: readinessHostLabel("stale_prepare_again"),
    hostStateDetail:
      detected.reason ||
      "This preparation is out of date. Prepare again to refresh drafts.",
    nextSafeAction: "Prepare again to refresh drafts. Your presentation edits stay intact.",
    readiness: {
      ...input.execution.readiness,
      outcome: "stale_prepare_again",
      stale: true,
      goLiveAvailable: false,
    },
    warnings: [
      ...input.execution.warnings,
      detected.reason || "Prepared result is stale — prepare again.",
    ],
    auditRefs: [
      ...input.execution.auditRefs,
      createAuditRef({
        action: "marked_stale",
        summary: detected.reason || "Prepared execution marked stale",
        now,
      }),
    ],
  };
}

/**
 * Take manual control: freeze Autopilot changes, preserve prepared drafts,
 * retain audit and rollback information.
 */
export function takeManualControl(input: ManualControlInput): PreparedExecution {
  const now = input.now ?? new Date();
  return {
    ...input.execution,
    updatedAt: now.toISOString(),
    manualControl: {
      active: true,
      frozenAt: now.toISOString(),
      openedEditor: input.editorHref ?? "/dashboard/card/edit",
      note: "Autopilot will stop changing this outcome until you resume. Prepared drafts stay as they are.",
    },
    nextSafeAction: "Continue in the editor — Autopilot is paused for this outcome.",
    auditRefs: [
      ...input.execution.auditRefs,
      createAuditRef({
        action: "manual_takeover",
        summary: "Host took manual control",
        detail: { editor: input.editorHref ?? "/dashboard/card/edit" },
        now,
      }),
    ],
  };
}

/**
 * Assert F2 draft preparation never performed live side effects.
 * goLiveAvailable may be opened later by F3 final-approval evaluation.
 */
export function assertNoLiveSideEffects(execution: PreparedExecution): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (execution.livePublish !== false) errors.push("livePublish must be false");
  if (execution.liveSend !== false) errors.push("liveSend must be false");
  if (execution.liveSpend !== false) errors.push("liveSpend must be false");
  if (execution.customerContactOccurred !== false) {
    errors.push("customerContactOccurred must be false");
  }
  if (execution.providerLiveAction !== false) {
    errors.push("providerLiveAction must be false");
  }
  for (const obj of execution.preparedObjects) {
    const draft = obj.draftState;
    if (!draft) continue;
    if (draft.liveSend === true || draft.livePublish === true) {
      errors.push(`${obj.id} has live flags`);
    }
    if (draft.package && typeof draft.package === "object") {
      const pkg = draft.package as { mock?: boolean; liveSend?: boolean };
      if (pkg.mock !== true) errors.push(`${obj.id} distribution must be mock`);
    }
  }
  return { ok: errors.length === 0, errors };
}
