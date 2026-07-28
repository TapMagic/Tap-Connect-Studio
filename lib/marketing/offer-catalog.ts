/**
 * Public TapConnect offer catalog — owns product story before Stripe.
 * Prices are placeholders; no entitlement enforcement; Stripe Price IDs server-only.
 */

import type { TapConnectIconId } from "@/lib/fusion/icons/registry";

export type OfferBillingFrequency = "monthly" | "annual" | "one_time";

export type OfferTierId =
  | "tapconnect"
  | "studio"
  | "studio_growth"
  | "studio_scale";

export type PublishedOffer = {
  id: OfferTierId;
  slug: string;
  displayName: string;
  productLine: "tapconnect" | "studio";
  whoFor: string;
  mainOutcome: string;
  description: string;
  capabilityIcons: TapConnectIconId[];
  capabilityCategories: string[];
  /** Marked for later Owner decision — not final pricing */
  allowancePlaceholder: string;
  upgradeContinuity: string;
  billingFrequencies: OfferBillingFrequency[];
  /** Display placeholder only — never treated as charged amount */
  priceDisplayPlaceholder: string;
  termsSummary: string;
  ctaLabel: string;
  /** Server maps to Stripe Price when configured; never expose as editable client secret */
  stripePriceKey: string;
  version: string;
};

export const PUBLISHED_OFFERS: PublishedOffer[] = [
  {
    id: "tapconnect",
    slug: "tapconnect",
    displayName: "TapConnect",
    productLine: "tapconnect",
    whoFor: "Businesses that need a living Card customers can tap and return to.",
    mainOutcome: "A complete, useful Card with core supporting capabilities.",
    description:
      "TapConnect is the Card — Brand Kit, Tap Points, Campaigns, and TapSave around one relationship hub. Useful on its own before Studio expands.",
    capabilityIcons: ["card", "brand", "tap_points", "campaigns", "tapsave"],
    capabilityCategories: ["Card", "Brand Kit", "Tap Points", "Campaigns", "TapSave"],
    allowancePlaceholder: "Capacity and allowance details — decided later.",
    upgradeContinuity: "Upgrade to Studio without rebuilding the Card.",
    billingFrequencies: ["monthly", "annual"],
    priceDisplayPlaceholder: "Pricing shown at checkout — not finalized here.",
    termsSummary:
      "Subscription terms and renewals are confirmed on the offer Card before payment. Payment details are collected by Stripe; TapConnect never stores card numbers.",
    ctaLabel: "Explore TapConnect",
    stripePriceKey: "offer.tapconnect.monthly",
    version: "offer-v1",
  },
  {
    id: "studio",
    slug: "studio",
    displayName: "TapConnect Studio",
    productLine: "studio",
    whoFor: "Teams that need to operate the Card relationship day to day.",
    mainOutcome: "Broader operating capabilities around the same Card.",
    description:
      "Studio adds Audience, Email & Communications, Autopilot, Insights, and Integrations around your Card. Feature availability varies by tier.",
    capabilityIcons: [
      "card",
      "brand",
      "tap_points",
      "campaigns",
      "tapsave",
      "audience",
      "email",
      "autopilot",
      "insights",
      "integrations",
      "trust_fabric",
    ],
    capabilityCategories: [
      "Card",
      "Audience",
      "Email & Communications",
      "Autopilot",
      "Insights & TapProof",
      "Integrations",
      "Trust Fabric",
    ],
    allowancePlaceholder: "Studio allowances — decided later by plan research.",
    upgradeContinuity: "Same Card. Add operating capabilities as you grow.",
    billingFrequencies: ["monthly", "annual"],
    priceDisplayPlaceholder: "Pricing shown at checkout — not finalized here.",
    termsSummary:
      "Studio feature availability varies by plan. Payment is processed by Stripe; you return to TapConnect after the transaction.",
    ctaLabel: "Explore Studio",
    stripePriceKey: "offer.studio.monthly",
    version: "offer-v1",
  },
  {
    id: "studio_growth",
    slug: "studio-growth",
    displayName: "Studio Growth",
    productLine: "studio",
    whoFor: "Growing multi-location or multi-campaign operations.",
    mainOutcome: "More capacity and operating depth around the same Card.",
    description:
      "Working label for a growth-oriented Studio path. Exact allowances and pricing remain Owner decisions.",
    capabilityIcons: [
      "card",
      "campaigns",
      "audience",
      "email",
      "autopilot",
      "insights",
      "integrations",
    ],
    capabilityCategories: ["Expanded Campaigns", "Audience", "Communications", "Autopilot", "Insights"],
    allowancePlaceholder: "Growth capacity placeholders — not final.",
    upgradeContinuity: "Move from Studio without rebuilding the Card.",
    billingFrequencies: ["monthly", "annual"],
    priceDisplayPlaceholder: "Pricing shown at checkout — not finalized here.",
    termsSummary: "Working offer architecture. Final plan research is separate.",
    ctaLabel: "Choose this path",
    stripePriceKey: "offer.studio_growth.monthly",
    version: "offer-v1",
  },
  {
    id: "studio_scale",
    slug: "studio-scale",
    displayName: "Studio Scale",
    productLine: "studio",
    whoFor: "Larger operations that need broader Studio operating room.",
    mainOutcome: "Scale-oriented Studio path around the same Card.",
    description:
      "Working label for scale. Not a finalized commercial package — presented for architecture clarity only.",
    capabilityIcons: [
      "card",
      "audience",
      "email",
      "service",
      "autopilot",
      "insights",
      "integrations",
      "trust_fabric",
    ],
    capabilityCategories: ["Full Studio categories", "Service / TapInbox", "Integrations", "Trust Fabric"],
    allowancePlaceholder: "Scale allowances — decided later.",
    upgradeContinuity: "Card relationship continuity preserved.",
    billingFrequencies: ["monthly", "annual"],
    priceDisplayPlaceholder: "Pricing shown at checkout — not finalized here.",
    termsSummary: "Working offer architecture. Final plan research is separate.",
    ctaLabel: "View plan options",
    stripePriceKey: "offer.studio_scale.monthly",
    version: "offer-v1",
  },
];

