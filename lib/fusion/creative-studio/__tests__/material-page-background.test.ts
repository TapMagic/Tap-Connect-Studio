import test from "node:test";
import assert from "node:assert/strict";
import {
  compositionBackgroundFromMaterialRecipe,
  getMaterialRecipe,
  materialPropsFromCompositionBackground,
} from "@/lib/fusion/creative-studio/material-engine";
import {
  resolveMaterialSurfaceFromProps,
  resolveMaterialSurfaceFromRecipe,
} from "@/lib/fusion/creative-studio/material-surface";
import { cardSurfaceImageLayerStyle } from "@/lib/fusion/creative-studio/platform/card-surface-rendering";

test("texture-bearing page Materials retain texture + fill through composition adapter", () => {
  for (const id of ["paper", "linen", "grain", "brushed_metal"] as const) {
    const recipe = getMaterialRecipe(id);
    assert.ok(recipe, id);
    assert.ok(recipe!.texture, `${id} should have texture`);
    const background = compositionBackgroundFromMaterialRecipe(recipe!);
    assert.equal(background.materialPreset, id);
    assert.ok(
      background.kind === "texture" || background.kind === "pattern",
      `${id} durable kind should be texture/pattern, got ${background.kind}`
    );
    assert.ok(background.pattern, `${id} should store pattern`);
    const props = materialPropsFromCompositionBackground(background);
    assert.ok(props);
    const surface = resolveMaterialSurfaceFromProps(props!, "generic");
    const fromRecipe = resolveMaterialSurfaceFromRecipe(recipe!);
    assert.equal(surface.textureToken, fromRecipe.textureToken);
    assert.equal(surface.materialPreset, id);
    assert.equal(surface.background, fromRecipe.background);
  }
});

test("gradient page Materials keep multi-stop authority via materialPreset rehydrate", () => {
  const recipe = getMaterialRecipe("holographic") || getMaterialRecipe("frosted_glass");
  assert.ok(recipe?.gradient);
  const background = compositionBackgroundFromMaterialRecipe(recipe!);
  assert.equal(background.kind, "gradient");
  assert.equal(background.value, recipe!.gradient);
  const props = materialPropsFromCompositionBackground(background);
  const surface = resolveMaterialSurfaceFromProps(props!, "generic");
  assert.equal(surface.fillAuthority, "gradientFill");
  assert.ok(surface.gradientStopCount >= 2);
});

test("page Material preview cannot flatten away brushed_metal texture", () => {
  const recipe = getMaterialRecipe("brushed_metal");
  assert.ok(recipe);
  const background = compositionBackgroundFromMaterialRecipe(recipe!);
  const props = materialPropsFromCompositionBackground(background);
  const surface = resolveMaterialSurfaceFromProps(props!, "generic");
  assert.equal(surface.textureToken, "brushed");
  assert.equal(surface.fillAuthority, "gradientFill");
  assert.ok(surface.gradientStopCount >= 3);
});

test("Worn Saddle Leather remains an immutable source master with adjustable full-bleed treatment", () => {
  const recipe = getMaterialRecipe("worn_saddle_leather");
  assert.equal(recipe?.sourceMaster?.id, "worn-saddle-leather@1.0.0");
  assert.equal(recipe?.sourceMaster?.sha256, "7cfbbc872682b26fdce2b6b9b3c116d0d00cb0c877ebf641c895fb54679a32fc");
  const background = compositionBackgroundFromMaterialRecipe(recipe!);
  assert.equal(background.kind, "image");
  assert.equal(background.image?.src, "/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png");
  assert.equal(background.image?.fit, "cover");
  assert.equal(background.image?.repeat, "no-repeat");
  assert.equal(materialPropsFromCompositionBackground(background), null);
  const tuned = {
    ...background,
    saturation: .72,
    image: { ...background.image!, scale: 1.35, focalX: .35, focalY: .62, brightness: .76, contrast: 1.3, overlayOpacity: .34 },
  };
  const style = cardSurfaceImageLayerStyle(tuned);
  assert.match(String(style?.backgroundImage), /SURFACE-LEATHER-001_worn-saddle-leather\.png/);
  assert.match(String(style?.filter), /brightness\(0\.76\).*contrast\(1\.3\).*saturate\(0\.72\)/);
  assert.equal(style?.transform, "scale(1.35)");
});
