import assert from "node:assert/strict";
import test from "node:test";
import { createCardElement } from "@/lib/fusion/card/composer-model";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import {
  BADGE_SHAPES,
  BADGE_WORDING,
  ICON_LIBRARY,
  MATERIAL_PRESETS,
  MOTION_PRESETS,
  applyGlyphEffect,
  applyMaterialPreset,
  defaultMotionSettings,
  instantiateReusableComposition,
  saveReusableComposition,
} from "@/lib/fusion/creative-studio/card-creative-system";
import { createEmptyCreativeComposition } from "@/lib/fusion/creative-studio/composition";

test("creative libraries expose editable badge, icon, material, and governed motion choices", () => {
  assert.ok(BADGE_WORDING.includes("SALE"));
  assert.ok(BADGE_SHAPES.includes("burst"));
  assert.ok(ICON_LIBRARY.some((icon) => icon.id === "map-pin"));
  assert.ok(MATERIAL_PRESETS.some((preset) => preset.id === "gold_foil"));
  assert.ok(MOTION_PRESETS.some((preset) => preset.id === "glow_pulse"));
  assert.deepEqual(defaultMotionSettings("glow_pulse"), {
    preset: "glow_pulse",
    intensity: 50,
    speedSeconds: 2.4,
    delaySeconds: 0,
    play: "gentle_repeat",
  });
});

test("Badge and Icon remain canonical editable Elements", () => {
  const badge = createCardElement("badge");
  const icon = createCardElement("icon");
  assert.equal(badge.primitive, "shape");
  assert.equal(badge.props.text, "SALE");
  assert.equal(badge.props.badgeShape, "pill");
  assert.equal(icon.primitive, "shape");
  assert.match(String(icon.props.icon), /sparkles/);
  assert.equal(icon.props.decorative, true);
});

test("material presets expand to supported editable properties", () => {
  const text = createCardElement("heading");
  const styled = applyMaterialPreset(text, "brushed_silver");
  assert.equal(styled.props.materialPreset, "brushed_silver");
  assert.match(String(styled.props.gradientFill), /linear-gradient/);
  assert.equal(typeof styled.props.shadow, "number");
});

test("glyph effects replace incompatible fields without touching the text box", () => {
  const base = {
    text: "Chad Test",
    color: "#ffffff",
    boxFill: "transparent",
    boxRadius: 12,
    glow: 36,
    outlineWidth: 4,
    materialPreset: "neon_tube",
  };
  const gold = applyGlyphEffect(base, "gold_foil");
  assert.equal(gold.text, "Chad Test");
  // Legacy glyph ids normalize onto the canonical MaterialRecipe catalog.
  assert.equal(gold.materialPreset, "gold");
  assert.equal(gold.outlineWidth, undefined);
  assert.equal(gold.boxFill, "transparent");
  assert.equal(gold.boxRadius, 12);

  const chrome = applyGlyphEffect(gold, "polished_chrome");
  assert.equal(chrome.materialPreset, "chrome");
  assert.notEqual(chrome.gradientFill, gold.gradientFill);
  assert.equal(chrome.boxFill, "transparent");

  const plain = applyGlyphEffect(chrome, null);
  assert.equal(plain.materialPreset, undefined);
  assert.equal(plain.gradientFill, undefined);
  assert.equal(plain.shadow, undefined);
  assert.equal(plain.text, "Chad Test");
});

test("reusable composition instances retain source revision but never share node identity", () => {
  const block = createEmptyCreativeComposition("offer-composition");
  block.nodes = [createCardElement("badge"), createCardElement("heading"), createCardElement("button")];
  const resource = saveReusableComposition({ block, name: "Free Fries Tonight" });
  const first = instantiateReusableComposition(resource);
  const second = instantiateReusableComposition(resource);
  assert.equal(resource.label, "Free Fries Tonight");
  assert.equal(first.resourceRef?.resourceId, resource.resourceRef?.resourceId);
  assert.equal(second.resourceRef?.revisionId, resource.resourceRef?.revisionId);
  assert.notEqual(first.id, second.id);
  const firstIds = new Set(first.nodes.map((node) => node.id));
  assert.equal(second.nodes.some((node) => firstIds.has(node.id)), false);
  first.nodes[0]!.props.text = "FIRST ONLY";
  assert.equal(second.nodes[0]!.props.text, "SALE");
  assert.equal(resource.nodes[0]!.props.text, "SALE");

  const parsed = parseTapConnectCard({
    version: 3,
    accentColor: "#b8ff2c",
    surfaceColor: "#10131a",
    textColor: "#ffffff",
    sections: [],
    reusableCompositions: [resource],
  }, { businessName: "Parser proof" });
  assert.equal(parsed.reusableCompositions?.[0]?.resourceRef?.resourceId, resource.resourceRef?.resourceId);
});
