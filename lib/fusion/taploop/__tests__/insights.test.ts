import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LoyaltyInsightsSnapshot } from "../insights";

describe("TapLoop insights hooks contract", () => {
  it("snapshot shape is Insights-compatible", () => {
    const snapshot: LoyaltyInsightsSnapshot = {
      rangeDays: 14,
      from: new Date().toISOString(),
      to: new Date().toISOString(),
      empty: false,
      fetchedAt: new Date().toISOString(),
      kpis: [
        {
          key: "loyalty_awards_range",
          label: "Awards (14d)",
          value: 3,
          evidenceClass: "confirmed",
          source: "LoyaltyLedgerEntry.AWARD",
          seeded: false,
        },
      ],
    };
    assert.equal(snapshot.kpis[0].evidenceClass, "confirmed");
    assert.ok(snapshot.kpis[0].key.startsWith("loyalty_"));
  });
});
