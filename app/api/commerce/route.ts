import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/fusion/features";
import {
  addLineToOrder,
  cancelOrder,
  completeMockCheckout,
  createMockCheckoutSession,
  createOrderDraft,
  evaluateCommerceStripeReadiness,
  fulfillOrder,
  getOrder,
  listCatalogItems,
  listOrders,
  refundOrder,
  seedDemoCatalog,
  upsertCatalogItem,
} from "@/lib/fusion/commerce";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const view = url.searchParams.get("view") ?? "orders";

    if (view === "readiness") {
      return NextResponse.json({
        ok: true,
        readiness: evaluateCommerceStripeReadiness(),
      });
    }

    if (view === "catalog") {
      let items = listCatalogItems(business.id);
      if (items.length === 0) {
        items = seedDemoCatalog(business.id);
      }
      return NextResponse.json({ ok: true, items });
    }

    if (orderId) {
      const order = getOrder(business.id, orderId);
      if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, order });
    }

    return NextResponse.json({ ok: true, orders: listOrders(business.id) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const postSchema = z.object({
  action: z.enum([
    "seed_catalog",
    "upsert_item",
    "create_draft",
    "add_line",
    "checkout",
    "complete_checkout",
    "cancel_order",
    "fulfill_order",
    "refund_order",
  ]),
  reason: z.string().optional(),
  itemId: z.string().optional(),
  orderId: z.string().optional(),
  sessionId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  taxRateBps: z.number().int().min(0).optional(),
  relationshipId: z.string().optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
  item: z
    .object({
      kind: z.enum(["product", "service", "gift_card", "booking"]),
      name: z.string().min(1),
      description: z.string().optional(),
      priceCents: z.number().int().min(0),
      currency: z.string().optional(),
      active: z.boolean().optional(),
      id: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureEnabled = isFeatureEnabled("commerce.tapcommerce", {});
    const body = postSchema.parse(await request.json());

    if (body.action === "seed_catalog") {
      const items = seedDemoCatalog(business.id);
      return NextResponse.json({ ok: true, items });
    }

    if (body.action === "upsert_item") {
      if (!body.item) {
        return NextResponse.json({ error: "item required" }, { status: 400 });
      }
      if (!featureEnabled) {
        return NextResponse.json(
          { error: "commerce.tapcommerce disabled", code: "feature_off" },
          { status: 403 }
        );
      }
      const item = upsertCatalogItem({ businessId: business.id, ...body.item });
      return NextResponse.json({ ok: true, item });
    }

    if (body.action === "create_draft") {
      const result = createOrderDraft({
        businessId: business.id,
        relationshipId: body.relationshipId,
        lines: body.lines,
        taxRateBps: body.taxRateBps,
        featureEnabled,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.code === "feature_off" ? 403 : 400 }
        );
      }
      return NextResponse.json({ ok: true, order: result.order });
    }

    if (body.action === "add_line") {
      if (!body.orderId || !body.itemId) {
        return NextResponse.json({ error: "orderId and itemId required" }, { status: 400 });
      }
      const result = addLineToOrder({
        businessId: business.id,
        orderId: body.orderId,
        itemId: body.itemId,
        quantity: body.quantity,
        taxRateBps: body.taxRateBps,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, order: result.order });
    }

    if (body.action === "checkout") {
      if (!body.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 });
      }
      const result = createMockCheckoutSession({
        businessId: business.id,
        orderId: body.orderId,
        featureEnabled,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.code === "feature_off" ? 403 : 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        session: result.session,
        order: result.order,
      });
    }

    if (body.action === "complete_checkout") {
      if (!body.sessionId) {
        return NextResponse.json({ error: "sessionId required" }, { status: 400 });
      }
      const result = completeMockCheckout({
        businessId: business.id,
        sessionId: body.sessionId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, order: result.order, session: result.session });
    }

    if (body.action === "cancel_order") {
      if (!body.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 });
      }
      const result = cancelOrder({
        businessId: business.id,
        orderId: body.orderId,
        reason: body.reason,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, order: result.order });
    }

    if (body.action === "fulfill_order") {
      if (!body.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 });
      }
      const result = fulfillOrder({
        businessId: business.id,
        orderId: body.orderId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, order: result.order });
    }

    if (body.action === "refund_order") {
      if (!body.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 });
      }
      const result = refundOrder({
        businessId: business.id,
        orderId: body.orderId,
        reason: body.reason,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        order: result.order,
        refundRef: result.refundRef,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
