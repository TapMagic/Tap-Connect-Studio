import { prisma } from "@/lib/db";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import type { ContentBlock } from "@/lib/types/campaign";
import type { Prisma } from "@prisma/client";
import {
  LANDING_DEMO_MODES,
  LANDING_DEMO_MODE_META,
  type LandingDemoMode,
  type LandingDemoSlotRow,
} from "@/lib/marketing/landing-demo-types";

export {
  LANDING_DEMO_MODES,
  LANDING_DEMO_MODE_META,
  type LandingDemoMode,
  type LandingDemoSlotRow,
} from "@/lib/marketing/landing-demo-types";

export async function ensureLandingDemoSlots(): Promise<void> {
  const existing = await prisma.landingDemoSlot.findMany({ select: { mode: true } });
  const have = new Set(existing.map((e) => e.mode));
  const missing = LANDING_DEMO_MODES.filter((m) => !have.has(m));
  if (!missing.length) return;

  // Migrate legacy isLandingDemo → card slot when seeding card
  let cardCampaignId: string | null = null;
  if (missing.includes("card")) {
    const legacy = await prisma.campaign.findFirst({
      where: { isLandingDemo: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    cardCampaignId = legacy?.id ?? null;
  }

  await prisma.landingDemoSlot.createMany({
    data: missing.map((mode) => ({
      mode,
      campaignId: mode === "card" ? cardCampaignId : null,
      enabled: true,
      showLogo: true,
      logoUrl: null,
    })),
  });
}

export async function listLandingDemoSlots(): Promise<LandingDemoSlotRow[]> {
  await ensureLandingDemoSlots();
  const rows = await prisma.landingDemoSlot.findMany();
  const byMode = new Map(rows.map((r) => [r.mode, r]));

  const campaignIds = rows.map((r) => r.campaignId).filter(Boolean) as string[];
  const campaigns =
    campaignIds.length > 0
      ? await prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, title: true, status: true },
        })
      : [];
  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

  return LANDING_DEMO_MODES.map((mode) => {
    const row = byMode.get(mode);
    const campaign = row?.campaignId ? campaignMap.get(row.campaignId) : null;
    return {
      mode,
      campaignId: row?.campaignId ?? null,
      enabled: row?.enabled ?? true,
      showLogo: row?.showLogo ?? true,
      logoUrl: row?.logoUrl ?? null,
      campaignTitle: campaign?.title ?? null,
      campaignStatus: campaign?.status ?? null,
    };
  });
}

export async function upsertLandingDemoSlot(input: {
  mode: LandingDemoMode;
  campaignId?: string | null;
  enabled?: boolean;
  showLogo?: boolean;
  logoUrl?: string | null;
}): Promise<LandingDemoSlotRow[]> {
  await ensureLandingDemoSlots();

  // One campaign per mode — clear other slots that claim the same campaign
  if (input.campaignId) {
    await prisma.landingDemoSlot.updateMany({
      where: {
        campaignId: input.campaignId,
        mode: { not: input.mode },
      },
      data: { campaignId: null },
    });
  }

  await prisma.landingDemoSlot.upsert({
    where: { mode: input.mode },
    create: {
      mode: input.mode,
      campaignId: input.campaignId ?? null,
      enabled: input.enabled ?? true,
      showLogo: input.showLogo ?? true,
      logoUrl: input.logoUrl ?? null,
    },
    update: {
      ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.showLogo !== undefined ? { showLogo: input.showLogo } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    },
  });

  // Keep legacy flag in sync for card mode
  if (input.mode === "card" && input.campaignId !== undefined) {
    await prisma.campaign.updateMany({
      where: { isLandingDemo: true },
      data: { isLandingDemo: false },
    });
    if (input.campaignId) {
      await prisma.campaign.update({
        where: { id: input.campaignId },
        data: { isLandingDemo: true, status: "LIVE" },
      });
    }
  }

  return listLandingDemoSlots();
}

export type PublicLandingDemoModePayload = {
  mode: LandingDemoMode;
  label: string;
  description: string;
  enabled: boolean;
  published: boolean;
  businessName: string;
  showLogo: boolean;
  logoUrl: string | null;
  reviewUrl: string | null;
  profile: ReturnType<typeof parseBrandContactProfile>;
  tapCard?: ReturnType<typeof parseTapConnectCard>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    showPageLogo?: boolean;
  };
  contentBlocks: ContentBlock[];
  campaignTitle: string | null;
};

