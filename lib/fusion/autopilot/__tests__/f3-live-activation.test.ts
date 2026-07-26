/**
 * Autopilot F3 — one-tap go-live + observation for card.offer.measurable@1.0.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleCardOfferMeasurableOutcome } from "../outcome-assembler";
import {
  KNOWLEDGE_FACT_SCHEMA_VERSION,
  type KnowledgeFact,
} from "../knowledge-fact";
import { prepareCardOfferMeasurableOutcome } from "../prepared-orchestrator";
import {
  activateCardOfferMeasurableOutcome,
  assertF3ExternalBoundary,
  evaluateFinalApprovalGate,
  interruptLiveActivation,
  provePublicOfferReachable,
  refreshObservation,
  resumeLiveActivation,
} from "../live-orchestrator";
import {
  buildActivationKey,
  canTransitionLiveActivation,
  deriveCustomerLiveState,
  evaluateScheduleWindow,
  transitionLiveActivation,
  validateLiveActivation,
  LIVE_ACTIVATION_SCHEMA_VERSION,
} from "../live-activation";
import { fingerprintPlanForExecution } from "../prepared-execution";
import {
  assertLivePrimaryCopySafe,
  buildFinalApprovalCopy,
  F3_EXTERNAL_BOUNDARY,
  F3_HONESTY_STATEMENT,
  primaryCopyFromActivation,
} from "../live-host";
import {
  buildLiveObservationSummary,
  visibleObservationStatements,
} from "../live-observation";
import { assertNoLiveSideEffects } from "../prepared-orchestrator";
import { assertOfferFuseSourceOfTruth, CARD_OFFER_MEASURABLE_RECIPE } from "../outcome-recipe";
import {
  extractAuthoritativeOffer,
  detectOfferProjectionState,
} from "@/lib/fusion/card/offer";
import type { ContentBlock } from "@/lib/types/campaign";
import { transitionProposal, canApplyArtifacts } from "../types";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";
import { assembleCardOfferMeasurableOutcome as assembleF1 } from "../outcome-assembler";

function fact(
  partial: Partial<KnowledgeFact> & Pick<KnowledgeFact, "id" | "kind" | "value">
): KnowledgeFact {
  return {
    schemaVersion: KNOWLEDGE_FACT_SCHEMA_VERSION,
    scope: { domain: "offer" },
    source: { kind: "campaign", ref: "camp_1" },
    confidence: 0.95,
    approvalState: "approved",
    lastVerifiedAt: new Date().toISOString(),
    contradictionState: "none",
    whereUsed: [],
    evidenceClass: "host_declared",
    version: 1,
    ...partial,
  };
}

function offerBlock(): ContentBlock {
  return {
    id: "blk_offer_1",
    type: "offer_coupon",
    order: 0,
    enabled: true,
    label: "Offer",
    data: {
      title: "Buy one get one coffee",
      description: "For returning guests",
      code: "BOGO",
      ctaLabel: "Claim offer",
      lockedUntilContact: true,
    },
  };
}

function baseAssemble(
  overrides: Parameters<typeof assembleCardOfferMeasurableOutcome>[0] extends infer T
    ? Partial<T>
    : never = {}
) {
  return assembleCardOfferMeasurableOutcome({
    brief: "Bring returning customers back this weekend",
    outcomeChoiceId: "returning_weekend",
    facts: [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ],
    brand: { businessName: "Demo Cafe", accentColor: "#d4af37", voice: "friendly" },
    card: { id: "card_1", hasSpotlight: true, boundCampaignId: "camp_1" },
    campaigns: [
      {
        id: "camp_1",
        title: "Weekend welcome",
        hasOffer: true,
        offerTitle: "Buy one get one coffee",
        offerDescription: "For returning guests",
        offerCode: "BOGO",
        offerBlockId: "blk_offer_1",
        boundToThisCard: true,
      },
    ],
    readiness: {
      featureOfferEnabled: true,
      featureAutopilotEnabled: true,
      emailConnected: false,
      consentPathAvailable: false,
      tapPointAssigned: true,
      askQuestionAvailable: true,
      keepCardAvailable: true,
    },
    localApprovalStatus: "approved",
    ...overrides,
  });
}

function prepareReady() {
  const assembled = baseAssemble();
  return prepareCardOfferMeasurableOutcome({
    plan: assembled.plan,
    campaign: {
      id: "camp_1",
      title: "Weekend welcome",
      status: "DRAFT",
      contentBlocks: [offerBlock()],
      offerTitle: "Buy one get one coffee",
      offerDescription: "For returning guests",
      offerCode: "BOGO",
      offerBlockId: "blk_offer_1",
    },
    card: { id: "card_1", sections: [] },
    businessName: "Demo Cafe",
    facts: [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ],
    readiness: {
      featureOfferEnabled: true,
      featureAutopilotEnabled: true,
      emailConnected: false,
      consentPathAvailable: false,
      askQuestionAvailable: true,
      keepCardAvailable: true,
    },
    prepareApproved: true,
    deviceCode: "DEMO01",
  });
}

function activateReady(
  overrides: Partial<Parameters<typeof activateCardOfferMeasurableOutcome>[0]> = {}
) {
  const prepared = prepareReady();
  assert.equal(prepared.ok, true);
  return activateCardOfferMeasurableOutcome({
    plan: prepared.plan,
    execution: prepared.execution,
    campaign: {
      id: "camp_1",
      title: "Weekend welcome",
      status: "DRAFT",
      contentBlocks: [offerBlock()],
      offerTitle: "Buy one get one coffee",
      offerDescription: "For returning guests",
      offerCode: "BOGO",
      offerBlockId: "blk_offer_1",
    },
    card: { id: "card_1", sections: [] },
    facts: [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ],
    readiness: {
      featureOfferEnabled: true,
      featureAutopilotEnabled: true,
      approvedTapPoints: [{ code: "DEMO01", label: "Front door" }],
      cardFirstApproved: false,
    },
    finalApprovalGranted: true,
    deviceCode: "DEMO01",
    ...overrides,
  });
}

describe("F3 final approval contract", () => {
  it("opens go-live when prepared and entry path exists", () => {
    const prepared = prepareReady();
    const facts = [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ];
    const gate = evaluateFinalApprovalGate({
      plan: prepared.plan,
      execution: prepared.execution,
      campaign: {
        id: "camp_1",
        title: "Weekend welcome",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      facts,
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [{ code: "DEMO01" }],
      },
    });
    assert.equal(gate.ok, true);
    assert.equal(gate.goLiveAvailable, true);
    assert.equal(gate.approvalCopy.primaryAction, "Make it live");
    assert.equal(gate.approvalCopy.approvalLabel, "Make this live");
    assert.match(gate.approvalCopy.notIncluded, /Email and social/i);
  });

  it("blocks when no customer entry path exists", () => {
    const prepared = prepareReady();
    const facts = [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ];
    const gate = evaluateFinalApprovalGate({
      plan: prepared.plan,
      execution: prepared.execution,
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      facts,
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [],
        cardFirstApproved: false,
      },
    });
    assert.equal(gate.ok, false);
    assert.equal(gate.blockers[0]?.code, "no_customer_entry_path");
  });
});

describe("F3 activation state machine", () => {
  it("transitions activating → live and live → paused → resume", () => {
    assert.equal(canTransitionLiveActivation("activating", { type: "mark_live" }), true);
    const live = transitionLiveActivation("activating", { type: "mark_live" });
    assert.equal(live.ok, true);
    if (live.ok) assert.equal(live.status, "live");
    const paused = transitionLiveActivation("live", { type: "pause" });
    assert.equal(paused.ok, true);
    if (paused.ok) assert.equal(paused.status, "paused");
  });
});

describe("F3 activation only from current prepared execution", () => {
  it("activates from prepared execution", () => {
    const result = activateReady();
    assert.equal(result.ok, true);
    assert.equal(result.activation.status, "live");
    assert.equal(result.activation.schemaVersion, LIVE_ACTIVATION_SCHEMA_VERSION);
    assert.equal(result.activation.hostStateDetail, "Your offer is live.");
    assert.equal(result.domain.campaignStatus, "LIVE");
  });

  it("rejects missing final approval", () => {
    const result = activateReady({ finalApprovalGranted: false });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "approval_missing");
  });
});

describe("F3 stale preparation blocks activation", () => {
  it("blocks when offer facts changed after prepare", () => {
    const prepared = prepareReady();
    const result = activateCardOfferMeasurableOutcome({
      plan: prepared.plan,
      execution: prepared.execution,
      campaign: {
        id: "camp_1",
        title: "Weekend welcome",
        status: "DRAFT",
        contentBlocks: [
          {
            ...offerBlock(),
            data: {
              ...(offerBlock().data as object),
              title: "Changed title after prepare",
            },
          } as ContentBlock,
        ],
      },
      card: { id: "card_1", sections: [] },
      facts: [
        fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
        fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
      ],
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [{ code: "DEMO01" }],
      },
      finalApprovalGranted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "offer_facts_changed");
  });
});

describe("F3 recipe/version compatibility", () => {
  it("rejects recipe mismatch", () => {
    const prepared = prepareReady();
    const mismatchedPlan = { ...prepared.plan, recipeId: "other.recipe" };
    const gate = evaluateFinalApprovalGate({
      plan: mismatchedPlan,
      execution: {
        ...prepared.execution,
        planFingerprint: fingerprintPlanForExecution(mismatchedPlan),
      },
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      facts: [
        fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
        fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
      ],
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [{ code: "DEMO01" }],
      },
    });
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.some((b) => b.code === "recipe_version_mismatch"));
  });
});

describe("F3 policy and feature gates", () => {
  it("blocks when feature disabled", () => {
    const result = activateReady({
      readiness: {
        featureOfferEnabled: false,
        approvedTapPoints: [{ code: "DEMO01" }],
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "feature_disabled");
  });
});

describe("F3 Campaign remains offer source of truth", () => {
  it("keeps Campaign offer facts authoritative after go-live", () => {
    const result = activateReady();
    assert.equal(result.ok, true);
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Weekend welcome",
      campaignStatus: result.domain.campaignStatus,
      blocks: [offerBlock()],
    });
    assert.ok(offer);
    assert.equal(offer!.title, "Buy one get one coffee");
    const sot = assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE);
    assert.equal(sot.ok, true);
  });
});

describe("F3 Spotlight remains projection", () => {
  it("projects Spotlight from Campaign offer", () => {
    const result = activateReady();
    assert.equal(result.ok, true);
    const section = result.domain.cardSections.find((s) => s.type === "special_offer");
    assert.ok(section);
    assert.equal(section!.offerMode, "campaign");
    assert.equal(section!.linkedCampaignId, "camp_1");
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Weekend",
      campaignStatus: "LIVE",
      blocks: [offerBlock()],
    });
    assert.equal(detectOfferProjectionState({ section, offer }), "current");
  });
});

describe("F3 approved customer entry path required", () => {
  it("fails without entry path", () => {
    const result = activateReady({
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [],
        cardFirstApproved: false,
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "no_customer_entry_path");
  });
});

describe("F3 no false Live without resolver reachability", () => {
  it("compensates when resolver unreachable", () => {
    const result = activateReady({ simulateFailure: "resolver" });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "resolver_unreachable");
    assert.equal(result.activation.status, "failed");
    assert.equal(result.domain.campaignStatus, "DRAFT");
  });
});

describe("F3 coordinated activation success", () => {
  it("activates campaign, spotlight, observation, audit", () => {
    const result = activateReady();
    assert.equal(result.ok, true);
    assert.equal(result.domain.campaignStatus, "LIVE");
    assert.equal(result.domain.insightsObservationActive, true);
    assert.ok(result.activation.auditRefs.some((a) => a.action === "activation_completed"));
    assert.ok(result.activation.auditRefs.some((a) => a.action === "observation_started"));
    assert.equal(result.activation.distributionSent, false);
    assert.equal(result.activation.customerContactOccurred, false);
    const v = validateLiveActivation(result.activation);
    assert.equal(v.ok, true);
  });
});

describe("F3 compensation after failures", () => {
  it("compensates after Spotlight failure", () => {
    const result = activateReady({ simulateFailure: "spotlight" });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.compensated, true);
    assert.equal(result.domain.campaignStatus, "DRAFT");
    assert.equal(result.domain.cardSections.length, 0);
  });

  it("compensates after Campaign failure", () => {
    const result = activateReady({ simulateFailure: "campaign" });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "campaign_activation_failed");
    assert.equal(result.domain.campaignStatus, "DRAFT");
  });

  it("compensates after Insights failure when required", () => {
    const result = activateReady({
      simulateFailure: "insights",
      insights: { canActivate: false, required: true },
    });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "insights_activation_failed");
  });
});

describe("F3 idempotent double activation", () => {
  it("does not duplicate on second Make it live", () => {
    const prepared = prepareReady();
    const input = {
      plan: prepared.plan,
      execution: prepared.execution,
      campaign: {
        id: "camp_1",
        title: "Weekend welcome",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
        offerTitle: "Buy one get one coffee",
        offerDescription: "For returning guests",
        offerCode: "BOGO",
        offerBlockId: "blk_offer_1",
      },
      card: { id: "card_1", sections: [] as [] },
      facts: [
        fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
        fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
      ],
      readiness: {
        featureOfferEnabled: true,
        featureAutopilotEnabled: true,
        approvedTapPoints: [{ code: "DEMO01", label: "Front door" }],
        cardFirstApproved: false,
      },
      finalApprovalGranted: true,
      deviceCode: "DEMO01",
    };
    const first = activateCardOfferMeasurableOutcome(input);
    assert.equal(first.ok, true);
    const second = activateCardOfferMeasurableOutcome({
      ...input,
      campaign: {
        ...input.campaign,
        status: first.domain.campaignStatus,
      },
      card: { id: "card_1", sections: first.domain.cardSections },
      existingActivation: first.activation,
    });
    assert.equal(second.ok, true);
    assert.equal(second.idempotent, true);
    assert.equal(second.activation.activationId, first.activation.activationId);
    assert.ok(second.activation.auditRefs.some((a) => a.action === "idempotent_hit"));
  });
});

describe("F3 concurrent edit rejection", () => {
  it("aborts and marks stale on campaign concurrent edit", () => {
    const result = activateReady({
      concurrent: {
        expectedCampaignUpdatedAt: "t1",
        campaignUpdatedAt: "t2",
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.activation.failure?.code, "concurrent_edit");
    assert.equal(result.execution.readiness.stale, true);
  });
});

describe("F3 scheduled outcome not labeled Live early", () => {
  it("labels Scheduled when start is later", () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const prepared = prepareReady();
    const facts = [
      fact({ id: "f_title", kind: "offer.title", value: "Buy one get one coffee" }),
      fact({ id: "f_value", kind: "offer.value", value: "Buy one get one coffee" }),
    ];
    const scheduled = activateCardOfferMeasurableOutcome({
      plan: {
        ...prepared.plan,
        schedule: { startsAt, notes: "Next weekend" },
      },
      execution: prepared.execution,
      campaign: {
        id: "camp_1",
        title: "Weekend welcome",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
        offerTitle: "Buy one get one coffee",
        offerDescription: "For returning guests",
        offerCode: "BOGO",
        offerBlockId: "blk_offer_1",
        scheduledStart: startsAt,
      },
      card: { id: "card_1", sections: [] },
      facts,
      readiness: {
        featureOfferEnabled: true,
        approvedTapPoints: [{ code: "DEMO01" }],
      },
      finalApprovalGranted: true,
    });
    assert.equal(scheduled.ok, true);
    assert.equal(scheduled.activation.status, "scheduled");
    assert.match(scheduled.activation.hostStateDetail, /Scheduled/i);
    assert.notEqual(scheduled.activation.hostStateDetail, "Your offer is live.");
    assert.equal(scheduled.domain.campaignStatus, "SCHEDULED");
  });
});

describe("F3 observation evidence classification", () => {
  it("does not show fake confirmed zeros", () => {
    const summary = buildLiveObservationSummary({
      activationId: "a1",
      campaignId: "camp_1",
      statusLabel: "Live",
      entryPathCount: 12,
      entryKind: "tap_point",
      scheduleLabel: "Now",
      observationActive: true,
      events: {},
    });
    assert.match(summary.headline, /12 Tap Points/);
    const views = summary.metrics.find((m) => m.key === "spotlight_views");
    assert.equal(views?.evidenceClass, "incomplete");
    assert.equal(views?.statement, null);
    const withClaims = buildLiveObservationSummary({
      activationId: "a1",
      campaignId: "camp_1",
      statusLabel: "Live",
      entryPathCount: 12,
      entryKind: "tap_point",
      scheduleLabel: "Now",
      observationActive: true,
      events: { spotlightViews: 18, claims: 4 },
    });
    const lines = visibleObservationStatements(withClaims);
    assert.ok(lines.some((l) => /18 people viewed/i.test(l)));
    assert.ok(lines.some((l) => /4 people claimed/i.test(l)));
    assert.ok(lines.some((l) => /Email was prepared but has not been sent/i.test(l)));
  });
});

describe("F3 no Distribution send / no customer contact", () => {
  it("keeps external boundary", () => {
    const result = activateReady();
    const check = assertF3ExternalBoundary(result.activation);
    assert.equal(check.ok, true);
    assert.equal(result.activation.distributionSent, false);
    assert.equal(result.activation.customerContactOccurred, false);
    assert.equal(result.execution.liveSend, false);
    assert.equal(result.execution.customerContactOccurred, false);
  });
});

describe("F3 Stop Pause Undo manual", () => {
  it("Stop removes customer visibility", () => {
    const live = activateReady();
    const stopped = interruptLiveActivation({
      activation: live.activation,
      plan: live.plan,
      execution: live.execution,
      domain: live.domain,
      mode: "stop",
    });
    assert.equal(stopped.ok, true);
    assert.equal(stopped.activation.status, "stopped");
    assert.equal(stopped.domain.campaignStatus, "PAUSED");
    const proof = provePublicOfferReachable({
      domain: stopped.domain,
      campaignId: "camp_1",
      offerFeatureOn: true,
    });
    assert.equal(proof.offerVisible, false);
  });

  it("Pause and resume", () => {
    const live = activateReady();
    const paused = interruptLiveActivation({
      activation: live.activation,
      plan: live.plan,
      execution: live.execution,
      domain: live.domain,
      mode: "pause",
    });
    assert.equal(paused.activation.status, "paused");
    const resumed = resumeLiveActivation({
      activation: paused.activation,
      plan: paused.plan,
      execution: paused.execution,
      domain: paused.domain,
    });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.activation.status, "live");
    assert.equal(resumed.domain.campaignStatus, "LIVE");
  });

  it("Undo go-live restores prior state and preserves evidence", () => {
    const live = activateReady();
    const undone = interruptLiveActivation({
      activation: live.activation,
      plan: live.plan,
      execution: live.execution,
      domain: live.domain,
      mode: "undo",
    });
    assert.equal(undone.ok, true);
    assert.equal(undone.activation.status, "rolled_back");
    assert.equal(undone.domain.campaignStatus, "DRAFT");
    assert.equal(undone.domain.preservedEvidence.claimsPreserved, true);
    assert.equal(undone.domain.preservedEvidence.consentPreserved, true);
    assert.equal(undone.domain.preservedEvidence.relationshipsPreserved, true);
    assert.equal(undone.domain.preservedEvidence.auditPreserved, true);
    assert.equal(undone.execution.status, "prepared");
    assert.equal(undone.execution.readiness.goLiveAvailable, true);
  });

  it("manual takeover freezes Autopilot", () => {
    const live = activateReady();
    const manual = interruptLiveActivation({
      activation: live.activation,
      plan: live.plan,
      execution: live.execution,
      domain: live.domain,
      mode: "manual",
    });
    assert.equal(manual.activation.status, "manual_control");
    assert.equal(manual.execution.manualControl.active, true);
  });
});

describe("F3 plain-language and hidden wiring", () => {
  it("primary copy stays host-safe", () => {
    const result = activateReady();
    const copy = primaryCopyFromActivation(result.activation);
    const check = assertLivePrimaryCopySafe(copy);
    assert.equal(check.ok, true);
    assert.match(result.activation.honestyStatement, /Email and social/i);
    assert.equal(F3_EXTERNAL_BOUNDARY.includes("have not been sent"), true);
    assert.match(F3_HONESTY_STATEMENT, /Your offer is live/);
  });

  it("final approval copy hides wiring", () => {
    const copy = buildFinalApprovalCopy({
      offerTitle: "BOGO coffee",
      audience: "Returning customers",
      where: "12 Tap Points",
      when: "This weekend",
      measured: "Views, claims",
      excludeSend: true,
    });
    const check = assertLivePrimaryCopySafe(Object.values(copy));
    assert.equal(check.ok, true);
  });
});

describe("F3 public path proof", () => {
  it("offer reachable after live and cleared after stop", () => {
    const live = activateReady();
    const proof = provePublicOfferReachable({
      domain: live.domain,
      campaignId: "camp_1",
      offerFeatureOn: true,
    });
    assert.equal(proof.reachable, true);
    assert.equal(proof.offerVisible, true);
    const stopped = interruptLiveActivation({
      activation: live.activation,
      plan: live.plan,
      execution: live.execution,
      domain: live.domain,
      mode: "stop",
    });
    const cleared = provePublicOfferReachable({
      domain: stopped.domain,
      campaignId: "camp_1",
      offerFeatureOn: true,
    });
    assert.equal(cleared.offerVisible, false);
  });

  it("observation refresh after claim/view events", () => {
    const live = activateReady();
    const obs = refreshObservation({
      activation: live.activation,
      events: { spotlightViews: 3, claims: 1, keeps: 1 },
    });
    assert.ok(visibleObservationStatements(obs).some((l) => /3 people viewed/i.test(l)));
    assert.ok(visibleObservationStatements(obs).some((l) => /1 person claimed/i.test(l)));
  });
});

describe("F3 derive live label honesty", () => {
  it("refuses Live without entry path", () => {
    const schedule = evaluateScheduleWindow({ notes: "Now" });
    const derived = deriveCustomerLiveState({
      activationStatus: "live",
      campaignStatus: "LIVE",
      schedule,
      resolverReachable: false,
      spotlightMatchesOffer: true,
      observationActive: true,
      hasAuditEvidence: true,
    });
    assert.equal(derived.maySayYourOfferIsLive, false);
  });
});

describe("F3 activation key idempotency helper", () => {
  it("builds stable activation keys", () => {
    const key = buildActivationKey({
      planId: "p1",
      preparedExecutionId: "e1",
      approvalId: "a1",
      fingerprints: { plan: "fp", facts: "ff", offer: "of", preparation: "pr" },
    });
    assert.equal(key.includes("p1"), true);
    assert.equal(key.includes("e1"), true);
  });
});

describe("F0/F1/F2 regression from F3 suite", () => {
  it("F2 prepare still has no live side effects before activation", () => {
    const prepared = prepareReady();
    const check = assertNoLiveSideEffects(prepared.execution);
    assert.equal(check.ok, true);
    assert.equal(prepared.execution.livePublish, false);
    assert.equal(prepared.execution.readiness.goLiveAvailable, false);
  });

  it("F1 assemble still works", () => {
    const assembled = assembleF1({
      brief: "Weekend offer",
      outcomeChoiceId: "measurable_card_offer",
      facts: [],
      brand: { businessName: "Demo" },
      card: { id: "card_1" },
      campaigns: [
        {
          id: "camp_1",
          title: "Weekend",
          hasOffer: true,
          offerTitle: "BOGO",
          offerDescription: "Coffee",
          offerBlockId: "blk_offer_1",
        },
      ],
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
        tapPointAssigned: true,
      },
    });
    assert.ok(assembled.plan.id);
    assert.equal(assembled.liveExecution, false);
  });

  it("J16 proposal lifecycle still transitions", async () => {
    resetProposalMemory();
    await createProposal({
      id: "prop_f3_reg",
      businessId: "biz_f3",
      recipeId: "campaign.full_draft",
      recipeVersion: "1.2.0",
      mode: "recommend",
      prompt: "Draft a welcome campaign",
      summary: "Welcome draft",
      artifacts: [{ kind: "theme", label: "T", payload: {} }],
    });
    const accepted = await decideProposal({
      proposalId: "prop_f3_reg",
      businessId: "biz_f3",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(canApplyArtifacts(accepted.proposal.status), true);
    const undone = transitionProposal(accepted.proposal.status, { type: "undo" });
    assert.equal(undone.ok, true);
  });
});
