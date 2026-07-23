/**
 * Stripe-ready billing domain — TapConnect remains authoritative for entitlements.
 */

export type PlanVersion = {
  id: string;
  code: string;
  name: string;
  priceMonthlyCents: number;
  activeDeviceLimit: number;
  activeCampaignLimit: number;
  aiCreditsMonthly: number;
  features: string[];
  stripePriceId?: string;
  version: number;
};

export type EntitlementGrant = {
  businessId: string;
  planVersionId: string;
  featureIds: string[];
  activeDeviceCapacity: number;
  aiCreditsRemaining: number;
  source: "stripe" | "manual" | "trial" | "admin";
};

export type BillingReconciliationDiff = {
  businessId: string;
  field: string;
  tapconnectValue: string;
  stripeValue: string;
  severity: "info" | "warn" | "critical";
};

export const STRIPE_WEBHOOK_EVENTS = [
  "customer.created",
  "customer.updated",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
] as const;

export type StripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];

export function stripeBillingReady(): { ready: boolean; missing: string[] } {
  const required = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  const missing = required.filter((k) => !process.env[k]?.trim());
  return { ready: missing.length === 0, missing };
}

export function planVersionsFromV1(): PlanVersion[] {
  return [
    {
      id: "basic-v1",
      code: "BASIC",
      name: "Basic",
      priceMonthlyCents: 1900,
      activeDeviceLimit: 1,
      activeCampaignLimit: 3,
      aiCreditsMonthly: 0,
      features: ["card.builder.v1", "audience.leads", "insights.core"],
      version: 1,
    },
    {
      id: "studio-v1",
      code: "STUDIO",
      name: "Studio",
      priceMonthlyCents: 4900,
      activeDeviceLimit: 10,
      activeCampaignLimit: 10,
      aiCreditsMonthly: 10,
      features: ["card.builder.v1", "campaign.groups.schedule", "ai.autopilot"],
      version: 1,
    },
    {
      id: "pro-v1",
      code: "PRO",
      name: "Pro",
      priceMonthlyCents: 9900,
      activeDeviceLimit: 50,
      activeCampaignLimit: 50,
      aiCreditsMonthly: 50,
      features: ["devices.scan_mode", "comms.email", "campaign.time_travel"],
      version: 1,
    },
    {
      id: "growth-v1",
      code: "GROWTH",
      name: "Growth",
      priceMonthlyCents: 19900,
      activeDeviceLimit: 150,
      activeCampaignLimit: 150,
      aiCreditsMonthly: 200,
      features: ["loyalty.taploop", "commerce.tapcommerce", "journey.tapflow"],
      version: 1,
    },
  ];
}
