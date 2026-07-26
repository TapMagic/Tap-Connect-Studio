/**
 * Card Offer Fuse — Campaign-owned authoritative offer + Card Spotlight projection.
 * One offer SoT: Campaign. Card / email / TapCast are projections/variants.
 */

import { createHash } from "crypto";
import type { ContentBlock, OfferCouponData } from "@/lib/types/campaign";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { FuseBoxStatus } from "./fuse-box";

export const CARD_OFFER_FUSE_FEATURE = "card.fuse.offer" as const;

export type AuthoritativeOffer = {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  offerBlockId: string;
  title: string;
  description: string;
  code?: string;
  expiresAt?: string;
  ctaLabel: string;
  lockedUntilContact: boolean;
  /** Fingerprint of authoritative facts (not presentation). */
  factsFingerprint: string;
};

export type OfferProjectionState = "current" | "stale" | "unbound" | "campaign_missing";

export type OfferFuseBindInput = {
  section: TapCardSection;
  offer: AuthoritativeOffer;
  /** Preserve host teaser overrides when refreshing facts */
  preservePresentation?: boolean;
  deviceCode?: string;
};

export type OfferDistributionChannel = "email" | "tapcast_social";

export type OfferDistributionPackage = {
  id: string;
  campaignId: string;
  offerBlockId: string;
  sectionId?: string;
  channels: OfferDistributionChannel[];
  emailSubject: string;
  emailBody: string;
  socialCaption: string;
  factsFingerprint: string;
  mock: true;
  requiresHumanApproval: true;
  preparedAt: string;
  status: "prepared";
};

