import test from "node:test";
import assert from "node:assert/strict";
import {
  STARTER_BADGE_PRESETS,
  STARTER_BUTTON_PRESETS,
  STARTER_CONTAINER_PRESETS,
  STARTER_COUPON_LAYOUTS,
  STARTER_DIVIDER_PRESETS,
  STARTER_FORM_PRESETS,
  STARTER_TEXT_COMBINATIONS,
  STARTER_TICKET_LAYOUTS,
  listStarterPresetFamilies,
} from "@/lib/fusion/creative-studio/starter-preset-registry";

test("starter catalog meets structural minimums", () => {
  const counts = listStarterPresetFamilies();
  assert.equal(counts.pack.version, 1);
  assert.ok(counts.text >= 8);
  assert.ok(counts.buttons >= 8);
  assert.ok(counts.badges >= 8);
  assert.ok(counts.coupons >= 4);
  assert.ok(counts.tickets >= 4);
  assert.ok(counts.dividers >= 4);
  assert.ok(counts.forms >= 4);
  assert.ok(counts.containers >= 4);
});

test("text combinations are structurally varied not color-only", () => {
  const structures = new Set(STARTER_TEXT_COMBINATIONS.map((item) => item.structure));
  assert.equal(structures.size, STARTER_TEXT_COMBINATIONS.length);
  assert.ok(STARTER_TEXT_COMBINATIONS.every((item) => item.lines.length >= 2));
  assert.ok(STARTER_TEXT_COMBINATIONS.some((item) => item.lines.some((line) => /serif|cursive|Oswald|Bebas|Orbitron|Fredoka/i.test(String(line.fontFamily || "")))));
});

test("coupon and ticket geometries stay distinct families", () => {
  const couponGeometry = new Set(STARTER_COUPON_LAYOUTS.map((item) => item.geometry));
  const ticketGeometry = new Set(STARTER_TICKET_LAYOUTS.map((item) => item.geometry));
  assert.equal(couponGeometry.size, 4);
  assert.equal(ticketGeometry.size, 4);
  for (const geometry of couponGeometry) assert.equal(ticketGeometry.has(geometry as never), false);
  assert.ok(STARTER_BUTTON_PRESETS.length >= 8);
  assert.ok(STARTER_BADGE_PRESETS.length >= 8);
  assert.ok(STARTER_DIVIDER_PRESETS.length >= 4);
  assert.ok(STARTER_FORM_PRESETS.length >= 4);
  assert.ok(STARTER_CONTAINER_PRESETS.length >= 4);
});
