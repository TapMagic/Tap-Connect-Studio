import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLocationItemHref,
  buildMapEmbedHref,
  mapElementDefaults,
  mapLocationHeight,
  normalizeMapLocationItems,
  normalizeMapLocationActions,
  readMapLocationDisplay,
  resolveRuntimeMapOpenApp,
  type MapElementProps,
} from "@/lib/fusion/card/designer-elements";
import {
  EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION,
  resolvePublishedEverEncoreExperience,
} from "@/lib/fusion/card/public-experience-registry";
import { allowedLayeredResizeHandles } from "@/lib/fusion/creative-studio/platform/layered-region";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

describe("Map / Location Container authority", () => {
  it("upgrades legacy single-location state without creating a second Map model", () => {
    const locations = normalizeMapLocationItems({ ...mapElementDefaults(), mapSourceMode: "custom_address", locationId: "venue", locationName: "Main Stage", address: "123 Main St" });
    assert.equal(locations.length, 1);
    assert.equal(locations[0]?.locationId, "venue");
    assert.equal(locations[0]?.primary, true);
    assert.equal(locations[0]?.category, "venue");
  });

  it("keeps independent visibility/order and elects one visible primary", () => {
    const props: MapElementProps = { locationItems: [
      { locationId: "parking", name: "Lot B", category: "parking", visible: true, order: 2, primary: true },
      { locationId: "venue", name: "Venue", category: "venue", visible: true, order: 0, primary: true },
      { locationId: "vip", name: "North Gate", category: "vip", visible: false, order: 1, primary: false },
    ] };
    const locations = normalizeMapLocationItems(props);
    assert.deepEqual(locations.map((item) => item.locationId), ["venue", "vip", "parking"]);
    assert.deepEqual(locations.filter((item) => item.primary).map((item) => item.locationId), ["venue"]);
    assert.equal(locations.find((item) => item.locationId === "vip")?.visible, false);
  });

  it("stores provider-neutral locations while adapters derive embed and Directions URLs", () => {
    const item = { locationId: "venue", name: "Venue", category: "venue" as const, address: "1750 NW 80th Ave, Ocala, FL 34482", visible: true, order: 0, primary: true };
    assert.match(buildMapEmbedHref(item) || "", /^https:\/\/maps\.google\.com\/maps\?/);
    assert.match(buildLocationItemHref(item, "apple") || "", /^https:\/\/maps\.apple\.com\//);
    assert.match(buildLocationItemHref(item, "google") || "", /^https:\/\/www\.google\.com\/maps\/dir\//);
  });

  it("chooses phone-native navigation adapters at runtime without changing canonical location state", () => {
    assert.equal(resolveRuntimeMapOpenApp("default", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "apple");
    assert.equal(resolveRuntimeMapOpenApp("default", "Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "default");
    assert.equal(resolveRuntimeMapOpenApp("default", "Mozilla/5.0 (Macintosh; Intel Mac OS X)"), "google");
    assert.equal(resolveRuntimeMapOpenApp("waze", "Mozilla/5.0 (iPhone)"), "waze");
  });

  it("provides sensible display and independent height defaults", () => {
    const display = readMapLocationDisplay({ mapDisplay: { phone: true, address: false } });
    assert.equal(display.phone, true);
    assert.equal(display.address, false);
    assert.equal(display.map, true);
    assert.equal(mapLocationHeight({ mapHeightPreset: "compact" }), 180);
    assert.equal(mapLocationHeight({ mapHeightPreset: "custom", mapCustomHeightPx: 333 }), 333);
  });

  it("uses the shared eight-handle layered resize authority instead of a map-specific drag engine", () => {
    const mapNode: CreativeCompositionNode = {
      id: "map", primitive: "image", compositionKind: "module", parentId: null, siblingOrder: 0,
      x: 0, y: 0, width: .8, height: .4, zIndex: 1,
      props: { elementKind: "map", componentKind: "map", resizePolicy: "free", aspectLocked: false },
    };
    assert.deepEqual(allowedLayeredResizeHandles(mapNode), ["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  });

  it("keeps associated buttons on the canonical action intent model", () => {
    const actions = normalizeMapLocationActions({ mapActions: [
      { actionId: "vip", label: "VIP Instructions", actionType: "internal_page", destinationRef: "page-vip", visible: true, order: 1 },
      { actionId: "tickets", label: "Tickets", actionType: "website", destinationRef: "https://example.com/tickets", visible: true, order: 0 },
    ] });
    assert.deepEqual(actions.map((action) => action.actionId), ["tickets", "vip"]);
    assert.equal(actions[1]?.destinationRef, "page-vip");
  });

  it("resolves the stable public slug to the current revision and direct Page identities", () => {
    const publication = resolvePublishedEverEncoreExperience("love-and-theft");
    assert.equal(publication?.publishedRevision, EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION);
    assert.deepEqual(publication?.config.experience?.pages.map((page) => page.slug), ["home", "music", "live", "vault", "backstage"]);
    assert.equal(publication?.config.experience?.pages.find((page) => page.slug === "backstage")?.navVisible, false);
    assert.equal(publication?.config.experience?.pages.find((page) => page.slug === "vault")?.access?.state, "locked");
  });
});
