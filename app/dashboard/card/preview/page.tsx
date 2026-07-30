import { CardPreviewWorkspace } from "@/components/fusion/card/card-preview-workspace";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import { PreviewViewedMarker } from "@/components/onboarding/preview-viewed-marker";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { buildFirstCardDraft } from "@/lib/fusion/card/first-card-draft";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

/**
 * Dedicated view-only Card preview — primary PO review surface.
 * Escape mode hides Studio nav (DashboardChrome).
 */
export default async function TapCardPreviewPage() {
  const { user, business } = await requireBusiness();
  const overrides = await listFeatureOverrides();
  const internalOperator = isPlatformAdmin(user);
  const featureFlags = {
    "tapsave.core": isFeatureEnabled("tapsave.core", { overrides, internalOperator }),
    "card.builder.v1": true,
    "card.fuse.support": isFeatureEnabled("card.fuse.support", { overrides, internalOperator }),
    "comms.inbox": isFeatureEnabled("comms.inbox", { overrides, internalOperator }),
  };

  const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const contactProfile = {
    ...profile,
    phone: profile.phone || business.phone || undefined,
    email: profile.email || business.email || undefined,
    website: profile.website || business.website || undefined,
    organization: profile.organization || business.name,
    displayName: profile.displayName || business.name,
  };
  const safeFallback = buildFirstCardDraft({
    businessName: business.name,
    outcome: business.primaryCustomerOutcome || "ESSENTIALS",
    facts: [],
  }).draft;
  const config = parseTapConnectCard(
    isTapConnectCardDraft(brandKit?.tapCardDraft)
      ? brandKit.tapCardDraft
      : safeFallback,
    {
    businessName: business.name,
    profile: contactProfile,
    logoUrl: business.logoUrl,
    accentColor: brandKit?.accentColor || "#d4af37",
    reviewUrl: business.googleReviewUrl,
    }
  );

  const liveAssignment = await prisma.deviceAssignment.findFirst({
    where: { businessId: business.id, status: "ACTIVE" },
    orderBy: { startsAt: "desc" },
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          status: true,
          contentBlocks: true,
          themeOverrides: true,
        },
      },
      deviceSlot: { select: { id: true, deviceCode: true } },
    },
  });

  const devices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    select: { deviceCode: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const seedContact = await prisma.contact.findFirst({
    where: { businessId: business.id, metadata: { path: ["seeded"], equals: true } },
    select: { name: true, email: true },
  });

  const publicCode =
    liveAssignment?.deviceSlot.deviceCode ||
    devices.find((d) => d.deviceCode === "seeddemo01")?.deviceCode ||
    devices[0]?.deviceCode ||
    null;

  const themeOverrides =
    (liveAssignment?.campaign?.themeOverrides as Record<string, unknown>) ?? {};

  // Inject Brand Kit tapCard onto a lightweight brandKit-shaped object for Campaign renderer
  const brandKitForPreview = brandKit
    ? { ...brandKit, tapCard: config }
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" data-testid="card-preview-host">
      <PreviewViewedMarker />
      <div
        className="border-b border-lime-300/25 bg-lime-300/10 px-4 py-2 text-center text-xs font-medium text-lime-100"
        role="status"
      >
        Customer preview · Draft changes not published
      </div>
      <CardPreviewWorkspace
        config={config}
        profile={contactProfile}
        businessName={business.name}
        businessId={business.id}
        logoUrl={business.logoUrl}
        reviewUrl={business.googleReviewUrl}
        publicHref={publicCode ? `/t/${publicCode}?public=1` : null}
        campaignBlocks={[]}
        campaignId={null}
        deviceSlotId={null}
        theme={{
          primaryColor:
            (themeOverrides.primaryColor as string) ||
            brandKit?.primaryColor ||
            config.accentColor,
          secondaryColor:
            (themeOverrides.secondaryColor as string) ||
            brandKit?.secondaryColor ||
            "#0ea5e9",
          backgroundColor:
            (themeOverrides.backgroundColor as string) ||
            brandKit?.backgroundColor ||
            config.surfaceColor,
          textColor:
            (themeOverrides.textColor as string) || brandKit?.textColor || config.textColor,
        }}
        featureFlags={featureFlags}
        keepCardEnabled={featureFlags["tapsave.core"]}
        personalizedLabel={
          seedContact
            ? `${seedContact.name || seedContact.email || "Seed contact"}`
            : null
        }
      />
      {/* brandKit available for future CampaignPageRenderer wiring */}
      <span className="sr-only" data-brandkit={brandKitForPreview ? "yes" : "no"} />
    </div>
  );
}
