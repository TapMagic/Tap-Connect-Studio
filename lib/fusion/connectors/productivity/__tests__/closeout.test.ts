import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  resetProductivityMemory,
  runProductivityCloseoutWorkflow,
} from "../index";

describe("Productivity closeout workflow (18 steps)", () => {
  beforeEach(() => {
    resetProductivityMemory();
  });

  it("passes all 18 local mock workflow steps", () => {
    const result = runProductivityCloseoutWorkflow("biz_closeout");
    if (!result.ok) {
      const failed = result.steps.filter((s) => !s.ok);
      assert.fail(
        `Closeout failed steps: ${failed.map((s) => `${s.step}:${s.name}`).join(", ")}`
      );
    }
    assert.equal(result.steps.length, 18);
    assert.equal(result.liveClassification, "VERIFIED — CREDENTIALS REQUIRED");
    assert.ok(result.workItemId);
  });
});
