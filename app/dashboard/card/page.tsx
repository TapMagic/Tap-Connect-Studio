import { CardAssemblyWorkspace } from "@/components/fusion/card/card-assembly-workspace";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { buildCardFuseBoxConnections } from "@/lib/fusion/card/fuse-box";
import {
  resolveCardUtilityLayer,
  utilityLayerWhereUsedSummary,
} from "@/lib/fusion/card/utility-layer";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import { findCardWhereUsed } from "@/lib/fusion/studio/where-used";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

/**
 * Card assembly / fuse-box page — customer preview, connections, readiness.
 * Full editing lives at /dashboard/card/edit.
 */
export default async function TapCardAssemblyPage() {
  const { user, business } = await requireBusiness();
  const overrides = await listFeatureOverrides();
  const internalOperator = isPlatformAdmin(user);
  const featureEnabled = (id: string) =>
    isFeatureEnabled(id as "card.fuse.support", { overrides, internalOperator });

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

  const contactProfile = {
    ...profile,
    phone: profile.phone || business.phone || undefined,
    email: profile.email || business.email || undefined,
    website: profile.website || business.website || undefined,
  };

  const [campaigns, devices, openSupportThreads, journeyCount, assignmentCount, liveAssignment] =
    await Promise.all([
      prisma.campaign.count({
        where: {
          businessId: business.id,
          status: { notIn: ["ARCHIVED", "CLOSED"] },
        },
      }),
      prisma.deviceSlot.findMany({
        where: { businessId: business.id },
        select: { id: true, nickname: true, deviceCode: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.messageThread.count({
        where: { businessId: business.id, status: { in: ["OPEN", "PENDING"] } },
      }),
      prisma.journeyDraft.count({ where: { businessId: business.id } }).catch(() => 0),
      prisma.deviceAssignment
        .count({ where: { businessId: business.id, status: "ACTIVE" } })
        .catch(() => 0),
      prisma.deviceAssignment.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { startsAt: "desc" },
        include: {
          campaign: { select: { id: true, title: true, status: true } },
          deviceSlot: { select: { deviceCode: true } },
        },
      }),
    ]);

  const cardWhereUsed = await findCardWhereUsed(business.id, {
    cardRetired: config.lifecycleStatus === "retired",
  });

  const fuseConnections = buildCardFuseBoxConnections({
    cardRetired: config.lifecycleStatus === "retired",
    hasPublicCard: config.sections.length > 0,
    activeCampaignCount: campaigns,
    tapPointAssignmentCount: assignmentCount,
    openSupportThreads,
    supportFeatureOn: featureEnabled("card.fuse.support"),
    inboxFeatureOn: featureEnabled("comms.inbox"),
    walletMock: true,
    walletLiveReady: false,
    journeyCount,
    emailFollowUpConfigured: Boolean(
      brandKit?.emailPromo &&
        typeof brandKit.emailPromo === "object" &&
        Object.keys(brandKit.emailPromo as object).length > 0
    ),
    lastCardUpdate: brandKit?.updatedAt?.toISOString() ?? null,
  });

  const utilityLayer = resolveCardUtilityLayer({
    card: config,
    profile: contactProfile,
    reviewUrl: business.googleReviewUrl,
    featureEnabled,
    keepCardEnabled: featureEnabled("tapsave.core"),
  });

  const readinessNotes: string[] = [];
  if (config.lifecycleStatus === "retired") {
    readinessNotes.push("Card is retired — restore in the editor before publishing.");
  }
  if (!utilityLayer.utilities.some((u) => u.kind === "support" && u.eligible)) {
    readinessNotes.push(
      "Ask a Question is not eligible — enable Support + Inbox features, or turn the utility on in Edit Card."
    );
  }
  if (assignmentCount === 0) {
    readinessNotes.push("No active Tap Point assignments — customers cannot reach this Card yet.");
  }
  if (!utilityLayer.visible) {
    readinessNotes.push("Persistent utility layer has no eligible actions.");
  }

  const nextActions = [
    { label: "Edit Card", href: "/dashboard/card/edit", primary: true },
    ...(devices[0]
      ? [
          {
            label: "Preview seeded Tap Point",
            href: `/t/${devices.find((d) => d.deviceCode === "seeddemo01")?.deviceCode ?? devices[0].deviceCode}?public=1`,
          },
        ]
      : []),
    { label: "Open TapInbox", href: "/dashboard/audience/inbox" },
    { label: "Manage Tap Points", href: "/dashboard/tap-points" },
  ];

  const publicCode =
    liveAssignment?.deviceSlot.deviceCode ||
    devices.find((d) => d.deviceCode === "seeddemo01")?.deviceCode ||
    devices[0]?.deviceCode ||
    null;

  return (
    <CardAssemblyWorkspace
      config={config}
      profile={contactProfile}
      businessName={business.name}
      logoUrl={business.logoUrl}
      reviewUrl={business.googleReviewUrl}
      connections={fuseConnections}
      whereUsedHits={cardWhereUsed.hits}
      publicPreviewHref={publicCode ? `/t/${publicCode}?public=1` : null}
      activeCampaign={
        liveAssignment?.campaign
          ? {
              id: liveAssignment.campaign.id,
              title: liveAssignment.campaign.title,
              status: liveAssignment.campaign.status,
            }
          : null
      }
      tapPointCount={assignmentCount}
      utilitySummary={utilityLayerWhereUsedSummary(utilityLayer)}
      supportConnected={utilityLayer.utilities.some(
        (u) => u.kind === "support" && u.eligible
      )}
      readinessNotes={readinessNotes}
      nextActions={nextActions}
    />
  );
}
