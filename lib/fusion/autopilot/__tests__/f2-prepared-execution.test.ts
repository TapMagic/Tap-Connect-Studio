/**
 * Autopilot F2 — prepared outcome execution for card.offer.measurable@1.0.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleCardOfferMeasurableOutcome } from "../outcome-assembler";
import {
  KNOWLEDGE_FACT_SCHEMA_VERSION,
  type KnowledgeFact,
} from "../knowledge-fact";
import {
  assertNoLiveSideEffects,
  markPreparedExecutionStaleIfNeeded,
  prepareCardOfferMeasurableOutcome,
  rollbackPreparedOutcome,
  takeManualControl,
  applyPreparedSpotlightDraft,
} from "../prepared-orchestrator";
import {
  detectPreparedExecutionStale,
  fingerprintPlanForExecution,
  transitionPreparedExecution,
  validatePreparedExecution,
  PREPARED_EXECUTION_SCHEMA_VERSION,
} from "../prepared-execution";
import {
  assertPreparedPrimaryCopySafe,
  F2_HONESTY_STATEMENT,
  preparedStatusHostCopy,
  primaryCopyFromExecution,
} from "../prepared-host";
import { CARD_OFFER_MEASURABLE_RECIPE } from "../outcome-recipe";
import { assertOfferFuseSourceOfTruth } from "../outcome-recipe";
import {
  extractAuthoritativeOffer,
  projectOfferOntoSpotlight,
  unprojectSpotlightOffer,
  buildOfferDistributionPackage,
  detectOfferProjectionState,
} from "@/lib/fusion/card/offer";
import type { TapCardSection } from "@/lib/brand/tap-card";
import type { ContentBlock } from "@/lib/types/campaign";
import { transitionProposal, canApplyArtifacts } from "../types";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";

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

function baseAssemble(overrides: Parameters<typeof assembleCardOfferMeasurableOutcome>[0] extends infer T ? Partial<T> : never = {}) {
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

function prepareFromApproved(overrides: Partial<Parameters<typeof prepareCardOfferMeasurableOutcome>[0]> = {}) {
  const assembled = baseAssemble();
  assert.equal(assembled.plan.status, "approved");
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
    card: {
      id: "card_1",
      sections: [],
    },
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
    ...overrides,
  });
}

describe("F2 approved-plan execution only", () => {
  it("prepares drafts from an approved plan", () => {
    const result = prepareFromApproved();
    assert.equal(result.ok, true);
    assert.equal(result.execution.status, "prepared");
    assert.equal(result.execution.schemaVersion, PREPARED_EXECUTION_SCHEMA_VERSION);
    assert.equal(result.execution.hostStateDetail, "Your offer is prepared and ready to go live.");
    assert.ok(result.execution.hostSummary);
    assert.equal(result.execution.livePublish, false);
    assert.equal(result.execution.readiness.goLiveAvailable, false);
    const v = validatePreparedExecution(result.execution);
    assert.equal(v.ok, true);
  });

  it("rejects unapproved plans", () => {
    const assembled = baseAssemble({ localApprovalStatus: "draft" });
    const result = prepareCardOfferMeasurableOutcome({
      plan: { ...assembled.plan, status: "draft" },
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      businessName: "Demo Cafe",
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
      prepareApproved: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "plan_not_approved");
  });

  it("rejects when prepare approval missing", () => {
    const result = prepareFromApproved({ prepareApproved: false });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "policy_approval_missing");
  });
});

describe("F2 recipe/version compatibility", () => {
  it("rejects major recipe version mismatch", () => {
    const assembled = baseAssemble();
    const result = prepareCardOfferMeasurableOutcome({
      plan: { ...assembled.plan, recipeVersion: "2.0.0" },
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      businessName: "Demo Cafe",
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
      prepareApproved: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "recipe_version_mismatch");
  });
});

describe("F2 source-of-truth ownership", () => {
  it("keeps Campaign as offer source of truth and Spotlight as projection", () => {
    const result = prepareFromApproved();
    assert.equal(result.ok, true);
    const campaign = result.execution.preparedObjects.find((o) => o.kind === "campaign_draft");
    const facts = result.execution.preparedObjects.find((o) => o.kind === "offer_coupon_facts");
    const spotlight = result.execution.preparedObjects.find(
      (o) => o.kind === "card_spotlight_projection"
    );
    const dist = result.execution.preparedObjects.find((o) => o.kind === "distribution_package");
    assert.equal(campaign?.role, "authoritative");
    assert.equal(facts?.role, "authoritative");
    assert.equal(facts?.draftState?.ownership, "campaign.offer_coupon");
    assert.equal(spotlight?.role, "projection");
    assert.equal(spotlight?.draftState?.ownership, "projection");
    assert.equal(dist?.role, "variant");
    assert.equal(dist?.draftState?.ownership, "variant");
    assert.equal(dist?.draftState?.mock, true);
    assert.equal(dist?.draftState?.liveSend, false);
    const sot = assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE);
    assert.equal(sot.ok, true);
  });

  it("Distribution remains a mock variant", () => {
    const result = prepareFromApproved();
    const dist = result.execution.preparedObjects.find((o) => o.kind === "distribution_package");
    const pkg = dist?.draftState?.package as { mock?: boolean; status?: string };
    assert.equal(pkg?.mock, true);
    assert.equal(pkg?.status, "prepared");
  });
});

describe("F2 status transitions", () => {
  it("supports preparing → prepared and prepared → rolled_back", () => {
    const t1 = transitionPreparedExecution("pending", { type: "start_prepare" });
    assert.equal(t1.ok, true);
    if (t1.ok) assert.equal(t1.status, "preparing");
    const t2 = transitionPreparedExecution("preparing", { type: "mark_prepared" });
    assert.equal(t2.ok, true);
    if (t2.ok) assert.equal(t2.status, "prepared");
    const t3 = transitionPreparedExecution("prepared", { type: "rollback" });
    assert.equal(t3.ok, true);
    if (t3.ok) assert.equal(t3.status, "rolled_back");
  });
});

describe("F2 reversible draft application + rollback", () => {
  it("applies spotlight draft and rollback restores prior section", () => {
    const prior: TapCardSection = {
      id: "sec_offer",
      type: "special_offer",
      enabled: true,
      order: 0,
      label: "Special offer",
      specialStyle: "banner",
      offerMode: "expand",
      headline: "Host teaser",
      text: "Offer",
    };
    const result = prepareFromApproved({
      card: { id: "card_1", sections: [prior] },
      preservePresentation: true,
    });
    assert.equal(result.ok, true);
    const applied = applyPreparedSpotlightDraft([prior], result.execution);
    assert.equal(applied[0]?.offerMode, "campaign");
    assert.equal(applied[0]?.linkedCampaignId, "camp_1");
    assert.equal(applied[0]?.headline, "Host teaser"); // preserved

    const rolled = rollbackPreparedOutcome({
      execution: result.execution,
      plan: result.plan,
      cardSections: applied,
    });
    assert.equal(rolled.ok, true);
    assert.equal(rolled.execution.status, "rolled_back");
    assert.equal(rolled.execution.hostStateDetail, "The prepared changes were undone.");
    assert.equal(rolled.cardSections[0]?.offerMode, "expand");
    assert.equal(rolled.cardSections[0]?.linkedCampaignId, undefined);
    assert.equal(rolled.cardSections[0]?.headline, "Host teaser");
    // Campaign offer facts unchanged in execution draft prior
    const campaignObj = result.execution.preparedObjects.find((o) => o.kind === "campaign_draft");
    assert.ok(campaignObj?.priorState);
  });

  it("rollback preserves unrelated card sections", () => {
    const unrelated: TapCardSection = {
      id: "sec_about",
      type: "text",
      enabled: true,
      order: 1,
      label: "About",
      text: "We roast locally",
    };
    const result = prepareFromApproved({
      card: { id: "card_1", sections: [unrelated] },
    });
    assert.equal(result.ok, true);
    const applied = applyPreparedSpotlightDraft([unrelated], result.execution);
    assert.equal(applied.length, 2);
    const rolled = rollbackPreparedOutcome({
      execution: result.execution,
      plan: result.plan,
      cardSections: applied,
    });
    const about = rolled.cardSections.find((s) => s.id === "sec_about");
    assert.ok(about);
    assert.equal(about?.text, "We roast locally");
    // Created spotlight removed
    assert.equal(
      rolled.cardSections.some((s) => s.type === "special_offer" && s.offerMode === "campaign"),
      false
    );
  });
});

describe("F2 stale detection", () => {
  it("marks prepared execution stale when plan fingerprint changes", () => {
    const result = prepareFromApproved();
    assert.equal(result.ok, true);
    const changedPlan = {
      ...result.plan,
      updatedAt: new Date(Date.now() + 1000).toISOString(),
      objective: "Changed goal",
    };
    const marked = markPreparedExecutionStaleIfNeeded({
      execution: result.execution,
      plan: changedPlan,
      facts: [],
    });
    assert.equal(marked.readiness.stale, true);
    assert.equal(marked.readiness.outcome, "stale_prepare_again");
    const detected = detectPreparedExecutionStale({
      execution: result.execution,
      currentPlanFingerprint: fingerprintPlanForExecution(changedPlan),
      currentFactsFingerprint: result.execution.factsFingerprint,
    });
    assert.equal(detected.stale, true);
  });
});

describe("F2 interventions and gates", () => {
  it("missing authoritative fact intervention", () => {
    const assembled = baseAssemble();
    const result = prepareCardOfferMeasurableOutcome({
      plan: assembled.plan,
      campaign: {
        id: "camp_1",
        title: "Empty",
        status: "DRAFT",
        contentBlocks: [],
      },
      card: { id: "card_1", sections: [] },
      businessName: "Demo Cafe",
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
      prepareApproved: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "missing_authoritative_fact");
  });

  it("contradiction intervention", () => {
    const assembled = baseAssemble({
      facts: [
        fact({
          id: "f_bad",
          kind: "offer.title",
          value: "A",
          contradictionState: "confirmed",
        }),
      ],
    });
    // Force approved for gate testing of prepare path
    const result = prepareCardOfferMeasurableOutcome({
      plan: { ...assembled.plan, status: "approved" },
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      businessName: "Demo Cafe",
      facts: [
        fact({
          id: "f_bad",
          kind: "offer.title",
          value: "A",
          contradictionState: "confirmed",
        }),
      ],
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
      prepareApproved: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "contradiction");
  });

  it("feature disabled gate", () => {
    const result = prepareFromApproved({
      readiness: {
        featureOfferEnabled: false,
        featureAutopilotEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "feature_disabled");
  });

  it("campaign archived gate", () => {
    const result = prepareFromApproved({
      campaign: {
        id: "camp_1",
        title: "Old",
        status: "ARCHIVED",
        contentBlocks: [offerBlock()],
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "campaign_unavailable");
  });

  it("spotlight bind conflict", () => {
    const boundOther: TapCardSection = {
      id: "sec_offer",
      type: "special_offer",
      enabled: true,
      order: 0,
      label: "Special offer",
      specialStyle: "banner",
      offerMode: "campaign",
      linkedCampaignId: "camp_other",
    };
    const result = prepareFromApproved({
      card: { id: "card_1", sections: [boundOther] },
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "spotlight_bind_conflict");
  });

  it("policy invent gate", () => {
    const assembled = baseAssemble();
    const plan = {
      ...assembled.plan,
      objectMutations: [
        ...assembled.plan.objectMutations,
        {
          id: "attempt.invent.price",
          kind: "update" as const,
          target: "campaign.offer_coupon" as const,
          ownership: "authoritative" as const,
          description: "Invent",
          payload: { inventDiscount: true },
        },
      ],
    };
    const result = prepareCardOfferMeasurableOutcome({
      plan,
      campaign: {
        id: "camp_1",
        title: "Weekend",
        status: "DRAFT",
        contentBlocks: [offerBlock()],
      },
      card: { id: "card_1", sections: [] },
      businessName: "Demo Cafe",
      readiness: {
        featureOfferEnabled: true,
        emailConnected: false,
        consentPathAvailable: false,
      },
      prepareApproved: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "policy_approval_missing");
  });
});

describe("F2 no live side effects", () => {
  it("never publishes, sends, spends, or contacts customers", () => {
    const result = prepareFromApproved();
    assert.equal(result.ok, true);
    const check = assertNoLiveSideEffects(result.execution);
    assert.equal(check.ok, true, check.errors.join("; "));
    assert.equal(result.execution.customerContactOccurred, false);
    assert.equal(result.execution.providerLiveAction, false);
    assert.equal(result.execution.honestyStatement, F2_HONESTY_STATEMENT);
  });
});

describe("F2 host-facing summary and hidden wiring", () => {
  it("outcome-level host summary without forbidden primary terms", () => {
    const result = prepareFromApproved();
    assert.ok(result.execution.hostSummary?.onCard.includes("Buy one get one coffee"));
    assert.ok(result.execution.hostSummary?.audience);
    assert.ok(result.execution.hostSummary?.afterGoLive.includes("Nothing is live yet"));
    const copy = primaryCopyFromExecution(result.execution);
    const check = assertPreparedPrimaryCopySafe(copy);
    assert.equal(check.ok, true, JSON.stringify(check));
    assert.equal(preparedStatusHostCopy("preparing").detail.includes("preparing your Card offer"), true);
  });
});

describe("F2 manual control", () => {
  it("freezes Autopilot and retains audit/rollback", () => {
    const result = prepareFromApproved();
    const manual = takeManualControl({
      execution: result.execution,
      editorHref: "/dashboard/card/edit",
    });
    assert.equal(manual.manualControl.active, true);
    assert.ok(manual.auditRefs.some((a) => a.action === "manual_takeover"));
    assert.ok(manual.reversibleActions.length > 0);
    assert.equal(manual.preparedObjects.length, result.execution.preparedObjects.length);
  });
});

describe("F2 Offer Fuse domain reuse", () => {
  it("uses extract / project / unproject / distribution contracts", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Weekend",
      campaignStatus: "DRAFT",
      blocks: [offerBlock()],
    });
    assert.ok(offer);
    const section: TapCardSection = {
      id: "s1",
      type: "special_offer",
      enabled: true,
      order: 0,
      label: "Offer",
      specialStyle: "banner",
    };
    const projected = projectOfferOntoSpotlight({ section, offer: offer! });
    assert.equal(projected.offerMode, "campaign");
    assert.equal(detectOfferProjectionState({ section: projected, offer }).toString(), "current");
    const cleared = unprojectSpotlightOffer(projected);
    assert.equal(cleared.linkedCampaignId, undefined);
    assert.notEqual(cleared.offerMode, "campaign");
    const pkg = buildOfferDistributionPackage({
      offer: offer!,
      businessName: "Demo Cafe",
    });
    assert.equal(pkg.mock, true);
  });
});

describe("F2 regression — J16 proposal path untouched", () => {
  it("proposal accept/undo still works (J16)", async () => {
    resetProposalMemory();
    await createProposal({
      id: "prop_f2_reg",
      businessId: "biz_f2",
      recipeId: "campaign.full_draft",
      recipeVersion: "1.2.0",
      mode: "recommend",
      prompt: "Draft a welcome campaign",
      summary: "Welcome draft",
      artifacts: [{ kind: "theme", label: "T", payload: {} }],
    });
    const accepted = await decideProposal({
      proposalId: "prop_f2_reg",
      businessId: "biz_f2",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(canApplyArtifacts(accepted.proposal.status), true);
    const undone = transitionProposal(accepted.proposal.status, { type: "undo" });
    assert.equal(undone.ok, true);
  });
});

describe("F2 partial failure recovery reporting", () => {
  it("reports failure without claiming live side effects", () => {
    const result = prepareFromApproved({
      card: { id: "card_1", sections: [], retired: true },
    });
    assert.equal(result.ok, false);
    assert.equal(result.execution.failure?.code, "card_unavailable");
    assert.equal(result.execution.livePublish, false);
    assert.equal(result.execution.liveSend, false);
    assert.ok(result.execution.auditRefs.some((a) => a.action === "preparation_failed"));
  });
});
