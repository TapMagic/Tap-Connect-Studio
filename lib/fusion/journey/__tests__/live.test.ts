import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyJourney } from "../types";
import {
  executeLiveJourneyDefinition,
  listLiveJourneyRuns,
  resetLiveJourneyRunsMemory,
} from "../live";

describe("TapFlow live visitor executor", () => {
  it("records non-dry-run completions in memory", () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Live hello");
    const { run, result } = executeLiveJourneyDefinition({
      businessId: "biz_live",
      journeyId: "jd_1",
      journeyName: def.name,
      definition: def,
      visitor: { visitorId: "v_hash", consent: { marketing: true, email: true } },
    });
    assert.equal(result.completed, true);
    assert.equal(run.dryRun, false);
    assert.equal(run.status, "completed");
    assert.equal(listLiveJourneyRuns("biz_live").length, 1);
  });

  it("marks blocked live runs without throwing", () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Blocked email");
    def.nodes = [
      { id: "t1", type: "trigger", label: "Start", config: {} },
      { id: "e1", type: "email", label: "Mail", config: { subject: "Hi" } },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ];
    def.edges = [
      { id: "a", from: "t1", to: "e1" },
      { id: "b", from: "e1", to: "x1" },
    ];
    const { run } = executeLiveJourneyDefinition({
      businessId: "biz_live",
      journeyId: "jd_2",
      journeyName: def.name,
      definition: def,
      visitor: {
        visitorId: "v2",
        consent: { email: false, marketing: false, sms: false },
      },
    });
    assert.equal(run.dryRun, false);
    assert.equal(run.status, "blocked");
  });
});
