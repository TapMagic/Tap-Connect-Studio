import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTapConnectCard, type TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  CARD_BLOCK_CATEGORIES,
  CARD_BLOCK_LIBRARY,
  cardBlockSourceLabel,
  createBlankCard,
  createCardBlock,
  linkCardBlock,
  isCardBlockLinkEligible,
  useBrandResource,
  useLocalCopy,
} from "@/lib/fusion/card/block-model";
import { cardOfferToCampaignBlocks } from "@/lib/fusion/card/offer-conversion";

const config: TapConnectCardConfig = {
  version: 3,
  accentColor: "#00ff88",
  surfaceColor: "#101010",
  textColor: "#ffffff",
  headerEnergy: 50,
  collapsible: false,
  defaultCollapsed: false,
  actionsLayout: "stack",
  defaultFinish: "soft",
  cardFinish: "soft",
  defaultShape: "rounded_md",
  sections: [{ id: "old", type: "text", enabled: true, order: 0, text: "Keep published separately" }],
};

describe("block-first Card model", () => {
  it("creates a real blank editable Card without mutating the source", () => {
    const blank = createBlankCard(config);
    assert.deepEqual(blank.sections, []);
    assert.equal(blank.rootComposition, undefined);
    assert.equal(config.sections.length, 1);
    assert.equal(blank.version, 3);
    const reloaded = parseTapConnectCard(blank, { businessName: "Tap House" });
    assert.deepEqual(reloaded.sections, []);
  });

  it("contains every required category and every catalog choice creates usable local content", () => {
    assert.deepEqual(CARD_BLOCK_CATEGORIES, ["Identity", "Content", "Actions", "Promotion", "Relationship", "Connected"]);
    const created = CARD_BLOCK_LIBRARY.map((definition, order) => createCardBlock(definition.kind, {
      order,
      businessName: "Tap House",
      logoUrl: "https://assets.example/logo.png",
      defaultFinish: "soft",
      defaultShape: "rounded_md",
      pillColor: "#111111",
      pillTextColor: "#ffffff",
      neonColor: "#00ff88",
    }));
    assert.equal(created.length, CARD_BLOCK_LIBRARY.length);
    assert.equal(new Set(created.map((block) => block.id)).size, created.length);
    assert.ok(created.every((block, order) => block.enabled && block.order === order && block.label));
    assert.ok(created.filter((block) => block.sourceMode === "LINKED").every((block) => block.fallbackMode && block.fallbackText));
    assert.ok(created.filter((block) => block.sourceMode !== "LINKED").every((block) => block.sourceMode === "LOCAL"));
  });

  it("makes source state explicit and preserves content when copied locally", () => {
    const local = createCardBlock("logo_block", { order: 0, logoUrl: "https://assets.example/logo.png" });
    assert.equal(cardBlockSourceLabel(local), "Custom on this Card");
    const branded = useBrandResource(local, { id: "logo-primary", name: "Primary logo", value: "https://assets.example/brand.png" });
    assert.equal(cardBlockSourceLabel(branded), "From Brand");
    assert.equal(branded.logoUrl, "https://assets.example/brand.png");
    const linked = linkCardBlock(branded, { type: "CAMPAIGN", id: "camp-1", name: "Game Night Fries" });
    assert.equal(cardBlockSourceLabel(linked), "Linked to Campaign — Game Night Fries");
    const copied = useLocalCopy(linked);
    assert.equal(copied.sourceMode, "LOCAL");
    assert.equal(copied.logoUrl, "https://assets.example/brand.png");
    assert.equal(copied.linkedObjectId, undefined);
  });

  it("projects a complete local Offer into Campaign blocks without losing facts or media", () => {
    const offer = createCardBlock("special_offer", { order: 0 });
    Object.assign(offer, {
      headline: "Free Fries Tonight",
      offerTitle: "Game Day Offer",
      offerDescription: "One order with purchase",
      imageUrl: "https://assets.example/fries.jpg",
      mediaAssetId: "asset-1",
      offerCode: "FRIES",
      offerValue: "Free fries",
      offerStart: "2026-08-01",
      offerExpires: "2026-08-02",
      offerTerms: "While supplies last",
      redemptionInstructions: "Show this Card",
      specialStyle: "ribbon",
    });
    const blocks = cardOfferToCampaignBlocks(offer);
    assert.deepEqual(blocks.map((block) => block.type), ["hero_image", "offer_coupon"]);
    assert.equal((blocks[0].data as { mediaAssetId?: string }).mediaAssetId, "asset-1");
    const data = blocks[1].data as Record<string, unknown>;
    assert.equal(data.title, "Game Day Offer");
    assert.equal(data.code, "FRIES");
    assert.equal(data.terms, "While supplies last");
    assert.equal(data.redemptionInstructions, "Show this Card");
    assert.equal(data.cardSectionId, offer.id);
  });

  it("never treats an unlinked, draft, future, or expired Campaign as eligible", () => {
    const block = createCardBlock("campaign", { order: 0 });
    assert.equal(isCardBlockLinkEligible(block, new Date("2026-08-01T12:00:00Z")), false);
    const linked = linkCardBlock(block, { type: "CAMPAIGN", id: "camp-1", name: "Game Night" });
    assert.equal(isCardBlockLinkEligible({ ...linked, linkedObjectStatus: "DRAFT" }), false);
    assert.equal(isCardBlockLinkEligible({ ...linked, linkedObjectStatus: "LIVE", linkedStartsAt: "2026-08-02T00:00:00Z" }, new Date("2026-08-01T12:00:00Z")), false);
    assert.equal(isCardBlockLinkEligible({ ...linked, linkedObjectStatus: "LIVE", linkedEndsAt: "2026-08-01T11:00:00Z" }, new Date("2026-08-01T12:00:00Z")), false);
    assert.equal(isCardBlockLinkEligible({ ...linked, linkedObjectStatus: "LIVE", linkedStartsAt: "2026-08-01T10:00:00Z", linkedEndsAt: "2026-08-01T13:00:00Z" }, new Date("2026-08-01T12:00:00Z")), true);
  });
});
