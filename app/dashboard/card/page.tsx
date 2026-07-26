import { TapCardBuilder } from "@/components/card/tap-card-builder";
import { WhereUsedPanel } from "@/components/fusion/studio/where-used-panel";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import { findCardWhereUsed } from "@/lib/fusion/studio/where-used";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

export default async function TapCardPage() {
  const { user, business } = await requireBusiness();
  const overrides = await listFeatureOverrides();
  const freeformEnabled = isFeatureEnabled("card.builder.freeform", {
    overrides,
    internalOperator: isPlatformAdmin(user),
  });
  const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const config = parseTapConnectCard(brandKit?.tapCard, {
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
  }));

  const cardWhereUsed = await findCardWhereUsed(business.id, {
    cardRetired: config.lifecycleStatus === "retired",
  });

  return (
    <div className="flex h-full min-h-0 flex-col max-lg:min-h-[100dvh]">
      <div className="min-h-0 flex-1">
        <TapCardBuilder
          initialConfig={config}
          profile={{
            ...profile,
            phone: profile.phone || business.phone || undefined,
            email: profile.email || business.email || undefined,
            website: profile.website || business.website || undefined,
          }}
          businessName={business.name}
          logoUrl={business.logoUrl}
          reviewUrl={business.googleReviewUrl}
          mediaUploadReady={isMediaUploadReady()}
          stockReady={isStockImagesReady()}
          isAdmin={isPlatformAdmin(user)}
          isLandingDemo={Boolean(landingDemo)}
          devices={devices}
          campaigns={campaigns}
          freeformEnabled={freeformEnabled}
          brandKitId={brandKit?.id ?? null}
          brandColors={
            brandKit
              ? {
                  primaryColor: brandKit.primaryColor,
                  secondaryColor: brandKit.secondaryColor,
                  accentColor: brandKit.accentColor,
                }
              : null
          }
        />
      </div>
      <div className="shrink-0 border-t border-white/8 bg-[#050814] px-4 py-4 lg:px-6">
        {config.lifecycleStatus === "retired" ? (
          <p
            className="mb-2 text-xs text-amber-200/90"
            data-testid="card-retired-banner"
          >
            This Tap Card is retired — restore and save to make it the active Brand Kit card again.
          </p>
        ) : null}
        <WhereUsedPanel
          title="Where this Tap Card appears"
          emptyLabel="No CONTACT_VCARD / digital_card campaigns currently reference this card."
          hits={cardWhereUsed.hits}
          testId="card-where-used"
        />
      </div>
    </div>
  );
}
