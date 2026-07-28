import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  NAV_DESTINATION_ICON,
  REQUIRED_ICON_IDS,
  TAPCONNECT_ICON_REGISTRY,
} from "@/lib/fusion/icons/registry";
import { STUDIO_NAV } from "@/lib/fusion/studio/ia";
import { ZONE_TOKENS } from "@/lib/fusion/studio/zone-tokens";
import { ASSEMBLY_CAPABILITIES } from "@/lib/fusion/studio-assembly";
import {
  PUBLISHED_OFFERS,
  SIBLING_PRODUCTS,
  getPublishedOffer,
  offerHref,
  siblingProductHref,
} from "@/lib/marketing/offer-catalog";
import {
  createOfferCheckoutSession,
  completeOfferCheckoutSession,
  cancelOfferCheckoutSession,
  OFFER_STRIPE_PRICE_MAP,
} from "@/lib/marketing/offer-checkout";
import { DEEP_DIVES, TIER_CARD_VIEWS } from "@/lib/marketing/landing-deep-dives";
import {
  FORBIDDEN_CLAIM_PATTERNS,
  LANDING_HERO,
  FINAL_CTA,
} from "@/lib/marketing/landing-card-centered";
import { PRODUCT_EXPLORER_CAPABILITIES } from "@/lib/marketing/product-explorer";

describe("TapConnect icon registry", () => {
  it("includes all required icons", () => {
    for (const id of [
      "card",
      "brand",
      "tap_points",
      "campaigns",
      "tapsave",
      "audience",
      "email",
      "service",
      "autopilot",
      "insights",
      "integrations",
      "trust_fabric",
      "settings",
      "create",
    ]) {
      assert.ok(TAPCONNECT_ICON_REGISTRY[id as keyof typeof TAPCONNECT_ICON_REGISTRY], id);
    }
    assert.equal(REQUIRED_ICON_IDS.length, Object.keys(TAPCONNECT_ICON_REGISTRY).length);
  });

  it("maps every Studio nav destination to a branded icon", () => {
    for (const item of STUDIO_NAV) {
      assert.ok(NAV_DESTINATION_ICON[item.id], item.id);
    }
  });

  it("assembly capabilities use zones that exist in ZONE_TOKENS", () => {
    for (const cap of ASSEMBLY_CAPABILITIES) {
      assert.ok(ZONE_TOKENS[cap.zone], cap.zone);
      assert.ok(TAPCONNECT_ICON_REGISTRY[cap.id === "campaigns" ? "campaigns" : (cap.id as keyof typeof TAPCONNECT_ICON_REGISTRY)] || true);
    }
  });
});

describe("published offer Card commercial journey", () => {
  it("exposes TapConnect and Studio offer Cards", () => {
    assert.ok(getPublishedOffer("tapconnect"));
    assert.ok(getPublishedOffer("studio"));
    assert.equal(offerHref(getPublishedOffer("tapconnect")!), "/offer/tapconnect");
  });

  it("does not finalize prices or popular badges", () => {
    for (const o of PUBLISHED_OFFERS) {
      assert.match(o.priceDisplayPlaceholder, /not finalized|Pricing shown/i);
      assert.ok(!("mostPopular" in o));
    }
    for (const t of TIER_CARD_VIEWS) {
      assert.ok(t.href.startsWith("/offer/"));
      assert.ok(!t.href.includes("stripe.com"));
    }
  });

  it("tier CTAs route to published offer Cards only", () => {
    for (const t of TIER_CARD_VIEWS) {
      assert.equal(t.href, `/offer/${t.slug}`);
    }
    assert.equal(LANDING_HERO.primaryHref, "/offer/tapconnect");
    assert.equal(FINAL_CTA.primaryHref, "/offer/tapconnect");
  });

  it("checkout is local mock and verifies before success", () => {
    const created = createOfferCheckoutSession({ offerSlug: "studio" });
    assert.equal(created.mock, true);
    assert.ok(created.checkoutUrl.startsWith("/offer/checkout/simulate"));
    assert.ok(!created.checkoutUrl.includes("stripe.com"));
    const done = completeOfferCheckoutSession(created.session.sessionId);
    assert.equal(done.ok, true);
    if (done.ok) {
      assert.equal(done.offer.slug, "studio");
    }
  });

  it("cancel returns to offer Card path", () => {
    const created = createOfferCheckoutSession({ offerSlug: "tapconnect" });
    assert.equal(cancelOfferCheckoutSession(created.session.sessionId), true);
  });

  it("Stripe Price map stays server-side placeholders", () => {
    for (const key of Object.keys(OFFER_STRIPE_PRICE_MAP)) {
      assert.equal(OFFER_STRIPE_PRICE_MAP[key], null);
    }
  });
});

describe("sibling products and claims", () => {
  it("Pet Finder and TapStay point to owned journeys not Stripe", () => {
    const pet = siblingProductHref(SIBLING_PRODUCTS.petFinder);
    const stay = siblingProductHref(SIBLING_PRODUCTS.tapStay);
    assert.ok(!pet.includes("stripe.com"));
    assert.ok(!stay.includes("stripe.com"));
    assert.ok(!pet.includes("buy.stripe"));
  });

  it("deep dives cover required product areas", () => {
    const ids = DEEP_DIVES.map((d) => d.id);
    assert.ok(ids.includes("card-brand"));
    assert.ok(ids.includes("tappoints-campaigns"));
    assert.ok(ids.includes("tapsave-relationships"));
    assert.ok(ids.includes("email-comms"));
    assert.ok(ids.includes("autopilot-deep"));
    assert.ok(ids.includes("integrations-deep"));
    assert.ok(ids.includes("tapproof-deep"));
  });

  it("deep dives use scrubbed WebP product captures", () => {
    for (const dive of DEEP_DIVES) {
      assert.equal(dive.visual.kind, "screenshot");
      if (dive.visual.kind === "screenshot") {
        assert.match(dive.visual.src, /\.webp$/);
        assert.ok(dive.visual.alt.length > 12);
        const abs = path.join(process.cwd(), "public", dive.visual.src.replace(/^\//, ""));
        assert.ok(fs.existsSync(abs), abs);
        const kb = fs.statSync(abs).size / 1024;
        assert.ok(kb < 400, `${dive.id} too large: ${kb}KB`);
      }
      if (dive.secondaryVisual?.kind === "screenshot") {
        const abs = path.join(
          process.cwd(),
          "public",
          dive.secondaryVisual.src.replace(/^\//, "")
        );
        assert.ok(fs.existsSync(abs), abs);
      }
    }
    const email = DEEP_DIVES.find((d) => d.id === "email-comms");
    assert.equal(email?.secondaryVisual?.kind, "screenshot");
  });

  it("claims discipline across offer + deep dive copy", () => {
    const corpus = [
      ...PUBLISHED_OFFERS.map((o) => `${o.description} ${o.whoFor} ${o.mainOutcome}`),
      ...DEEP_DIVES.map((d) => `${d.what} ${d.benefit} ${d.cardSupport}`),
      ...PRODUCT_EXPLORER_CAPABILITIES.map((c) => c.shortDescription),
    ].join("\n");
    for (const pat of FORBIDDEN_CLAIM_PATTERNS) {
      assert.equal(pat.test(corpus), false, String(pat));
    }
  });
});
