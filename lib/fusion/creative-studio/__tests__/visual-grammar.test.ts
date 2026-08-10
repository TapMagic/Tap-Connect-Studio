import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CURATED_FAMILY_BRIGHT_LACQUER_ID,
  CURATED_FAMILY_MISSION_CONTROL_ID,
  applyAssemblyRecipeToProps,
  applyBrandRecipeToProps,
  applyColorRefinement,
  applyCuratedFamily,
  applyIconStationScale,
  applySurfaceMode,
  applyVisualPart,
  captureAssemblyRecipe,
  curatedFamilyIngredientIds,
  deriveFinishSurface,
  emptyBrandEnvironment,
  isBrandEnvironmentContract,
  observeViewportYield,
  readVisualPartsState,
  reassemblyParityCheck,
  shouldAutoStackPhone,
  visualPartsStateMatchesIngredients,
} from "../visual-parts";

describe("Visual Grammar — content independence", () => {
  it("curated family never invents Book Your Table wording", () => {
    const props = applyCuratedFamily({}, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    assert.notEqual(props.label, "Book Your Table");
    assert.equal(props.actionType, undefined);
  });
});

describe("Visual Grammar — Mission Control structural diversity", () => {
  it("applies angular body + mission mount + mechanical interaction", () => {
    const props = applyCuratedFamily(
      { actionType: "website", href: "https://host.example/apply" },
      CURATED_FAMILY_MISSION_CONTROL_ID,
      "button"
    );
    const state = readVisualPartsState(props);
    assert.equal(state.bodyPartId, "body_angular_mission");
    assert.equal(state.mountPartId, "mount_mission_control");
    assert.equal(state.interactionPartId, "interaction_mechanical");
    assert.equal(props.presentation, "angular");
    assert.equal(props.actionType, "website");
    assert.equal(props.href, "https://host.example/apply");
    assert.ok(visualPartsStateMatchesIngredients(props, CURATED_FAMILY_MISSION_CONTROL_ID).ok);
  });
});

describe("Visual Grammar — Surface ON/OFF", () => {
  it("Surface Off does not require copper staging", () => {
    let props = applySurfaceMode({}, true, "quiet_field");
    assert.equal(readVisualPartsState(props).surfaceEnabled, true);
    props = applySurfaceMode(props, false);
    const state = readVisualPartsState(props);
    assert.equal(state.surfaceEnabled, false);
    assert.equal(state.surfaceTreatment, "off");
  });
});

describe("Visual Grammar — assembly reassembly parity", () => {
  it("captures and reconstructs recipe without Action mutation or diet ingredients", () => {
    const original = applyCuratedFamily(
      { actionType: "call", href: "tel:+15551112222", label: "Host Label" },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    const ingredients = curatedFamilyIngredientIds(CURATED_FAMILY_BRIGHT_LACQUER_ID)!;
    const recipe = captureAssemblyRecipe(original, {
      id: CURATED_FAMILY_BRIGHT_LACQUER_ID,
      label: "Bright Lacquer",
      ingredientPartIds: { family: CURATED_FAMILY_BRIGHT_LACQUER_ID, ...ingredients },
    });
    assert.equal(recipe.ingredientPartIds.rim, "rim_pounded_copper");
    assert.equal(recipe.anchors?.iconStationAnchor, "left_center");
    const check = reassemblyParityCheck(original, recipe);
    assert.equal(check.ok, true, check.missing.join(","));
    const rebuilt = applyAssemblyRecipeToProps({ actionType: "call", href: "tel:+15551112222" }, recipe);
    assert.equal(rebuilt.actionType, "call");
    assert.equal(readVisualPartsState(rebuilt).mountPartId, "mount_dark_plaque");
  });
});

describe("Visual Grammar — Icon Station scale/anchor + Brand Recipe", () => {
  it("scale and Brand Recipe preserve Action", () => {
    let props: Record<string, unknown> = { actionType: "call", href: "tel:+1" };
    props = applyCuratedFamily(props, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    props = applyIconStationScale(props, 0.9, "left_center");
    props = applyBrandRecipeToProps(props, "brand_recipe_tapit_primary_blue");
    props = applyColorRefinement(props, { richness: 0.8, depth: 0.6, lightResponse: 0.7 }, "button");
    assert.equal(props.actionType, "call");
    assert.equal(readVisualPartsState(props).iconStationScale, 0.9);
    assert.equal(readVisualPartsState(props).brandRecipeId, "brand_recipe_tapit_primary_blue");
    const refined = deriveFinishSurface("lacquer", "#155eef", { richness: 0.9, contrast: 0.8 });
    const plain = deriveFinishSurface("lacquer", "#155eef");
    assert.notEqual(refined.gradient, plain.gradient);
  });
});

describe("Visual Grammar — rails / auto-stack / viewport yield / environment seam", () => {
  it("auto-stacks unsafe two-column on narrow phone", () => {
    assert.equal(
      shouldAutoStackPhone({
        viewportWidthPx: 360,
        columns: 2,
        autoStackPhone: true,
      }),
      true
    );
    assert.equal(
      shouldAutoStackPhone({
        viewportWidthPx: 800,
        columns: 2,
        autoStackPhone: true,
      }),
      false
    );
  });

  it("viewport yield flags oversized Hero", () => {
    const obs = observeViewportYield({
      heroHeightPx: 520,
      dividerHeightPx: 40,
      actionCount: 1,
      viewportHeightPx: 800,
    });
    assert.ok(obs.notes.some((n) => /Hero/i.test(n)));
  });

  it("Brand Environment contract is architecture-only", () => {
    const env = emptyBrandEnvironment();
    assert.equal(isBrandEnvironmentContract(env), true);
    assert.equal(env.version, 1);
  });
});

describe("Visual Grammar — Mount + Bottom Stop + Electric Divider", () => {
  it("applies mount, bottom stop, and electric divider parts", () => {
    const mount = applyVisualPart({}, "mount_mission_control", { targetFamily: "button" });
    assert.equal(mount.ok, true);
    if (mount.ok) assert.equal(readVisualPartsState(mount.props).mountPartId, "mount_mission_control");
    const stop = applyVisualPart({}, "bottom_stop_minimal", { targetFamily: "container" });
    assert.equal(stop.ok, true);
    const divider = applyVisualPart({}, "divider_electric", { targetFamily: "divider" });
    assert.equal(divider.ok, true);
    if (divider.ok) {
      assert.equal(readVisualPartsState(divider.props).dividerLinePartId, "divider_electric");
      assert.equal(divider.props.vpDividerMotion, "energy_travel");
    }
  });
});
