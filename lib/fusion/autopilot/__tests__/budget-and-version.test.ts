import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  AUTOPILOT_MONTHLY_BUDGET_DEFAULT,
  autopilotBudgetLimitForPlan,
  checkAutopilotBudgetSync,
  compareProposals,
  recordAutopilotBudgetUse,
  resetAutopilotBudgetMemory,
} from "../budget";
import { getRecipe } from "../recipes";
import { createProposal, decideProposal, resetProposalMemory } from "../proposals";
import { modeAllowsGeneration, resolveAutopilotMode } from "../types";
import { isFeatureExecutable } from "@/lib/fusion/features/resolve";

describe("autopilot budget stub", () => {
  beforeEach(() => resetAutopilotBudgetMemory());

  it("allows generation under monthly limit", () => {
    const check = checkAutopilotBudgetSync("biz_budget");
    assert.equal(check.ok, true);
    assert.equal(check.used, 0);
    assert.equal(check.limit, AUTOPILOT_MONTHLY_BUDGET_DEFAULT);
  });

  it("exhausts after recording limit uses", () => {
    for (let i = 0; i < AUTOPILOT_MONTHLY_BUDGET_DEFAULT; i++) {
      recordAutopilotBudgetUse("biz_budget");
    }
    const check = checkAutopilotBudgetSync("biz_budget");
    assert.equal(check.ok, false);
    assert.equal(check.used, AUTOPILOT_MONTHLY_BUDGET_DEFAULT);
  });

  it("uses plan-tier limits", () => {
    assert.equal(autopilotBudgetLimitForPlan("STUDIO"), 50);
    assert.equal(autopilotBudgetLimitForPlan("PRO"), 200);
  });
});

describe("autopilot recipe version", () => {
  beforeEach(() => resetProposalMemory());

  it("stamps recipe version on created proposals", async () => {
    const recipe = getRecipe("campaign.full_draft");
    assert.ok(recipe?.version);
    const created = await createProposal({
      id: "prop_ver",
      businessId: "biz_1",
      recipeId: recipe!.id,
      recipeVersion: recipe!.version,
      mode: "recommend",
      prompt: "Promo",
      summary: "Test",
      artifacts: [{ kind: "theme", label: "T", payload: {} }],
    });
    assert.equal(created.recipeVersion, recipe!.version);
  });
});

describe("autopilot kill switch / mode", () => {
  it("resolveAutopilotMode is disabled when feature off", () => {
    assert.equal(resolveAutopilotMode("recommend", false), "disabled");
    assert.equal(modeAllowsGeneration("disabled"), false);
  });

  it("isFeatureExecutable respects override kill switch", () => {
    const off = isFeatureExecutable("ai.autopilot", {
      overrides: [{ featureId: "ai.autopilot", enabled: false, scope: "global" }],
    });
    assert.equal(off, false);
  });
});

describe("compare proposals", () => {
  it("diffs artifact kinds between two proposals", () => {
    const diff = compareProposals(
      {
        id: "a",
        recipeId: "campaign.full_draft",
        recipeVersion: "1.1.0",
        summary: "One",
        status: "pending",
        artifacts: [
          { kind: "campaign_draft", label: "Draft" },
          { kind: "theme", label: "Theme" },
        ],
      },
      {
        id: "b",
        recipeId: "campaign.full_draft",
        recipeVersion: "1.1.0",
        summary: "Two",
        status: "pending",
        artifacts: [{ kind: "theme", label: "Theme" }],
      }
    );
    assert.equal(diff.sameRecipe, true);
    assert.equal(diff.sameVersion, true);
    assert.equal(diff.sameRevision, true);
    assert.deepEqual(diff.artifactDiff.onlyLeft, ["campaign_draft"]);
    assert.deepEqual(diff.artifactDiff.both, ["theme"]);
    assert.equal(diff.summaryEqual, false);
  });
});

describe("autopilot proposal lifecycle (smoke)", () => {
  beforeEach(() => resetProposalMemory());

  it("accepts a pending proposal", async () => {
    await createProposal({
      id: "prop_smoke",
      businessId: "biz_1",
      recipeId: "campaign.full_draft",
      recipeVersion: "1.1.0",
      mode: "recommend",
      prompt: "x",
      summary: "y",
      artifacts: [],
    });
    const accepted = await decideProposal({
      proposalId: "prop_smoke",
      businessId: "biz_1",
      action: { type: "accept" },
    });
    assert.equal(accepted.ok, true);
  });
});