export function getPublishedOffer(slugOrId: string): PublishedOffer | undefined {
  return PUBLISHED_OFFERS.find((o) => o.slug === slugOrId || o.id === slugOrId);
}

export function offerHref(offer: PublishedOffer): string {
  return `/offer/${offer.slug}`;
}

/** Sibling products — owned journeys outside this repo when URLs are configured. */
export const SIBLING_PRODUCTS = {
  petFinder: {
    id: "pet_finder",
    name: "Tap Magic Pet Finder",
    concept: "Help a lost pet find the way home.",
    body: "A tap-ready pet profile with finder access, an owner contact path, and an appropriate privacy boundary — including multiple photos where the product already supports them.",
    ctaLabel: "Explore Pet Finder",
    /** Owned product journey — never Stripe */
    hrefEnv: "NEXT_PUBLIC_PET_FINDER_URL",
    fallbackHref: "https://tapthemagic.com",
  },
  tapStay: {
    id: "tapstay",
    name: "TapStay",
    concept: "Give every guest the information they need, right when they need it.",
    body: "A living guest experience for property information via link, QR, or tap — host-managed content with the features TapStay currently ships.",
    ctaLabel: "Explore TapStay",
    hrefEnv: "NEXT_PUBLIC_TAPSTAY_URL",
    fallbackHref: "https://tapthemagic.com",
  },
} as const;

export function siblingProductHref(
  product: (typeof SIBLING_PRODUCTS)[keyof typeof SIBLING_PRODUCTS]
): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env[product.hrefEnv]?.trim() : undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : product.fallbackHref;
}
