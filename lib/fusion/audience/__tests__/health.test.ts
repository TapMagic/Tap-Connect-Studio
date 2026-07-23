import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRelationshipHealth } from "../health";

describe("Relationship health score", () => {
  it("scores strong relationships highly", () => {
    const h = computeRelationshipHealth({
      status: "ACTIVE",
      hasEmail: true,
      hasPhone: true,
      emailConsent: true,
      walletConsent: true,
      marketingConsent: true,
      tapSaveEnabled: true,
      daysSinceCreated: 10,
      daysSinceLastTouch: 3,
      openThreadCount: 0,
      issuedPassCount: 1,
      leadCount: 2,
    });
    assert.ok(h.score >= 80);
    assert.equal(h.grade, "excellent");
  });

  it("flags at-risk when sparse", () => {
    const h = computeRelationshipHealth({
      status: "ARCHIVED",
      hasEmail: false,
      hasPhone: false,
      emailConsent: false,
      walletConsent: false,
      marketingConsent: false,
      tapSaveEnabled: false,
      daysSinceCreated: 400,
      openThreadCount: 5,
      issuedPassCount: 0,
      leadCount: 0,
    });
    assert.ok(h.score < 40);
    assert.equal(h.grade, "at_risk");
  });

  it("labels evidence classes on signals", () => {
    const h = computeRelationshipHealth({
      status: "ACTIVE",
      hasEmail: true,
      hasPhone: false,
      emailConsent: true,
      walletConsent: false,
      marketingConsent: false,
      tapSaveEnabled: false,
      daysSinceCreated: 5,
    });
    assert.ok(h.signals.some((s) => s.evidenceClass === "confirmed"));
    assert.ok(h.summary.length > 0);
  });
});
