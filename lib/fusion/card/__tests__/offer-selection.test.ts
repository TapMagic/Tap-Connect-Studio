import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialOfferCampaignSelection,
  listEligibleOfferCampaigns,
  offerSelectionMode,
  type OfferCampaignCandidate,
} from "@/lib/fusion/card/offer-selection";

function cand(
  partial: Partial<OfferCampaignCandidate> & Pick<OfferCampaignCandidate, "id" | "title">
): OfferCampaignCandidate {
  return {
    status: "LIVE",
    hasOffer: true,
    ...partial,
  };
}

describe("offer campaign explicit selection", () => {
  it("does not preselect newest when multiple eligible exist", () => {
    const eligible = listEligibleOfferCampaigns([
      cand({ id: "newest", title: "Newest", offerTitle: "A" }),
      cand({ id: "older", title: "Older", offerTitle: "B" }),
      cand({ id: "nope", title: "No offer", hasOffer: false }),
    ]);
    assert.equal(eligible.length, 2);
    assert.equal(offerSelectionMode(eligible), "multiple");
    assert.equal(
      initialOfferCampaignSelection({ eligible, boundCampaignId: null }),
      "",
      "multiple candidates require explicit empty selection"
    );
  });

  it("preselects the already-bound campaign even when others are newer", () => {
    const eligible = [
      cand({ id: "newest", title: "Newest" }),
      cand({ id: "bound", title: "Bound", boundToThisCard: true }),
    ];
    assert.equal(
      initialOfferCampaignSelection({ eligible, boundCampaignId: "bound" }),
      "bound"
    );
  });

  it("suggests the sole eligible campaign", () => {
    const eligible = [cand({ id: "only", title: "Only one", offerTitle: "20% off" })];
    assert.equal(offerSelectionMode(eligible), "single");
    assert.equal(initialOfferCampaignSelection({ eligible }), "only");
  });

  it("returns none mode with empty selection when no offers", () => {
    const eligible = listEligibleOfferCampaigns([
      cand({ id: "a", title: "Draft", hasOffer: false }),
    ]);
    assert.equal(offerSelectionMode(eligible), "none");
    assert.equal(initialOfferCampaignSelection({ eligible }), "");
  });
});
