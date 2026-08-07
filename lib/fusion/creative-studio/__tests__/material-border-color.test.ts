import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySurfaceMaterial,
  getMaterialRecipe,
  MATERIAL_CATALOG,
  normalizeMaterialId,
} from "../material-engine";
import { applyBorderProps, borderIsVisuallyNone, clearBorderProps } from "../border";
import {
  buildPhotoColorSources,
  flattenSolidColors,
  PHOTO_COLORS_EMPTY_MESSAGE,
} from "../color-palettes";
import { GRADIENT_PRESETS, gradientToCss } from "../gradient";

describe("shared material / border / color contracts", () => {
  it("material catalog includes gold glass chrome and applies visibly", () => {
    for (const id of ["gold", "glass", "chrome", "frosted_glass", "neon"]) {
      assert.ok(getMaterialRecipe(id), id);
    }
    assert.ok(MATERIAL_CATALOG.length >= 40);
    const gold = applySurfaceMaterial({ text: "VIP", badgeShape: "seal" }, "gold");
    assert.equal(gold.materialPreset, "gold");
    assert.ok(String(gold.gradientFill || "").includes("gradient"));
    assert.equal(gold.badgeShape, "seal");
    assert.equal(gold.text, "VIP");
    const glass = applySurfaceMaterial(gold, "glass");
    assert.equal(glass.materialPreset, "glass");
    assert.notEqual(glass.gradientFill, gold.gradientFill);
    assert.equal(glass.text, "VIP");
  });

  it("normalizes legacy badge material ids", () => {
    assert.equal(normalizeMaterialId("rose-gold"), "rose_gold");
    assert.equal(normalizeMaterialId("silver"), "brushed_silver");
    assert.equal(normalizeMaterialId("gold_foil"), "gold");
  });

  it("Border None clears width style and outline residues", () => {
    const cleared = clearBorderProps({
      borderWidth: 4,
      borderStyle: "solid",
      borderColor: "#fff",
      outlineWidth: 4,
      outlineColor: "#fff",
      radius: 12,
    });
    assert.equal(cleared.borderStyle, "none");
    assert.equal(cleared.borderWidth, 0);
    assert.equal(cleared.outlineWidth, 0);
    assert.equal(cleared.radius, 12);
    assert.equal(borderIsVisuallyNone(cleared), true);
    const solid = applyBorderProps({}, { style: "solid", width: 2, color: "#b8ff2c" });
    assert.equal(solid.borderWidth, 2);
    assert.equal(borderIsVisuallyNone(solid), false);
  });

  it("solid palette is wide and gradient presets produce CSS", () => {
    assert.ok(flattenSolidColors().length >= 40);
    assert.ok(GRADIENT_PRESETS.length >= 8);
    for (const preset of GRADIENT_PRESETS.slice(0, 4)) {
      const css = gradientToCss(preset.gradient);
      assert.match(css, /gradient/i);
    }
  });

  it("photo colors empty when no document images", () => {
    const empty = buildPhotoColorSources({ nodes: [] });
    assert.equal(empty.length, 0);
    assert.match(PHOTO_COLORS_EMPTY_MESSAGE, /imágenes/i);
    const withImage = buildPhotoColorSources({
      nodes: [{ props: { src: "https://cdn.example/photo.jpg", alt: "Hero" } }],
    });
    assert.equal(withImage.length, 1);
    assert.ok(withImage[0]!.colors.length >= 3);
    assert.equal(withImage[0]!.thumbnailUrl, "https://cdn.example/photo.jpg");
  });
});
