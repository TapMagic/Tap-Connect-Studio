import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  listPendingOutbox,
  resetMemoryOutbox,
} from "../../publication/events";
import {
  listContactTimelineEvents,
  resetMemoryContactTimeline,
} from "../../audience/timeline";
import {
  buildCommerceInsightKpis,
  listCommerceEvidence,
  resetCommerceEvidenceStore,
} from "../../insights/commerce-evidence";
import {
  completeMockCheckout,
  createMockCheckoutSession,
  createOrderDraft,
  resetCommerceStore,
  seedDemoCatalog,
} from "../tapcommerce";
import { wireCommerceOrderPaidSideEffects } from "../commerce-wire";

describe("TapCommerce → Relationship → Loyalty → Insights wire", () => {
  beforeEach(() => {
    resetCommerceStore();
    resetMemoryOutbox();
    resetMemoryContactTimeline();
    resetCommerceEvidenceStore();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetCommerceStore();
    resetMemoryOutbox();
    resetMemoryContactTimeline();
    resetCommerceEvidenceStore();
  });

  function paidOrder(businessId: string, relationshipId?: string) {
    const [item] = seedDemoCatalog(businessId);
    const draft = createOrderDraft({
      businessId,
      relationshipId,
      lines: [{ itemId: item!.id, quantity: 1 }],
      featureEnabled: true,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) throw new Error("draft failed");

    const session = createMockCheckoutSession({
      businessId,
      orderId: draft.order.id,
      featureEnabled: true,
    });
    assert.equal(session.ok, true);
    if (!session.ok) throw new Error("session failed");

    const paid = completeMockCheckout({
      businessId,
      sessionId: session.session.id,
    });
    assert.equal(paid.ok, true);
    if (!paid.ok) throw new Error("pay failed");
    return paid.order;
  }

  it("wires mock payment ref to timeline, outbox, and insights evidence", async () => {
    const order = paidOrder("biz_wire", "rel_commerce_1");

    const wire = await wireCommerceOrderPaidSideEffects({
      businessId: "biz_wire",
      order,
      mock: true,
      link: {
        relationshipId: "rel_commerce_1",
        contactId: "contact_wire_1",
      },
    });

    assert.ok(wire.evidenceId);
    assert.equal(wire.timelineEventId !== null, true);
    assert.deepEqual(wire.outboxTopics.sort(), [
      "audience.contact_timeline",
      "commerce.order.paid",
    ].sort());

    const topics = listPendingOutbox().map((r) => r.topic);
    assert.ok(topics.includes("commerce.order.paid"));
    assert.ok(topics.includes("audience.contact_timeline"));

    const timeline = await listContactTimelineEvents({
      businessId: "biz_wire",
      contactId: "contact_wire_1",
    });
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]?.kind, "commerce_order_paid");
    assert.equal(timeline[0]?.metadata?.orderId, order.id);

    const evidence = listCommerceEvidence({ businessId: "biz_wire" });
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0]?.paymentRef, order.paymentRef);
    assert.equal(evidence[0]?.relationshipId, "rel_commerce_1");
  });

  it("enqueues loyalty award stub when requested and feature on", async () => {
    const order = paidOrder("biz_loyalty");

    const wire = await wireCommerceOrderPaidSideEffects({
      businessId: "biz_loyalty",
      order,
      mock: true,
      featureCtx: {
        overrides: [{ featureId: "loyalty.taploop", enabled: true, scope: "global" }],
      },
      link: {
        relationshipId: "rel_loyalty",
        contactId: "contact_loyalty",
        awardLoyalty: true,
        loyaltyPoints: 42,
      },
    });

    assert.equal(wire.loyaltyAwardStubId, `stub_${order.id}`);
    assert.ok(listPendingOutbox().some((r) => r.topic === "loyalty.award.stub"));

    const stub = listPendingOutbox().find((r) => r.topic === "loyalty.award.stub");
    assert.equal(stub?.envelope.payload.points, 42);
    assert.equal(stub?.envelope.payload.idempotencyKey, `commerce_paid_${order.id}`);

    const evidence = listCommerceEvidence({ businessId: "biz_loyalty" });
    assert.equal(evidence[0]?.loyaltyAwardStubId, wire.loyaltyAwardStubId);
  });

  it("skips loyalty stub when awardLoyalty is false", async () => {
    const order = paidOrder("biz_no_loyalty");

    await wireCommerceOrderPaidSideEffects({
      businessId: "biz_no_loyalty",
      order,
      mock: true,
      featureCtx: {
        overrides: [{ featureId: "loyalty.taploop", enabled: true, scope: "global" }],
      },
      link: {
        relationshipId: "rel_x",
        contactId: "contact_x",
        awardLoyalty: false,
      },
    });

    assert.equal(
      listPendingOutbox().some((r) => r.topic === "loyalty.award.stub"),
      false
    );
  });

  it("records insights evidence without relationship but skips timeline", async () => {
    const order = paidOrder("biz_unlinked");

    const wire = await wireCommerceOrderPaidSideEffects({
      businessId: "biz_unlinked",
      order,
      mock: true,
      link: { contactId: "contact_only" },
    });

    assert.equal(wire.timelineEventId, null);
    assert.ok(wire.evidenceId);
    assert.deepEqual(wire.outboxTopics, []);
  });

  it("builds commerce insight KPIs with modeled evidence for mock path", async () => {
    const from = new Date(Date.now() - 7 * 86400_000);
    const order = paidOrder("biz_kpi", "rel_kpi");

    await wireCommerceOrderPaidSideEffects({
      businessId: "biz_kpi",
      order,
      mock: true,
      link: {
        relationshipId: "rel_kpi",
        contactId: "contact_kpi",
        awardLoyalty: true,
      },
      featureCtx: {
        overrides: [{ featureId: "loyalty.taploop", enabled: true, scope: "global" }],
      },
    });

    const kpis = buildCommerceInsightKpis({
      businessId: "biz_kpi",
      rangeDays: 7,
      from,
    });
    assert.ok(kpis.some((k) => k.key === "commerce_orders_paid" && k.value >= 1));
    assert.ok(kpis.some((k) => k.key === "commerce_revenue_mock" && k.value >= 25));
    assert.ok(kpis.some((k) => k.key === "commerce_loyalty_stubs" && k.value >= 1));
    const paidKpi = kpis.find((k) => k.key === "commerce_orders_paid");
    assert.equal(paidKpi?.evidenceClass, "modeled");
  });
});
