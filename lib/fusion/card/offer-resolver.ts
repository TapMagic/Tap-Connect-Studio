/**
 * Card Offer resolver helpers — deterministic public surface precedence.
 * Full decision table: docs/fusion/CARD_OFFER_FUSE_CONTRACT.md §3
 */

import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import { findPrimarySpotlightSection } from "./offer";

export type PublicTapSurfaceMode =
  | "campaign_takeover_with_spotlight"
  | "campaign_takeover"
  | "card_first"
  | "end_experience"
  | "status";

export type ResolvePublicTapSurfaceInput = {
  hasLiveCampaign: boolean;
  liveCampaignId?: string | null;
  card: TapConnectCardConfig | null | undefined;
  cardRetired?: boolean;
  offerFeatureOn: boolean;
  hasEndExperience: boolean;
};

export type ResolvePublicTapSurfaceResult = {
  mode: PublicTapSurfaceMode;
  injectSpotlight: boolean;
  spotlightSection: TapCardSection | null;
  hostExplanation: string;
};

/**
 * Deterministic precedence:
 * 1. Live campaign → takeover page
 * 1a. Bound Spotlight on Card matching live campaign (or any bound spotlight when feature on) → inject
 * 2. No live campaign + living Card → card_first
 * 3. End experience cascade
 */
export function resolvePublicTapSurface(
  input: ResolvePublicTapSurfaceInput
): ResolvePublicTapSurfaceResult {
  const spotlight = findPrimarySpotlightSection(input.card);
  const bound =
    Boolean(spotlight?.linkedCampaignId) && spotlight?.offerMode === "campaign";
  const livingCard =
    Boolean(input.card?.sections?.length) && !input.cardRetired;

  if (input.hasLiveCampaign) {
    const matchesLive =
      bound &&
      input.offerFeatureOn &&
      (!input.liveCampaignId || spotlight?.linkedCampaignId === input.liveCampaignId);
    // Also inject when Spotlight is bound to the live campaign specifically;
    // if bound to another campaign, still show campaign takeover without inject.
    const inject =
      input.offerFeatureOn &&
      bound &&
      (spotlight?.linkedCampaignId === input.liveCampaignId ||
        (!input.liveCampaignId && bound));

    if (matchesLive || inject) {
      return {
        mode: "campaign_takeover_with_spotlight",
        injectSpotlight: true,
        spotlightSection: spotlight,
        hostExplanation:
          "A live Campaign owns this Tap Point page. Your Card Offer shows as Spotlight on that page.",
      };
    }

    return {
      mode: "campaign_takeover",
      injectSpotlight: false,
      spotlightSection: null,
      hostExplanation:
        "A live Campaign owns this Tap Point page. Bind a Card Spotlight to this Campaign to show the Offer fuse.",
    };
  }

  if (livingCard) {
    return {
      mode: "card_first",
      injectSpotlight: false,
      spotlightSection: spotlight,
      hostExplanation:
        "No live Campaign — customers see your living Card (including Spotlight when configured).",
    };
  }

  if (input.hasEndExperience) {
    return {
      mode: "end_experience",
      injectSpotlight: false,
      spotlightSection: null,
      hostExplanation: "Falling back to end experience / Brand Kit fallback content.",
    };
  }

  return {
    mode: "status",
    injectSpotlight: false,
    spotlightSection: null,
    hostExplanation: "No live Campaign or Card — waiting / status page.",
  };
}
