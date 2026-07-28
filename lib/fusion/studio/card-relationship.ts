/**
 * Card relationship context — single read model for Home command center
 * and the reusable Card relationship anchor. Does not invent a second Card SoT.
 */

import { parseTapConnectCard, type TapConnectCardConfig } from "@/lib/brand/tap-card";
import { findPrimarySpotlightSection } from "@/lib/fusion/card/offer";
import type { StudioZoneId } from "@/lib/fusion/studio/zone-tokens";

export type CardPublicState = "missing" | "draft" | "ready_unpublished" | "published" | "retired";

export type CardNextActionId =
  | "create_card"
  | "finish_card"
  | "publish_card"
  | "connect_tap_point"
  | "prepare_campaign"
  | "setup_tapsave"
  | "fix_attention"
  | "review_autopilot"
  | "review_insights";

export type CardNextAction = {
  id: CardNextActionId;
  label: string;
  href: string;
  detail: string;
};

export type CardProofStrip = {
  taps: number;
  saves: number;
  contacts: number;
  claims: number;
};

export type CardRelationshipContext = {
  businessId: string;
  businessName: string;
  cardName: string;
  hasPersistedCard: boolean;
  publicState: CardPublicState;
  publicStateLabel: string;
  lifecycleStatus: "active" | "retired";
  publicCode: string | null;
  tapPointCount: number;
  tapPointHealthy: number;
  tapPointWarning: number;
  tapPointCritical: number;
  spotlightTitle: string | null;
  spotlightCampaignId: string | null;
  tapSaveEnabled: boolean;
  brandSource: "brand_kit" | "custom";
  needsAttention: { title: string; href: string; detail: string } | null;
  autopilotSuggestion: { title: string; href: string; detail: string } | null;
  proof: CardProofStrip;
  nextAction: CardNextAction;
  openHref: string;
  editHref: string;
  publicHref: string | null;
  returnToCardHref: string;
};

export type CardRelationshipRole =
  | "spotlight"
  | "email_return"
  | "integrations_ecosystem"
  | "audience_relationships"
  | "brand_identity"
  | "service_support"
  | "insights_proof"
  | "tap_points_entry"
  | "autopilot_prepared"
  | "campaign_conversion"
  | "home_command";

export const CARD_RELATIONSHIP_ROLE_COPY: Record<
  CardRelationshipRole,
  { supports: string; role: string }
> = {
  home_command: {
    supports: "Primary Card relationship",
    role: "Command center",
  },
  spotlight: {
    supports: "Supports this Card",
    role: "Active Campaign Spotlight",
  },
  campaign_conversion: {
    supports: "Supports this Card",
    role: "Activation and conversion",
  },
  email_return: {
    supports: "Supports this Card",
    role: "Campaign return path",
  },
  integrations_ecosystem: {
    supports: "Supports this Card ecosystem",
    role: "External handoff and operational routing",
  },
  audience_relationships: {
    supports: "Supports this Card relationships",
    role: "Consent, memory, and eligibility",
  },
  brand_identity: {
    supports: "Defines identity for this Card",
    role: "Defines the identity inherited by this Card and its supporting experiences",
  },
  service_support: {
    supports: "Supports this Card",
    role: "Service handling and resolution",
  },
  insights_proof: {
    supports: "Proves what this Card accomplished",
    role: "Evidence and attribution",
  },
  tap_points_entry: {
    supports: "Connects customers to this Card",
    role: "Physical and digital entry",
  },
  autopilot_prepared: {
    supports: "Prepares work for this Card",
    role: "Prepared recommendations and orchestration",
  },
};

export function detectPersistedCard(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return Array.isArray(o.sections) && o.sections.length > 0;
}

export function resolveCardPublicState(input: {
  hasPersistedCard: boolean;
  lifecycleStatus: "active" | "retired";
  tapPointCount: number;
  hasLiveAssignment: boolean;
}): CardPublicState {
  if (!input.hasPersistedCard) return "missing";
  if (input.lifecycleStatus === "retired") return "retired";
  if (input.tapPointCount === 0 && !input.hasLiveAssignment) {
    // Persisted but not yet on a Tap Point — treat as ready unpublished when sections exist
    return "ready_unpublished";
  }
  if (input.hasLiveAssignment || input.tapPointCount > 0) return "published";
  return "draft";
}

export function publicStateLabel(state: CardPublicState): string {
  switch (state) {
    case "missing":
      return "No Card yet";
    case "draft":
      return "Draft";
    case "ready_unpublished":
      return "Ready · not on a Tap Point";
    case "published":
      return "Live";
    case "retired":
      return "Retired";
  }
}

