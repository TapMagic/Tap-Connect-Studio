/**
 * Wire TapCommerce mock order/payment → Relationship timeline → TapLoop loyalty stub → Insights evidence.
 * Mock/sandbox only — no live Stripe, no raw card data.
 */

import { prisma } from "@/lib/db";
import { recordContactTimelineEvent } from "@/lib/fusion/audience/timeline";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { recordCommerceEvidence } from "@/lib/fusion/insights/commerce-evidence";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { CommerceOrder } from "./tapcommerce";

export type CommerceWireContext = {
  contactId?: string;
  relationshipId?: string;
  /** When true and loyalty.taploop is on, enqueue award stub (no live ledger write required) */
  awardLoyalty?: boolean;
  loyaltyPoints?: number;
  enrollmentId?: string;
  correlationId?: string;
};

export type CommerceWireResult = {
  timelineEventId: string | null;
  loyaltyAwardStubId: string | null;
  evidenceId: string | null;
  outboxTopics: string[];
};

function correlationId(explicit?: string) {
  if (explicit) return explicit;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `commerce_${Date.now().toString(36)}`;
}

async function resolveContactId(input: {
  businessId: string;
  relationshipId: string;
  contactId?: string;
}): Promise<string | null> {
  if (input.contactId?.trim()) return input.contactId.trim();

  if (!isIsolatedFusionDatabaseConfigured()) return null;

  try {
    const rel = await prisma.customerRelationship.findFirst({
      where: { id: input.relationshipId, businessId: input.businessId },
      select: { contactId: true },
    });
    return rel?.contactId ?? null;
  } catch {
    return null;
  }
}

function defaultPurchasePoints(order: CommerceOrder): number {
  return Math.max(1, Math.floor(order.totalCents / 100));
}

/**
 * Side effects after mock checkout completes or a paid order is recorded.
 * Requires relationshipId (on order or link) for timeline + loyalty wiring.
 */
export async function wireCommerceOrderPaidSideEffects(input: {
  businessId: string;
  order: CommerceOrder;
  mock: boolean;
  link?: CommerceWireContext;
  featureCtx?: { overrides?: import("@/lib/fusion/features/resolve").FeatureOverride[] };
}): Promise<CommerceWireResult> {
  const link = input.link ?? {};
  const relationshipId = link.relationshipId ?? input.order.relationshipId;
  const outboxTopics: string[] = [];
  const corr = correlationId(link.correlationId);
  const paymentRef = input.order.paymentRef ?? input.order.checkoutSessionId ?? null;

  let contactId: string | null = null;
  if (relationshipId?.trim()) {
    contactId = await resolveContactId({
      businessId: input.businessId,
      relationshipId,
      contactId: link.contactId,
    });

    enqueueOutboxSync(
      "commerce.order.paid",
      createGovernedEvent({
        name: "commerce.order.paid",
        businessId: input.businessId,
        aggregateType: "commerce_order",
        aggregateId: input.order.id,
        correlationId: corr,
        payload: {
          orderId: input.order.id,
          relationshipId,
          contactId,
          paymentRef,
          totalCents: input.order.totalCents,
          currency: input.order.currency,
          mock: input.mock,
          status: input.order.status,
        },
      })
    );
    outboxTopics.push("commerce.order.paid");
  }

  let timelineEventId: string | null = null;
  if (relationshipId?.trim() && contactId) {
    const timeline = await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId,
      relationshipId,
      kind: "commerce_order_paid",
      correlationId: corr,
      providerRef: paymentRef ?? undefined,
      metadata: {
        orderId: input.order.id,
        totalCents: input.order.totalCents,
        currency: input.order.currency,
        mock: input.mock,
        lines: input.order.lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        })),
      },
    });
    timelineEventId = timeline?.id ?? null;
    if (timelineEventId) outboxTopics.push("audience.contact_timeline");
  }

  let loyaltyAwardStubId: string | null = null;
  const loyaltyOn = isFeatureEnabled("loyalty.taploop", input.featureCtx ?? {});
  const wantsAward = link.awardLoyalty === true;

  if (wantsAward && loyaltyOn && relationshipId?.trim() && contactId) {
    const points = link.loyaltyPoints ?? defaultPurchasePoints(input.order);
    loyaltyAwardStubId = `stub_${input.order.id}`;

    enqueueOutboxSync(
      "loyalty.award.stub",
      createGovernedEvent({
        name: "loyalty.award.stub",
        businessId: input.businessId,
        aggregateType: "commerce_order",
        aggregateId: input.order.id,
        correlationId: corr,
        payload: {
          orderId: input.order.id,
          relationshipId,
          contactId,
          enrollmentId: link.enrollmentId,
          points,
          idempotencyKey: `commerce_paid_${input.order.id}`,
          mock: input.mock,
          note: `TapLoop award stub (${points} pts) — ledger write deferred to TapLoop service`,
        },
      })
    );
    outboxTopics.push("loyalty.award.stub");
  }

  const evidence = recordCommerceEvidence({
    businessId: input.businessId,
    orderId: input.order.id,
    relationshipId: relationshipId ?? null,
    contactId,
    paymentRef,
    totalCents: input.order.totalCents,
    currency: input.order.currency,
    mock: input.mock,
    loyaltyAwardStubId,
    timelineEventId,
  });

  return {
    timelineEventId,
    loyaltyAwardStubId,
    evidenceId: evidence.id,
    outboxTopics,
  };
}
