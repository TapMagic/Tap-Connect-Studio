import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { runAutopilotGenerate } from "../facade";
import {
  autopilotBudgetLimitForPlan,
  recordAutopilotBudgetUse,
  resetAutopilotBudgetMemory,
} from "../budget";
import { resetAutopilotKnowledgeMemory } from "../knowledge";
import { resetProposalMemory } from "../proposals";

describe("runAutopilotGenerate guardrails", () => {
  const priorKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-facade";
    resetAutopilotBudgetMemory();
    resetAutopilotKnowledgeMemory();
    resetProposalMemory();
  });

  afterEach(() => {
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
  });

  it("blocks when ai.autopilot kill switch is off", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await runAutopilotGenerate({
      prompt: "Weekend cigar lounge promo with reserve boxes",
      planTier: "STUDIO",
      businessId: "biz_kill",
      overrides: [{ featureId: "ai.autopilot", enabled: false, scope: "global" }],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "feature_disabled");
  });

  it("blocks BASIC plan", async () => {
    const result = await runAutopilotGenerate({
      prompt: "Weekend cigar lounge promo with reserve boxes",
      planTier: "BASIC",
      businessId: "biz_basic",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "plan_blocked");
  });

  it("blocks when monthly budget is exhausted", async () => {
    const limit = autopilotBudgetLimitForPlan("STUDIO");
    for (let i = 0; i < limit; i++) {
      recordAutopilotBudgetUse("biz_exhaust");
    }
    const result = await runAutopilotGenerate({
      prompt: "Weekend cigar lounge promo with reserve boxes",
      planTier: "STUDIO",
      businessId: "biz_exhaust",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "budget_exhausted");
    assert.ok(result.budget);
  });

  it("blocks unknown recipe ids", async () => {
    const result = await runAutopilotGenerate({
      prompt: "Weekend cigar lounge promo with reserve boxes",
      planTier: "STUDIO",
      recipeId: "campaign.does_not_exist",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "recipe_unknown");
  });

  it("blocks PRO-only recipe on STUDIO plan", async () => {
    const result = await runAutopilotGenerate({
      prompt: "Weekend cigar lounge promo with reserve boxes",
      planTier: "STUDIO",
      recipeId: "campaign.offer_pack",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "plan_blocked");
  });
});
