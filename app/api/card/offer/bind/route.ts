import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { prisma } from "@/lib/db";
import {
  detectOfferProjectionState,
  extractAuthoritativeOffer,
  projectOfferOntoSpotlight,
} from "@/lib/fusion/card/offer";
import { parseContentBlocks } from "@/lib/services/devices";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().min(1),
  sectionId: z.string().optional(),
  offerBlockId: z.string().optional(),
  /** When true, refresh facts but keep host teaser copy */
  preservePresentation: z.boolean().optional().default(true),
  deviceCode: z.string().optional(),
});

/**
 * Host: bind or refresh Card Spotlight → Campaign-owned authoritative offer.
 * Writes Brand Kit tapCard JSON (no duplicate Offer SoT).
 */
export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());

    const campaign = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
      select: {
        id: true,
        title: true,
        status: true,
        contentBlocks: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: { deviceSlot: { select: { deviceCode: true } } },
        },
      },
    });
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Campaign not found", code: "campaign_not_found" },
        { status: 404 }
      );
    }

    const blocks = parseContentBlocks(campaign.contentBlocks);
    const offer = extractAuthoritativeOffer({
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      blocks,
      preferBlockId: body.offerBlockId,
    });
    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Add an offer_coupon block to the Campaign before binding.",
          code: "offer_not_found",
        },
        { status: 400 }
      );
    }

    const brandKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
    });
    const profile = parseBrandContactProfile(brandKit?.socialLinks);
    const config = parseTapConnectCard(brandKit?.tapCard, {
      businessName: business.name,
      profile,
      logoUrl: business.logoUrl,
      accentColor: brandKit?.accentColor || "#a3e635",
    });

    const deviceCode =
      body.deviceCode ||
      campaign.assignments[0]?.deviceSlot.deviceCode ||
      undefined;

    let section = body.sectionId
      ? config.sections.find((s) => s.id === body.sectionId)
      : config.sections
          .filter((s) => s.type === "special_offer")
          .sort((a, b) => a.order - b.order)[0];

    const creating = !section;
    if (!section) {
      section = {
        id: `offer_${Date.now().toString(36)}`,
        type: "special_offer",
        enabled: true,
        order: config.sections.length,
        label: "Special offer",
        specialStyle: "banner",
        offerMode: "campaign",
      };
    }

    const projected = projectOfferOntoSpotlight({
      section,
      offer,
      preservePresentation: creating ? false : body.preservePresentation,
      deviceCode,
    });

    const nextSections = creating
      ? [...config.sections, projected]
      : config.sections.map((s) => (s.id === projected.id ? projected : s));

    const nextConfig = { ...config, sections: nextSections };
    await prisma.brandKit.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        tapCard: nextConfig as object,
      },
      update: {
        tapCard: nextConfig as object,
      },
    });

    const projectionState = detectOfferProjectionState({
      section: projected,
      offer,
    });

    return NextResponse.json({
      ok: true,
      sectionId: projected.id,
      campaignId: offer.campaignId,
      offerBlockId: offer.offerBlockId,
      factsFingerprint: offer.factsFingerprint,
      projectionState,
      offer: {
        title: offer.title,
        description: offer.description,
        code: offer.code,
        expiresAt: offer.expiresAt,
        ctaLabel: offer.ctaLabel,
      },
      createdSection: creating,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid bind request", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Card offer bind error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to bind offer", code: "server" },
      { status: 500 }
    );
  }
}

/** Preview projections across Card / email / social without writing. */
export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json(
        { ok: false, error: "campaignId required", code: "validation" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, businessId: business.id },
      select: { id: true, title: true, status: true, contentBlocks: true },
    });
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Campaign not found", code: "campaign_not_found" },
        { status: 404 }
      );
    }

    const { buildOfferDistributionPackage, detectOfferProjectionState } = await import(
      "@/lib/fusion/card/offer"
    );
    const { parseTapConnectCard: parseCard } = await import("@/lib/brand/tap-card");
    const { parseBrandContactProfile: parseProfile } = await import(
      "@/lib/brand/contact-profile"
    );

    const blocks = parseContentBlocks(campaign.contentBlocks);
    const offer = extractAuthoritativeOffer({
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      blocks,
      preferBlockId: url.searchParams.get("offerBlockId") ?? undefined,
    });
    if (!offer) {
      return NextResponse.json(
        { ok: false, error: "No offer_coupon on campaign", code: "offer_not_found" },
        { status: 404 }
      );
    }

    const brandKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
    });
    const profile = parseProfile(brandKit?.socialLinks);
    const config = parseCard(brandKit?.tapCard, {
      businessName: business.name,
      profile,
      logoUrl: business.logoUrl,
      accentColor: brandKit?.accentColor || "#a3e635",
    });
    const section =
      config.sections.find(
        (s) => s.type === "special_offer" && s.linkedCampaignId === campaign.id
      ) ||
      config.sections.find((s) => s.type === "special_offer");

    const pkg = buildOfferDistributionPackage({
      offer,
      businessName: business.name,
      sectionId: section?.id,
    });

    return NextResponse.json({
      ok: true,
      offer,
      projectionState: detectOfferProjectionState({ section, offer }),
      previews: {
        cardSpotlight: {
          headline: section?.headline || offer.title,
          description: section?.description || offer.description,
          offerTitle: offer.title,
          offerCode: offer.code,
          offerCta: offer.ctaLabel,
          offerExpires: offer.expiresAt,
        },
        email: { subject: pkg.emailSubject, body: pkg.emailBody, mock: true },
        tapcast: { caption: pkg.socialCaption, mock: true, published: false },
        confirmation: {
          statusLabels: ["Available", "Claimed", "Requested", "Saved"],
          sample: offer.code
            ? `Offer claimed. Your code is ${offer.code}.`
            : "Offer claimed.",
        },
        insightsAttribution: {
          campaignId: offer.campaignId,
          offerBlockId: offer.offerBlockId,
          sectionId: section?.id ?? null,
          events: [
            "card_offer_viewed",
            "card_offer_claimed",
            "card_offer_lead",
            "card_offer_followup_queued",
          ],
        },
      },
    });
  } catch (error) {
    console.error("Card offer preview error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to preview offer", code: "server" },
      { status: 500 }
    );
  }
}
