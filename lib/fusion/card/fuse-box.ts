/**
 * Card Fuse-Box connection model — honest status only.
 * Never mark Connected without a real Card wire.
 */

export type FuseBoxStatus =
  | "connected"
  | "partially_connected"
  | "available_to_configure"
  | "requires_provider"
  | "requires_consent"
  | "not_yet_available";

export type FuseBoxConnection = {
  id: string;
  label: string;
  pillar: string;
  status: FuseBoxStatus;
  summary: string;
  lastUpdate?: string | null;
  whereUsed?: string;
  readiness?: string;
  primaryHref?: string;
  primaryAction?: string;
  canEdit?: boolean;
  canPreview?: boolean;
  canTest?: boolean;
  canPause?: boolean;
};

export const FUSE_BOX_STATUS_LABEL: Record<FuseBoxStatus, string> = {
  connected: "Connected",
  partially_connected: "Partially connected",
  available_to_configure: "Available to configure",
  requires_provider: "Requires provider",
  requires_consent: "Requires consent",
  not_yet_available: "Not yet available",
};

export type FuseBoxSnapshotInput = {
  cardRetired?: boolean;
  hasPublicCard: boolean;
  activeCampaignCount: number;
  tapPointAssignmentCount: number;
  tapSaveEnabled?: boolean;
  openSupportThreads: number;
  supportFeatureOn: boolean;
  inboxFeatureOn: boolean;
  walletMock: boolean;
  walletLiveReady: boolean;
  loyaltyEnrolled?: boolean;
  journeyCount: number;
  emailFollowUpConfigured?: boolean;
  lastCardUpdate?: string | null;
  /** Offer fuse */
  offerFeatureOn?: boolean;
  offerBound?: boolean;
  offerHasAuthoritative?: boolean;
  offerProjectionState?: "current" | "stale" | "unbound" | "campaign_missing";
  offerConversionEvidenceCount?: number;
};

