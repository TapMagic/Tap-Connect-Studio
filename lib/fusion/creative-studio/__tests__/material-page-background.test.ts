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
