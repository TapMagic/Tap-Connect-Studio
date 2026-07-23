import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTOPILOT_CATALOG_VERSION,
  AUTOPILOT_RECIPES,
  defaultRecipeId,
  getRecipe,
  listRecipes,
  recipeAllowedForPlan,
  recipesForPlan,
} from "../recipes";

describe("autopilot recipe catalog", () => {
  it("has catalog version and at least five recipes", () => {
    assert.match(AUTOPILOT_CATALOG_VERSION, /^\d+\.\d+\.\d+$/);
    assert.ok(AUTOPILOT_RECIPES.length >= 5);
    assert.equal(listRecipes().length, AUTOPILOT_RECIPES.length);
  });

  it("every recipe has semver version and output kinds", () => {
    for (const recipe of AUTOPILOT_RECIPES) {
      assert.match(recipe.version, /^\d+\.\d+\.\d+$/);
      assert.ok(recipe.outputKinds.length >= 1);
      assert.equal(getRecipe(recipe.id)?.id, recipe.id);
    }
  });

  it("default recipe is full draft", () => {
    assert.equal(defaultRecipeId(), "campaign.full_draft");
    const recipe = getRecipe(defaultRecipeId());
    assert.ok(recipe);
    assert.equal(recipe!.version, "1.2.0");
  });

  it("filters recipes by plan tier", () => {
    const studio = recipesForPlan("STUDIO");
    const pro = recipesForPlan("PRO");
    assert.ok(studio.length >= 3);
    assert.ok(pro.length >= studio.length);
    assert.equal(recipeAllowedForPlan(getRecipe("campaign.offer_pack")!, "STUDIO"), false);
    assert.equal(recipeAllowedForPlan(getRecipe("campaign.offer_pack")!, "PRO"), true);
  });
});
