/**
 * Stripe adapter boundary — maps provider events to billing domain actions.
 * Never persist PAN/CVC; only Stripe customer/subscription IDs.
 */

import type { PlanTier, SubscriptionStatus } from "@prisma/client";

export const STRIPE_WEBHOOK_EVENT_MAP: Record<
  string,
  { action: string; description: string }
> = {
  "customer.subscription.created": {
    action: "subscription.sync",
    description: "Create or update local Subscription row from Stripe subscription",
  },
  "customer.subscription.updated": {
    action: "subscription.sync",
    description: "Reconcile tier, status, period boundaries, cancel_at_period_end",
  },
  "customer.subscription.deleted": {
    action: "subscription.cancel",
    description: "Mark subscription canceled; retain business access per grace policy",
  },
  "invoice.paid": {
    action: "invoice.record",
    description: "Append UsageLedger / billing audit; clear past_due when applicable",
  },
  "invoice.payment_failed": {
    action: "subscription.past_due",
    description: "Set billingStatus PAST_DUE; surface dunning in dashboard",
  },
  "checkout.session.completed": {
    action: "checkout.complete",
    description: "Bind stripeCustomerId; start subscription from selected price",
  },
  "customer.updated": {
    action: "customer.sync",
    description: "Sync email/metadata only — no payment method details",
  },
};

export type StripeConnectorConfig = {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
};

export function getStripeConnectorConfig(): StripeConnectorConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim(),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  };
}

export function isStripeConfigured(): boolean {
  const c = getStripeConnectorConfig();
  return Boolean(c.secretKey && c.publishableKey);
}

export function isStripeWebhookReady(): boolean {
  const c = getStripeConnectorConfig();
  return Boolean(c.secretKey && c.webhookSecret);
}

/** Mock checkout session — real Stripe SDK wired when keys present */
export function createMockCheckoutSession(input: {
  businessId: string;
  tier: PlanTier;
  priceId?: string;
}): { url: string; sessionId: string; mock: true } {
  return {
    url: `/dashboard/billing?mock_checkout=1&tier=${input.tier}`,
    sessionId: `mock_cs_${input.businessId}_${Date.now()}`,
    mock: true,
  };
}

export function mapStripeStatus(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    unpaid: "PAST_DUE",
  };
  return map[status] ?? "INCOMPLETE";
}

export function listSupportedWebhookEvents(): string[] {
  return Object.keys(STRIPE_WEBHOOK_EVENT_MAP);
}
