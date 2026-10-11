import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactActionGridNodeProps,
  compactActionGridProofFixture,
  createCompactActionGrid,
  createCompactActionTile,
  readCompactActionGrid,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import {
  EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  EVERENCORE_LOVE_AND_THEFT_INSERT_CONSTRUCTIONS,
  EVERENCORE_LOVE_AND_THEFT_MASTER_INSERT_CONSTRUCTIONS,
  EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS,
  loveAndTheftFallbackInsertConstruction,
  loveAndTheftMasteredPickSource,
  loveAndTheftPickInsertResolution,
} from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";

describe("Compact Action Tile / Grid authority", () => {
  it("supports only 2, 3, or 4 columns and never creates a five-column Grid", () => {
    assert.equal(createCompactActionGrid({ columns: 2 }).columns, 2);
    assert.equal(createCompactActionGrid({ columns: 3 }).columns, 3);
    assert.equal(createCompactActionGrid({ columns: 4 }).columns, 4);
    assert.equal(createCompactActionGrid({ columns: 5 as never }).columns, 3);
  });

  it("preserves stable Tile, Action, analytics, and destination identities through serialization", () => {
    const tile = createCompactActionTile({ componentId:"tile-one", actionId:"action-one", analyticsId:"analytics-one", label:"Music", iconAssetRef:"simple-icons:spotify", insertConstruction:"recessed-medallion", actionType:"internal_page", destinationRef:"page-music", new:true, active:true });
    const state = createCompactActionGrid({ componentId:"grid-one", analyticsId:"grid-analytics", tiles:[tile] });
    const read = readCompactActionGrid(compactActionGridNodeProps(state))!;
    assert.equal(read.componentId, "grid-one");
    assert.deepEqual(read.tiles[0], tile);
  });

  it("ships six governed social proofs with mastered artist pick mappings", () => {
    const fixture = compactActionGridProofFixture();
    assert.equal(fixture.tiles.length, 6);
    assert.ok(fixture.tiles.every((tile) => loveAndTheftMasteredPickSource(tile.iconAssetRef)?.endsWith(".png")));
    assert.deepEqual(fixture.tiles.map((tile) => tile.label), ["Spotify", "Apple Music", "YouTube", "Instagram", "Facebook", "Bandsintown"]);
  });

  it("keeps locked behavior and NEW state on the reusable Tile rather than its presentation", () => {
    const tile = createCompactActionTile({ label:"Exclusive", locked:true, new:true, lockedBehavior:{mode:"cta",message:"Members only",ctaLabel:"Join",ctaDestinationType:"external",ctaDestinationRef:"https://example.com/join"} });
    assert.equal(tile.locked, true);
    assert.equal(tile.new, true);
    assert.equal(tile.lockedBehavior?.mode, "cta");
  });

  it("resolves mastered artwork first, approved family constructions second, and everything else to blank", () => {
    assert.deepEqual(loveAndTheftPickInsertResolution("simple-icons:spotify"), {
      kind: "mastered", sourceAsset: loveAndTheftMasteredPickSource("simple-icons:spotify"), construction: "recessed-medallion",
    });
    assert.equal(loveAndTheftPickInsertResolution("lucide:library-big").kind, "engraved-fallback");
    assert.equal(loveAndTheftPickInsertResolution("lucide:library-big").construction, "secondary-insert");
    assert.equal(loveAndTheftPickInsertResolution("lucide:heart").construction, "direct-engrave");
    assert.equal(loveAndTheftPickInsertResolution("lucide:globe").construction, "recessed-medallion");
    assert.equal(loveAndTheftPickInsertResolution("lucide:heart", "secondary-insert").construction, "secondary-insert");
    assert.equal(loveAndTheftPickInsertResolution("iconify:cheap-generic-badge").kind, "blank");
    assert.equal(loveAndTheftPickInsertResolution(EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID).kind, "blank");
  });

  it("preserves the three certified master construction families and semantic-fit defaults", () => {
    assert.deepEqual(EVERENCORE_LOVE_AND_THEFT_INSERT_CONSTRUCTIONS.map((option) => option.id), ["direct-engrave", "recessed-medallion", "secondary-insert"]);
    assert.deepEqual(Object.values(EVERENCORE_LOVE_AND_THEFT_MASTER_INSERT_CONSTRUCTIONS).sort(), [
      "direct-engrave", "direct-engrave", "direct-engrave", "direct-engrave",
      "recessed-medallion", "recessed-medallion", "recessed-medallion",
      "secondary-insert", "secondary-insert", "secondary-insert", "secondary-insert", "secondary-insert", "secondary-insert",
    ].sort());
    assert.equal(loveAndTheftFallbackInsertConstruction("lucide:disc-3"), "recessed-medallion");
    assert.equal(loveAndTheftFallbackInsertConstruction("lucide:map-pin"), "direct-engrave");
    assert.equal(loveAndTheftFallbackInsertConstruction("lucide:album"), "secondary-insert");
  });

  it("offers the complete approved Pick Insert library with More Music represented by a library, not a star", () => {
    const ids = EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.map((asset) => asset.canonicalId);
    for (const id of [
      "simple-icons:spotify", "simple-icons:apple-music", "lucide:music-2", "lucide:play",
      "simple-icons:instagram", "simple-icons:facebook", "simple-icons:bandsintown", "lucide:microphone",
      "lucide:lock", "lucide:calendar-days", "lucide:shirt", "lucide:ticket", "lucide:library-big",
      "lucide:album", "lucide:disc-3", "lucide:map-pin", "lucide:globe", "lucide:phone",
      "lucide:star", "lucide:heart",
    ]) assert.ok(ids.includes(id), id);
    assert.equal(EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.find((asset) => asset.canonicalId === "lucide:library-big")?.accessibleLabel, "More Music / Music Library");
    assert.notEqual(ids.indexOf("lucide:library-big"), ids.indexOf("lucide:star"));
  });
});
