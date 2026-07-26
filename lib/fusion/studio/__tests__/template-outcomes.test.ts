import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTemplateOutcome, TEMPLATE_OUTCOMES } from "../template-outcomes";

describe("template outcomes differentiation", () => {
  it("provides distinct outcomes for every gallery template id", () => {
    const ids = Object.keys(TEMPLATE_OUTCOMES);
    assert.ok(ids.length >= 6);
    const scenarios = new Set(ids.map((id) => TEMPLATE_OUTCOMES[id]!.scenario));
    assert.equal(scenarios.size, ids.length, "scenarios must be unique");
    const firstScreens = new Set(ids.map((id) => TEMPLATE_OUTCOMES[id]!.firstScreen));
    assert.ok(firstScreens.size >= ids.length - 1, "first screens should differ");
  });

  it("includes required host-facing fields", () => {
    for (const [id, o] of Object.entries(TEMPLATE_OUTCOMES)) {
      assert.ok(o.scenario, id);
      assert.ok(o.customerExperience, id);
      assert.ok(o.whatYouNeed.length > 0, id);
      assert.ok(o.pillars.length > 0, id);
      assert.ok(o.estimatedSteps >= 1, id);
      assert.ok(o.finalOutcome, id);
      assert.ok(getTemplateOutcome(id), id);
    }
  });
});
