import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ZONE_DISTINCTION_PAIRS,
  ZONE_TOKENS,
  zoneForStudioDestination,
} from "@/lib/fusion/studio/zone-tokens";
import { TAPCONNECT_ICON_REGISTRY, NAV_DESTINATION_ICON } from "@/lib/fusion/icons/registry";
import { demoCardSnapshot } from "@/lib/fusion/studio-assembly";
import { INTEGRATION_TICKER_ITEMS } from "@/lib/marketing/landing-integrations-ticker";
import { LANDING_STORY_STAGES } from "@/lib/marketing/landing-integrations-ticker";

describe("Assets zone identity", () => {
  it("defines assets zone tokens distinct from brand", () => {
    assert.ok(ZONE_TOKENS.assets);
    assert.equal(ZONE_TOKENS.assets.atmosphereClass, "zone-assets");
    assert.notEqual(ZONE_TOKENS.assets.iconAccent, ZONE_TOKENS.brand.iconAccent);
    assert.ok(ZONE_TOKENS.assets.railAccent.includes("295") || ZONE_TOKENS.assets.neonEdge.includes("295"));
  });

  it("maps assets destination and icon to assets zone", () => {
    assert.equal(zoneForStudioDestination("assets"), "assets");
    assert.equal(NAV_DESTINATION_ICON.assets, "assets");
    assert.equal(TAPCONNECT_ICON_REGISTRY.assets.zone, "assets");
  });
});

describe("zone distinction pairs", () => {
  it("keeps Owner-critical pairs on different hue families", () => {
    for (const { a, b } of ZONE_DISTINCTION_PAIRS) {
      const ha = ZONE_TOKENS[a].iconAccent;
      const hb = ZONE_TOKENS[b].iconAccent;
      assert.notEqual(ha, hb, `${a} vs ${b}`);
      // crude hue token presence — different oklch hue numbers
      const hueA = ha.match(/oklch\(\s*[0-9.]+\s+[0-9.]+\s+([0-9.]+)/)?.[1];
      const hueB = hb.match(/oklch\(\s*[0-9.]+\s+[0-9.]+\s+([0-9.]+)/)?.[1];
      assert.ok(hueA && hueB);
      assert.ok(Math.abs(Number(hueA) - Number(hueB)) > 20, `${a}/${b} hues too close`);
    }
  });

  it("exposes neon edge and bloom on every zone", () => {
    for (const z of Object.values(ZONE_TOKENS)) {
      assert.ok(z.neonEdge.includes("oklch"));
      assert.ok(z.bloom.includes("oklch"));
    }
  });
});

describe("vertical profile Card snapshot", () => {
  it("provides portrait marketing fields without private data", () => {
    const card = demoCardSnapshot();
    assert.ok(card.businessDescriptor);
    assert.ok(card.avatarInitials);
    assert.match(card.tapCueLabel ?? "", /tap|scan/i);
    assert.equal(card.safeForPublicAnalytics, true);
  });
});

describe("integration ticker honesty", () => {
  it("labels maturity and does not claim all work now", () => {
    assert.ok(INTEGRATION_TICKER_ITEMS.length >= 5);
    assert.ok(INTEGRATION_TICKER_ITEMS.some((i) => i.maturity === "planned"));
    assert.ok(INTEGRATION_TICKER_ITEMS.some((i) => i.maturity === "works_now"));
    for (const item of INTEGRATION_TICKER_ITEMS) {
      assert.ok(item.whatTapSends.length > 8);
      assert.ok(item.whatReturns.length > 8);
    }
  });

  it("story stages cover Card→Prove", () => {
    const ids = LANDING_STORY_STAGES.map((s) => s.id);
    assert.deepEqual(ids, ["card", "create", "connect", "keep", "operate", "prove"]);
  });
});
