import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  addLineToOrder,
  assertNoRawCardData,
  completeMockCheckout,
  computeOrderTotals,
  createMockCheckoutSession,
  createOrderDraft,
  evaluateCommerceStripeReadiness,
  listOrders,
  orderTotalCents,
  resetCommerceStore,
  seedDemoCatalog,
  upsertCatalogItem,
} from "../tapcommerce";

describe("TapCommerce functional mock", () => {
  beforeEach(() => {
    resetCommerceStore();
  });

  it("creates order draft with line items and totals", () => {
    const [widget] = seedDemoCatalog("biz_1");
    const draft = createOrderDraft({
      businessId: "biz_1",
      lines: [{ itemId: widget.id, quantity: 2 }],
      taxRateBps: 1000,
      featureEnabled: true,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.order.status, "draft");
    assert.equal(draft.order.lines.length, 1);
    assert.equal(draft.order.subtotalCents, 5000);
    assert.equal(draft.order.taxCents, 500);
    assert.equal(draft.order.totalCents, 5500);
    assert.equal(orderTotalCents(draft.order), 5000);
  });

  it("adds lines and lists orders per business", () => {
    const items = seedDemoCatalog("biz_2");
    const draft = createOrderDraft({
      businessId: "biz_2",
      lines: [{ itemId: items[0].id, quantity: 1 }],
      featureEnabled: true,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const added = addLineToOrder({
      businessId: "biz_2",
      orderId: draft.order.id,
      itemId: items[1].id,
      quantity: 1,
    });
    assert.equal(added.ok, true);
    if (!added.ok) return;
    assert.equal(added.order.lines.length, 2);
    assert.equal(listOrders("biz_2").length, 1);
    assert.equal(listOrders("other").length, 0);
  });

  it("mock checkout session then complete — no raw card fields", () => {
    upsertCatalogItem({
      businessId: "biz_3",
      kind: "product",
      name: "Sticker",
      priceCents: 400,
    });
    const [item] = seedDemoCatalog("biz_3");
    const draft = createOrderDraft({
      businessId: "biz_3",
      lines: [{ itemId: item.id, quantity: 1 }],
      featureEnabled: true,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const session = createMockCheckoutSession({
      businessId: "biz_3",
      orderId: draft.order.id,
      featureEnabled: true,
    });
    assert.equal(session.ok, true);
    if (!session.ok) return;
    assert.equal(session.session.mock, true);
    assert.equal(session.order.status, "pending");
    assert.ok(session.session.id.startsWith("cs_mock"));
    assert.equal("cardNumber" in session.session, false);

    const paid = completeMockCheckout({
      businessId: "biz_3",
      sessionId: session.session.id,
    });
    assert.equal(paid.ok, true);
    if (!paid.ok) return;
    assert.equal(paid.order.status, "paid");
    assert.equal(paid.order.paymentRef, session.session.id);
  });

  it("rejects raw card data on payloads", () => {
    assert.throws(() => assertNoRawCardData({ cardNumber: "4111111111111111" }));
    assert.throws(() => assertNoRawCardData({ cvv: "123" }));
    assert.throws(() =>
      assertNoRawCardData({ nested: { pan: "4111" } } as Record<string, unknown>)
    );
    assert.doesNotThrow(() =>
      assertNoRawCardData({ paymentRef: "pi_mock_123", checkoutSessionId: "cs_mock_1" })
    );
  });

  it("blocks checkout when feature off", () => {
    const [item] = seedDemoCatalog("biz_off");
    const draft = createOrderDraft({
      businessId: "biz_off",
      lines: [{ itemId: item.id, quantity: 1 }],
      featureEnabled: false,
    });
    assert.equal(draft.ok, false);
    if (draft.ok) return;
    assert.equal(draft.code, "feature_off");
  });

  it("computeOrderTotals and commerce Stripe readiness expose mock path", () => {
    assert.deepEqual(computeOrderTotals([{ itemId: "a", quantity: 3, unitPriceCents: 100, name: "a" }], 0), {
      subtotalCents: 300,
      taxCents: 0,
      totalCents: 300,
    });
    const readiness = evaluateCommerceStripeReadiness();
    assert.equal(readiness.mockCheckoutAvailable, true);
    assert.ok(Array.isArray(readiness.missingEnvVars));
  });
});
