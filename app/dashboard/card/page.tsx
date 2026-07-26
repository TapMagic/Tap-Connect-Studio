import { CardAssemblyWorkspace } from "@/components/fusion/card/card-assembly-workspace";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { buildCardFuseBoxConnections } from "@/lib/fusion/card/fuse-box";
import {
  detectOfferProjectionState,
  extractAuthoritativeOffer,
  findPrimarySpotlightSection,
} from "@/lib/fusion/card/offer";
import {
  resolveCardUtilityLayer,
  utilityLayerWhereUsedSummary,
} from "@/lib/fusion/card/utility-layer";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listFeatureOverrides } from "@/lib/fusion/features/overrides";
import { findCardWhereUsed } from "@/lib/fusion/studio/where-used";
import { parseContentBlocks } from "@/lib/services/devices";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

/**
 * Card assembly / fuse-box page — customer preview, connections, readiness.
 * Full editing lives at /dashboard/card/edit.
 */
export default async function TapCardAssemblyPage({
  searchParams,
}: {
  searchParams: Promise<{ wire?: string }>;
}) {
  const { wire } = await searchParams;
  const { user, business } = await requireBusiness();
  const overrides = await listFeatureOverrides();
  const internalOperator = isPlatformAdmin(user);
  const featureEnabled = (id: string) =>
    isFeatureEnabled(id as "card.fuse.support" | "card.fuse.offer", {
      overrides,
      internalOperator,
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

  const contactProfile = {
    ...profile,
    phone: profile.phone || business.phone || undefined,
    email: profile.email || business.email || undefined,
    website: profile.website || business.website || undefined,
  };

  const [
    campaignCount,
    campaignRows,
    devices,
    openSupportThreads,
    journeyCount,
    assignmentCount,
    liveAssignment,
    offerEvidenceCount,
  ] = await Promise.all([
    prisma.campaign.count({
      where: {
        businessId: business.id,
        status: { notIn: ["ARCHIVED", "CLOSED"] },
      },
    }),
    prisma.campaign.findMany({
      where: {
        businessId: business.id,
        status: { notIn: ["ARCHIVED", "CLOSED"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        contentBlocks: true,
        scheduledStart: true,
        scheduledEnd: true,
        assignments: {
          where: { status: "ACTIVE" },
          take: 5,
          include: {
            deviceSlot: { select: { nickname: true, deviceCode: true } },
          },
        },
        groupSlots: {
          take: 3,
          include: { group: { select: { title: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
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
    prisma.clickEvent
      .count({
        where: {
          businessId: business.id,
          eventType: {
            in: ["card_offer_claimed", "card_offer_lead", "card_offer_kept"],
          },
        },
      })
      .catch(() => 0),
  ]);

  const spotlight = findPrimarySpotlightSection(config);
  const boundCampaignId = spotlight?.linkedCampaignId ?? null;
  let offerHasAuthoritative = false;
  let offerProjectionState: "current" | "stale" | "unbound" | "campaign_missing" = "unbound";

  if (boundCampaignId) {
    const bound = campaignRows.find((c) => c.id === boundCampaignId);
    if (!bound) {
      offerProjectionState = "campaign_missing";
    } else {
      const offer = extractAuthoritativeOffer({
        campaignId: bound.id,
        campaignTitle: bound.title,
        campaignStatus: bound.status,
        blocks: parseContentBlocks(bound.contentBlocks),
        preferBlockId: spotlight?.offerBlockId,
      });
      offerHasAuthoritative = Boolean(offer);
      offerProjectionState = detectOfferProjectionState({
        section: spotlight,
        offer,
      });
    }
  }

  const offerCampaigns = campaignRows.map((c) => {
    const offer = extractAuthoritativeOffer({
      campaignId: c.id,
      campaignTitle: c.title,
      campaignStatus: c.status,
      blocks: parseContentBlocks(c.contentBlocks),
    });
    const assignmentSummary =
      c.assignments.length > 0
        ? c.assignments
            .map(
              (a) =>
                a.deviceSlot.nickname || a.deviceSlot.deviceCode || "Tap Point"
            )
            .join(", ")
        : null;
    const groupSummary =
      c.groupSlots.length > 0
        ? [...new Set(c.groupSlots.map((s) => s.group.title).filter(Boolean))].join(
            ", "
          )
        : null;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      hasOffer: Boolean(offer),
      offerTitle: offer?.title ?? null,
      offerCode: offer?.code ?? null,
      offerValueSummary: offer?.description ?? null,
      scheduledStart: c.scheduledStart?.toISOString() ?? null,
      scheduledEnd: c.scheduledEnd?.toISOString() ?? null,
      assignmentSummary,
      groupSummary,
      boundToThisCard: Boolean(boundCampaignId && c.id === boundCampaignId),
    };
  });

  const cardWhereUsed = await findCardWhereUsed(business.id, {
    cardRetired: config.lifecycleStatus === "retired",
  });

  const fuseConnections = buildCardFuseBoxConnections({
    cardRetired: config.lifecycleStatus === "retired",
    hasPublicCard: config.sections.length > 0,
    activeCampaignCount: campaignCount,
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
    offerFeatureOn: featureEnabled("card.fuse.offer"),
    offerBound: Boolean(boundCampaignId && spotlight?.offerMode === "campaign"),
    offerHasAuthoritative,
    offerProjectionState,
    offerConversionEvidenceCount: offerEvidenceCount,
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
  if (featureEnabled("card.fuse.offer") && !boundCampaignId) {
    readinessNotes.push("Offer fuse: bind a Campaign offer to Card Spotlight.");
  }
  if (offerProjectionState === "stale") {
    readinessNotes.push(
      "Offer projection is stale — refresh facts from the Campaign (preserves your teaser copy)."
    );
  }

  const nextActions = [
    { label: "Edit Card", href: "/dashboard/card/edit", primary: true },
    {
      label: "Put an offer on my Card",
      href: "/dashboard/card?wire=offer",
    },
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
      showOfferWire={wire === "offer" || featureEnabled("card.fuse.offer")}
      offerCampaigns={offerCampaigns}
      offerSectionId={spotlight?.id}
      boundOfferCampaignId={boundCampaignId}
    />
  );
}
