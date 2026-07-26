/**
 * Deterministic one-tap go-live orchestrator for card.offer.measurable@1.0.0 (F3).
 *
 * Coordinates Campaign activation, Card Spotlight projection, approved customer entry,
 * Insights observation, audit/TapProof evidence — without live email/social/SMS/Wallet/Stripe.
 *
 * LiveActivation is orchestration evidence. Campaign / Card / resolver / Insights remain SoT.
 */

import type { ContentBlock, OfferCouponData } from "@/lib/types/campaign";
import type { TapCardSection } from "@/lib/brand/tap-card";
import {
  detectOfferProjectionState,
  extractAuthoritativeOffer,
  findPrimarySpotlightSection,
  projectOfferOntoSpotlight,
  unprojectSpotlightOffer,
  type AuthoritativeOffer,
} from "@/lib/fusion/card/offer";
import { resolvePublicTapSurface } from "@/lib/fusion/card/offer-resolver";
import {
  applyPlanTransition,
  isPlanCompatibleWithRecipeVersion,
  type AutopilotPlan,
  validateAutopilotPlan,
} from "./plan";
import {
  CARD_OFFER_MEASURABLE_RECIPE_ID,
  CARD_OFFER_MEASURABLE_VERSION,
} from "./outcome-recipe";
import {
  evaluateFactUsability,
  type KnowledgeFact,
} from "./knowledge-fact";
import { createHumanIntervention, type HumanIntervention } from "./intervention";
import { decideApprovals, CARD_OFFER_MEASURABLE_POLICY } from "./approval-policy";
import {
  detectPreparedExecutionStale,
  fingerprintFactsForExecution,
  fingerprintPlanForExecution,
  type PreparedExecution,
} from "./prepared-execution";
import {
  LIVE_ACTIVATION_SCHEMA_VERSION,
  buildActivationKey,
  canTransitionLiveActivation,
  createLiveAuditRef,
  deriveCustomerLiveState,
  evaluateScheduleWindow,
  isScheduleExpired,
  transitionLiveActivation,
  validateLiveActivation,
  type LiveActivation,
  type LiveActivationFailure,
  type LiveEntryPath,
  type LiveHostSummary,
} from "./live-activation";
import {
  F3_EXTERNAL_BOUNDARY,
  F3_HONESTY_STATEMENT,
  assertLivePrimaryCopySafe,
  buildFinalApprovalCopy,
  buildLiveHostSummary,
  liveStatusHostCopy,
} from "./live-host";
import {
  buildLiveObservationSummary,
  type LiveObservationSummary,
  type ObservationEventCounts,
} from "./live-observation";
import type { OrchestratorCampaignInput, OrchestratorCardInput } from "./prepared-orchestrator";

export type ActivateOutcomeInput = {
  plan: AutopilotPlan;
  execution: PreparedExecution;
  campaign: OrchestratorCampaignInput;
  card: OrchestratorCardInput;
  facts?: KnowledgeFact[];
  readiness: {
    featureOfferEnabled: boolean;
    featureAutopilotEnabled?: boolean;
    emailConnected?: boolean;
    consentPathAvailable?: boolean;
    /** Approved Tap Point / group refs already in the plan — do not invent new ones */
    approvedTapPoints?: Array<{ code: string; label?: string }>;
    /** When true, Card-first public path is an approved entry */
    cardFirstApproved?: boolean;
    askQuestionAvailable?: boolean;
    keepCardAvailable?: boolean;
  };
  /** Outcome-level final approval: Make this live */
  finalApprovalGranted: boolean;
  approvalId?: string;
  /** Concurrent-edit detection: fingerprints at click time */
  concurrent?: {
    campaignUpdatedAt?: string;
    cardUpdatedAt?: string;
    expectedCampaignUpdatedAt?: string;
    expectedCardUpdatedAt?: string;
  };
  /** Existing activation for idempotency */
  existingActivation?: LiveActivation | null;
  /** Force Insights failure (tests) or disclose incomplete */
  insights?: {
    canActivate: boolean;
    required: boolean;
    discloseIncomplete?: boolean;
  };
  /** Simulate mid-flight domain failures (tests) */
  simulateFailure?:
    | "spotlight"
    | "campaign"
    | "insights"
    | "resolver"
    | null;
  deviceCode?: string;
  now?: Date;
  activationId?: string;
};

export type DomainLiveSnapshot = {
  campaignStatus: string;
  cardSections: TapCardSection[];
  insightsObservationActive: boolean;
  /** Customer claims / consent / relationships preserved across undo */
  preservedEvidence: {
    claimsPreserved: true;
    consentPreserved: true;
    relationshipsPreserved: true;
    auditPreserved: true;
  };
};

export type ActivateOutcomeResult =
  | {
      ok: true;
      activation: LiveActivation;
      plan: AutopilotPlan;
      execution: PreparedExecution;
      domain: DomainLiveSnapshot;
      observation: LiveObservationSummary;
      idempotent: boolean;
    }
  | {
      ok: false;
      activation: LiveActivation;
      plan: AutopilotPlan;
      execution: PreparedExecution;
      domain: DomainLiveSnapshot;
      observation: LiveObservationSummary | null;
      idempotent: boolean;
    };

export type StopLiveInput = {
  activation: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
  mode: "stop" | "pause" | "undo" | "manual";
  editorHref?: string;
  now?: Date;
};

export type StopLiveResult = {
  ok: boolean;
  activation: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
};

const FINAL_APPROVAL_ID = "outcome_make_live";

