import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  buildCommerceInsightKpis,
  commerceEvidenceClass,
  recordCommerceEvidence,
  resetCommerceEvidenceStore,
} from "../commerce-evidence";
import { formatEvidenceCaption } from "../evidence-display";

describe("Commerce insights evidence", () => {
  beforeEach(() => {
    resetCommerceEvidenceStore();
  });

  it("records and lists evidence by business and range", () => {
    recordCommerceEvidence({
      businessId: "biz_a",
      orderId: "ord_1",
      relationshipId: "rel_1",
      contactId: "c_1",
      paymentRef: "cs_mock_abc",
      totalCents: 2500,
      currency: "usd",
      mock: true,
      loyaltyAwardStubId: "stub_ord_1",
      timelineEventId: "tl_1",
    });

    const all = buildCommerceInsightKpis({
      businessId: "biz_a",
      rangeDays: 14,
      from: new Date(Date.now() - 86400_000),
    });
    assert.equal(all.find((k) => k.key === "commerce_orders_paid")?.value, 1);
    assert.equal(all.find((k) => k.key === "commerce_revenue_mock")?.value, 25);
    assert.equal(all.find((k) => k.key === "commerce_loyalty_stubs")?.value, 1);
  });

  it("uses modeled class for mock commerce when records exist", () => {
    assert.equal(commerceEvidenceClass(true, false), "incomplete");
    assert.equal(commerceEvidenceClass(true, true), "modeled");
    assert.equal(commerceEvidenceClass(false, true), "confirmed");
  });

  it("formats mock-path caption for insights hub", () => {
    const caption = formatEvidenceCaption({
      evidenceClass: "modeled",
      source: "TapCommerce/commerce-wire",
      seeded: false,
      mockPath: true,
    });
    assert.match(caption, /Modeled/);
    assert.match(caption, /Mock adapter path/);
  });
});
