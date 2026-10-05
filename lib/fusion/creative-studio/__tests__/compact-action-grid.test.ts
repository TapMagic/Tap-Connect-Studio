import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactActionGridNodeProps,
  compactActionGridProofFixture,
  createCompactActionGrid,
  createCompactActionTile,
  readCompactActionGrid,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import { loveAndTheftMasteredPickSource } from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";

describe("Compact Action Tile / Grid authority", () => {
  it("supports only 2, 3, or 4 columns and never creates a five-column Grid", () => {
    assert.equal(createCompactActionGrid({ columns: 2 }).columns, 2);
    assert.equal(createCompactActionGrid({ columns: 3 }).columns, 3);
    assert.equal(createCompactActionGrid({ columns: 4 }).columns, 4);
    assert.equal(createCompactActionGrid({ columns: 5 as never }).columns, 3);
  });

  it("preserves stable Tile, Action, analytics, and destination identities through serialization", () => {
    const tile = createCompactActionTile({ componentId:"tile-one", actionId:"action-one", analyticsId:"analytics-one", label:"Music", iconAssetRef:"simple-icons:spotify", actionType:"internal_page", destinationRef:"page-music", new:true, active:true });
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
});
