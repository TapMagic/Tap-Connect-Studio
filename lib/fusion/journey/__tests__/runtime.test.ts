import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyJourney } from "../types";
import { dryRunJourney } from "../runtime";

describe("TapFlow dry-run runtime", () => {
  it("walks trigger → message → exit", () => {
    const def = createEmptyJourney("Test");
    def.nodes = [
      { id: "t", type: "trigger", label: "Start", config: {}, position: { x: 0, y: 0 } },
      {
        id: "m",
        type: "message",
        label: "Hi",
        config: { channel: "email" },
        position: { x: 0, y: 1 },
      },
      { id: "e", type: "exit", label: "End", config: {}, position: { x: 0, y: 2 } },
    ];
    def.edges = [
      { id: "a", from: "t", to: "m" },
      { id: "b", from: "m", to: "e" },
    ];

    const result = dryRunJourney(def, {
      businessId: "b1",
      consentMarketing: true,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.path, ["t", "m", "e"]);
  });

  it("blocks marketing message without consent", () => {
    const def = createEmptyJourney("Guard");
    def.nodes = [
      { id: "t", type: "trigger", label: "Start", config: {}, position: { x: 0, y: 0 } },
      {
        id: "m",
        type: "message",
        label: "Promo",
        config: { channel: "email", requireMarketingConsent: true },
        position: { x: 0, y: 1 },
      },
      { id: "e", type: "exit", label: "End", config: {}, position: { x: 0, y: 2 } },
    ];
    def.edges = [
      { id: "a", from: "t", to: "m" },
      { id: "b", from: "m", to: "e" },
    ];

    const result = dryRunJourney(def, {
      businessId: "b1",
      consentMarketing: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.blockedAt, "m");
  });
});
