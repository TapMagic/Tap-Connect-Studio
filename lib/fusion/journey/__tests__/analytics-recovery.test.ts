import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyJourney, type JourneyDefinition } from "../types";
import { executeJourneyDryRun } from "../runtime";
import { buildJourneyAnalyticsOverlay } from "../analytics";
import { planJourneyRecovery, recoverJourneyDryRun } from "../recovery";
import { resetJourneyRunsMemory, recordJourneyDryRun } from "../runs";

function emailBlockedJourney(): JourneyDefinition {
  const j = createEmptyJourney("Consent gate");
  j.nodes = [
    { id: "t1", type: "trigger", label: "Start", config: {} },
    {
      id: "e1",
      type: "email",
      label: "Send",
      config: { subject: "Hi", requireConsent: true },
    },
    { id: "x1", type: "exit", label: "Done", config: {} },
  ];
  j.edges = [
    { id: "a", from: "t1", to: "e1" },
    { id: "b", from: "e1", to: "x1" },
  ];
  return j;
}

describe("journey analytics + recovery", () => {
  it("builds derived overlay from sample path", () => {
    const def = createEmptyJourney("Simple");
    def.nodes = [
      { id: "t1", type: "trigger", label: "Start", config: {} },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ];
    def.edges = [{ id: "a", from: "t1", to: "x1" }];
    const overlay = buildJourneyAnalyticsOverlay(def);
    assert.equal(overlay.evidence, "derived");
    assert.ok(overlay.nodeVisitEstimates.some((n) => n.estimatedVisits > 0));
  });

  it("recovers guardian-blocked dry-run with consent patch", () => {
    const def = emailBlockedJourney();
    const blocked = executeJourneyDryRun(
      def,
      {
        visitorId: "v1",
        consent: { email: false, marketing: false, sms: false },
      },
      { requireValid: false }
    );
    assert.equal(blocked.completed, false);
    const plan = planJourneyRecovery(blocked);
    assert.equal(plan.canAutoRecover, true);
    const recovered = recoverJourneyDryRun(def, blocked);
    assert.equal(recovered.completed, true);
  });

  it("upgrades overlay evidence when runs recorded", async () => {
    resetJourneyRunsMemory();
    const def = createEmptyJourney("Logged");
    def.nodes = [
      { id: "t1", type: "trigger", label: "Start", config: {} },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ];
    def.edges = [{ id: "a", from: "t1", to: "x1" }];
    await recordJourneyDryRun({ businessId: "biz_a", definition: def });
    const overlay = buildJourneyAnalyticsOverlay(def, [
      {
        id: "r1",
        businessId: "biz_a",
        journeyName: "Logged",
        status: "completed",
        path: ["t1", "x1"],
        issues: [],
        visitor: {},
        createdAt: new Date().toISOString(),
        dryRun: true,
      },
    ]);
    assert.equal(overlay.evidence, "confirmed");
  });
});
