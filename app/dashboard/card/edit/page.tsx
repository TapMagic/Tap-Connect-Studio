import Link from "next/link";
import { TapCardBuilder } from "@/components/card/tap-card-builder";
import { AuthoringWorkspaceShell } from "@/components/fusion/authoring/authoring-workspace-shell";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

/**
 * True focused Card authoring escape — Studio nav hidden by DashboardChrome.
 * One compact builder toolbar · outline · large preview · inspector.
 * Done / Esc → /dashboard/card.
 */
export default async function TapCardEditPage() {
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

  const publicCode =
    devices.find((d) => d.deviceCode === "seeddemo01")?.deviceCode ?? devices[0]?.deviceCode;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="card-edit-workspace-host"
      data-escape-authoring="true"
    >
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5"
        data-testid="card-edit-compact-toolbar"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Card editor
          </p>
          <p className="truncate text-xs text-white/55">
            Outline · live preview · Format — Esc or Done returns to assembly
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/card/preview"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/75 hover:bg-white/5"
            data-testid="card-edit-open-preview"
          >
            View-only preview
          </Link>
          {publicCode ? (
            <a
              href={`/dashboard/card/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              data-testid="card-edit-open-full"
              title="Open this editor in a detached tab"
            >
              Detached tab ↗
            </a>
          ) : null}
          {publicCode ? (
            <a
              href={`/t/${publicCode}?public=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
              data-testid="card-edit-preview-public"
            >
              Open public URL
            </a>
          ) : null}
          <Link
            href="/dashboard/card"
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/85 hover:bg-white/5"
            data-testid="card-edit-done-link"
          >
            Done editing
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden" data-testid="card-builder-host">
        <AuthoringWorkspaceShell
          title="Card"
          subtitle="Shared authoring shell · builder owns Outline · Canvas · Format"
          className="h-full !bg-transparent [&_header]:hidden"
          canvas={
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
              workspaceMode
              escapeMode
              doneHref="/dashboard/card"
            />
          }
        />
      </div>
    </div>
  );
}
