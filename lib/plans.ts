import type { PlanTier } from "@prisma/client";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  description: string;
  activeDeviceLimit: number;
  activeCampaignLimit: number;
  features: string[];
  stripePriceId?: string;
}

export const PLANS: PlanDefinition[] = [
  {
    tier: "BASIC",
    name: "Basic",
    priceMonthly: 19,
    description: "One TapConnect profile with essential mini pages.",
    activeDeviceLimit: 1,
    activeCampaignLimit: 3,
    features: [
      "1 active device",
      "3 mini pages",
      "QR codes",
      "Basic analytics",
      "Email capture",
    ],
  },
  {
    tier: "STUDIO",
    name: "Studio",
    priceMonthly: 49,
    description: "For businesses running multiple tap campaigns.",
    activeDeviceLimit: 10,
    activeCampaignLimit: 10,
    features: [
      "10 active devices",
      "10 active campaigns",
      "Campaign Workbench",
      "Basic AI builder",
      "Company templates",
      "Coupons & offers",
      "Basic analytics",
    ],
  },
  {
    tier: "PRO",
    name: "Pro",
    priceMonthly: 99,
    description: "Advanced tools for growing businesses.",
    activeDeviceLimit: 50,
    activeCampaignLimit: 50,
    features: [
      "50 active devices",
      "50 active campaigns",
      "Archived campaigns",
      "Scan mode",
      "Staff scanner role",
      "Auto-reply emails",
      "Lead export",
      "Multi-location lite",
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    priceMonthly: 199,
    description: "For multi-location brands scaling tap marketing.",
    activeDeviceLimit: 150,
    activeCampaignLimit: 150,
    features: [
      "150 active devices",
      "150 active campaigns",
      "Multiple locations",
      "Team users",
      "Campaign scheduling",
      "Advanced analytics",
      "Priority support",
    ],
  },
];

export function getPlanByTier(tier: PlanTier) {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}
