/**
 * Autopilot F0 foundation — plan, facts, interventions, approval policy, certified recipe.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPlanTransition,
  AUTOPILOT_PLAN_SCHEMA_VERSION,
  isPlanCompatibleWithRecipeVersion,
  supersedePlan,
  transitionPlan,
  validateAutopilotPlan,
  type AutopilotPlan,
  type ObjectMutation,
} from "../plan";
import {
  canDeleteFact,
  correctKnowledgeFact,
  evaluateFactUsability,
  isFactAuthoritative,
  isFactStale,
  KNOWLEDGE_FACT_SCHEMA_VERSION,
  LOW_CONFIDENCE_THRESHOLD,
  missingInformationFromFacts,
  validateKnowledgeFact,
  type KnowledgeFact,
} from "../knowledge-fact";
import {
  createHumanIntervention,
  HUMAN_INTERVENTION_CODES,
  hasBlockingInterventions,
  validateHumanIntervention,
} from "../intervention";
import {
  CARD_OFFER_MEASURABLE_POLICY,
  decideApprovals,
  defaultPolicyForRecipe,
} from "../approval-policy";
import {
  assertOfferFuseSourceOfTruth,
  CARD_OFFER_MEASURABLE_RECIPE,
  CARD_OFFER_MEASURABLE_RECIPE_ID,
  CARD_OFFER_MEASURABLE_VERSION,
  gateCertifiedRecipeInputs,
  getCertifiedRecipe,
} from "../outcome-recipe";
import { transitionProposal, canApplyArtifacts } from "../types";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";
import { getRecipe, AUTOPILOT_RECIPES } from "../recipes";
import { checkAutopilotBudgetSync, resetAutopilotBudgetMemory } from "../budget";

function baseMutations(): ObjectMutation[] {
  return [
    {
      id: "m.spotlight",
      kind: "project",
      target: "card.spotlight",
      ownership: "projection",
      description: "Project Campaign offer onto Card Spotlight",
      payload: { presentationOnly: true },
    },
    {
      id: "m.publish_campaign",
      kind: "update",
      target: "campaign.offer_coupon",
      ownership: "authoritative",
      description: "Publish Campaign-owned offer",
      payload: { publish: true },
    },
  ];
}

function makePlan(overrides: Partial<AutopilotPlan> = {}): AutopilotPlan {
  const now = new Date().toISOString();
  return {
    id: "plan_1",
    schemaVersion: AUTOPILOT_PLAN_SCHEMA_VERSION,
    recipeId: CARD_OFFER_MEASURABLE_RECIPE_ID,
    recipeVersion: CARD_OFFER_MEASURABLE_VERSION,
    objective: "Put a measurable offer on the Card",
    strategy: "Campaign owns offer; Spotlight projects; measure fuse events",
    reason: "Host asked for a Card offer outcome",
    audience: { summary: "Local customers who tap the Card" },
    journeySummary: "Tap → Spotlight → claim → Insights",
    objectMutations: baseMutations(),
    factsUsed: ["fact_offer_title"],
    assumptions: [],
    missingInformation: [],
    providersRequired: ["mock.distribution"],
    costEstimate: { currency: "USD", amount: 0, basis: "F0 local only" },
    riskEstimate: { level: "low", rationale: "Presentation + publish gated" },
    approvalsRequired: [],
    schedule: { notes: "Host-controlled" },
    successMetrics: [{ id: "s1", name: "Claims", measure: "card.offer.claimed" }],
    fallback: {
      strategy: "configure",
      description: "Surface configure honesty if offer missing",
    },
    rollback: {
      strategy: "unproject",
      description: "Clear Spotlight projection; keep Campaign offer",
    },
    policyAutoApproved: [],
    humanInterventions: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
    planVersion: 1,
    ...overrides,
  };
}

function makeFact(overrides: Partial<KnowledgeFact> = {}): KnowledgeFact {
  return {
    id: "fact_1",
    schemaVersion: KNOWLEDGE_FACT_SCHEMA_VERSION,
    kind: "offer.title",
    scope: { domain: "offer" },
    value: "Weekend special",
    source: { kind: "campaign", ref: "camp_1" },
    confidence: 0.95,
    approvalState: "approved",
    lastVerifiedAt: new Date().toISOString(),
    contradictionState: "none",
    whereUsed: [],
    evidenceClass: "host_declared",
    version: 1,
    ...overrides,
  };
}

describe("F0 AutopilotPlan schema validation", () => {
  it("accepts a complete plan", () => {
    const result = validateAutopilotPlan(makePlan());
    assert.equal(result.ok, true);
  });

  it("rejects missing required fields", () => {
    const result = validateAutopilotPlan(makePlan({ objective: "" }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.some((e) => e.includes("objective")));
  });
});

describe("F0 AutopilotPlan transitions", () => {
  it("allows draft → ready_for_review → approved → applying → active", () => {
    let status = makePlan().status;
    for (const action of [
      { type: "submit_for_review" as const },
      { type: "approve" as const },
      { type: "start_apply" as const },
      { type: "mark_active" as const },
    ]) {
      const next = transitionPlan(status, action);
      assert.equal(next.ok, true);
      if (!next.ok) return;
      status = next.status;
    }
    assert.equal(status, "active");
  });

  it("rejects invalid transitions", () => {
    const bad = transitionPlan("draft", { type: "approve" });
    assert.equal(bad.ok, false);
    const stopped = transitionPlan("stopped", { type: "resume" });
    assert.equal(stopped.ok, false);
  });

  it("applyPlanTransition updates status and timestamp", () => {
    const plan = makePlan();
    const next = applyPlanTransition(plan, { type: "submit_for_review" });
    assert.equal(next.ok, true);
    if (!next.ok) return;
    assert.equal(next.plan.status, "ready_for_review");
    assert.ok(next.plan.updatedAt >= plan.updatedAt);
  });
});

describe("F0 plan and recipe version compatibility", () => {
  it("treats same major as compatible", () => {
    const r = isPlanCompatibleWithRecipeVersion("1.0.0", "1.2.0");
    assert.equal(r.compatible, true);
  });

  it("rejects major version bumps", () => {
    const r = isPlanCompatibleWithRecipeVersion("1.0.0", "2.0.0");
    assert.equal(r.compatible, false);
  });

  it("supersede creates a new draft revision", () => {
    const prior = makePlan({ status: "active", planVersion: 1 });
    const next = supersedePlan(prior, { reason: "Revised strategy" }, { newId: "plan_2" });
    assert.equal(next.id, "plan_2");
    assert.equal(next.status, "draft");
    assert.equal(next.planVersion, 2);
    assert.equal(next.supersedesPlanId, prior.id);
    assert.equal(prior.status, "active");
  });
});

describe("F0 KnowledgeFact invariants", () => {
  it("validates fact schema", () => {
    assert.equal(validateKnowledgeFact(makeFact()).ok, true);
    assert.equal(validateKnowledgeFact(makeFact({ confidence: 1.5 })).ok, false);
  });

  it("unapproved facts are never authoritative", () => {
    const fact = makeFact({ approvalState: "unapproved" });
    assert.equal(isFactAuthoritative(fact), false);
    const u = evaluateFactUsability(fact);
    assert.equal(u.usable, false);
    if (u.usable) return;
    assert.equal(u.reason, "unapproved");
  });

  it("rejected and retired facts are not usable", () => {
    assert.equal(evaluateFactUsability(makeFact({ approvalState: "rejected" })).usable, false);
    assert.equal(evaluateFactUsability(makeFact({ approvalState: "retired" })).usable, false);
  });

  it("confirmed contradiction blocks use", () => {
    const u = evaluateFactUsability(
      makeFact({ contradictionState: "confirmed", approvalState: "approved" })
    );
    assert.equal(u.usable, false);
    if (u.usable) return;
    assert.equal(u.reason, "confirmed_contradiction");
    assert.equal(u.intervention.code, "contradiction");
  });

  it("low confidence creates missing-information behavior", () => {
    const fact = makeFact({ confidence: LOW_CONFIDENCE_THRESHOLD });
    const interventions = missingInformationFromFacts([fact]);
    assert.equal(interventions.length, 1);
    assert.equal(interventions[0].code, "low_confidence");
    assert.equal(interventions[0].blocking, true);
  });

  it("stale facts are marked for verification", () => {
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const fact = makeFact({ lastVerifiedAt: old });
    assert.equal(isFactStale(fact), true);
    const u = evaluateFactUsability(fact);
    assert.equal(u.usable, false);
    if (u.usable) return;
    assert.equal(u.reason, "stale");
    assert.equal(u.intervention.code, "stale_fact");
  });

  it("facts referenced by live plans cannot be silently deleted", () => {
    const fact = makeFact({ whereUsed: ["plan_live"] });
    const blocked = canDeleteFact(fact, ["plan_live"]);
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.code, "referenced_by_live_plan");
    assert.equal(canDeleteFact(fact, ["other"]).ok, true);
  });

  it("correction creates a new version", () => {
    const prior = makeFact({ approvalState: "approved", version: 1 });
    const next = correctKnowledgeFact(prior, { value: "Corrected title" });
    assert.equal(next.version, 2);
    assert.equal(next.supersedesFactId, prior.id);
    assert.equal(next.approvalState, "unapproved");
    assert.equal(prior.value, "Weekend special");
  });
});

describe("F0 human-intervention reasons", () => {
  it("exposes all required reason codes", () => {
    const required = [
      "missing_fact",
      "contradiction",
      "low_confidence",
      "stale_fact",
      "consent_required",
      "publish_approval",
      "send_approval",
      "spend_approval",
      "budget_limit",
      "provider_unavailable",
      "policy_prohibited",
      "recovery_failed",
      "role_permission_required",
      "host_requested_review",
    ];
    for (const code of required) {
      assert.ok(HUMAN_INTERVENTION_CODES.includes(code as (typeof HUMAN_INTERVENTION_CODES)[number]));
    }
  });

  it("generates structured interventions with explanation and next action", () => {
    const intervention = createHumanIntervention({
      code: "missing_fact",
      affectedObjectOrStep: "offer.code",
    });
    assert.equal(validateHumanIntervention(intervention).ok, true);
    assert.ok(intervention.explanation.length > 0);
    assert.ok(intervention.suggestedNextAction.length > 0);
    assert.equal(intervention.blocking, true);
  });
});

describe("F0 Approval Policy Engine", () => {
  it("uses default policy for card.offer.measurable", () => {
    const policy = defaultPolicyForRecipe(CARD_OFFER_MEASURABLE_RECIPE_ID);
    assert.equal(policy.id, CARD_OFFER_MEASURABLE_POLICY.id);
  });

  it("auto-approves presentation drafts within limits", () => {
    const plan = makePlan({
      objectMutations: [
        {
          id: "pres",
          kind: "project",
          target: "card.spotlight",
          ownership: "projection",
          description: "Presentation draft",
          payload: { presentationOnly: true },
        },
      ],
      providersRequired: ["mock.distribution"],
    });
    const result = decideApprovals(plan);
    assert.ok(result.autoApproved.includes("pres"));
    assert.equal(result.prohibited.length, 0);
  });

  it("requires review before publish for Campaign/Card publish", () => {
    const plan = makePlan();
    const result = decideApprovals(plan);
    assert.ok(result.approvalsRequired.some((a) => a.level === "review_before_publish"));
    assert.ok(result.interventions.some((i) => i.code === "publish_approval"));
  });

  it("requires review before send for customer-contact", () => {
    const plan = makePlan({
      objectMutations: [
        {
          id: "email_send",
          kind: "prepare_distribution",
          target: "distribution.email",
          ownership: "variant",
          description: "Email follow-up",
          payload: { consentPathValid: true, customerContact: true },
        },
      ],
      providersRequired: ["mock.distribution"],
    });
    const result = decideApprovals(plan);
    assert.ok(result.approvalsRequired.some((a) => a.level === "review_before_send"));
  });

  it("prohibits inventing price or discount", () => {
    const plan = makePlan({
      objectMutations: [
        {
          id: "invent",
          kind: "update",
          target: "campaign.offer_coupon",
          ownership: "authoritative",
          description: "Invent discount",
          payload: { inventDiscount: true },
        },
      ],
      providersRequired: [],
    });
    const result = decideApprovals(plan);
    assert.ok(result.prohibited.includes("invent"));
    assert.ok(result.interventions.some((i) => i.code === "policy_prohibited"));
  });

  it("prohibits send without valid consent path", () => {
    const plan = makePlan({
      objectMutations: [
        {
          id: "bad_send",
          kind: "prepare_distribution",
          target: "distribution.email",
          ownership: "variant",
          description: "Email without consent",
          payload: { customerContact: true, consentPathValid: false },
        },
      ],
      providersRequired: [],
    });
    const result = decideApprovals(plan);
    assert.ok(result.prohibited.includes("bad_send"));
    assert.ok(result.interventions.some((i) => i.code === "consent_required"));
  });

  it("handles budget soft and hard thresholds", () => {
    const soft = decideApprovals(
      makePlan({
        costEstimate: { currency: "USD", amount: 5, basis: "test" },
        objectMutations: [],
        providersRequired: [],
      })
    );
    assert.ok(soft.approvalsRequired.some((a) => a.level === "review_before_spend"));

    const hard = decideApprovals(
      makePlan({
        costEstimate: { currency: "USD", amount: 25, basis: "test" },
        objectMutations: [],
        providersRequired: [],
      })
    );
    assert.ok(hard.approvalsRequired.some((a) => a.level === "prohibited"));
    assert.ok(hard.interventions.some((i) => i.code === "budget_limit"));
    assert.equal(hasBlockingInterventions(hard.interventions), true);
  });

  it("prohibits live provider actions in F0", () => {
    const plan = makePlan({
      objectMutations: [],
      providersRequired: ["resend", "openai"],
    });
    const result = decideApprovals(plan);
    assert.ok(result.prohibited.includes("resend"));
    assert.ok(result.interventions.some((i) => i.code === "provider_unavailable"));
  });
});

describe("F0 certified recipe card.offer.measurable", () => {
  it("exports versioned recipe stub", () => {
    const recipe = getCertifiedRecipe(CARD_OFFER_MEASURABLE_RECIPE_ID, CARD_OFFER_MEASURABLE_VERSION);
    assert.ok(recipe);
    assert.equal(recipe!.version, "1.0.0");
    assert.equal(recipe!.id, "card.offer.measurable");
  });

  it("gates required inputs", () => {
    const open = gateCertifiedRecipeInputs(CARD_OFFER_MEASURABLE_RECIPE, {});
    assert.equal(open.ok, false);
    if (open.ok) return;
    assert.ok(open.missing.includes("campaign_id"));

    const ok = gateCertifiedRecipeInputs(CARD_OFFER_MEASURABLE_RECIPE, {
      campaign_id: "camp_1",
      offer_block_id: "blk_1",
      card_id: "card_1",
    });
    assert.equal(ok.ok, true);
  });

  it("encodes Offer Fuse source of truth", () => {
    const check = assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE);
    assert.equal(check.ok, true, check.errors.join("; "));
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.offerOwner, "campaign.offer_coupon");
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.cardSpotlight, "projection");
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.liveSending, false);
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.wallet, false);
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.tapflowBind, false);
    assert.equal(CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth.taploopEnrollment, false);
  });
});

describe("F0 compatibility with existing proposal lifecycle (J16)", () => {
  it("preserves proposal state machine", () => {
    assert.equal(transitionProposal("pending", { type: "accept" }).ok, true);
    assert.equal(transitionProposal("accepted", { type: "undo" }).ok, true);
    assert.equal(transitionProposal("rejected", { type: "accept" }).ok, false);
    assert.equal(canApplyArtifacts("accepted"), true);
  });

  it("create/accept/undo still works", async () => {
    resetProposalMemory();
    await createProposal({
      id: "prop_f0",
      businessId: "biz_f0",
      recipeId: "campaign.full_draft",
      recipeVersion: "1.2.0",
      mode: "recommend",
      prompt: "x",
      summary: "y",
      artifacts: [{ kind: "theme", label: "T", payload: {} }],
    });
    const accepted = await decideProposal({
      proposalId: "prop_f0",
      businessId: "biz_f0",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
    const undone = await decideProposal({
      proposalId: "prop_f0",
      businessId: "biz_f0",
      action: { type: "undo" },
    });
    assert.equal(undone.ok, true);
  });

  it("preserves generation recipe catalog and budget helpers", () => {
    resetAutopilotBudgetMemory();
    assert.ok(AUTOPILOT_RECIPES.length >= 5);
    assert.equal(getRecipe("campaign.full_draft")?.version, "1.2.0");
    assert.equal(checkAutopilotBudgetSync("biz_f0").ok, true);
  });
});
