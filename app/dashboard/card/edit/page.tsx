import { CardAuthoringWorkspace } from "@/components/fusion/card/card-authoring-workspace";
import { isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { beginCardDraftEditing } from "@/lib/fusion/card/draft";
import { buildFirstCardDraft } from "@/lib/fusion/card/first-card-draft";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

/**
 * True focused Card authoring escape — Studio nav hidden by DashboardChrome.
 * Full Adaptive Workspace Shell: Command Shade · Outline · live Card · one Task Drawer.
 * Done / Esc → /dashboard/card.
 */
export default async function TapCardEditPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { user, business } =
    await requireBusinessCapability("card.draft.edit");
  const query = await searchParams;
  const doneHref =
    query.returnTo === "/onboarding" ? "/onboarding?stage=card" : "/dashboard/card";
  const overrides = await listFeatureOverrides();
  const freeformEnabled = isFeatureEnabled("card.builder.freeform", {
    overrides,
    internalOperator: isPlatformAdmin(user),
  });
  const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const safeFallback = buildFirstCardDraft({
    businessName: business.name,
    outcome: business.primaryCustomerOutcome || "ESSENTIALS",
    facts: [],
  }).draft;
  const draftState = await beginCardDraftEditing(business.id, safeFallback);
  const config = parseTapConnectCard(draftState.tapCardDraft, {
    businessName: business.name,
    profile: {
      ...profile,
      phone: profile.phone || business.phone || undefined,
      email: profile.email || business.email || undefined,
      website: profile.website || business.website || undefined,
    },
    logoUrl: business.logoUrl,
    accentColor: brandKit?.accentColor || "#d4af37",
    reviewUrl: business.googleReviewUrl,
  });

  const landingDemo = await prisma.campaign.findFirst({
    where: { businessId: business.id, isLandingDemo: true },
    select: { id: true },
  });

  const devices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    select: { id: true, nickname: true, deviceCode: true },
    orderBy: { createdAt: "desc" },
  });

  const campaignRows = await prisma.campaign.findMany({
    where: {
      businessId: business.id,
      status: { notIn: ["ARCHIVED", "CLOSED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      title: true,
      status: true,
      campaignType: true,
      contentBlocks: true,
      scheduledStart: true,
      scheduledEnd: true,
      group: { select: { id: true, title: true } },
      assignments: {
        where: { status: "ACTIVE" },
        take: 3,
        include: {
          deviceSlot: { select: { deviceCode: true, nickname: true } },
        },
      },
    },
  });

  function campaignFeatures(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const labels: Record<string, string> = {
      email_capture: "Contact capture",
      offer_coupon: "Coupon / offer",
      banner: "Banner",
      button_group: "Buttons",
      digital_card: "Tap Card",
      headline: "Headline",
      rich_text: "Text",
      product_details: "Product",
      social_links: "Socials",
      hero_image: "Hero",
      hero_video: "Video",
    };
    const found = new Set<string>();
    for (const b of raw) {
      if (!b || typeof b !== "object") continue;
      const type = (b as { type?: string }).type;
      if (type && labels[type]) found.add(labels[type]);
    }
    return Array.from(found);
  }

  const campaigns = campaignRows.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    campaignType: c.campaignType,
    features: campaignFeatures(c.contentBlocks),
    devices: c.assignments.map((a) => ({
      code: a.deviceSlot.deviceCode,
      label: a.deviceSlot.nickname || a.deviceSlot.deviceCode,
    })),
    scheduledStart: c.scheduledStart?.toISOString() ?? null,
    scheduledEnd: c.scheduledEnd?.toISOString() ?? null,
    group: c.group,
  }));

  const groupRows = await prisma.campaignGroup.findMany({
    where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      title: true,
      status: true,
      defaultCampaign: { select: { title: true } },
      _count: { select: { slots: true } },
    },
  });
  const campaignGroups = groupRows.map((group) => ({
    id: group.id,
    title: group.title,
    status: group.status,
    defaultCampaignTitle: group.defaultCampaign?.title ?? null,
    slotCount: group._count.slots,
  }));

  const publicCode =
    devices.find((d) => d.deviceCode === "seeddemo01")?.deviceCode ?? devices[0]?.deviceCode;

  const activeSpotlight =
    campaignRows.find((c) => c.status === "LIVE" || c.status === "READY") ?? null;

  const builderProps = {
    initialConfig: config,
    initialDraftRevision: draftState.tapCardDraftRevision,
    profile: {
      ...profile,
      phone: profile.phone || business.phone || undefined,
      email: profile.email || business.email || undefined,
      website: profile.website || business.website || undefined,
    },
    businessName: business.name,
    logoUrl: business.logoUrl,
    reviewUrl: business.googleReviewUrl,
    mediaUploadReady: isMediaUploadReady(),
    stockReady: isStockImagesReady(),
    isAdmin: isPlatformAdmin(user),
    isLandingDemo: Boolean(landingDemo),
    devices,
    campaigns,
    campaignGroups,
    freeformEnabled,
    brandKitId: brandKit?.id ?? null,
    brandColors: brandKit
      ? {
          primaryColor: brandKit.primaryColor,
          secondaryColor: brandKit.secondaryColor,
          accentColor: brandKit.accentColor,
          backgroundColor: brandKit.backgroundColor,
          textColor: brandKit.textColor,
        }
      : null,
  };

  return (
    <CardAuthoringWorkspace
      {...builderProps}
      publicCode={publicCode}
      tapPointCount={devices.length}
      activeSpotlightTitle={activeSpotlight?.title ?? null}
      doneHref={doneHref}
    />
  );
}
