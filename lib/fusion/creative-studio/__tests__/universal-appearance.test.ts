import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aaPreviewStyles,
  applyEffectRecipe,
  applyGlyphMaterial,
  applyMaterialRecipe,
  applySurfaceMaterial,
  EFFECT_RECIPES,
  getEffectRecipe,
  getMaterialRecipe,
  MATERIAL_CATALOG,
  MATERIAL_UI_CATEGORIES,
  materialsByCategory,
  materialsForTarget,
  normalizeMaterialId,
  surfaceShadowCss,
} from "../material-engine";
import { applyGlyphEffect } from "../card-creative-system";
import { STARTER_BADGE_PRESETS } from "../starter-preset-registry";

describe("universal appearance / MaterialRecipe adapters", () => {
  it("catalog covers required categories and substantial recipes", () => {
    assert.ok(MATERIAL_CATALOG.length >= 40);
    assert.equal(MATERIAL_UI_CATEGORIES.length, 6);
    for (const id of ["flat", "gold", "glass", "chrome", "neon_edge", "frosted_glass", "brushed_metal", "leather", "double_neon"]) {
      assert.ok(getMaterialRecipe(id), id);
    }
    assert.ok(materialsByCategory("metallic").length >= 6);
    assert.ok(materialsByCategory("neon").length >= 5);
  });

  it("surface Gold → Glass preserves badge identity fields", () => {
    const gold = applySurfaceMaterial({ text: "SALE", badgeShape: "pill", actionType: "website", x: 0.2 }, "gold");
    assert.equal(gold.materialPreset, "gold");
    assert.equal(gold.text, "SALE");
    assert.equal(gold.badgeShape, "pill");
    assert.equal(gold.actionType, "website");
    const glass = applySurfaceMaterial(gold, "glass");
    assert.equal(glass.materialPreset, "glass");
    assert.equal(glass.text, "SALE");
    assert.equal(glass.badgeShape, "pill");
    assert.equal(glass.actionType, "website");
    assert.notEqual(glass.gradientFill || glass.fill, gold.gradientFill || gold.fill);
  });

  it("glyph adapter leaves Text Box props untouched", () => {
    const next = applyGlyphMaterial(
      { color: "#111", boxFill: "#00ff00", boxGradient: "linear-gradient(#0f0,#0a0)", text: "Hello" },
      "gold"
    );
    assert.equal(next.materialPreset, "gold");
    assert.ok(String(next.gradientFill || "").includes("gradient"));
    assert.equal(next.boxFill, "#00ff00");
    assert.equal(next.boxGradient, "linear-gradient(#0f0,#0a0)");
    assert.equal(next.text, "Hello");
  });

  it("legacy glyph gold_foil routes through catalog gold", () => {
    assert.equal(normalizeMaterialId("gold_foil"), "gold");
    const next = applyGlyphEffect({ color: "#fff", boxFill: "#123456" }, "gold_foil");
    assert.equal(next.materialPreset, "gold");
    assert.equal(next.boxFill, "#123456");
  });

  it("icon artwork Neon Edge uses path glow and clears box glow", () => {
    const next = applyMaterialRecipe("icon_artwork", "neon_edge", { fill: "#fff", boxGlow: 22 });
    assert.equal(next.materialPreset, "neon_edge");
    assert.ok(Number(next.glow) > 0);
    assert.equal(next.boxGlow, 0);
    assert.ok(String(next.fill).length > 0);
  });

  it("icon backing Glass enables backing surface props", () => {
    const next = applyMaterialRecipe("icon_backing", "glass", {});
    assert.equal(next.backingSurfaceEnabled, true);
    assert.equal(next.materialPreset, "glass");
    assert.ok(next.boxFill || next.boxGradient);
  });

  it("effect recipes apply neon edge and reset", () => {
    assert.ok(getEffectRecipe("neon_edge"));
    assert.ok(EFFECT_RECIPES.length >= 10);
    const neon = applyEffectRecipe("icon_artwork", "neon_edge", { fill: "#22d3ee" });
    assert.equal(neon.effectPreset, "neon_edge");
    assert.ok(Number(neon.glow) > 0);
    const cleared = applyEffectRecipe("icon_artwork", "none", neon);
    assert.equal(cleared.effectPreset, "none");
    assert.equal(cleared.glow, 0);
  });

  it("target filtering returns surface and glyph capable recipes", () => {
    assert.ok(materialsForTarget("surface").length >= 20);
    assert.ok(materialsForTarget("glyph").length >= 10);
    assert.ok(materialsForTarget("background").length >= 10);
  });

  it("Aa preview reflects glyph and box treatments", () => {
    const aa = aaPreviewStyles({
      color: "#0000ff",
      boxFill: "#00ff00",
    });
    assert.equal(aa.glyphColor, "#0000ff");
    assert.equal(aa.boxBackground, "#00ff00");
    assert.equal(aa.boxTransparent, false);
    const transparent = aaPreviewStyles({ color: "#fff", boxFill: "transparent" });
    assert.equal(transparent.boxTransparent, true);
    const gradient = aaPreviewStyles({ gradientFill: "linear-gradient(#f00,#00f)", boxFill: "transparent" });
    assert.match(gradient.glyphColor, /gradient/i);
  });

  it("surface shadow CSS combines shadow glow and inner shadow", () => {
    const css = surfaceShadowCss({ boxShadow: 12, boxGlow: 18, glowColor: "#67e8f9", innerShadow: "inset 0 2px 4px #000" });
    assert.ok(css);
    assert.match(String(css), /67e8f9/);
    assert.match(String(css), /inset/);
  });

  it("badge starters are shapes/designs not material species", () => {
    const ids = STARTER_BADGE_PRESETS.map((item) => item.id) as string[];
    assert.ok(ids.includes("pill"));
    assert.ok(ids.includes("seal"));
    assert.ok(ids.includes("vip"));
    assert.ok(ids.includes("sale"));
    assert.equal(ids.includes("neon"), false);
    assert.equal(ids.includes("metallic"), false);
    assert.equal(ids.includes("glass"), false);
    assert.ok(STARTER_BADGE_PRESETS.every((item) => item.props.badgeShape));
  });

  it("button surface adapter preserves label when requested", () => {
    const next = applyMaterialRecipe("surface", "chrome", { label: "Claim", labelColor: "#0b0f19", actionType: "coupon" }, {
      asButtonSurface: true,
      preserveTextColor: true,
    });
    assert.equal(next.materialPreset, "chrome");
    assert.equal(next.label, "Claim");
    assert.equal(next.actionType, "coupon");
    assert.equal(next.labelColor, "#0b0f19");
  });
});
