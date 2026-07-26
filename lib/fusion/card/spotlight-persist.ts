/**
 * Authoritative Card Spotlight bind for Offer Fuse / Autopilot F3.
 * Brand Kit stores projection only — Campaign remains offer SoT.
 */

import { parseTapConnectCard, type TapCardSection } from "@/lib/brand/tap-card";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { prisma } from "@/lib/db";
import {
  detectOfferProjectionState,
  extractAuthoritativeOffer,
  projectOfferOntoSpotlight,
  unprojectSpotlightOffer,
  type AuthoritativeOffer,
  type OfferProjectionState,
} from "@/lib/fusion/card/offer";
import { parseContentBlocks } from "@/lib/services/devices";
import type { Prisma } from "@prisma/client";

export type PersistSpotlightBindInput = {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  campaignId: string;
  sectionId?: string;
  offerBlockId?: string;
  preservePresentation?: boolean;
  deviceCode?: string;
  /** When provided, project from this prepared section shell */
  sectionSeed?: TapCardSection | null;
};

export type PersistSpotlightBindResult =
  | {
      ok: true;
      section: TapCardSection;
      offer: AuthoritativeOffer;
      projectionState: OfferProjectionState;
      priorSection: TapCardSection | null;
      createdSection: boolean;
      tapCardBefore: unknown;
    }
  | {
      ok: false;
      code:
        | "campaign_not_found"
        | "offer_not_found"
        | "campaign_unavailable"
        | "persist_failed";
      message: string;
    };

export async function persistSpotlightOfferBind(
  input: PersistSpotlightBindInput
): Promise<PersistSpotlightBindResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
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
    return {
      ok: false,
      code: "campaign_not_found",
      message: "Campaign not found.",
    };
  }
  const status = campaign.status.toUpperCase();
  if (["ARCHIVED", "CLOSED", "DELETED", "RETIRED"].includes(status)) {
    return {
      ok: false,
      code: "campaign_unavailable",
      message: "That campaign is unavailable.",
    };
  }

  const blocks = parseContentBlocks(campaign.contentBlocks);
  const offer = extractAuthoritativeOffer({
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignStatus: campaign.status,
    blocks,
    preferBlockId: input.offerBlockId,
  });
  if (!offer) {
    return {
      ok: false,
      code: "offer_not_found",
      message: "Add an offer to the Campaign before going live.",
    };
  }

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const config = parseTapConnectCard(brandKit?.tapCard, {
    businessName: input.businessName,
    profile,
    logoUrl: input.logoUrl,
    accentColor: brandKit?.accentColor || "#a3e635",
  });
  const tapCardBefore = brandKit?.tapCard ?? {};

  const deviceCode =
    input.deviceCode ||
    campaign.assignments[0]?.deviceSlot.deviceCode ||
    undefined;

  let section =
    input.sectionSeed ||
    (input.sectionId
      ? config.sections.find((s) => s.id === input.sectionId)
      : undefined) ||
    config.sections
      .filter((s) => s.type === "special_offer")
      .sort((a, b) => a.order - b.order)[0];

  const priorSection = section
    ? (JSON.parse(JSON.stringify(section)) as TapCardSection)
    : null;
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
    preservePresentation: creating ? false : input.preservePresentation !== false,
    deviceCode,
  });

  const nextSections = creating
    ? [...config.sections, projected]
    : config.sections.map((s) => (s.id === projected.id ? projected : s));
  const nextConfig = { ...config, sections: nextSections };

  try {
    await prisma.brandKit.upsert({
      where: { businessId: input.businessId },
      create: {
        businessId: input.businessId,
        tapCard: nextConfig as object,
      },
      update: {
        tapCard: nextConfig as object,
      },
    });
  } catch {
    return {
      ok: false,
      code: "persist_failed",
      message: "Could not save the Card Spotlight.",
    };
  }

  return {
    ok: true,
    section: projected,
    offer,
    projectionState: detectOfferProjectionState({ section: projected, offer }),
    priorSection,
    createdSection: creating,
    tapCardBefore,
  };
}

export async function restoreSpotlightFromPrior(input: {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  sectionId: string | null;
  priorSection: TapCardSection | null;
  createdSection: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const config = parseTapConnectCard(brandKit?.tapCard, {
    businessName: input.businessName,
    profile,
    logoUrl: input.logoUrl,
    accentColor: brandKit?.accentColor || "#a3e635",
  });

  let nextSections = [...config.sections];
  if (input.createdSection && input.sectionId) {
    nextSections = nextSections.filter((s) => s.id !== input.sectionId);
  } else if (input.priorSection && input.sectionId) {
    nextSections = nextSections.map((s) =>
      s.id === input.sectionId ? input.priorSection! : s
    );
  } else if (input.sectionId) {
    nextSections = nextSections.map((s) =>
      s.id === input.sectionId ? unprojectSpotlightOffer(s) : s
    );
  }

  try {
    await prisma.brandKit.upsert({
      where: { businessId: input.businessId },
      create: {
        businessId: input.businessId,
        tapCard: { ...config, sections: nextSections } as object,
      },
      update: {
        tapCard: { ...config, sections: nextSections } as object,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not restore the previous Card Spotlight." };
  }
}

export async function readPersistedSpotlightOffer(input: {
  businessId: string;
  businessName: string;
  logoUrl?: string | null;
  campaignId: string;
}): Promise<{
  section: TapCardSection | null;
  offer: AuthoritativeOffer | null;
  projectionState: OfferProjectionState;
}> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
    select: { id: true, title: true, status: true, contentBlocks: true },
  });
  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: input.businessId },
  });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const config = parseTapConnectCard(brandKit?.tapCard, {
    businessName: input.businessName,
    profile,
    logoUrl: input.logoUrl,
  });
  const section =
    config.sections
      .filter(
        (s) =>
          s.type === "special_offer" &&
          s.offerMode === "campaign" &&
          s.linkedCampaignId === input.campaignId
      )
      .sort((a, b) => a.order - b.order)[0] || null;

  const offer = campaign
    ? extractAuthoritativeOffer({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        campaignStatus: campaign.status,
        blocks: parseContentBlocks(campaign.contentBlocks),
      })
    : null;

  return {
    section,
    offer,
    projectionState: detectOfferProjectionState({ section, offer }),
  };
}

export type JsonTapCard = Prisma.InputJsonValue;