export async function getPublicLandingDemos(): Promise<{
  modes: PublicLandingDemoModePayload[];
  published: boolean;
}> {
  await ensureLandingDemoSlots();
  const slots = await listLandingDemoSlots();

  const modes: PublicLandingDemoModePayload[] = [];

  for (const slot of slots) {
    const meta = LANDING_DEMO_MODE_META[slot.mode];
    const baseEmpty: PublicLandingDemoModePayload = {
      mode: slot.mode,
      label: meta.label,
      description: meta.description,
      enabled: slot.enabled,
      published: false,
      businessName: "Demo Studio",
      showLogo: slot.showLogo,
      logoUrl: slot.showLogo ? slot.logoUrl : null,
      reviewUrl: null,
      profile: {},
      theme: {
        primaryColor: "#d6a84f",
        secondaryColor: "#72ff8a",
        backgroundColor: "#0b0f19",
        textColor: "#f8fafc",
        accentColor: "#d6a84f",
        showPageLogo: slot.showLogo,
      },
      contentBlocks: [],
      campaignTitle: null,
    };

    if (!slot.campaignId) {
      modes.push(baseEmpty);
      continue;
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: slot.campaignId,
        status: { in: ["LIVE", "READY", "SCHEDULED", "DRAFT"] },
      },
      include: {
        business: { include: { brandKit: true } },
      },
    });

    if (!campaign?.business) {
      modes.push(baseEmpty);
      continue;
    }

    const business = campaign.business;
    const brandKit = business.brandKit;
    const profile = parseBrandContactProfile(brandKit?.socialLinks);
    const merged = {
      ...profile,
      phone: profile.phone || business.phone || undefined,
      email: profile.email || business.email || undefined,
      website: profile.website || business.website || undefined,
    };

    // Logo resolution: slot override > business logo > null (no forced brand fallback)
    let logoUrl: string | null = null;
    if (slot.showLogo) {
      if (slot.logoUrl !== null && slot.logoUrl !== undefined) {
        logoUrl = slot.logoUrl.trim() || null;
      } else {
        logoUrl = business.logoUrl ?? null;
      }
    }

    const themeOverrides = (campaign.themeOverrides ?? {}) as Record<string, unknown>;
    const theme = {
      primaryColor: String(
        themeOverrides.primaryColor ?? brandKit?.primaryColor ?? "#d6a84f"
      ),
      secondaryColor: String(
        themeOverrides.secondaryColor ?? brandKit?.secondaryColor ?? "#72ff8a"
      ),
      backgroundColor: String(
        themeOverrides.backgroundColor ?? brandKit?.backgroundColor ?? "#0b0f19"
      ),
      textColor: String(themeOverrides.textColor ?? brandKit?.textColor ?? "#f8fafc"),
      accentColor: String(brandKit?.accentColor ?? "#d6a84f"),
      showPageLogo:
        slot.showLogo &&
        (themeOverrides.showPageLogo === true ||
          themeOverrides.showPageLogo === "true" ||
          Boolean(logoUrl)),
      backgroundImage: String(themeOverrides.backgroundImage ?? ""),
      backgroundOverlayOpacity: Number(themeOverrides.backgroundOverlayOpacity ?? 55),
      fontStyle: String(themeOverrides.fontStyle ?? "sans"),
    };

    const tapCard =
      slot.mode === "card"
        ? parseTapConnectCard(brandKit?.tapCard, {
            businessName: business.name,
            profile: merged,
            logoUrl: logoUrl ?? undefined,
            accentColor: brandKit?.accentColor || "#d6a84f",
            reviewUrl: business.googleReviewUrl,
          })
        : undefined;

    const blocks = Array.isArray(campaign.contentBlocks)
      ? (campaign.contentBlocks as unknown as ContentBlock[])
      : [];

    modes.push({
      mode: slot.mode,
      label: meta.label,
      description: meta.description,
      enabled: slot.enabled,
      published: true,
      businessName: business.name,
      showLogo: slot.showLogo,
      logoUrl,
      reviewUrl: business.googleReviewUrl,
      profile: merged,
      tapCard,
      theme,
      contentBlocks: blocks,
      campaignTitle: campaign.title,
    });
  }

  return {
    modes,
    published: modes.some((m) => m.published && m.enabled),
  };
}

/** Assign admin workspace Tap Card campaign as landing card demo (legacy publish path). */
export async function publishLandingCardDemo(params: {
  businessId: string;
  publish: boolean;
  tapCard?: unknown;
}): Promise<{ published: boolean; campaignId?: string }> {
  if (params.tapCard) {
    await prisma.brandKit.upsert({
      where: { businessId: params.businessId },
      create: {
        businessId: params.businessId,
        tapCard: params.tapCard as Prisma.InputJsonValue,
      },
      update: { tapCard: params.tapCard as Prisma.InputJsonValue },
    });
  }

  if (!params.publish) {
    await upsertLandingDemoSlot({ mode: "card", campaignId: null });
    return { published: false };
  }

  let campaign = await prisma.campaign.findFirst({
    where: { businessId: params.businessId, campaignType: "CONTACT_VCARD" },
    orderBy: { updatedAt: "desc" },
  });

  if (!campaign) {
    const user = await prisma.user.findFirst({
      where: { memberships: { some: { businessId: params.businessId } } },
    });
    campaign = await prisma.campaign.create({
      data: {
        businessId: params.businessId,
        title: "Landing Demo · Tap Connect Card",
        campaignType: "CONTACT_VCARD",
        status: "LIVE",
        isLandingDemo: true,
        createdById: user?.id,
        contentBlocks: [],
      },
    });
  }

  await upsertLandingDemoSlot({ mode: "card", campaignId: campaign.id, enabled: true });
  return { published: true, campaignId: campaign.id };
}
