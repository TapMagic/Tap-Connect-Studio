/**
 * TapCommerce — catalog/checkout/order refs. Provider-hosted payments only.
 */

export type CommerceItem = {
  id: string;
  businessId: string;
  kind: "product" | "service" | "gift_card" | "booking";
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  active: boolean;
};

export type CommerceOrder = {
  id: string;
  businessId: string;
  relationshipId?: string;
  status: "draft" | "pending" | "paid" | "fulfilled" | "canceled" | "refunded";
  lines: Array<{ itemId: string; quantity: number; unitPriceCents: number; name: string }>;
  /** Provider payment intent / charge reference — never raw PAN */
  paymentRef?: string;
  provider: "stripe" | "manual" | "other";
  createdAt: string;
};

export type BookingRequest = {
  id: string;
  businessId: string;
  serviceItemId: string;
  startsAt: string;
  endsAt: string;
  status: "requested" | "confirmed" | "canceled" | "completed";
  relationshipId?: string;
};

export function orderTotalCents(order: CommerceOrder): number {
  return order.lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
}

export function assertNoRawCardData(payload: Record<string, unknown>): void {
  const banned = ["cardNumber", "pan", "cvv", "cvc", "card_number", "paymentMethodData"];
  for (const key of banned) {
    if (key in payload) {
      throw new Error(`Refusing to persist raw payment field: ${key}`);
    }
  }
}
