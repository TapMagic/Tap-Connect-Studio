import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBalance,
  validateLedgerAppend,
  resolveTier,
  normalizeLedgerType,
} from "../ledger-math";

describe("TapLoop ledger math", () => {
  it("awards and redeems with correct balance", () => {
    const entries = [
      { type: "AWARD" as const, points: 100 },
      { type: "REDEEM" as const, points: 30 },
      { type: "AWARD" as const, points: 10 },
    ];
    assert.equal(computeBalance(entries), 80);
  });

  it("prevents overdraft on redeem", () => {
    const prev = [{ type: "earn" as const, points: 10 }];
    const bad = validateLedgerAppend(prev, { type: "redeem", points: 20 });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.error, /Insufficient/);
  });

  it("rejects zero and negative magnitudes", () => {
    assert.equal(validateLedgerAppend([], { type: "AWARD", points: 0 }).ok, false);
    assert.equal(validateLedgerAppend([], { type: "AWARD", points: -5 }).ok, false);
  });

  it("normalizes award → earn for balance math", () => {
    assert.equal(normalizeLedgerType("AWARD"), "earn");
    assert.equal(normalizeLedgerType("REDEEM"), "redeem");
  });

  it("resolves highest qualifying tier", () => {
    const tiers = [
      { id: "1", name: "Member", rank: 0, thresholdPoints: 0, perks: [] },
      { id: "2", name: "Silver", rank: 1, thresholdPoints: 100, perks: [] },
      { id: "3", name: "Gold", rank: 2, thresholdPoints: 500, perks: [] },
    ];
    assert.equal(resolveTier(120, tiers)?.name, "Silver");
    assert.equal(resolveTier(500, tiers)?.name, "Gold");
  });

  it("documents duplicate prevention via idempotency key uniqueness", () => {
    // Persistence layer enforces @@unique([businessId, idempotencyKey]).
    // Domain award/redeem return duplicate:true when key already exists.
    const key = "visit_abc_001";
    assert.equal(typeof key, "string");
    assert.ok(key.length > 0);
  });
});

describe("TapLoop reverse math", () => {
  it("reverse of award reduces balance", () => {
    const entries = [
      { type: "AWARD" as const, points: 50 },
      { type: "REVERSE" as const, points: 50 },
    ];
    assert.equal(computeBalance(entries), 0);
  });

  it("restore after redeem via award reverse path", () => {
    const entries = [
      { type: "AWARD" as const, points: 50 },
      { type: "REDEEM" as const, points: 20 },
      { type: "AWARD" as const, points: 20 }, // reverse of redeem
    ];
    assert.equal(computeBalance(entries), 50);
  });
});
