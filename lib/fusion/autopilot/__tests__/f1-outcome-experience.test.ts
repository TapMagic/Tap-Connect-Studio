/**
 * Autopilot F1 — deterministic outcome assembler + plain-language experience.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assembleCardOfferMeasurableOutcome,
  OUTCOME_CHOICES,
  suggestOutcomes,
} from "../outcome-assembler";
import {
  assertNoForbiddenPrimaryTerminology,
  groupApprovalsForHost,
  plainApprovalLevel,
} from "../plain-language";
import { buildHostQuestions } from "../host-questions";
import {
  KNOWLEDGE_FACT_SCHEMA_VERSION,
  type KnowledgeFact,
} from "../knowledge-fact";
import { transitionProposal, canApplyArtifacts } from "../types";
import { CARD_OFFER_MEASURABLE_RECIPE } from "../outcome-recipe";
import { assertOfferFuseSourceOfTruth } from "../outcome-recipe";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";

function fact(partial: Partial<KnowledgeFact> & Pick<KnowledgeFact, "id" | "kind" | "value">): KnowledgeFact {
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

function baseInput(overrides: Parameters<typeof assembleCardOfferMeasurableOutcome>[0] extends infer T ? Partial<T> : never = {}) {
  return {
    brief: "Bring returning customers back this weekend",
    outcomeChoiceId: "returning_weekend" as const,
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
    ...overrides,
  };
}

describe("F1 deterministic plan assembly", () => {
  it("assembles a versioned AutopilotPlan for card.offer.measurable", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    assert.equal(result.plan.recipeId, "card.offer.measurable");
    assert.equal(result.plan.recipeVersion, "1.0.0");
    assert.equal(result.liveExecution, false);
    assert.equal(result.inventsPriceOrDiscount, false);
    assert.ok(result.preparedSummary.length > 20);
    assert.equal(result.state === "ready_to_review" || result.state === "needs_detail", true);
  });

  it("uses approved facts without re-asking", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    const valueQuestions = result.questions.filter((q) =>
      q.prompt.toLowerCase().includes("what should customers receive")
    );
    assert.equal(valueQuestions.length, 0);
    assert.ok(result.understood.includes("Buy one get one coffee"));
  });

  it("turns missing required facts into concise questions", () => {
    const result = assembleCardOfferMeasurableOutcome(
      baseInput({
        facts: [],
        campaigns: [
          {
            id: "camp_1",
            title: "Weekend",
            hasOffer: true,
            offerTitle: null,
            boundToThisCard: true,
          },
        ],
      })
    );
    assert.equal(result.state, "needs_detail");
    assert.ok(result.questions.some((q) => q.prompt === "What should customers receive?"));
  });

  it("blocks safely on contradictions", () => {
    const result = assembleCardOfferMeasurableOutcome(
      baseInput({
        facts: [
          fact({
            id: "f_bad",
            kind: "offer.title",
            value: "A",
            contradictionState: "confirmed",
            approvalState: "approved",
          }),
        ],
      })
    );
    assert.equal(result.state, "cannot_continue");
    assert.ok(result.questions.some((q) => q.relatedInterventionCodes.includes("contradiction")) ||
      result.plan.humanInterventions.some((i) => i.code === "contradiction"));
  });

  it("creates intervention on low confidence", () => {
    const result = assembleCardOfferMeasurableOutcome(
      baseInput({
        facts: [
          fact({
            id: "f_low",
            kind: "offer.title",
            value: "Maybe deal",
            confidence: 0.2,
          }),
        ],
        campaigns: [
          {
            id: "camp_1",
            title: "Weekend",
            hasOffer: true,
            offerTitle: null,
            boundToThisCard: true,
          },
        ],
      })
    );
    assert.ok(
      result.plan.humanInterventions.some((i) => i.code === "low_confidence") ||
        result.questions.some((q) => q.relatedInterventionCodes.includes("low_confidence"))
    );
  });

  it("translates policy approvals into plain language", () => {
    assert.equal(plainApprovalLevel("review_before_publish"), "Review before this appears on your Card");
    assert.equal(plainApprovalLevel("review_before_send"), "Review before customers are contacted");
    const grouped = groupApprovalsForHost([
      {
        id: "a1",
        level: "review_before_publish",
        reason: "x",
        blocking: true,
      },
      {
        id: "a2",
        level: "review_before_publish",
        reason: "y",
        blocking: true,
      },
    ]);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].sourceIds.length, 2);
  });

  it("encodes no duplicate Offer source of truth", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    assert.equal(result.duplicateOfferSourceOfTruth, false);
    assert.equal(result.advanced.sourceOfTruth.offerOwner, "campaign.offer_coupon");
    assert.equal(result.advanced.sourceOfTruth.cardSpotlight, "projection");
    assert.equal(assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE).ok, true);
  });

  it("never enables live execution or invents price/discount", () => {
    const result = assembleCardOfferMeasurableOutcome(
      baseInput({
        answers: { invent_discount: "true" },
      })
    );
    assert.equal(result.liveExecution, false);
    assert.equal(result.inventsPriceOrDiscount, false);
    assert.ok(
      result.plan.objectMutations.every(
        (m) => m.payload?.inventPrice !== true || m.id === "attempt.invent.price"
      )
    );
    assert.equal(result.state, "cannot_continue");
  });

  it("keeps primary plain-language free of contract terminology", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    assert.equal(result.primaryCopyCheck.ok, true, JSON.stringify(result.primaryCopyCheck));
    const check = assertNoForbiddenPrimaryTerminology([
      result.understood,
      result.preparedSummary,
      ...result.preparedComponents,
      ...result.questions.map((q) => q.prompt),
      ...result.plainApprovals.map((a) => a.label),
    ]);
    assert.equal(check.ok, true);
  });

  it("groups meaningful approvals rather than exposing every mutation", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    assert.ok(result.plainApprovals.length >= 1);
    assert.ok(
      result.plainApprovals.every(
        (a) =>
          !a.label.includes("objectMutation") &&
          !a.label.includes("review_before_")
      )
    );
  });

  it("builds a unified customer preview model", () => {
    const result = assembleCardOfferMeasurableOutcome(baseInput());
    const ids = result.preview.steps.map((s) => s.id);
    assert.ok(ids.includes("tap"));
    assert.ok(ids.includes("spotlight"));
    assert.ok(ids.includes("act"));
    assert.ok(ids.includes("insights"));
    assert.ok(ids.includes("ask"));
    assert.equal(result.preview.keepCardAvailable, true);
    assert.ok(result.preview.metrics.includes("Claims"));
  });

  it("exposes outcome choices including measurable Card offer", () => {
    assert.ok(OUTCOME_CHOICES.some((c) => c.id === "measurable_card_offer"));
    const suggested = suggestOutcomes({
      hasCard: true,
      hasEligibleCampaignOffer: true,
      boundOffer: true,
    });
    assert.ok(suggested.some((s) => s.id === "measurable_card_offer"));
  });
});

describe("F1 host questions", () => {
  it("does not ask for information already known", () => {
    const questions = buildHostQuestions({
      missingInformation: [],
      facts: [fact({ id: "f1", kind: "offer.title", value: "Deal" })],
      interventions: [],
      emailConnected: true,
    });
    assert.equal(
      questions.filter((q) => q.prompt === "What should customers receive?").length,
      0
    );
  });

  it("offers decide-later for non-blocking email connectivity", () => {
    const questions = buildHostQuestions({
      missingInformation: [],
      facts: [],
      interventions: [],
      emailConnected: false,
    });
    const emailQ = questions.find((q) => q.id === "email_not_connected");
    assert.ok(emailQ);
    assert.equal(emailQ!.allowDecideLater, true);
    assert.equal(emailQ!.blocking, false);
  });
});

describe("F1 J16 proposal compatibility", () => {
  it("preserves proposal lifecycle helpers", async () => {
    assert.equal(transitionProposal("pending", { type: "accept" }).ok, true);
    assert.equal(canApplyArtifacts("accepted"), true);
    resetProposalMemory();
    await createProposal({
      id: "prop_f1",
      businessId: "biz",
      recipeId: "campaign.full_draft",
      mode: "recommend",
      prompt: "x",
      summary: "y",
      artifacts: [],
    });
    const accepted = await decideProposal({
      proposalId: "prop_f1",
      businessId: "biz",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
  });
});
