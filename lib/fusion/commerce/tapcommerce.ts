/**
 * TapCommerce — catalog / order drafts / mock checkout.
 * Provider-hosted payments only. Never persist raw card data (PAN/CVC).
 * In-memory FUNCTIONAL mock until Stripe commerce credentials are certified.
 */

import { isFeatureEnabled, isFeatureExecutable } from "@/lib/fusion/features/resolve";
import {
  getStripeConnectorConfig,
  isStripeConfigured,
  isStripeWebhookReady,
} from "@/lib/fusion/billing/stripe-connector";

export type CommerceItemKind = "product" | "service" | "gift_card" | "booking";

export type CommerceItem = {
  id: string;
  businessId: string;
  kind: CommerceItemKind;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  active: boolean;
};

export type CommerceLineItem = {
  itemId: string;
  quantity: number;
  unitPriceCents: number;
  name: string;
};

export type CommerceOrderStatus =
  | "draft"
  | "pending"
  | "paid"
  | "fulfilled"
  | "canceled"
  | "refunded";

export type CommerceOrder = {
  id: string;
  businessId: string;
  relationshipId?: string;
  status: CommerceOrderStatus;
  lines: CommerceLineItem[];
  currency: string;
  /** Subtotal before tax */
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  /** Provider payment intent / charge / checkout session reference — never raw PAN */
  paymentRef?: string;
  checkoutSessionId?: string;
  provider: "stripe" | "manual" | "other";
  mock: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommerceCheckoutSession = {
  id: string;
  orderId: string;
  businessId: string;
  url: string;
  status: "open" | "complete" | "expired";
  amountTotalCents: number;
  currency: string;
  /** Stripe-style client secret placeholder — not a card number */
  clientReference?: string;
  mock: true;
  createdAt: string;
};

export type CommerceStripeReadiness = {
  state: "disconnected" | "credentials_partial" | "ready_mock" | "ready_live";
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  publishableConfigured: boolean;
  missingEnvVars: string[];
  featureEnabled: boolean;
  featureExecutable: boolean;
  mockCheckoutAvailable: boolean;
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

type CommerceStore = {
  items: CommerceItem[];
  orders: CommerceOrder[];
  sessions: CommerceCheckoutSession[];
};

const store: CommerceStore = {
  items: [],
  orders: [],
  sessions: [],
};

const BANNED_CARD_KEYS = [
  "cardNumber",
  "pan",
  "cvv",
  "cvc",
  "card_number",
  "paymentMethodData",
  "card_cvc",
  "exp_month",
  "exp_year",
  "number",
] as const;

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Test / seed helper — clears in-memory catalog and orders */
export function resetCommerceStore(): void {
  store.items.length = 0;
  store.orders.length = 0;
  store.sessions.length = 0;
}

export function assertNoRawCardData(payload: Record<string, unknown>): void {
  for (const key of BANNED_CARD_KEYS) {
    if (key in payload) {
      throw new Error(`Refusing to persist raw payment field: ${key}`);
    }
  }
  // Nested objects (shallow check)
  for (const value of Object.values(payload)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const key of BANNED_CARD_KEYS) {
        if (key in (value as Record<string, unknown>)) {
          throw new Error(`Refusing to persist raw payment field: ${key}`);
        }
      }
    }
  }
}

export function orderTotalCents(order: Pick<CommerceOrder, "lines">): number {
  return order.lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
}

