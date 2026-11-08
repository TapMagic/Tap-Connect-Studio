import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileSignatureAuthoringState, createSignatureAssemblyAuthoringState, setSignatureAppearanceOption, setSignatureAppearanceColor, updateSignatureAction, setSignatureActionCount, setSignatureLayout, applySignatureAssemblyMutation } from "../signature-assets/authoring";
import { BRONZE_STANDARD_ASSETS, BRONZE_STANDARD_APPEARANCE, BRONZE_STANDARD_FAMILY_ID } from "../signature-assets/bronze-standard";
import { SIGNATURE_ASSEMBLY_RECIPES } from "../signature-assets/registry";
import { selectedStructuredAssembly } from "../reconstitution/signature-assembly-entry";
import { curatedMaterialSurface, curatedMaterialSurfaceStyle } from "../signature-assets/curated-material-projection";
import { curatedCommandPayloadToMutation, createCuratedAuthoringCapability } from "../reconstitution/curated-authoring-adapter";

const create = () => createSignatureAssemblyAuthoringState(BRONZE_STANDARD_FAMILY_ID, "standalone", { idFactory: () => "standard-action" })!;
function compile(state = create()) {
  const result = compileSignatureAuthoringState(state, { blockId: "standard-proof" });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("Compilation failed");
  return result.composition.block;
}

test("one Standard recipe retains one live action and one attached plug using verified native parts", () => {
  const recipes = SIGNATURE_ASSEMBLY_RECIPES.filter((recipe) => recipe.familyId === BRONZE_STANDARD_FAMILY_ID);
  assert.equal(recipes.length, 1);
  assert.equal(recipes[0].presentationMode, "standalone");
  assert.deepEqual(recipes[0].certificationLimits.launchCertifiedActionCounts, [1]);
  const block = compile();
  assert.equal(block.signatureAssembly?.input.actions[0].semanticIconRef?.canonicalId, "lucide:music-2");
  assert.equal(block.nodes.filter((node) => node.props.signatureClassification === "live-action").length, 1);
  assert.equal(block.nodes.filter((node) => node.props.signatureRole === "semantic-plug").length, 1);
  for (const asset of BRONZE_STANDARD_ASSETS.filter((asset) => !asset.referenceOnly)) {
    const bytes = readFileSync(`public${asset.sourceAsset}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sourceSha256);
    assert.match(bytes.toString(), /<svg/);
    assert.doesNotMatch(bytes.toString(), /<image|<text|data:image/i, "furniture must not bake in content or bitmap button art");
  }
});

test("all 36 body/plug combinations preserve actions, geometry and saved native inputs", () => {
  const initial = create();
  const original = compile(initial);
  for (const body of BRONZE_STANDARD_APPEARANCE.roles[0].options) {
    for (const plug of BRONZE_STANDARD_APPEARANCE.roles[1].options) {
      const state = setSignatureAppearanceOption(setSignatureAppearanceOption(initial, body.roleId, body.id), plug.roleId, plug.id);
      const block = compile(state);
      assert.deepEqual(state.input.actions, initial.input.actions);
      assert.deepEqual(block.nodes.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })), original.nodes.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })));
      const roles = block.nodes[0].props.signatureMaterialRoles as Record<string, { materialId: string }>;
      assert.equal(roles[body.roleId].materialId, body.materialProjection!.materialId);
      assert.equal(roles[plug.roleId].materialId, plug.materialProjection!.materialId);
      assert.deepEqual(compile(JSON.parse(JSON.stringify(block.signatureAssembly))).nodes, block.nodes);
    }
  }
});

test("independent custom pigments survive finish changes, reset independently and match preview", () => {
  const initial = create();
  let state = setSignatureAppearanceColor(initial, "text-bar-surface", "#510B0C");
  state = setSignatureAppearanceColor(state, "plug-surface", "#054653");
  state = setSignatureAppearanceOption(state, "plug-surface", "plug-surface-obsidian-satin");
  assert.deepEqual(state.appearance?.semanticColors, { "text-bar-surface": "#510b0c", "plug-surface": "#054653" });
  const block = compile(state);
  assert.deepEqual(compile(JSON.parse(JSON.stringify(block.signatureAssembly))).nodes, block.nodes);
  const descriptor = selectedStructuredAssembly([block], block.nodes[0])!;
  assert.ok(createCuratedAuthoringCapability(descriptor).commandIds.includes("curated.appearance.color"));
  const mutation = curatedCommandPayloadToMutation("curated.appearance.color", { controlId: "appearance-color:plug-surface", roleId: "plug-surface", value: "#063b25" }, descriptor);
  assert.deepEqual(mutation, { type: "set-appearance-color", roleId: "plug-surface", color: "#063b25" });
  assert.equal(applySignatureAssemblyMutation(block, mutation!).ok, true);
  assert.equal(descriptor.appearance.roles[1].colorPicker?.value, "#054653");
  assert.equal(descriptor.appearance.roles[1].preview, "material:mineral_obsidian_satin|#054653");
  const surface = curatedMaterialSurface("mineral_obsidian_satin", "#054653")!;
  assert.equal(curatedMaterialSurfaceStyle("mineral_obsidian_satin", "#054653")?.background, surface.background);
  assert.match(surface.background, /#054653/);
  state = setSignatureAppearanceColor(state, "plug-surface");
  assert.deepEqual(state.appearance?.semanticColors, { "text-bar-surface": "#510b0c" });
  assert.equal(setSignatureAppearanceColor(state, "accent", "#ffffff"), state, "hardware has no recolor contract");
  assert.equal(setSignatureAppearanceColor(state, "plug-surface", "url(bad)"), state);
  assert.deepEqual(state.input.actions, initial.input.actions);
});

test("clearing the optional sublabel retains one unchanged action binding and hides the sub-line", () => {
  const initial = create();
  const action = initial.input.actions[0];
  const blank = updateSignatureAction(initial, action.id, { label: "LISTEN", sublabel: "" });
  const block = compile(blank);
  assert.equal(blank.input.actions.length, 1);
  assert.equal(blank.input.actions[0].destination, action.destination);
  assert.equal(blank.input.actions[0].id, action.id);
  const rendered = block.nodes.find((node) => node.primitive === "button")!;
  assert.equal(rendered.props.description, "");
  assert.equal(rendered.props.showDescription, false);
});

test("incompatible count conversions block without changing any action; compatible conversion preserves them", () => {
  const initial = createSignatureAssemblyAuthoringState("cabinet-noir", "single-stack")!;
  const four = setSignatureActionCount(initial, 4);
  const result = compileSignatureAuthoringState(four);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(setSignatureLayout(four, "standalone"), four);
  const blocked = applySignatureAssemblyMutation(result.composition.block, { type: "set-layout", layoutMode: "standalone" });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.message, /4 actions.*Your actions were kept/);
  const standaloneId = SIGNATURE_ASSEMBLY_RECIPES.find((recipe) => recipe.familyId === "cabinet-noir" && recipe.presentationMode === "standalone")!;
  const blockedPresentation = applySignatureAssemblyMutation(result.composition.block, { type: "set-presentation", presentationId: standaloneId.presentation?.id ?? standaloneId.recipeId });
  assert.equal(blockedPresentation.ok, false);
  if (!blockedPresentation.ok) assert.match(blockedPresentation.message, /Your actions were kept/);
  assert.deepEqual(setSignatureLayout(four, "twin-rail").input.actions, four.input.actions);
  assert.equal(setSignatureLayout(initial, "twin-rail"), initial, "conversion cannot silently create actions either");
});