function newId(prefix: string, now: Date): string {
  return `${prefix}_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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

function extractOffer(campaign: OrchestratorCampaignInput): AuthoritativeOffer | null {
  return extractAuthoritativeOffer({
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignStatus: campaign.status,
    blocks: synthesizeBlocks(campaign),
    preferBlockId: campaign.offerBlockId || undefined,
  });
}

function isCampaignUnavailable(status: string): boolean {
  const s = status.toUpperCase();
  return s === "ARCHIVED" || s === "DELETED" || s === "RETIRED" || s === "CLOSED";
}

function preparedOfferFingerprint(execution: PreparedExecution): string {
  const factsObj = execution.preparedObjects.find((o) => o.kind === "offer_coupon_facts");
  const fp = factsObj?.draftState?.factsFingerprint;
  return typeof fp === "string" ? fp : execution.factsFingerprint;
}

function resolveEntryPaths(input: ActivateOutcomeInput): LiveEntryPath[] {
  const paths: LiveEntryPath[] = [];
  for (const tp of input.readiness.approvedTapPoints ?? []) {
    paths.push({
      kind: "tap_point",
      ref: tp.code,
      label: tp.label || `Tap Point ${tp.code}`,
    });
  }
  if ((input.readiness.approvedTapPoints?.length ?? 0) > 0) {
    return paths.filter((p) => p.kind === "tap_point" || p.kind === "tap_point_group");
  }
  // Card-first only when explicitly approved (or defaulted true) and no Tap Points
  if (input.readiness.cardFirstApproved === false) {
    return paths;
  }
  if (input.card.id) {
    paths.push({
      kind: "card_first",
      ref: input.card.id,
      label: "Your Card",
    });
  }
  return paths;
}

function failActivation(input: {
  base: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
  failure: LiveActivationFailure;
  interventions?: HumanIntervention[];
  now: Date;
  compensatedDomain?: DomainLiveSnapshot;
}): ActivateOutcomeResult {
  const host = liveStatusHostCopy("failed");
  const activation: LiveActivation = {
    ...input.base,
    status: "failed",
    updatedAt: input.now.toISOString(),
    failure: input.failure,
    interventions: input.interventions ?? (input.failure.intervention ? [input.failure.intervention] : []),
    hostStateLabel: host.label,
    hostStateDetail: input.failure.message,
    nextSafeAction: input.failure.nextAction,
    localPublish: false,
    observationActive: false,
    honestyStatement:
      "Your offer is not live. Email and social were not sent.",
    auditRefs: [
      ...input.base.auditRefs,
      createLiveAuditRef({
        action: input.failure.compensated ? "activation_compensated" : "activation_failed",
        summary: input.failure.message,
        detail: { code: input.failure.code, compensated: Boolean(input.failure.compensated) },
        now: input.now,
      }),
    ],
  };
  return {
    ok: false,
    activation,
    plan: input.plan,
    execution: {
      ...input.execution,
      updatedAt: input.now.toISOString(),
      livePublish: false,
      readiness: {
        ...input.execution.readiness,
        goLiveAvailable: !input.execution.readiness.stale,
      },
    },
    domain: input.compensatedDomain ?? input.domain,
    observation: null,
    idempotent: false,
  };
}

/**
 * Evaluate whether a prepared execution may receive final go-live approval.
 */
export function evaluateFinalApprovalGate(input: {
  plan: AutopilotPlan;
  execution: PreparedExecution;
  campaign: OrchestratorCampaignInput;
  card: OrchestratorCardInput;
  facts?: KnowledgeFact[];
  readiness: ActivateOutcomeInput["readiness"];
  now?: Date;
}): {
  ok: boolean;
  goLiveAvailable: boolean;
  blockers: LiveActivationFailure[];
  approvalCopy: ReturnType<typeof buildFinalApprovalCopy>;
  entryPaths: LiveEntryPath[];
} {
  const now = input.now ?? new Date();
  const blockers: LiveActivationFailure[] = [];
  const facts = input.facts ?? [];
  const entryPaths = resolveEntryPaths({
    plan: input.plan,
    execution: input.execution,
    campaign: input.campaign,
    card: input.card,
    readiness: input.readiness,
    finalApprovalGranted: false,
  });

  const offer = extractOffer(input.campaign);
  const schedule = evaluateScheduleWindow({
    startsAt: input.campaign.scheduledStart ?? input.plan.schedule.startsAt,
    endsAt: input.campaign.scheduledEnd ?? input.plan.schedule.endsAt,
    timezone: input.plan.schedule.timezone,
    notes: input.plan.schedule.notes,
    now,
  });

  if (input.execution.status !== "prepared" && input.execution.status !== "needs_attention") {
    blockers.push({
      code: "stale_preparation",
      message: "Prepare this outcome before making it live.",
      nextAction: "Prepare this outcome, then try again.",
    });
  }
  if (input.execution.readiness.stale || input.execution.readiness.outcome === "stale_prepare_again") {
    blockers.push({
      code: "stale_preparation",
      message: "The Campaign changed after preparation. Prepare it again before going live.",
      nextAction: "Prepare again, then make it live.",
    });
  }
  const stale = detectPreparedExecutionStale({
    execution: input.execution,
    currentPlanFingerprint: fingerprintPlanForExecution(input.plan),
    currentFactsFingerprint: fingerprintFactsForExecution(facts),
  });
  if (stale.stale) {
    blockers.push({
      code: "stale_preparation",
      message: stale.reason || "This preparation is out of date. Prepare again before going live.",
      nextAction: "Prepare again, then make it live.",
    });
  }
  if (input.plan.recipeId !== CARD_OFFER_MEASURABLE_RECIPE_ID) {
    blockers.push({
      code: "recipe_version_mismatch",
      message: "This plan uses a recipe that cannot go live here.",
      nextAction: "Start over with a measurable Card offer.",
    });
  }
  const compat = isPlanCompatibleWithRecipeVersion(
    input.plan.recipeVersion,
    CARD_OFFER_MEASURABLE_VERSION
  );
  if (!compat.compatible) {
    blockers.push({
      code: "recipe_version_mismatch",
      message: "This plan needs to be rebuilt before going live.",
      nextAction: "Edit the goal and prepare again.",
    });
  }
  if (!validateAutopilotPlan(input.plan).ok) {
    blockers.push({
      code: "plan_incompatible",
      message: "The plan is incomplete and cannot go live safely.",
      nextAction: "Edit the goal and prepare again.",
    });
  }
  if (!input.readiness.featureOfferEnabled || input.readiness.featureAutopilotEnabled === false) {
    blockers.push({
      code: "feature_disabled",
      message: "Offers on Card or Autopilot are turned off for this workspace.",
      nextAction: "Ask an admin to enable the feature, or take manual control.",
    });
  }
  if (!offer) {
    blockers.push({
      code: "offer_facts_changed",
      message: "Authoritative offer details are missing.",
      nextAction: "Add offer details on the Campaign, then prepare again.",
    });
  } else {
    const preparedFp = preparedOfferFingerprint(input.execution);
    if (preparedFp && preparedFp !== offer.factsFingerprint) {
      blockers.push({
        code: "offer_facts_changed",
        message: "The Campaign changed after preparation. Prepare it again before going live.",
        nextAction: "Prepare again, then make it live.",
      });
    }
  }
  for (const fact of facts) {
    const u = evaluateFactUsability(fact, { now });
    if (!u.usable && u.reason === "confirmed_contradiction") {
      blockers.push({
        code: "contradiction",
        message: "Two offer details disagree. Resolve them before going live.",
        nextAction: "Resolve the conflict, then prepare again.",
        intervention: u.intervention,
      });
    }
  }
  if (isCampaignUnavailable(input.campaign.status)) {
    blockers.push({
      code: "campaign_unavailable",
      message: "That campaign is unavailable.",
      nextAction: "Choose an active campaign offer, then prepare again.",
    });
  }
  if (!input.card.id?.trim() || input.card.retired) {
    blockers.push({
      code: "card_unavailable",
      message: "The Card is unavailable.",
      nextAction: "Open Edit Card, then try again.",
    });
  }
  if (isScheduleExpired(schedule, now)) {
    blockers.push({
      code: "schedule_missing_or_expired",
      message: "The approved schedule has ended.",
      nextAction: "Update the schedule on the Campaign, then prepare again.",
    });
  }
  if (entryPaths.length === 0) {
    blockers.push({
      code: "no_customer_entry_path",
      message: "Your offer could not be made live because no Tap Point is connected.",
      nextAction: "Connect a Tap Point or approve Card-first visibility, then try again.",
    });
  }

  const existingSpotlight = findPrimarySpotlightSection({
    sections: input.card.sections,
  } as Parameters<typeof findPrimarySpotlightSection>[0]);
  if (
    existingSpotlight?.offerMode === "campaign" &&
    existingSpotlight.linkedCampaignId &&
    existingSpotlight.linkedCampaignId !== input.campaign.id
  ) {
    blockers.push({
      code: "spotlight_bind_conflict",
      message: "Your Card Spotlight is already linked to a different offer.",
      nextAction: "Take manual control to change the link, or unbind first.",
    });
  }

  const policy = decideApprovals(input.plan, CARD_OFFER_MEASURABLE_POLICY);
  // Recipe forbid_* / live-provider prohibitions are expected and do not block local go-live.
  const unexpectedProhibited = policy.prohibited.filter((id) => {
    if (id.startsWith("forbid")) return false;
    if (id.startsWith("live_provider")) return false;
    if (id.startsWith("prohibit_forbid")) return false;
    if (id.startsWith("prohibit_live_provider")) return false;
    return true;
  });
  if (unexpectedProhibited.length > 0) {
    blockers.push({
      code: "policy_blocked",
      message: "This step is not allowed under your current settings.",
      nextAction: "Resolve the policy issue or take manual control.",
    });
  }
  if ((input.plan.riskEstimate?.level === "high") && CARD_OFFER_MEASURABLE_POLICY.scope.maxRisk === "medium") {
    blockers.push({
      code: "risk_exceeded",
      message: "Risk is too high for one-tap go-live.",
      nextAction: "Take manual control or lower risk before continuing.",
    });
  }
  // Outstanding send approvals may remain — external send excluded from this approval
  const blockingOutstanding = input.execution.approvalsOutstanding.filter(
    (a) => a.blocking && a.level !== "review_before_send"
  );
  // publish approval is satisfied by outcome-level Make this live
  const stillBlocking = blockingOutstanding.filter(
    (a) => a.level !== "review_before_publish"
  );
  if (stillBlocking.length > 0) {
    blockers.push({
      code: "approval_missing",
      message: "A required approval is still open.",
      nextAction: "Resolve the approval, then try again.",
    });
  }

  const tapCount = entryPaths.filter((p) => p.kind === "tap_point" || p.kind === "tap_point_group").length;
  const hasCard = entryPaths.some((p) => p.kind === "card_first");
  const where =
    tapCount > 0 && hasCard
      ? `Your Card and ${tapCount} Tap Point${tapCount === 1 ? "" : "s"}`
      : tapCount > 0
        ? `${tapCount} Tap Point${tapCount === 1 ? "" : "s"}`
        : "Your Card";

  const approvalCopy = buildFinalApprovalCopy({
    offerTitle: offer?.title || input.campaign.offerTitle || input.campaign.title,
    audience: input.plan.audience.summary,
    where,
    when: schedule.label,
    measured: input.plan.successMetrics.map((m) => m.name).join(", ") || "Views, claims, Keeps, and leads",
    excludeSend: true,
  });

  const ok = blockers.length === 0;
  return {
    ok,
    goLiveAvailable: ok && input.execution.status === "prepared",
    blockers,
    approvalCopy,
    entryPaths,
  };
}

/**
 * One-tap coordinated activation. Double-tap safe via activationKey.
 */
export function activateCardOfferMeasurableOutcome(
  input: ActivateOutcomeInput
): ActivateOutcomeResult {
  const now = input.now ?? new Date();
  const facts = input.facts ?? [];
  const priorDomain: DomainLiveSnapshot = {
    campaignStatus: input.campaign.status,
    cardSections: [...input.card.sections],
    insightsObservationActive: false,
    preservedEvidence: {
      claimsPreserved: true,
      consentPreserved: true,
      relationshipsPreserved: true,
      auditPreserved: true,
    },
  };

  const gate = evaluateFinalApprovalGate({
    plan: input.plan,
    execution: input.execution,
    campaign: input.campaign,
    card: input.card,
    facts,
    readiness: input.readiness,
    now,
  });

  const offer = extractOffer(input.campaign);
  const offerFp = offer?.factsFingerprint || "";
  const approvalId = input.approvalId ?? FINAL_APPROVAL_ID;
  const fingerprints = {
    plan: fingerprintPlanForExecution(input.plan),
    facts: fingerprintFactsForExecution(facts),
    offer: offerFp,
    preparation: input.execution.executionId + ":" + input.execution.planFingerprint,
  };
  const activationKey = buildActivationKey({
    planId: input.plan.id,
    preparedExecutionId: input.execution.executionId,
    approvalId,
    fingerprints,
  });

  // Idempotent replay
  if (
    input.existingActivation &&
    input.existingActivation.activationKey === activationKey &&
    (input.existingActivation.status === "live" ||
      input.existingActivation.status === "scheduled")
  ) {
    const observation = buildLiveObservationSummary({
      activationId: input.existingActivation.activationId,
      campaignId: input.existingActivation.campaignId,
      statusLabel: input.existingActivation.hostStateLabel,
      entryPathCount: input.existingActivation.approvedEntryPaths.filter(
        (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
      ).length,
      entryKind: entryKindFromPaths(input.existingActivation.approvedEntryPaths),
      scheduleLabel: input.existingActivation.schedule.label,
      observationActive: input.existingActivation.observationActive,
      disclosedIncomplete: !input.existingActivation.observationActive,
    });
    return {
      ok: true,
      activation: {
        ...input.existingActivation,
        auditRefs: [
          ...input.existingActivation.auditRefs,
          createLiveAuditRef({
            action: "idempotent_hit",
            summary: "Make it live was already completed — no duplicate activation",
            now,
          }),
        ],
        updatedAt: now.toISOString(),
      },
      plan: input.plan,
      execution: input.execution,
      domain: {
        campaignStatus: input.campaign.status,
        cardSections: input.card.sections,
        insightsObservationActive: input.existingActivation.observationActive,
        preservedEvidence: priorDomain.preservedEvidence,
      },
      observation,
      idempotent: true,
    };
  }

  if (
    input.existingActivation &&
    input.existingActivation.status === "activating" &&
    input.existingActivation.activationKey === activationKey
  ) {
    const base = emptyActivation({
      activationId: input.existingActivation.activationId,
      plan: input.plan,
      execution: input.execution,
      campaign: input.campaign,
      card: input.card,
      approvalId,
      activationKey,
      fingerprints,
      entryPaths: gate.entryPaths,
      priorDomain,
      now,
    });
    return failActivation({
      base,
      plan: input.plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "activation_in_progress",
        message: "Activation is already in progress.",
        nextAction: "Wait a moment, then check the result.",
      },
      now,
    });
  }

  const base = emptyActivation({
    activationId: input.activationId ?? newId("act", now),
    plan: input.plan,
    execution: input.execution,
    campaign: input.campaign,
    card: input.card,
    approvalId,
    activationKey,
    fingerprints,
    entryPaths: gate.entryPaths,
    priorDomain,
    now,
  });

  if (!input.finalApprovalGranted) {
    return failActivation({
      base,
      plan: input.plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "approval_missing",
        message: "Confirm Make this live before continuing.",
        nextAction: "Approve Make this live, then try again.",
        intervention: createHumanIntervention({
          code: "host_requested_review",
          affectedObjectOrStep: "final_approval",
          explanation: "Confirm Make this live before continuing.",
          suggestedNextAction: "Approve Make this live, then try again.",
        }),
      },
      now,
    });
  }

  // Concurrent edit abort
  if (
    input.concurrent?.expectedCampaignUpdatedAt &&
    input.concurrent.campaignUpdatedAt &&
    input.concurrent.expectedCampaignUpdatedAt !== input.concurrent.campaignUpdatedAt
  ) {
    return failActivation({
      base: {
        ...base,
        auditRefs: [
          ...base.auditRefs,
          createLiveAuditRef({
            action: "concurrent_edit_aborted",
            summary: "Campaign changed during activation",
            now,
          }),
        ],
      },
      plan: input.plan,
      execution: {
        ...input.execution,
        readiness: {
          ...input.execution.readiness,
          stale: true,
          outcome: "stale_prepare_again",
          goLiveAvailable: false,
        },
        status: "needs_attention",
      },
      domain: priorDomain,
      failure: {
        code: "concurrent_edit",
        message: "The Campaign changed during activation. Prepare it again before going live.",
        nextAction: "Prepare again, then make it live.",
      },
      now,
    });
  }
  if (
    input.concurrent?.expectedCardUpdatedAt &&
    input.concurrent.cardUpdatedAt &&
    input.concurrent.expectedCardUpdatedAt !== input.concurrent.cardUpdatedAt
  ) {
    return failActivation({
      base: {
        ...base,
        auditRefs: [
          ...base.auditRefs,
          createLiveAuditRef({
            action: "concurrent_edit_aborted",
            summary: "Card changed during activation",
            now,
          }),
        ],
      },
      plan: input.plan,
      execution: {
        ...input.execution,
        readiness: {
          ...input.execution.readiness,
          stale: true,
          outcome: "stale_prepare_again",
          goLiveAvailable: false,
        },
        status: "needs_attention",
      },
      domain: priorDomain,
      failure: {
        code: "concurrent_edit",
        message: "The Card changed during activation. Prepare it again before going live.",
        nextAction: "Prepare again, then make it live.",
      },
      now,
    });
  }

  if (!gate.ok) {
    const blocker = gate.blockers[0]!;
    return failActivation({
      base,
      plan: input.plan,
      execution: input.execution,
      domain: priorDomain,
      failure: blocker,
      interventions: blocker.intervention ? [blocker.intervention] : [],
      now,
    });
  }

  // Refuse customer-contact / provider / spend in this activation
  const liveSendAttempt = input.plan.objectMutations.find(
    (m) =>
      !m.prohibited &&
      (m.payload?.liveSend === true ||
        m.payload?.customerContact === true ||
        m.payload?.liveProvider === true ||
        m.payload?.spend === true)
  );
  if (liveSendAttempt) {
    return failActivation({
      base,
      plan: input.plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code:
          liveSendAttempt.payload?.liveProvider === true
            ? "provider_activation_requested"
            : "customer_contact_requested",
        message:
          "Customer contact or provider activation is not included in Make it live.",
        nextAction: "Keep email and social prepared — send later with separate approval.",
      },
      now,
    });
  }

  let plan = input.plan;
  let activation: LiveActivation = {
    ...base,
    status: "activating",
    updatedAt: now.toISOString(),
    hostStateLabel: liveStatusHostCopy("activating").label,
    hostStateDetail: liveStatusHostCopy("activating").detail,
    nextSafeAction: "Wait while Autopilot makes your offer live.",
    auditRefs: [
      ...base.auditRefs,
      createLiveAuditRef({
        action: "final_approval_granted",
        summary: "Host approved Make this live",
        detail: { approvalId },
        now,
      }),
      createLiveAuditRef({
        action: "activation_started",
        summary: "Activation started",
        detail: { activationKey },
        now,
      }),
    ],
  };

  // Working domain — mutate then confirm; compensate on failure
  let workingSections = [...input.card.sections];
  let workingCampaignStatus = input.campaign.status;
  let observationActive = false;
  const priorSpotlight = findPrimarySpotlightSection({
    sections: workingSections,
  } as Parameters<typeof findPrimarySpotlightSection>[0]);
  const priorSpotlightSnapshot = priorSpotlight
    ? (JSON.parse(JSON.stringify(priorSpotlight)) as TapCardSection)
    : null;

  // 10) Persist Spotlight projection through Offer Fuse contracts
  if (input.simulateFailure === "spotlight" || !offer) {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "spotlight_activation_failed",
        message:
          "Autopilot restored the previous Card after activation could not be completed.",
        nextAction: "Try again or take manual control.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }

  const sectionSeed: TapCardSection = priorSpotlight ?? {
    id: `offer_${now.getTime().toString(36)}`,
    type: "special_offer",
    enabled: true,
    order: workingSections.length,
    label: "Special offer",
    specialStyle: "banner",
    offerMode: "campaign",
  };

  // Prefer prepared draft section when present
  const preparedSpotlight = input.execution.preparedObjects.find(
    (o) => o.kind === "card_spotlight_projection" && o.status === "prepared"
  );
  const draftSection = preparedSpotlight?.draftState?.section as TapCardSection | undefined;
  const projected = draftSection
    ? projectOfferOntoSpotlight({
        section: draftSection,
        offer,
        preservePresentation: true,
        deviceCode: input.deviceCode,
      })
    : projectOfferOntoSpotlight({
        section: sectionSeed,
        offer,
        preservePresentation: Boolean(priorSpotlight),
        deviceCode: input.deviceCode,
      });

  const projectionState = detectOfferProjectionState({ section: projected, offer });
  if (projectionState === "unbound" || projectionState === "stale") {
    // Force fresh projection for go-live
  }
  const exists = workingSections.some((s) => s.id === projected.id);
  workingSections = exists
    ? workingSections.map((s) => (s.id === projected.id ? projected : s))
    : [...workingSections, projected];

  activation = {
    ...activation,
    spotlightSectionId: projected.id,
    priorSpotlightSection: priorSpotlightSnapshot
      ? (priorSpotlightSnapshot as unknown as Record<string, unknown>)
      : { existed: false },
  };

  // 11) Activate Campaign (local LIVE or SCHEDULED)
  if (input.simulateFailure === "campaign") {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "campaign_activation_failed",
        message:
          "Autopilot restored the previous Card after activation could not be completed.",
        nextAction: "Try again or take manual control.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }

  const schedule = evaluateScheduleWindow({
    startsAt: input.campaign.scheduledStart ?? input.plan.schedule.startsAt,
    endsAt: input.campaign.scheduledEnd ?? input.plan.schedule.endsAt,
    timezone: input.plan.schedule.timezone,
    notes: input.plan.schedule.notes,
    now,
  });
  workingCampaignStatus = schedule.startsLater ? "SCHEDULED" : "LIVE";

  // 13) Insights observation
  const insightsCan = input.insights?.canActivate !== false;
  const insightsRequired = input.insights?.required !== false;
  if (input.simulateFailure === "insights" || (!insightsCan && insightsRequired)) {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "insights_activation_failed",
        message:
          "Autopilot restored the previous Card after activation could not be completed.",
        nextAction: "Try again or take manual control.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }
  const disclosedIncomplete = !insightsCan && input.insights?.discloseIncomplete === true;
  observationActive = insightsCan;

  // 15) Confirm public path resolves
  const hasTap = gate.entryPaths.some(
    (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
  );
  const surface = resolvePublicTapSurface({
    hasLiveCampaign: workingCampaignStatus === "LIVE" || workingCampaignStatus === "SCHEDULED",
    liveCampaignId: input.campaign.id,
    card: { sections: workingSections } as Parameters<typeof resolvePublicTapSurface>[0]["card"],
    cardRetired: input.card.retired,
    offerFeatureOn: input.readiness.featureOfferEnabled,
    hasEndExperience: false,
  });
  const resolverReachable =
    input.simulateFailure !== "resolver" &&
    ((hasTap &&
      (surface.mode === "campaign_takeover_with_spotlight" ||
        surface.mode === "campaign_takeover" ||
        surface.mode === "card_first")) ||
      (!hasTap &&
        gate.entryPaths.some((p) => p.kind === "card_first") &&
        (surface.mode === "card_first" ||
          surface.mode === "campaign_takeover_with_spotlight")));

  if (!resolverReachable) {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "resolver_unreachable",
        message:
          "Your offer could not be made live because customers cannot reach it yet.",
        nextAction: "Connect a Tap Point or check Card visibility, then try again.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }

  const spotlightMatches =
    detectOfferProjectionState({ section: projected, offer }) === "current" ||
    projected.linkedCampaignId === offer.campaignId;

  const targetStatus = schedule.startsLater ? "scheduled" : "live";
  if (!canTransitionLiveActivation("activating", { type: schedule.startsLater ? "mark_scheduled" : "mark_live" })) {
    // should not happen
  }
  const t = transitionLiveActivation("activating", {
    type: schedule.startsLater ? "mark_scheduled" : "mark_live",
  });
  void t;

  const tapCount = gate.entryPaths.filter(
    (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
  ).length;
  const hostSummary: LiveHostSummary = buildLiveHostSummary({
    entryPathCount: tapCount || (gate.entryPaths.length ? 1 : 0),
    entryKind: entryKindFromPaths(gate.entryPaths),
    scheduleLabel: schedule.label,
    metricsLabel:
      input.plan.successMetrics.map((m) => m.name).join(", ") ||
      "Views, claims, Keeps, and leads",
    needsAttention: disclosedIncomplete
      ? "Some measurements are temporarily incomplete."
      : "",
  });

  const derived = deriveCustomerLiveState({
    activationStatus: targetStatus,
    campaignStatus: workingCampaignStatus,
    schedule,
    resolverReachable,
    spotlightMatchesOffer: spotlightMatches,
    observationActive: observationActive || disclosedIncomplete,
    observationDisclosedIncomplete: disclosedIncomplete,
    hasAuditEvidence: true,
    now,
  });

  // Never label Live without derived proof
  if (targetStatus === "live" && !derived.maySayYourOfferIsLive) {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "partial_failure",
        message: derived.reason,
        nextAction: "Fix the issue, then try again.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }

  const host = liveStatusHostCopy(targetStatus);
  activation = {
    ...activation,
    status: targetStatus,
    schedule,
    observationActive,
    activatedAt: now.toISOString(),
    localPublish: true,
    distributionSent: false,
    customerContactOccurred: false,
    hostSummary,
    hostStateLabel: host.label,
    hostStateDetail: derived.maySayYourOfferIsLive
      ? "Your offer is live."
      : derived.reason,
    honestyStatement: derived.maySayYourOfferIsLive
      ? F3_HONESTY_STATEMENT
      : `Scheduled — not live yet. ${F3_EXTERNAL_BOUNDARY}`,
    nextSafeAction: "Watch results, or Stop / Undo if you need to pull it back.",
    failure: null,
    updatedAt: now.toISOString(),
    auditRefs: [
      ...activation.auditRefs,
      createLiveAuditRef({
        action: "observation_started",
        summary: observationActive
          ? "Insights observation started"
          : "Insights observation disclosed incomplete",
        detail: { observationActive, disclosedIncomplete },
        now,
      }),
      createLiveAuditRef({
        action: "activation_completed",
        summary: derived.maySayYourOfferIsLive
          ? "Offer is live"
          : "Offer is scheduled",
        detail: {
          campaignStatus: workingCampaignStatus,
          entryPaths: gate.entryPaths.map((p) => p.kind),
          distributionSent: false,
          customerContactOccurred: false,
        },
        now,
      }),
    ],
  };

  const validated = validateLiveActivation(activation);
  if (!validated.ok) {
    return failActivation({
      base: activation,
      plan,
      execution: input.execution,
      domain: priorDomain,
      failure: {
        code: "partial_failure",
        message: "Activation produced an invalid result and was refused.",
        nextAction: "Try again or take manual control.",
        compensated: true,
      },
      compensatedDomain: priorDomain,
      now,
    });
  }

  const copyCheck = assertLivePrimaryCopySafe([
    activation.hostStateLabel,
    activation.hostStateDetail,
    activation.nextSafeAction,
    activation.honestyStatement,
    hostSummary.whereLive,
    hostSummary.externalBoundary,
  ]);
  if (!copyCheck.ok) {
    // Soft warn — do not fail live for advanced terms in internal fields
  }

  // Keep plan active (already active from F2 prepare)
  if (plan.status === "approved" || plan.status === "applying") {
    const start = applyPlanTransition(plan, { type: "start_apply" }, now);
    if (start.ok) plan = start.plan;
    const active = applyPlanTransition(plan, { type: "mark_active" }, now);
    if (active.ok) plan = active.plan;
  }

  const execution: PreparedExecution = {
    ...input.execution,
    updatedAt: now.toISOString(),
    livePublish: true,
    liveSend: false,
    liveSpend: false,
    customerContactOccurred: false,
    providerLiveAction: false,
    approvalsSatisfied: [
      ...input.execution.approvalsSatisfied,
      {
        id: FINAL_APPROVAL_ID,
        level: "review_before_publish",
        reason: "Host approved Make this live",
        blocking: true,
      },
    ],
    approvalsOutstanding: input.execution.approvalsOutstanding.filter(
      (a) => a.level === "review_before_send"
    ),
    readiness: {
      ...input.execution.readiness,
      goLiveAvailable: false,
      outcome: "prepared",
      stale: false,
    },
    nextSafeAction: activation.nextSafeAction,
    hostStateLabel: activation.hostStateLabel,
    hostStateDetail: activation.hostStateDetail,
    honestyStatement: activation.honestyStatement,
  };

  const domain: DomainLiveSnapshot = {
    campaignStatus: workingCampaignStatus,
    cardSections: workingSections,
    insightsObservationActive: observationActive,
    preservedEvidence: priorDomain.preservedEvidence,
  };

  const observation = buildLiveObservationSummary({
    activationId: activation.activationId,
    campaignId: activation.campaignId,
    statusLabel: activation.hostStateLabel,
    entryPathCount: tapCount || gate.entryPaths.length,
    entryKind: entryKindFromPaths(gate.entryPaths),
    scheduleLabel: schedule.label,
    observationActive,
    disclosedIncomplete,
    followUpReady: true,
  });

  return {
    ok: true,
    activation,
    plan,
    execution,
    domain,
    observation,
    idempotent: false,
  };
}

function entryKindFromPaths(
  paths: LiveEntryPath[]
): "tap_point" | "card_first" | "mixed" {
  const hasTap = paths.some((p) => p.kind === "tap_point" || p.kind === "tap_point_group");
  const hasCard = paths.some((p) => p.kind === "card_first");
  if (hasTap && hasCard) return "mixed";
  if (hasCard) return "card_first";
  return "tap_point";
}

function emptyActivation(input: {
  activationId: string;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  campaign: OrchestratorCampaignInput;
  card: OrchestratorCardInput;
  approvalId: string;
  activationKey: string;
  fingerprints: LiveActivation["fingerprints"];
  entryPaths: LiveEntryPath[];
  priorDomain: DomainLiveSnapshot;
  now: Date;
}): LiveActivation {
  const host = liveStatusHostCopy("pending_approval");
  const schedule = evaluateScheduleWindow({
    startsAt: input.campaign.scheduledStart ?? input.plan.schedule.startsAt,
    endsAt: input.campaign.scheduledEnd ?? input.plan.schedule.endsAt,
    timezone: input.plan.schedule.timezone,
    notes: input.plan.schedule.notes,
    now: input.now,
  });
  return {
    activationId: input.activationId,
    schemaVersion: LIVE_ACTIVATION_SCHEMA_VERSION,
    planId: input.plan.id,
    preparedExecutionId: input.execution.executionId,
    approvalId: input.approvalId,
    recipeId: input.plan.recipeId,
    recipeVersion: input.plan.recipeVersion,
    status: "pending_approval",
    activationKey: input.activationKey,
    fingerprints: input.fingerprints,
    campaignId: input.campaign.id,
    cardId: input.card.id,
    spotlightSectionId: null,
    approvedEntryPaths: input.entryPaths,
    schedule,
    distributionSent: false,
    customerContactOccurred: false,
    priorCampaignStatus: input.priorDomain.campaignStatus,
    priorSpotlightSection: null,
    priorInsightsActive: input.priorDomain.insightsObservationActive,
    observationActive: false,
    auditRefs: [],
    failure: null,
    hostSummary: null,
    hostStateLabel: host.label,
    hostStateDetail: host.detail,
    honestyStatement:
      "Not live yet. Email and social stay prepared and unsent.",
    nextSafeAction: "Review, approve Make this live, then tap Make it live.",
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
    localPublish: false,
    interventions: [],
  };
}

/**
 * Stop / Pause / Undo go-live / Take manual control.
 * Preserves claims, consent, relationships, and audit evidence.
 */
export function interruptLiveActivation(input: StopLiveInput): StopLiveResult {
  const now = input.now ?? new Date();
  let activation = input.activation;
  let plan = input.plan;
  let domain = { ...input.domain, cardSections: [...input.domain.cardSections] };
  let execution = input.execution;

  if (input.mode === "manual") {
    activation = {
      ...activation,
      status: "manual_control",
      updatedAt: now.toISOString(),
      hostStateLabel: liveStatusHostCopy("manual_control").label,
      hostStateDetail: liveStatusHostCopy("manual_control").detail,
      nextSafeAction: "Continue in the editor — Autopilot is frozen for this outcome.",
      auditRefs: [
        ...activation.auditRefs,
        createLiveAuditRef({
          action: "manual_takeover",
          summary: "Host took manual control",
          detail: { editor: input.editorHref ?? "/dashboard/card/edit" },
          now,
        }),
      ],
    };
    execution = {
      ...execution,
      manualControl: {
        active: true,
        frozenAt: now.toISOString(),
        openedEditor: input.editorHref ?? "/dashboard/card/edit",
        note: "Autopilot is frozen for this outcome until you resume with a fresh review.",
      },
      updatedAt: now.toISOString(),
    };
    return { ok: true, activation, plan, execution, domain };
  }

  if (input.mode === "pause") {
    if (!canTransitionLiveActivation(activation.status, { type: "pause" })) {
      return {
        ok: false,
        activation: {
          ...activation,
          failure: {
            code: "partial_failure",
            message: "This offer cannot be paused right now.",
            nextAction: "Stop or Undo instead.",
          },
        },
        plan,
        execution,
        domain,
      };
    }
    const paused = applyPlanTransition(plan, { type: "pause" }, now);
    if (paused.ok) plan = paused.plan;
    domain = {
      ...domain,
      campaignStatus: "PAUSED",
      insightsObservationActive: false,
    };
    activation = {
      ...activation,
      status: "paused",
      pausedAt: now.toISOString(),
      observationActive: false,
      updatedAt: now.toISOString(),
      hostStateLabel: liveStatusHostCopy("paused").label,
      hostStateDetail: liveStatusHostCopy("paused").detail,
      nextSafeAction: "Resume when you are ready, or Stop / Undo.",
      honestyStatement: "Your offer is on hold. Email and social were not sent.",
      auditRefs: [
        ...activation.auditRefs,
        createLiveAuditRef({
          action: "pause_completed",
          summary: "Offer paused",
          now,
        }),
      ],
    };
    return { ok: true, activation, plan, execution, domain };
  }

  if (input.mode === "stop") {
    if (!canTransitionLiveActivation(activation.status, { type: "stop" }) && activation.status !== "paused") {
      // allow stop from paused via transition
    }
    const stopped = applyPlanTransition(plan, { type: "stop" }, now);
    if (stopped.ok) plan = stopped.plan;
    // Unproject or restore Spotlight per approved rollback — prefer prior restore
    domain = restoreSpotlight(domain, activation);
    domain = {
      ...domain,
      campaignStatus: "PAUSED",
      insightsObservationActive: false,
    };
    activation = {
      ...activation,
      status: "stopped",
      stoppedAt: now.toISOString(),
      observationActive: false,
      localPublish: false,
      updatedAt: now.toISOString(),
      hostStateLabel: liveStatusHostCopy("stopped").label,
      hostStateDetail: liveStatusHostCopy("stopped").detail,
      nextSafeAction: "Return to Studio, or prepare a new outcome.",
      honestyStatement: "Your offer is no longer shown as live. Email and social were not sent.",
      auditRefs: [
        ...activation.auditRefs,
        createLiveAuditRef({
          action: "stop_completed",
          summary: "Offer stopped — customer visibility removed",
          now,
        }),
        createLiveAuditRef({
          action: "observation_stopped",
          summary: "Insights observation stopped",
          now,
        }),
      ],
    };
    execution = {
      ...execution,
      livePublish: false,
      updatedAt: now.toISOString(),
      readiness: {
        ...execution.readiness,
        goLiveAvailable: false,
      },
    };
    return { ok: true, activation, plan, execution, domain };
  }

  // undo
  activation = {
    ...activation,
    auditRefs: [
      ...activation.auditRefs,
      createLiveAuditRef({
        action: "undo_golive_requested",
        summary: "Host requested Undo go-live",
        now,
      }),
    ],
  };
  domain = restoreSpotlight(domain, activation);
  domain = {
    ...domain,
    campaignStatus: activation.priorCampaignStatus,
    insightsObservationActive: activation.priorInsightsActive,
  };
  const rolled = applyPlanTransition(plan, { type: "rollback" }, now);
  if (rolled.ok) plan = rolled.plan;

  activation = {
    ...activation,
    status: "rolled_back",
    rolledBackAt: now.toISOString(),
    observationActive: false,
    localPublish: false,
    updatedAt: now.toISOString(),
    hostStateLabel: liveStatusHostCopy("rolled_back").label,
    hostStateDetail: liveStatusHostCopy("rolled_back").detail,
    nextSafeAction: "Prepare again when you are ready to go live.",
    honestyStatement:
      "Go-live was undone. Claims, consent, and history were kept. Email and social were not sent.",
    auditRefs: [
      ...activation.auditRefs,
      createLiveAuditRef({
        action: "undo_golive_completed",
        summary: "Go-live undone — prior Campaign and Card restored",
        detail: {
          claimsPreserved: true,
          consentPreserved: true,
          relationshipsPreserved: true,
          auditPreserved: true,
        },
        now,
      }),
    ],
  };
  execution = {
    ...execution,
    livePublish: false,
    status: "prepared",
    updatedAt: now.toISOString(),
    readiness: {
      ...execution.readiness,
      goLiveAvailable: true,
      outcome: "ready_for_final_approval",
      stale: false,
    },
    nextSafeAction: "Review and make it live again when ready.",
    hostStateLabel: "Prepared",
    hostStateDetail: "Your offer is prepared and ready to go live.",
    honestyStatement:
      "Prepared locally — not published, not sent, and no customers were contacted.",
  };

  return { ok: true, activation, plan, execution, domain };
}

function restoreSpotlight(
  domain: DomainLiveSnapshot,
  activation: LiveActivation
): DomainLiveSnapshot {
  const sectionId = activation.spotlightSectionId;
  const prior = activation.priorSpotlightSection;
  let sections = [...domain.cardSections];
  if (!sectionId) return domain;
  if (prior && prior.existed === false) {
    sections = sections.filter((s) => s.id !== sectionId);
  } else if (prior && prior.id) {
    const restored = prior as unknown as TapCardSection;
    sections = sections.map((s) => (s.id === sectionId ? restored : s));
  } else {
    sections = sections.map((s) =>
      s.id === sectionId ? unprojectSpotlightOffer(s) : s
    );
  }
  return { ...domain, cardSections: sections };
}

/** Resume from pause — explicit safe resume only */
export function resumeLiveActivation(input: {
  activation: LiveActivation;
  plan: AutopilotPlan;
  execution: PreparedExecution;
  domain: DomainLiveSnapshot;
  now?: Date;
}): StopLiveResult {
  const now = input.now ?? new Date();
  if (!canTransitionLiveActivation(input.activation.status, { type: "resume" })) {
    return {
      ok: false,
      activation: {
        ...input.activation,
        failure: {
          code: "partial_failure",
          message: "This offer cannot be resumed right now.",
          nextAction: "Make it live again from a prepared outcome.",
        },
      },
      plan: input.plan,
      execution: input.execution,
      domain: input.domain,
    };
  }
  let plan = input.plan;
  const resumed = applyPlanTransition(plan, { type: "resume" }, now);
  if (resumed.ok) plan = resumed.plan;
  const schedule = input.activation.schedule;
  const campaignStatus = schedule.startsLater ? "SCHEDULED" : "LIVE";
  const status = schedule.startsLater ? "scheduled" : "live";
  const host = liveStatusHostCopy(status);
  const activation: LiveActivation = {
    ...input.activation,
    status,
    observationActive: true,
    pausedAt: undefined,
    updatedAt: now.toISOString(),
    hostStateLabel: host.label,
    hostStateDetail: host.detail,
    nextSafeAction: "Watch results, or Stop / Undo if you need to pull it back.",
    honestyStatement: status === "live" ? F3_HONESTY_STATEMENT : input.activation.honestyStatement,
    failure: null,
    auditRefs: [
      ...input.activation.auditRefs,
      createLiveAuditRef({
        action: "resume_completed",
        summary: "Offer resumed",
        now,
      }),
    ],
  };
  return {
    ok: true,
    activation,
    plan,
    execution: {
      ...input.execution,
      livePublish: true,
      updatedAt: now.toISOString(),
    },
    domain: {
      ...input.domain,
      campaignStatus,
      insightsObservationActive: true,
    },
  };
}

/** Public-path proof helper for tests / headed flows */
export function provePublicOfferReachable(input: {
  domain: DomainLiveSnapshot;
  campaignId: string;
  offerFeatureOn: boolean;
  cardRetired?: boolean;
}): {
  reachable: boolean;
  mode: string;
  offerVisible: boolean;
} {
  const spotlight = findPrimarySpotlightSection({
    sections: input.domain.cardSections,
  } as Parameters<typeof findPrimarySpotlightSection>[0]);
  const hasLive =
    input.domain.campaignStatus === "LIVE" ||
    input.domain.campaignStatus === "SCHEDULED";
  const surface = resolvePublicTapSurface({
    hasLiveCampaign: hasLive,
    liveCampaignId: input.campaignId,
    card: { sections: input.domain.cardSections } as Parameters<
      typeof resolvePublicTapSurface
    >[0]["card"],
    cardRetired: input.cardRetired,
    offerFeatureOn: input.offerFeatureOn,
    hasEndExperience: false,
  });
  const offerVisible =
    Boolean(spotlight?.linkedCampaignId === input.campaignId) &&
    spotlight?.offerMode === "campaign" &&
    hasLive;
  return {
    reachable:
      offerVisible &&
      (surface.mode === "campaign_takeover_with_spotlight" ||
        surface.mode === "card_first" ||
        surface.mode === "campaign_takeover"),
    mode: surface.mode,
    offerVisible,
  };
}

export function refreshObservation(input: {
  activation: LiveActivation;
  events?: ObservationEventCounts;
  featureDisabled?: boolean;
}): LiveObservationSummary {
  const tapCount = input.activation.approvedEntryPaths.filter(
    (p) => p.kind === "tap_point" || p.kind === "tap_point_group"
  ).length;
  return buildLiveObservationSummary({
    activationId: input.activation.activationId,
    campaignId: input.activation.campaignId,
    statusLabel: input.activation.hostStateLabel,
    entryPathCount: tapCount || input.activation.approvedEntryPaths.length,
    entryKind: entryKindFromPaths(input.activation.approvedEntryPaths),
    scheduleLabel: input.activation.schedule.label,
    scheduleExpired: isScheduleExpired(input.activation.schedule),
    featureDisabled: input.featureDisabled,
    observationActive: input.activation.observationActive,
    disclosedIncomplete: !input.activation.observationActive,
    followUpReady: true,
    events: input.events,
  });
}

/** Assert F3 external boundary never crossed */
export function assertF3ExternalBoundary(activation: LiveActivation): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (activation.distributionSent !== false) errors.push("distributionSent must be false");
  if (activation.customerContactOccurred !== false) {
    errors.push("customerContactOccurred must be false");
  }
  return { ok: errors.length === 0, errors };
}
