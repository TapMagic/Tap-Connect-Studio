import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFeature } from "../registry";
import {
  EXPANDED_KILL_SWITCH_PROOF_IDS,
  KILL_SWITCH_FEATURE_IDS,
  KILL_SWITCH_MATRIX,
} from "../kill-switch-matrix";
import { LIVE_EXECUTION_FEATURE_ID, checkLiveProviderExecution } from "../gate";

describe("kill-switch matrix", () => {
  it("registers every matrix feature in FEATURE_DEFINITIONS", () => {
    for (const row of KILL_SWITCH_MATRIX) {
      assert.ok(getFeature(row.featureId), `missing registry entry ${row.featureId}`);
      assert.equal(KILL_SWITCH_FEATURE_IDS.has(row.featureId), true);
    }
  });

  it("covers required expanded owner-walkthrough features", () => {
    for (const id of EXPANDED_KILL_SWITCH_PROOF_IDS) {
      assert.ok(
        KILL_SWITCH_MATRIX.some((r) => r.featureId === id),
        `expanded proof id missing from matrix: ${id}`
      );
    }
  });

  it("live execution gate blocks when override off", () => {
    const gate = checkLiveProviderExecution({
      overrides: [
        { featureId: LIVE_EXECUTION_FEATURE_ID, enabled: false, scope: "global" },
      ],
    });
    assert.equal(gate.ok, false);
    if (!gate.ok) {
      assert.equal(gate.featureId, LIVE_EXECUTION_FEATURE_ID);
    }
  });

  it("live execution gate passes by default", () => {
    assert.equal(checkLiveProviderExecution({}).ok, true);
  });
});