export function resolveCardNextAction(input: {
  publicState: CardPublicState;
  tapPointCount: number;
  hasActiveSpotlight: boolean;
  tapSaveEnabled: boolean;
  needsAttention: boolean;
  hasAutopilotSuggestion: boolean;
  openHref: string;
  editHref: string;
}): CardNextAction {
  if (input.needsAttention) {
    return {
      id: "fix_attention",
      label: "Fix the blocking issue",
      href: "/dashboard#decision-queue",
      detail: "Something needs attention before the Card relationship can run smoothly.",
    };
  }
  if (input.hasAutopilotSuggestion) {
    return {
      id: "review_autopilot",
      label: "Review prepared recommendation",
      href: "/dashboard/card?wire=offer",
      detail: "Autopilot has a prepared Card offer recommendation ready to review locally.",
    };
  }
  switch (input.publicState) {
    case "missing":
      return {
        id: "create_card",
        label: "Create your Card",
        href: input.openHref,
        detail: "Build the customer relationship hub people see when they tap.",
      };
    case "draft":
      return {
        id: "finish_card",
        label: "Finish your Card",
        href: input.editHref,
        detail: "Complete Card sections so the relationship is ready to publish.",
      };
    case "retired":
      return {
        id: "finish_card",
        label: "Restore or replace your Card",
        href: input.editHref,
        detail: "This Card is retired — restore it or build a replacement.",
      };
    case "ready_unpublished":
      if (input.tapPointCount === 0) {
        return {
          id: "connect_tap_point",
          label: "Connect a Tap Point",
          href: "/dashboard/tap-points",
          detail: "Your Card is ready — connect a Tap Point so customers can reach it.",
        };
      }
      return {
        id: "publish_card",
        label: "Publish your Card",
        href: input.openHref,
        detail: "Assign the Card so it goes live on a Tap Point.",
      };
    case "published":
      if (!input.hasActiveSpotlight) {
        return {
          id: "prepare_campaign",
          label: "Prepare a Campaign",
          href: "/dashboard/card?wire=offer",
          detail: "No Spotlight is active — prepare a Campaign offer on the Card.",
        };
      }
      if (!input.tapSaveEnabled) {
        return {
          id: "setup_tapsave",
          label: "Set up TapSave",
          href: `${input.editHref}?focus=utility`,
          detail: "Keep the relationship after the tap with TapSave / Keep.",
        };
      }
      return {
        id: "review_insights",
        label: "Review Card results",
        href: "/dashboard/insights?view=card",
        detail: "Card is live with Spotlight and TapSave — check what customers did.",
      };
  }
}

export function buildCardRelationshipFromParts(input: {
  businessId: string;
  businessName: string;
  brandKitTapCard: unknown;
  brandKitPresent: boolean;
  logoUrl?: string | null;
  accentColor?: string | null;
  publicCode: string | null;
  tapPointCount: number;
  tapPointHealthy?: number;
  tapPointWarning?: number;
  tapPointCritical?: number;
  hasLiveAssignment: boolean;
  proof?: Partial<CardProofStrip>;
  needsAttention?: { title: string; href: string; detail: string } | null;
  autopilotSuggestion?: { title: string; href: string; detail: string } | null;
}): CardRelationshipContext {
  const hasPersistedCard = detectPersistedCard(input.brandKitTapCard);
  const config: TapConnectCardConfig = parseTapConnectCard(input.brandKitTapCard, {
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    accentColor: input.accentColor || "#d4af37",
  });
  const spotlight = findPrimarySpotlightSection(config);
  const keepToggle = config.utilityLayer?.utilities?.find((u) => u.kind === "keep");
  const tapSaveEnabled =
    config.utilityLayer?.enabled !== false && keepToggle?.enabled !== false;
  const lifecycleStatus = config.lifecycleStatus === "retired" ? "retired" : "active";
  const publicState = resolveCardPublicState({
    hasPersistedCard,
    lifecycleStatus,
    tapPointCount: input.tapPointCount,
    hasLiveAssignment: input.hasLiveAssignment,
  });
  // Draft detection: persisted but hero/title still default-ish and no spotlight / few sections
  let refinedState = publicState;
  if (hasPersistedCard && lifecycleStatus === "active" && publicState === "ready_unpublished") {
    const sectionCount = config.sections?.length ?? 0;
    if (sectionCount <= 2 && !spotlight) {
      refinedState = "draft";
    }
  }

  const openHref = "/dashboard/card";
  const editHref = "/dashboard/card/edit";
  const hero = config.sections?.find((s) => s.type === "hero");
  const cardName = hero?.title?.trim() || input.businessName;

  const nextAction = resolveCardNextAction({
    publicState: refinedState,
    tapPointCount: input.tapPointCount,
    hasActiveSpotlight: Boolean(spotlight),
    tapSaveEnabled,
    needsAttention: Boolean(input.needsAttention),
    hasAutopilotSuggestion: Boolean(input.autopilotSuggestion) && !input.needsAttention,
    openHref,
    editHref,
  });

  return {
    businessId: input.businessId,
    businessName: input.businessName,
    cardName,
    hasPersistedCard,
    publicState: refinedState,
    publicStateLabel: publicStateLabel(refinedState),
    lifecycleStatus,
    publicCode: input.publicCode,
    tapPointCount: input.tapPointCount,
    tapPointHealthy: input.tapPointHealthy ?? 0,
    tapPointWarning: input.tapPointWarning ?? 0,
    tapPointCritical: input.tapPointCritical ?? 0,
    spotlightTitle: spotlight
      ? String(spotlight.offerTitle || spotlight.title || "Campaign Spotlight")
      : null,
    spotlightCampaignId: spotlight?.linkedCampaignId ?? null,
    tapSaveEnabled,
    brandSource: input.brandKitPresent ? "brand_kit" : "custom",
    needsAttention: input.needsAttention ?? null,
    autopilotSuggestion: input.autopilotSuggestion ?? null,
    proof: {
      taps: input.proof?.taps ?? 0,
      saves: input.proof?.saves ?? 0,
      contacts: input.proof?.contacts ?? 0,
      claims: input.proof?.claims ?? 0,
    },
    nextAction,
    openHref,
    editHref,
    publicHref: input.publicCode ? `/t/${input.publicCode}?public=1` : null,
    returnToCardHref: openHref,
  };
}

export function zoneForRelationshipRole(role: CardRelationshipRole): StudioZoneId {
  switch (role) {
    case "home_command":
      return "home";
    case "spotlight":
    case "campaign_conversion":
      return "campaign";
    case "email_return":
      return "email";
    case "integrations_ecosystem":
      return "integrations";
    case "audience_relationships":
      return "audience";
    case "brand_identity":
      return "brand";
    case "service_support":
      return "service";
    case "insights_proof":
      return "insights";
    case "tap_points_entry":
      return "tap_points";
    case "autopilot_prepared":
      return "autopilot";
  }
}
