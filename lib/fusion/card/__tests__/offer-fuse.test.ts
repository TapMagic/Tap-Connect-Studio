import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentBlock } from "@/lib/types/campaign";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  detectOfferProjectionState,
  deriveOfferFuseStatus,
  extractAuthoritativeOffer,
  fingerprintOfferFacts,
  projectOfferOntoSpotlight,
  unprojectSpotlightOffer,
  buildOfferDistributionPackage,
} from "@/lib/fusion/card/offer";
import { resolvePublicTapSurface } from "@/lib/fusion/card/offer-resolver";
import { buildCardFuseBoxConnections } from "@/lib/fusion/card/fuse-box";
import { submitCardOfferEntry } from "@/lib/fusion/card/offer-entry";

function couponBlock(id: string, data: Record<string, unknown> = {}): ContentBlock {
  return {
    id,
    type: "offer_coupon",
    order: 0,
    enabled: true,
    label: "Offer",
    data: {
      title: (data.title as string) ?? "20% off",
      description: (data.description as string) ?? "Save on your next visit",
      code: (data.code as string) ?? "SAVE20",
      expiresAt: (data.expiresAt as string) ?? "2026-12-31",
      ctaLabel: (data.ctaLabel as string) ?? "Claim",
      lockedUntilContact: (data.lockedUntilContact as boolean) ?? true,
    },
  };
}

function minimalCard(sections: TapCardSection[]): TapConnectCardConfig {
  return {
    version: 3,
    accentColor: "#fff",
    surfaceColor: "#000",
    textColor: "#fff",
    headerEnergy: 50,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "rounded_md",
    sections,
  };
}

describe("card offer authoritative SoT", () => {
  it("extracts offer_coupon as Campaign-owned offer", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      blocks: [couponBlock("blk_1")],
    });
    assert.ok(offer);
    assert.equal(offer?.campaignId, "camp_1");
    assert.equal(offer?.offerBlockId, "blk_1");
    assert.equal(offer?.title, "20% off");
    assert.equal(offer?.code, "SAVE20");
    assert.equal(
      offer?.factsFingerprint,
      fingerprintOfferFacts({
        title: "20% off",
        description: "Save on your next visit",
        code: "SAVE20",
        expiresAt: "2026-12-31",
        ctaLabel: "Claim",
      })
    );
  });

  it("projects facts onto Spotlight without inventing a second SoT", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      blocks: [couponBlock("blk_1")],
    })!;
    const section: TapCardSection = {
      id: "sec_1",
      type: "special_offer",
      enabled: true,
      order: 0,
      text: "Hot",
      headline: "Host teaser",
    };
    const projected = projectOfferOntoSpotlight({
      section,
      offer,
      preservePresentation: true,
      deviceCode: "seeddemo01",
    });
    assert.equal(projected.offerMode, "campaign");
    assert.equal(projected.linkedCampaignId, "camp_1");
    assert.equal(projected.offerTitle, "20% off");
    assert.equal(projected.offerCode, "SAVE20");
    assert.equal(projected.headline, "Host teaser");
    assert.equal(projected.offerFactsFingerprint, offer.factsFingerprint);
    assert.equal(detectOfferProjectionState({ section: projected, offer }), "current");
  });

  it("unprojects Spotlight bind while preserving presentation", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      blocks: [couponBlock("blk_1")],
    })!;
    const projected = projectOfferOntoSpotlight({
      section: {
        id: "sec_1",
        type: "special_offer",
        enabled: true,
        order: 0,
        headline: "Host teaser",
        text: "Offer",
      },
      offer,
      preservePresentation: true,
    });
    const cleared = unprojectSpotlightOffer(projected);
    assert.equal(cleared.linkedCampaignId, undefined);
    assert.equal(cleared.offerFactsFingerprint, undefined);
    assert.equal(cleared.headline, "Host teaser");
    assert.notEqual(cleared.offerMode, "campaign");
  });

  it("detects stale projection when Campaign facts change", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      blocks: [couponBlock("blk_1")],
    })!;
    const section: TapCardSection = {
      id: "sec_1",
      type: "special_offer",
      enabled: true,
      order: 0,
      offerMode: "campaign",
      linkedCampaignId: "camp_1",
      offerFactsFingerprint: "stalehash",
    };
    assert.equal(detectOfferProjectionState({ section, offer }), "stale");
  });

  it("builds mock distribution from the same offer", () => {
    const offer = extractAuthoritativeOffer({
      campaignId: "camp_1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      blocks: [couponBlock("blk_1")],
    })!;
    const pkg = buildOfferDistributionPackage({
      offer,
      businessName: "Demo Co",
      sectionId: "sec_1",
    });
    assert.equal(pkg.mock, true);
    assert.equal(pkg.requiresHumanApproval, true);
    assert.ok(pkg.emailSubject.includes("20% off"));
    assert.ok(pkg.socialCaption.includes("Demo Co"));
    assert.deepEqual(pkg.channels, ["email", "tapcast_social"]);
  });
});

