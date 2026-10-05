"use client";

import type { BrandKit } from "@prisma/client";
import { TapConnectExperience } from "@/components/tap/tap-connect-experience";
import { CardViewportSurface } from "@/components/tap/card-viewport-surface";
import { CardUtilityLayer } from "@/components/tap/card-utility-layer";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { CompositionFontLoader } from "@/components/fusion/creative-studio/composition-font-loader";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { resolveCardUtilityLayer } from "@/lib/fusion/card/utility-layer";

/**
 * Public Card-first experience when no live Campaign owns the Tap Point.
 */
export function TapConnectCardPublic({
  config,
  profile,
  businessName,
  businessId,
  deviceSlotId,
  logoUrl,
  reviewUrl,
  brandKit,
  keepCardEnabled,
  walletMode = "preview",
  walletFeatureOn = true,
  featureFlags,
  backgroundColor = "#0b0f19",
  routeBasePath,
  directPageRef,
}: {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  businessId: string;
  deviceSlotId: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  brandKit?: BrandKit | null;
  keepCardEnabled?: boolean;
  walletMode?: "live" | "preview" | "unavailable";
  walletFeatureOn?: boolean;
  featureFlags?: Record<string, boolean>;
  backgroundColor?: string;
  routeBasePath?: string;
  directPageRef?: string;
}) {
  void brandKit;
  const featureGate = (id: string) => {
    if (featureFlags && Object.prototype.hasOwnProperty.call(featureFlags, id)) {
      return Boolean(featureFlags[id]);
    }
    return true;
  };
  const utilityLayer = resolveCardUtilityLayer({
    card: config,
    profile,
    reviewUrl,
    featureEnabled: featureGate,
    keepCardEnabled,
  });
  const offerFuse = featureGate("card.fuse.offer");
  const boundCampaignId = config.sections.find(
    (s) => s.type === "special_offer" && s.offerMode === "campaign" && s.linkedCampaignId
  )?.linkedCampaignId;

  return (
    <div
      className="tap-page relative isolate min-h-screen overflow-hidden"
      style={{ backgroundColor, color: config.textColor || "#f8fafc" }}
      data-testid="tap-card-first-public"
    >
      <CompositionFontLoader config={config} />
      <div className="tap-page-inner relative z-[1] mx-auto max-w-lg py-6">
        <CardViewportSurface environment="runtime" testId="public-card-viewport">
          <TapConnectExperience
            config={config}
            profile={profile}
            businessName={businessName}
            logoUrl={logoUrl}
            reviewUrl={reviewUrl}
            forceExpanded
            offerFuseEnabled={offerFuse}
            offerContext={offerFuse ? { businessId, campaignId: boundCampaignId || "", deviceSlotId } : null}
            supportContext={{ businessId, deviceSlotId, campaignId: boundCampaignId }}
            externalFullBleedSurface
            routingMode="history"
            routeBasePath={routeBasePath}
            directPageRef={directPageRef}
            viewportBackdrop
            persistentContent={utilityLayer.visible ? <CardUtilityLayer
              layer={utilityLayer}
              businessId={businessId}
              businessName={businessName}
              campaignId={boundCampaignId}
              deviceSlotId={deviceSlotId}
              profile={profile}
              walletMode={walletMode}
              walletFeatureOn={walletFeatureOn}
              accentColor={config.accentColor}
              surfaceColor={config.surfaceColor}
              textColor={config.textColor}
            /> : null}
          />
        </CardViewportSurface>
        <footer className="px-4 py-10">
          <PoweredByTapTheMagic />
        </footer>
      </div>
    </div>
  );
}
