import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ZONE_TOKENS,
  ZONE_CONTRAST_PAIRS,
  resolveZoneTokens,
  zoneAtmosphereClass,
  zoneForStudioDestination,
  STUDIO_ACTION_TOKENS,
} from "@/lib/fusion/studio/zone-tokens";
import { contrastRatio } from "@/lib/fusion/authoring/contrast";
import {
  buildCardRelationshipFromParts,
  resolveCardNextAction,
  resolveCardPublicState,
  CARD_RELATIONSHIP_ROLE_COPY,
  detectPersistedCard,
} from "@/lib/fusion/studio/card-relationship";
import {
  buildIntegrationMaturityCatalog,
  MATURITY_GROUP_META,
} from "@/lib/fusion/studio/integration-maturity";
import { EMPTY_STATES, getEmptyState } from "@/lib/fusion/studio/empty-states";
import { CREATE_RECIPES } from "@/lib/fusion/studio/create-recipes";
import { CREATE_ACTIONS, sectionsForDestination } from "@/lib/fusion/studio/ia";

describe("zone token contract", () => {
  it("resolves all owner zones", () => {
    const ids = Object.keys(ZONE_TOKENS);
    for (const id of [
      "card",
      "brand",
      "assets",
      "campaign",
      "email",
      "audience",
      "service",
      "autopilot",
      "insights",
      "integrations",
      "tap_points",
      "settings",
    ] as const) {
      assert.ok(ids.includes(id));
      const z = resolveZoneTokens(id);
      assert.equal(z.atmosphereClass, zoneAtmosphereClass(id));
      assert.ok(z.railAccent.includes("oklch"));
      assert.ok(z.labelColor.includes("oklch"));
    }
  });

  it("maps studio destinations without rainbow nav", () => {
    assert.equal(zoneForStudioDestination("home"), "home");
    assert.equal(zoneForStudioDestination("experiences"), "card");
    assert.equal(zoneForStudioDestination("assets"), "assets");
    assert.equal(zoneForStudioDestination("unknown"), null);
  });

  it("keeps green GO separate from zone atmosphere", () => {
    assert.equal(STUDIO_ACTION_TOKENS.goAction, "var(--studio-go)");
    assert.notEqual(STUDIO_ACTION_TOKENS.goAction, ZONE_TOKENS.card.railAccent);
  });

  it("passes deterministic contrast pairs", () => {
    for (const pair of ZONE_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      assert.ok(ratio != null && ratio >= pair.minRatio, `${pair.id} ratio ${ratio}`);
    }
  });
});

describe("card relationship + next action", () => {
  it("detects missing card and create next action", () => {
    assert.equal(detectPersistedCard(null), false);
    const ctx = buildCardRelationshipFromParts({
      businessId: "b1",
      businessName: "Demo Cafe",
      brandKitTapCard: null,
      brandKitPresent: false,
      publicCode: null,
      tapPointCount: 0,
      hasLiveAssignment: false,
    });
    assert.equal(ctx.publicState, "missing");
    assert.equal(ctx.nextAction.id, "create_card");
    assert.equal(ctx.cardName, "Demo Cafe");
  });

  it("prioritizes needs-attention over other next actions", () => {
    const action = resolveCardNextAction({
      publicState: "published",
      tapPointCount: 2,
      hasActiveSpotlight: true,
      tapSaveEnabled: true,
      needsAttention: true,
      hasAutopilotSuggestion: true,
      openHref: "/dashboard/card",
      editHref: "/dashboard/card/edit",
    });
    assert.equal(action.id, "fix_attention");
  });

  it("resolves published + no spotlight to prepare campaign", () => {
    const state = resolveCardPublicState({
      hasPersistedCard: true,
      lifecycleStatus: "active",
      tapPointCount: 1,
      hasLiveAssignment: true,
    });
    assert.equal(state, "published");
    const action = resolveCardNextAction({
      publicState: "published",
      tapPointCount: 1,
      hasActiveSpotlight: false,
      tapSaveEnabled: true,
      needsAttention: false,
      hasAutopilotSuggestion: false,
      openHref: "/dashboard/card",
      editHref: "/dashboard/card/edit",
    });
    assert.equal(action.id, "prepare_campaign");
  });

  it("exposes relationship role copy for supporting workspaces", () => {
    assert.match(CARD_RELATIONSHIP_ROLE_COPY.email_return.role, /return path/i);
    assert.match(CARD_RELATIONSHIP_ROLE_COPY.brand_identity.role, /identity inherited/i);
    assert.match(CARD_RELATIONSHIP_ROLE_COPY.audience_relationships.role, /Consent/i);
  });
});

describe("integrations maturity hierarchy", () => {
  it("groups Works Now / After Setup / Local-Test / Planned", () => {
    const catalog = buildIntegrationMaturityCatalog({ resendConfigured: false });
    assert.deepEqual(
      catalog.map((g) => g.group),
      ["works_now", "after_setup", "local_or_test", "planned"]
    );
    assert.ok(catalog[0]!.cards.length > 0);
    assert.equal(MATURITY_GROUP_META.works_now.testId, "integrations-group-works-now");
    const email = catalog
      .flatMap((g) => g.cards)
      .find((c) => c.id === "email_replies");
    assert.ok(email);
    assert.equal(email!.group, "local_or_test");
    assert.match(email!.maturityLabel, /Campaign sending disabled/i);
    const monday = catalog.flatMap((g) => g.cards).find((c) => c.id === "productivity_monday");
    assert.ok(monday);
    assert.match(monday!.maturityLabel, /honest|credential|test/i);
  });
});

describe("empty states", () => {
  it("provides truthful routing and insights empties", () => {
    const routing = getEmptyState("routing");
    assert.match(routing.whatMissing, /No replies/i);
    assert.ok(routing.isNormal);
    assert.match(routing.actionLabel, /test reply/i);
    const insights = EMPTY_STATES.insights;
    assert.match(insights.whatMissing, /No customer taps/i);
    assert.match(insights.actionHref, /tap-points/);
  });
});

describe("card-first create + brand default", () => {
  it("orders Create Start recipes Card → Campaign → Email → Tap Point", () => {
    const start = CREATE_RECIPES.filter((r) => r.group === "Start").map((r) => r.id);
    assert.deepEqual(start.slice(0, 4), [
      "recipe_card",
      "recipe_campaign",
      "recipe_email",
      "recipe_tap_point",
    ]);
    assert.equal(CREATE_ACTIONS[0]!.id, "card");
    assert.match(CREATE_ACTIONS[0]!.label, /Card/i);
  });

  it("points Brand Kit section to focused workspace", () => {
    const brand = sectionsForDestination("assets").find((s) => s.id === "brand");
    assert.equal(brand?.href, "/dashboard/brand/edit");
    const classic = sectionsForDestination("assets").find((s) => s.id === "brand-classic");
    assert.equal(classic?.href, "/dashboard/brand");
  });
});
