import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateChannelGuardian } from "../comms/channel-guardian";
import { computeBalance, validateLedgerAppend } from "../loyalty/taploop";
import { assertNoRawCardData, orderTotalCents } from "../commerce/tapcommerce";
import { selectSenseWinner } from "../runtime/tapsense";
import { validateJourney, simulatePathLegacy } from "../journey/tapflow";

describe("Channel Guardian", () => {
  it("blocks promo without consent", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "promo",
      consentGiven: false,
      featureEnabled: true,
      providerReady: true,
      planAllows: true,
    });
    assert.equal(d.allowed, false);
    assert.equal(d.code, "no_consent");
  });

  it("allows transactional without marketing consent", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "transactional",
      consentGiven: false,
      featureEnabled: true,
      providerReady: true,
      planAllows: true,
    });
    assert.equal(d.allowed, true);
  });
});

describe("TapLoop ledger", () => {
  it("prevents overdraft on redeem", () => {
    const prev = [{ type: "earn" as const, points: 10 }];
    const bad = validateLedgerAppend(prev, { type: "redeem", points: 20 });
    assert.equal(bad.ok, false);
    assert.equal(computeBalance(prev), 10);
  });

  it("computes award then redeem balance", () => {
    assert.equal(
      computeBalance([
        { type: "AWARD", points: 40 },
        { type: "REDEEM", points: 15 },
      ]),
      25
    );
  });
});

describe("TapCommerce", () => {
  it("totals lines and rejects raw card fields", () => {
    assert.equal(
      orderTotalCents({
        lines: [{ itemId: "i", quantity: 2, unitPriceCents: 500, name: "x" }],
      }),
      1000
    );
    assert.throws(() => assertNoRawCardData({ cardNumber: "4111" }));
  });
});

describe("TapSense + TapFlow", () => {
  it("selects highest score eligible candidate", () => {
    const win = selectSenseWinner(
      {
        at: new Date(),
        timezone: "America/New_York",
        campaignIdsEligible: ["c1"],
        guardianAllowsPromo: true,
      },
      [
        { id: "c1", kind: "campaign", score: 1, reasons: [] },
        { id: "c2", kind: "campaign", score: 9, reasons: [] },
        { id: "s1", kind: "spotlight", score: 5, reasons: [] },
      ]
    );
    assert.equal(win?.id, "s1");
  });

  it("validates journey structure", () => {
    const def = {
      id: "j",
      businessId: "b",
      name: "t",
      version: 1,
      status: "draft" as const,
      nodes: [
        { id: "t", type: "trigger" as const, label: "t", config: {}, x: 0, y: 0 },
        { id: "e", type: "end" as const, label: "e", config: {}, x: 0, y: 1 },
      ],
      edges: [{ id: "x", from: "t", to: "e" }],
    };
    assert.equal(validateJourney(def).ok, true);
    assert.deepEqual(simulatePathLegacy(def), ["t", "e"]);
  });
});
