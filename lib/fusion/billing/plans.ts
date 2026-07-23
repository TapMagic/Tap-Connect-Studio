import type { PlanTier } from "@prisma/client";
import { PLANS } from "@/lib/plans";
import type { Entitlement, PlanVersion } from "./types";

function entitlementsForTier(tier: PlanTier): Entitlement[] {
  const plan = PLANS.find((p) => p.tier === tier);
  if (!plan) return [];
  return [
    {
      key: "devices.active",
      label: "Active devices",
      limit: plan.activeDeviceLimit,
    },
    {
      key: "campaigns.active",
      label: "Active campaigns",
      limit: plan.activeCampaignLimit,
    },
    {
      key: "ai.autopilot",
      label: "Automation Team requests",
      limit: tier === "BASIC" ? 0 : tier === "STUDIO" ? 50 : 500,
      metered: true,
    },
    {
      key: "insights.core",
      label: "Insights dashboards",
      unlimited: true,
    },
  ];
}

export const PLAN_VERSIONS: PlanVersion[] = PLANS.map((plan) => ({
  id: `plan_${plan.tier.toLowerCase()}_v1`,
  tier: plan.tier,
  version: 1,
  name: plan.name,
  priceMonthlyCents: plan.priceMonthly * 100,
  stripePriceId: plan.stripePriceId,
  entitlements: entitlementsForTier(plan.tier),
  effectiveFrom: "2026-01-01T00:00:00.000Z",
}));

export function getPlanVersion(tier: PlanTier): PlanVersion | undefined {
  return PLAN_VERSIONS.find((p) => p.tier === tier);
}