export function fingerprintOfferFacts(facts: {
  title: string;
  description: string;
  code?: string;
  expiresAt?: string;
  ctaLabel: string;
}): string {
  const payload = [
    facts.title.trim(),
    facts.description.trim(),
    (facts.code ?? "").trim(),
    (facts.expiresAt ?? "").trim(),
    facts.ctaLabel.trim(),
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function extractAuthoritativeOffer(input: {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  blocks: ContentBlock[];
  preferBlockId?: string;
}): AuthoritativeOffer | null {
  const coupons = input.blocks.filter(
    (b) => b.type === "offer_coupon" && b.enabled !== false
  ) as unknown as ContentBlock<OfferCouponData>[];
  if (coupons.length === 0) return null;

  const preferred =
    (input.preferBlockId
      ? coupons.find((b) => b.id === input.preferBlockId)
      : undefined) ?? coupons.sort((a, b) => a.order - b.order)[0];

  const data = preferred.data;
  const title = (data.title || "").trim() || input.campaignTitle;
  const description = (data.description || "").trim() || "Special offer";
  const ctaLabel = (data.ctaLabel || "").trim() || "Claim offer";
  const code = data.code?.trim() || undefined;
  const expiresAt = data.expiresAt?.trim() || undefined;

  return {
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle,
    campaignStatus: input.campaignStatus,
    offerBlockId: preferred.id,
    title,
    description,
    code,
    expiresAt,
    ctaLabel,
    lockedUntilContact: data.lockedUntilContact !== false,
    factsFingerprint: fingerprintOfferFacts({
      title,
      description,
      code,
      expiresAt,
      ctaLabel,
    }),
  };
}

/** Project authoritative facts onto a Card Spotlight section. */
export function projectOfferOntoSpotlight(input: OfferFuseBindInput): TapCardSection {
  const { section, offer, preservePresentation, deviceCode } = input;
  const href = deviceCode ? `/t/${deviceCode}?public=1` : section.href;

  return {
    ...section,
    type: "special_offer",
    enabled: section.enabled !== false,
    offerMode: "campaign",
    linkedCampaignId: offer.campaignId,
    linkedCampaignTitle: offer.campaignTitle,
    linkedDeviceCode: deviceCode || section.linkedDeviceCode,
    offerBlockId: offer.offerBlockId,
    offerFactsFingerprint: offer.factsFingerprint,
    offerTitle: offer.title,
    offerDescription: offer.description,
    offerCode: offer.code,
    offerExpires: offer.expiresAt,
    offerCta: offer.ctaLabel,
    href: href || section.href,
    // Presentation: keep host teaser when refreshing; seed from facts on first bind
    text: preservePresentation && section.text ? section.text : section.text || "Offer",
    headline:
      preservePresentation && section.headline?.trim()
        ? section.headline
        : offer.title,
    description:
      preservePresentation && section.description?.trim()
        ? section.description
        : offer.description,
    offerDefaultOpen: section.offerDefaultOpen ?? true,
  };
}

export function detectOfferProjectionState(input: {
  section: TapCardSection | null | undefined;
  offer: AuthoritativeOffer | null;
}): OfferProjectionState {
  if (!input.section || input.section.type !== "special_offer") return "unbound";
  if (!input.section.linkedCampaignId || input.section.offerMode !== "campaign") {
    return "unbound";
  }
  if (!input.offer) return "campaign_missing";
  const stored = input.section.offerFactsFingerprint;
  if (!stored) return "stale";
  return stored === input.offer.factsFingerprint ? "current" : "stale";
}

export function findPrimarySpotlightSection(
  card: TapConnectCardConfig | null | undefined
): TapCardSection | null {
  if (!card?.sections?.length) return null;
  const offers = card.sections
    .filter((s) => s.type === "special_offer" && s.enabled !== false)
    .sort((a, b) => a.order - b.order);
  const bound = offers.find((s) => s.offerMode === "campaign" && s.linkedCampaignId);
  return bound || offers[0] || null;
}

export function deriveOfferFuseStatus(input: {
  featureOn: boolean;
  hasBoundSpotlight: boolean;
  hasAuthoritativeOffer: boolean;
  projectionState: OfferProjectionState;
  conversionEvidenceCount: number;
}): FuseBoxStatus {
  if (!input.featureOn) return "not_yet_available";
  if (!input.hasBoundSpotlight || !input.hasAuthoritativeOffer) {
    return "available_to_configure";
  }
  if (input.projectionState === "campaign_missing") {
    return "available_to_configure";
  }
  if (input.conversionEvidenceCount > 0) return "connected";
  return "partially_connected";
}

export function buildOfferEmailVariant(offer: AuthoritativeOffer, businessName: string): {
  subject: string;
  body: string;
} {
  const codeLine = offer.code ? `\n\nYour code: ${offer.code}` : "";
  const expiresLine = offer.expiresAt ? `\nExpires: ${offer.expiresAt}` : "";
  return {
    subject: `${offer.title} · from ${businessName}`,
    body: `Thanks for saving this offer from ${businessName}.\n\n${offer.title}\n${offer.description}${codeLine}${expiresLine}\n\n— ${businessName}\n(Mock follow-up · not live email)`,
  };
}

export function buildOfferSocialCaption(offer: AuthoritativeOffer, businessName: string): string {
  const code = offer.code ? ` Code: ${offer.code}.` : "";
  return `${offer.title} at ${businessName}. ${offer.description}${code} Tap to claim. (Mock TapCast package · not published)`;
}

export function buildOfferDistributionPackage(input: {
  offer: AuthoritativeOffer;
  businessName: string;
  sectionId?: string;
}): OfferDistributionPackage {
  const email = buildOfferEmailVariant(input.offer, input.businessName);
  return {
    id: `odp_${input.offer.campaignId}_${Date.now().toString(36)}`,
    campaignId: input.offer.campaignId,
    offerBlockId: input.offer.offerBlockId,
    sectionId: input.sectionId,
    channels: ["email", "tapcast_social"],
    emailSubject: email.subject,
    emailBody: email.body,
    socialCaption: buildOfferSocialCaption(input.offer, input.businessName),
    factsFingerprint: input.offer.factsFingerprint,
    mock: true,
    requiresHumanApproval: true,
    preparedAt: new Date().toISOString(),
    status: "prepared",
  };
}
