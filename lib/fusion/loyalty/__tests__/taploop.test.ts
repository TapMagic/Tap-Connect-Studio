import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBalance,
  resolveTier,
  validateLedgerAppend,
  type LoyaltyLedgerEntry,
  type LoyaltyTier,
} from "../taploop";

const tiers: LoyaltyTier[] = [
  { id: "bronze", name: "Bronze", rank: 1, thresholdPoints: 0, perks: [] },
  { id: "silver", name: "Silver", rank: 2, thresholdPoints: 100, perks: ["perk"] },
  { id: "gold", name: "Gold", rank: 3, thresholdPoints: 500, perks: ["perk", "vip"] },
];

function entry(
  partial: Partial<LoyaltyLedgerEntry> & Pick<LoyaltyLedgerEntry, "type" | "points">
): LoyaltyLedgerEntry {
  return {
    id: partial.id ?? "e",
    relationshipId: "r",
    businessId: "b",
    type: partial.type,
    points: partial.points,
    reason: partial.reason ?? "test",
    createdAt: new Date().toISOString(),
    createdBy: partial.createdBy ?? "system",
  };
}

describe("TapLoop loyalty hooks", () => {
  it("computes balance across earn/redeem", () => {
    const ledger = [entry({ type: "earn", points: 50 }), entry({ type: "earn", points: 20 })];
    assert.equal(computeBalance(ledger), 70);
    const redeem = validateLedgerAppend(ledger, entry({ id: "r1", type: "redeem", points: 30 }));
    assert.equal(redeem.ok, true);
  });

  it("rejects overdraft redeem", () => {
    const ledger = [entry({ type: "earn", points: 10 })];
    const bad = validateLedgerAppend(ledger, entry({ id: "r1", type: "redeem", points: 50 }));
    assert.equal(bad.ok, false);
  });

  it("resolves tier by threshold", () => {
    assert.equal(resolveTier(0, tiers)?.id, "bronze");
    assert.equal(resolveTier(150, tiers)?.id, "silver");
    assert.equal(resolveTier(600, tiers)?.id, "gold");
  });

  it("rejects zero-point entries", () => {
    const r = validateLedgerAppend([], entry({ type: "earn", points: 0 }));
    assert.equal(r.ok, false);
  });
});
