import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationVisualLibraryForPresentation,
  resolveNavigationVisualRef,
} from "../navigation-visual-library";
import { EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS } from "../signature-assets/everencore-love-and-theft";

test("Love & Theft navigation exposes the canonical certified master library", () => {
  const library = navigationVisualLibraryForPresentation("everencore-love-and-theft-mini-pick");
  assert.ok(library);
  assert.equal(library.assets, EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS);
  assert.equal(library.label, "Love & Theft Pick Library");
  assert.equal(library.assets.length, 23);
  assert.equal(library.allowBlank, true);
  assert.equal(library.blankId, "LT-PICK-BLANK");
  assert.equal(new Set(library.assets.map((asset) => asset.catalogCategory)).size, 7);
  assert.ok(library.assets.every((asset) => asset.rasterMasterSource?.endsWith(".png")));
});

test("legacy navigation values resolve to certified IDs without document migration", () => {
  const presentation = "everencore-love-and-theft-mini-pick";
  assert.equal(resolveNavigationVisualRef(presentation, "house"), "LT-PICK-LOVE-THEFT");
  assert.equal(resolveNavigationVisualRef(presentation, "music"), "LT-PICK-MUSIC");
  assert.equal(resolveNavigationVisualRef(presentation, "map-pin"), "LT-PICK-MAP");
  assert.equal(resolveNavigationVisualRef(presentation, "lock"), "LT-PICK-LOCK");
  assert.equal(resolveNavigationVisualRef(presentation, "shopping-bag"), "LT-PICK-MERCH");
  assert.equal(resolveNavigationVisualRef(presentation, "user"), "LT-PICK-BLANK");
  assert.equal(resolveNavigationVisualRef(presentation, "sparkles"), "LT-PICK-BLANK");
});

test("canonical and registered alias values resolve to the same exact source master", () => {
  const presentation = "everencore-love-and-theft-mini-pick";
  assert.equal(resolveNavigationVisualRef(presentation, "LT-PICK-PLAYLIST"), "LT-PICK-PLAYLIST");
  assert.equal(resolveNavigationVisualRef(presentation, "lucide:library-big"), "LT-PICK-PLAYLIST");
  assert.equal(resolveNavigationVisualRef(presentation, "simple-icons:spotify"), "LT-PICK-SPOTIFY");
  assert.equal(resolveNavigationVisualRef("standard-icon", "house"), "house");
});
