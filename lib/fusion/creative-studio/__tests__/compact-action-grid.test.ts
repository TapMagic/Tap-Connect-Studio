import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactActionGridNodeProps,
  compactActionGridLayoutMetrics,
  compactActionGridProofFixture,
  createCompactActionGrid,
  createCompactActionTile,
  readCompactActionGrid,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import {
  EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  EVERENCORE_LOVE_AND_THEFT_PICK_MASTER_CATALOG,
  EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS,
  loveAndTheftPickMasterDefinition,
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

  it("keeps authored Tile size independent from the column arrangement", () => {
    const threeAcross = createCompactActionGrid({ columns: 3, tileSizePx: 96, columnGapPx: 12 });
    const twoAcross = createCompactActionGrid({ ...threeAcross, columns: 2 });
    assert.equal(threeAcross.tileSizePx, 96);
    assert.equal(twoAcross.tileSizePx, 96);
  });

  it("fits the frame to occupied columns without reserving an empty track", () => {
    const state = createCompactActionGrid({
      columns: 3,
      tileSizePx: 96,
      columnGapPx: 12,
      widthMode: "fit_content",
      tiles: [createCompactActionTile({ label: "Instagram" }), createCompactActionTile({ label: "Facebook" })],
    });
    const metrics = compactActionGridLayoutMetrics(state);
    assert.equal(metrics.occupiedColumns, 2);
    assert.equal(metrics.contentWidthPx, 204);
    assert.equal(metrics.rows, 1);
  });

  it("preserves explicit width mode, Grid alignment, custom width, and the approved 64px gap range", () => {
    const state = createCompactActionGrid({ widthMode: "custom", customWidthPx: 280, gridAlignment: "right", columnGapPx: 64, rowGapPx: 64 });
    assert.equal(state.widthMode, "custom");
    assert.equal(state.customWidthPx, 280);
    assert.equal(state.gridAlignment, "right");
    assert.equal(state.columnGapPx, 64);
    assert.equal(state.rowGapPx, 64);
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

  it("resolves exact certified source masters and sends every unknown semantic to the certified blank", () => {
    assert.deepEqual(loveAndTheftPickInsertResolution("simple-icons:spotify"), {
      kind: "mastered", sourceAsset: loveAndTheftMasteredPickSource("simple-icons:spotify"), construction: "circular-recessed", canonicalId: "LT-PICK-SPOTIFY",
    });
    assert.deepEqual(loveAndTheftPickInsertResolution("lucide:library-big"), {
      kind: "mastered", sourceAsset: loveAndTheftMasteredPickSource("lucide:library-big"), construction: "open-face-engraved", canonicalId: "LT-PICK-PLAYLIST",
    });
    assert.equal(loveAndTheftPickInsertResolution("lucide:heart").kind, "blank");
    assert.equal(loveAndTheftPickInsertResolution("lucide:globe").kind, "blank");
    assert.equal(loveAndTheftPickInsertResolution("iconify:cheap-generic-badge").kind, "blank");
    assert.equal(loveAndTheftPickInsertResolution(EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID).kind, "blank");
  });

  it("preserves every authored face construction as metadata without rebuilding it", () => {
    const constructions = new Set(EVERENCORE_LOVE_AND_THEFT_PICK_MASTER_CATALOG.map((master) => master.faceConstruction));
    assert.deepEqual([...constructions].sort(), ["artist-identity", "blank-master", "circular-recessed", "open-face-engraved", "secondary-shaped"]);
    assert.equal(loveAndTheftPickMasterDefinition("simple-icons:spotify")?.faceConstruction, "circular-recessed");
    assert.equal(loveAndTheftPickMasterDefinition("simple-icons:instagram")?.faceConstruction, "open-face-engraved");
    assert.equal(loveAndTheftPickMasterDefinition("simple-icons:youtube")?.faceConstruction, "secondary-shaped");
  });

  it("offers all 24 unique masters once, including blank, with More Music represented by the playlist master", () => {
    const ids = EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.map((asset) => asset.canonicalId);
    assert.equal(EVERENCORE_LOVE_AND_THEFT_PICK_MASTER_CATALOG.length, 24);
    assert.equal(EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.length, 23);
    assert.equal(new Set(ids).size, 23);
    assert.ok(ids.includes("LT-PICK-PLAYLIST"));
    assert.equal(EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.find((asset) => asset.canonicalId === "LT-PICK-PLAYLIST")?.accessibleLabel, "Playlist / More Music");
    assert.notEqual(ids.indexOf("LT-PICK-PLAYLIST"), ids.indexOf("LT-PICK-FAVORITE"));
    assert.ok(EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS.every((asset) => asset.rasterMasterSource?.endsWith(".png") && asset.sourceMasterSha256?.length === 64));
  });
});