export function computeOrderTotals(
  lines: CommerceLineItem[],
  taxRateBps = 0
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function applyTotals(order: CommerceOrder, taxRateBps = 0): CommerceOrder {
  const totals = computeOrderTotals(order.lines, taxRateBps);
  return {
    ...order,
    ...totals,
    updatedAt: nowIso(),
  };
}

export function upsertCatalogItem(input: {
  businessId: string;
  id?: string;
  kind: CommerceItemKind;
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  active?: boolean;
}): CommerceItem {
  assertNoRawCardData(input as unknown as Record<string, unknown>);
  if (input.priceCents < 0) throw new Error("priceCents must be >= 0");

  const existing = input.id
    ? store.items.find((i) => i.id === input.id && i.businessId === input.businessId)
    : undefined;

  if (existing) {
    existing.kind = input.kind;
    existing.name = input.name;
    existing.description = input.description;
    existing.priceCents = input.priceCents;
    existing.currency = input.currency ?? existing.currency;
    existing.active = input.active ?? existing.active;
    return existing;
  }

  const item: CommerceItem = {
    id: input.id ?? newId("item"),
    businessId: input.businessId,
    kind: input.kind,
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    currency: input.currency ?? "usd",
    active: input.active ?? true,
  };
  store.items.push(item);
  return item;
}

export function listCatalogItems(businessId: string, activeOnly = false): CommerceItem[] {
  return store.items.filter(
    (i) => i.businessId === businessId && (!activeOnly || i.active)
  );
}

export function createOrderDraft(input: {
  businessId: string;
  relationshipId?: string;
  currency?: string;
  lines?: Array<{ itemId: string; quantity: number } | CommerceLineItem>;
  taxRateBps?: number;
  featureEnabled?: boolean;
}):
  | { ok: true; order: CommerceOrder }
  | { ok: false; code: string; error: string } {
  const enabled =
    input.featureEnabled ?? isFeatureEnabled("commerce.tapcommerce", {});
  if (!enabled) {
    return { ok: false, code: "feature_off", error: "commerce.tapcommerce is disabled" };
  }

  assertNoRawCardData(input as unknown as Record<string, unknown>);

  const lines: CommerceLineItem[] = [];
  for (const raw of input.lines ?? []) {
    if ("name" in raw && "unitPriceCents" in raw) {
      lines.push({
        itemId: raw.itemId,
        quantity: Math.max(1, raw.quantity),
        unitPriceCents: raw.unitPriceCents,
        name: raw.name,
      });
      continue;
    }
    const item = store.items.find(
      (i) => i.id === raw.itemId && i.businessId === input.businessId && i.active
    );
    if (!item) {
      return { ok: false, code: "item_not_found", error: `Catalog item ${raw.itemId} not found` };
    }
    lines.push({
      itemId: item.id,
      quantity: Math.max(1, raw.quantity),
      unitPriceCents: item.priceCents,
      name: item.name,
    });
  }

  const totals = computeOrderTotals(lines, input.taxRateBps ?? 0);
  const ts = nowIso();
  const order: CommerceOrder = {
    id: newId("ord"),
    businessId: input.businessId,
    relationshipId: input.relationshipId,
    status: "draft",
    lines,
    currency: input.currency ?? "usd",
    ...totals,
    provider: "stripe",
    mock: true,
    createdAt: ts,
    updatedAt: ts,
  };
  store.orders.push(order);
  return { ok: true, order };
}

export function addLineToOrder(input: {
  businessId: string;
  orderId: string;
  itemId: string;
  quantity?: number;
  taxRateBps?: number;
}):
  | { ok: true; order: CommerceOrder }
  | { ok: false; code: string; error: string } {
  const order = store.orders.find(
    (o) => o.id === input.orderId && o.businessId === input.businessId
  );
  if (!order) return { ok: false, code: "not_found", error: "Order not found" };
  if (order.status !== "draft") {
    return { ok: false, code: "not_draft", error: "Only draft orders can be edited" };
  }

  const item = store.items.find(
    (i) => i.id === input.itemId && i.businessId === input.businessId && i.active
  );
  if (!item) return { ok: false, code: "item_not_found", error: "Catalog item not found" };

  const qty = Math.max(1, input.quantity ?? 1);
  const existing = order.lines.find((l) => l.itemId === item.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    order.lines.push({
      itemId: item.id,
      quantity: qty,
      unitPriceCents: item.priceCents,
      name: item.name,
    });
  }

  const updated = applyTotals(order, input.taxRateBps ?? 0);
  Object.assign(order, updated);
  return { ok: true, order };
}

export function listOrders(businessId: string): CommerceOrder[] {
  return store.orders
    .filter((o) => o.businessId === businessId)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(businessId: string, orderId: string): CommerceOrder | null {
  return store.orders.find((o) => o.id === orderId && o.businessId === businessId) ?? null;
}

/**
 * Mock Stripe Checkout Session — never accepts or stores card numbers.
 * Live Stripe SDK wiring remains credential-blocked.
 */
export function createMockCheckoutSession(input: {
  businessId: string;
  orderId: string;
  successPath?: string;
  featureEnabled?: boolean;
}):
  | { ok: true; session: CommerceCheckoutSession; order: CommerceOrder }
  | { ok: false; code: string; error: string } {
  const enabled =
    input.featureEnabled ?? isFeatureEnabled("commerce.tapcommerce", {});
  if (!enabled) {
    return { ok: false, code: "feature_off", error: "commerce.tapcommerce is disabled" };
  }

  assertNoRawCardData(input as unknown as Record<string, unknown>);

  const order = getOrder(input.businessId, input.orderId);
  if (!order) return { ok: false, code: "not_found", error: "Order not found" };
  if (order.lines.length === 0) {
    return { ok: false, code: "empty_cart", error: "Order has no line items" };
  }
  if (order.status !== "draft" && order.status !== "pending") {
    return { ok: false, code: "invalid_status", error: `Cannot checkout order in status ${order.status}` };
  }

  const sessionId = newId("cs_mock");
  const success =
    input.successPath ??
    `/dashboard/experiences/orders?mock_checkout=1&order=${order.id}`;

  const session: CommerceCheckoutSession = {
    id: sessionId,
    orderId: order.id,
    businessId: input.businessId,
    url: `${success}&session=${sessionId}`,
    status: "open",
    amountTotalCents: order.totalCents,
    currency: order.currency,
    clientReference: `mock_ref_${order.id}`,
    mock: true,
    createdAt: nowIso(),
  };
  store.sessions.push(session);

  order.status = "pending";
  order.checkoutSessionId = sessionId;
  order.paymentRef = sessionId;
  order.updatedAt = nowIso();

  return { ok: true, session, order };
}

/** Simulate provider webhook completing checkout — still no card data */
export function completeMockCheckout(input: {
  businessId: string;
  sessionId: string;
}):
  | { ok: true; order: CommerceOrder; session: CommerceCheckoutSession }
  | { ok: false; code: string; error: string } {
  assertNoRawCardData(input as unknown as Record<string, unknown>);

  const session = store.sessions.find(
    (s) => s.id === input.sessionId && s.businessId === input.businessId
  );
  if (!session) return { ok: false, code: "session_not_found", error: "Checkout session not found" };

  const order = getOrder(input.businessId, session.orderId);
  if (!order) return { ok: false, code: "not_found", error: "Order not found" };

  session.status = "complete";
  order.status = "paid";
  order.paymentRef = session.id;
  order.updatedAt = nowIso();

  return { ok: true, order, session };
}

const COMMERCE_STRIPE_ENV = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function evaluateCommerceStripeReadiness(ctx?: {
  overrides?: import("@/lib/fusion/features/resolve").FeatureOverride[];
}): CommerceStripeReadiness {
  const config = getStripeConnectorConfig();
  const missingEnvVars = COMMERCE_STRIPE_ENV.filter((k) => !process.env[k]?.trim());
  const featureEnabled = isFeatureEnabled("commerce.tapcommerce", ctx);
  const featureExecutable = isFeatureExecutable("commerce.tapcommerce", ctx);

  let state: CommerceStripeReadiness["state"] = "disconnected";
  if (isStripeConfigured() && isStripeWebhookReady()) {
    state = "ready_live";
  } else if (isStripeConfigured() || missingEnvVars.length < COMMERCE_STRIPE_ENV.length) {
    state = "credentials_partial";
  }

  // Honest mock path: checkout works without live Stripe
  if (state !== "ready_live") {
    state = featureEnabled ? "ready_mock" : state === "disconnected" ? "disconnected" : "credentials_partial";
  }

  return {
    state,
    stripeConfigured: isStripeConfigured(),
    webhookConfigured: isStripeWebhookReady(),
    publishableConfigured: Boolean(config.publishableKey),
    missingEnvVars: [...missingEnvVars],
    featureEnabled,
    featureExecutable,
    mockCheckoutAvailable: true,
  };
}

/** Seed a couple of demo catalog items for UI / tests */
export function seedDemoCatalog(businessId: string): CommerceItem[] {
  return [
    upsertCatalogItem({
      businessId,
      id: `item_demo_widget_${businessId.slice(0, 6)}`,
      kind: "product",
      name: "Demo Widget",
      description: "TapCommerce mock product",
      priceCents: 2500,
    }),
    upsertCatalogItem({
      businessId,
      id: `item_demo_service_${businessId.slice(0, 6)}`,
      kind: "service",
      name: "Consultation",
      description: "30-minute service booking stub",
      priceCents: 7500,
    }),
  ];
}