describe("offer resolver precedence", () => {
  it("injects Spotlight on live Campaign when bound", () => {
    const result = resolvePublicTapSurface({
      hasLiveCampaign: true,
      liveCampaignId: "camp_1",
      offerFeatureOn: true,
      hasEndExperience: false,
      card: minimalCard([
          {
            id: "s1",
            type: "special_offer",
            enabled: true,
            order: 0,
            offerMode: "campaign",
            linkedCampaignId: "camp_1",
          },
        ]),
    });
    assert.equal(result.mode, "campaign_takeover_with_spotlight");
    assert.equal(result.injectSpotlight, true);
  });

  it("serves Card-first when no live Campaign", () => {
    const result = resolvePublicTapSurface({
      hasLiveCampaign: false,
      offerFeatureOn: true,
      hasEndExperience: true,
      card: minimalCard([{ id: "s1", type: "hero", enabled: true, order: 0 }]),
    });
    assert.equal(result.mode, "card_first");
  });
});

describe("offer fuse-box honesty", () => {
  it("marks offer Connected only with evidence", () => {
    assert.equal(
      deriveOfferFuseStatus({
        featureOn: true,
        hasBoundSpotlight: true,
        hasAuthoritativeOffer: true,
        projectionState: "current",
        conversionEvidenceCount: 0,
      }),
      "partially_connected"
    );
    assert.equal(
      deriveOfferFuseStatus({
        featureOn: true,
        hasBoundSpotlight: true,
        hasAuthoritativeOffer: true,
        projectionState: "current",
        conversionEvidenceCount: 2,
      }),
      "connected"
    );
    const rows = buildCardFuseBoxConnections({
      hasPublicCard: true,
      activeCampaignCount: 1,
      tapPointAssignmentCount: 1,
      openSupportThreads: 0,
      supportFeatureOn: true,
      inboxFeatureOn: true,
      walletMock: true,
      walletLiveReady: false,
      journeyCount: 0,
      offerFeatureOn: true,
      offerBound: true,
      offerHasAuthoritative: true,
      offerProjectionState: "current",
      offerConversionEvidenceCount: 1,
    });
    assert.equal(rows.find((r) => r.id === "offer")?.status, "connected");
  });
});

describe("card offer entry gates", () => {
  it("requires consent for claim with email before persistence", async () => {
    const result = await submitCardOfferEntry({
      businessId: "biz_test",
      action: "claim",
      campaignId: "camp_test",
      email: "guest@example.com",
      consentGiven: false,
      featureOverrides: {},
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(["consent_required", "feature_off"].includes(result.code));
    }
  });

  it("validates missing campaign id", async () => {
    const result = await submitCardOfferEntry({
      businessId: "biz_test",
      action: "view",
      campaignId: "  ",
      featureOverrides: {},
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(["validation", "feature_off"].includes(result.code));
    }
  });
});
