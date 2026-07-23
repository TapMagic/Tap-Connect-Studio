import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insightsToCsv, type InsightsSnapshot } from "../metrics";
import { assertNotPresentedAsFact, labelEvidence } from "../tapproof";

describe("Insights evidence + CSV", () => {
  it("labels evidence classes", () => {
    assert.equal(labelEvidence("confirmed"), "Confirmed");
    assert.equal(labelEvidence("modeled"), "Modeled (not fact)");
    assert.equal(assertNotPresentedAsFact("modeled"), false);
    assert.equal(assertNotPresentedAsFact("confirmed"), true);
  });

  it("exports CSV of current view", () => {
    const snapshot: InsightsSnapshot = {
      rangeDays: 14,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-14T00:00:00.000Z",
      empty: false,
      fetchedAt: "2026-07-14T12:00:00.000Z",
      kpis: [
        {
          key: "taps_range",
          label: "Taps (14d)",
          value: 3,
          evidenceClass: "confirmed",
          source: "TapEvent",
          seeded: false,
        },
      ],
    };
    const csv = insightsToCsv(snapshot);
    assert.match(csv, /key,label,value/);
    assert.match(csv, /taps_range/);
    assert.match(csv, /confirmed/);
  });
});