export function buildCardFuseBoxConnections(
  input: FuseBoxSnapshotInput
): FuseBoxConnection[] {
  const supportStatus: FuseBoxStatus = !input.supportFeatureOn
    ? "not_yet_available"
    : !input.inboxFeatureOn
      ? "available_to_configure"
      : input.openSupportThreads > 0
        ? "connected"
        : "partially_connected";

  const offerFeatureOn = input.offerFeatureOn ?? false;
  const offerBound = Boolean(input.offerBound);
  const offerHasAuth = Boolean(input.offerHasAuthoritative);
  const offerEvidence = input.offerConversionEvidenceCount ?? 0;
  const offerStatus: FuseBoxStatus = !offerFeatureOn
    ? "not_yet_available"
    : !offerBound || !offerHasAuth || input.offerProjectionState === "campaign_missing"
      ? "available_to_configure"
      : offerEvidence > 0
        ? "connected"
        : "partially_connected";

  return [
    {
      id: "public_card",
      label: "Public Card",
      pillar: "card",
      status: input.hasPublicCard && !input.cardRetired ? "connected" : "available_to_configure",
      summary: input.cardRetired
        ? "Card is retired — restore to publish."
        : input.hasPublicCard
          ? "Brand Kit Card is the living public hub."
          : "Create or restore a Tap Card.",
      lastUpdate: input.lastCardUpdate,
      whereUsed: "Brand Kit · public /t",
      primaryHref: "/dashboard/card/edit",
      primaryAction: "Edit Card",
      canEdit: true,
      canPreview: true,
    },
    {
      id: "experience_campaign",
      label: "Experience / Campaign",
      pillar: "campaign",
      status:
        input.activeCampaignCount > 0 ? "partially_connected" : "available_to_configure",
      summary:
        input.activeCampaignCount > 0
          ? `${input.activeCampaignCount} active campaign(s) can embed the Card.`
          : "Link a Campaign with a digital Card block.",
      whereUsed: "Experiences",
      primaryHref: "/dashboard/experiences",
      primaryAction: "Open",
      canEdit: true,
      canPreview: true,
    },
    {
      id: "tap_points",
      label: "Tap Point assignments",
      pillar: "devices",
      status:
        input.tapPointAssignmentCount > 0 ? "connected" : "available_to_configure",
      summary:
        input.tapPointAssignmentCount > 0
          ? `${input.tapPointAssignmentCount} active assignment(s).`
          : "Assign a Campaign to a Tap Point.",
      primaryHref: "/dashboard/tap-points",
      primaryAction: "Manage",
      canEdit: true,
      canTest: true,
    },
    {
      id: "tapsave",
      label: "TapSave",
      pillar: "tapsave",
      status: "partially_connected",
      summary: "Keep / vCard on Card — relationship retention works; not a fuse action kind.",
      primaryHref: "/dashboard/audience",
      primaryAction: "View",
      canPreview: true,
    },
    {
      id: "mytap",
      label: "MyTap",
      pillar: "tapsave",
      status: "partially_connected",
      summary: "Personalized projection after Keep or Support.",
      primaryHref: "/dashboard/audience",
      canPreview: true,
    },
    {
      id: "support",
      label: "Support / conversation",
      pillar: "inbox",
      status: supportStatus,
      summary:
        supportStatus === "connected"
          ? `${input.openSupportThreads} open Card-origin or inbox thread(s).`
          : supportStatus === "partially_connected"
            ? "Ask a Question available via persistent utility layer — test on a public Tap Point."
            : supportStatus === "available_to_configure"
              ? "Enable TapInbox to connect Support."
              : "Support fuse not enabled.",
      readiness: "Mock channel functional · live messaging credentials required",
      whereUsed: "Card utility layer · Audience Inbox",
      primaryHref: "/dashboard/audience/inbox",
      primaryAction: "Open Inbox",
      canEdit: true,
      canTest: true,
      canPreview: true,
    },
    {
      id: "journey",
      label: "Journey (TapFlow)",
      pillar: "tapflow",
      status: input.journeyCount > 0 ? "not_yet_available" : "not_yet_available",
      summary: "Journeys exist as a Studio module — Card action binding deferred.",
      primaryHref: "/dashboard/experiences/journeys",
      canEdit: true,
    },
    {
      id: "email_followup",
      label: "Email follow-up",
      pillar: "email",
      status: input.emailFollowUpConfigured
        ? "partially_connected"
        : "available_to_configure",
      summary: "Brand Kit email promo / campaign email — not Card mailto fuse.",
      readiness: "Mock · Resend live = credentials required",
      primaryHref: "/dashboard/brand/edit",
      canEdit: true,
    },
    {
      id: "loyalty",
      label: "Loyalty (TapLoop)",
      pillar: "taploop",
      status: "not_yet_available",
      summary: "TapLoop is a separate Audience module — Card enroll wire deferred.",
      primaryHref: "/dashboard/audience#taploop",
    },
    {
      id: "wallet",
      label: "Wallet",
      pillar: "wallet",
      status: input.walletLiveReady
        ? "requires_provider"
        : input.walletMock
          ? "requires_provider"
          : "not_yet_available",
      summary: "Mock wallet UX only — Apple/Google certification required for live.",
      readiness: "VERIFIED — CREDENTIALS REQUIRED",
      primaryHref: "/dashboard/audience/wallet",
    },
    {
      id: "offer",
      label: "Offer / Spotlight",
      pillar: "campaign",
      status: offerStatus,
      summary:
        offerStatus === "connected"
          ? "Card Spotlight bound to Campaign offer — conversion evidence recorded."
          : offerStatus === "partially_connected"
            ? input.offerProjectionState === "stale"
              ? "Bound offer projection is stale — refresh facts from Campaign."
              : "Spotlight bound — tap a public Tap Point to claim and prove the wire."
            : offerStatus === "available_to_configure"
              ? "Bind a Campaign offer_coupon to Card Spotlight (Put an offer on my Card)."
              : "Offer fuse not enabled.",
      readiness: "Mock follow-up + Distribution · live Resend/Meta = credentials required",
      whereUsed: "Card Spotlight · Campaign offer · Insights",
      primaryHref: "/dashboard/card/edit?wire=offer",
      primaryAction: "Configure Offer",
      canEdit: true,
      canPreview: true,
      canTest: true,
    },
    {
      id: "booking_payment",
      label: "Booking / Payment",
      pillar: "commerce",
      status: "not_yet_available",
      summary: "calendar/shop/book actions are URL placeholders — native booking deferred.",
    },
    {
      id: "insights",
      label: "Insights",
      pillar: "insights",
      status: "partially_connected",
      summary: "Card views and support events appear when recorded — not OWNER-READY.",
      primaryHref: "/dashboard/insights?view=card",
      canPreview: true,
    },
  ];
}
