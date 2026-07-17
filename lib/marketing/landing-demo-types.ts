export const LANDING_DEMO_MODES = ["card", "offer", "product", "review"] as const;
export type LandingDemoMode = (typeof LANDING_DEMO_MODES)[number];

export const LANDING_DEMO_MODE_META: Record<
  LandingDemoMode,
  { label: string; description: string; editHint: string }
> = {
  card: {
    label: "Tap Card",
    description: "Premium profile that launches campaigns, offers, and contact save.",
    editHint: "Edit in Tap Card Builder, then assign here (or publish from the card).",
  },
  offer: {
    label: "Special Offer",
    description: "Scheduled promo with lead capture and a locked coupon code.",
    editHint: "Build the page in Campaign Workbench, then assign it here.",
  },
  product: {
    label: "Product Story",
    description: "Shelf-tag story with details and a claimable intro perk.",
    editHint: "Build the product page in Workbench, then assign it here.",
  },
  review: {
    label: "Contact Collector",
    description: "Review route plus signup that returns a thank-you offer.",
    editHint: "Build the collector page in Workbench, then assign it here.",
  },
};

export type LandingDemoSlotRow = {
  mode: LandingDemoMode;
  campaignId: string | null;
  enabled: boolean;
  showLogo: boolean;
  logoUrl: string | null;
  campaignTitle: string | null;
  campaignStatus: string | null;
};
