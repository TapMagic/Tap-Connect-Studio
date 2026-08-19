import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultTapConnectCard, parseTapConnectCard } from "@/lib/brand/tap-card";
import { parseCreativeComposition } from "../composition";
import { CABINET_NOIR_ENTITLEMENT_KEY, CABINET_NOIR_FAMILY_ID } from "../signature-assets/cabinet-noir";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  listSignatureAuthoringFamilies,
  mergeSignatureAssemblyComposition,
  reorderSignatureAction,
  setSignatureActionCount,
  setSignatureComponentVariant,
  setSignatureDecorativeFurniture,
  setSignatureLayout,
  updateSignatureAction,
} from "../signature-assets/authoring";
import { adaptSignatureStandaloneComponent } from "../signature-assets/composition-adapter";
import { getSignatureAsset, signatureAssetInsert } from "../signature-assets/registry";

let id = 0;
const idFactory = () => `stable-${++id}`;
const create = (layout: "single-stack" | "twin-rail" = "single-stack") => {
  id = 0;
  const state = createSignatureAssemblyAuthoringState(CABINET_NOIR_FAMILY_ID, layout, { idFactory, identityContent: { src: "/brand.png", alt: "Brand" } });
  assert.ok(state);
  return state;
};

test("registry discovery exposes advanced family metadata and reference-only preview", () => {
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID);
  assert.ok(family);
  assert.equal(family.runtimeEligible, true);
  assert.equal(family.previewAsset?.referenceOnly, true);
  assert.deepEqual(family.layouts.map((layout) => layout.layoutMode), ["single-stack", "twin-rail"]);
  assert.equal(family.variants.length, 4);
  assert.equal(family.plugs.length, 24);
  assert.equal(family.informationalComponents.length, 1);
});

test("entitlement states are independently visible, selectable, and publishable", () => {
  const locked = listSignatureAuthoringFamilies().find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  const entitled = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  assert.deepEqual(locked.access, { visible: true, selectable: false, publishable: false });
  assert.deepEqual(entitled.access, { visible: true, selectable: true, publishable: true });
});

test("action-count choices expose launch certification only", () => {
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  assert.deepEqual(family.layouts[0].launchCertifiedActionCounts, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(family.layouts[1].launchCertifiedActionCounts, [2, 3, 4, 5, 6]);
  assert.deepEqual(family.layouts[1].structuralProofOnlyActionCounts, [7]);
  assert.equal(family.layouts[1].launchCertifiedActionCounts.includes(7), false);
});

test("single-stack add/remove preserves action identities and recompiles", () => {
  const initial = create();
  const four = setSignatureActionCount(initial, 4, idFactory);
  const two = setSignatureActionCount(four, 2, idFactory);
  assert.deepEqual(two.input.actions.map((action) => action.id), ["stable-1", "stable-2"]);
  assert.equal(compileSignatureAuthoringState(four).ok, true);
  assert.equal(compileSignatureAuthoringState(two).ok, true);
});

test("twin-rail transitions through odd and even counts deterministically", () => {
  const initial = create("twin-rail");
  for (const count of [3, 4, 5, 6]) {
    const state = setSignatureActionCount(initial, count, idFactory);
    const compiled = compileSignatureAuthoringState(state);
    assert.equal(compiled.ok, true);
    if (compiled.ok) assert.equal(compiled.composition.block.signatureAssembly?.input.requestedActionCount, count);
  }
  assert.equal(setSignatureActionCount(initial, 7, idFactory), initial);
});

test("layout changes use registered recipe metadata", () => {
  const single = setSignatureActionCount(create(), 4, idFactory);
  const twin = setSignatureLayout(single, "twin-rail", idFactory);
  assert.equal(twin.input.layoutMode, "twin-rail");
  assert.equal(twin.input.requestedActionCount, 4);
  assert.match(twin.input.recipeId, /twin-rail/);
});

test("reorder preserves action identity, content, destination, and plug", () => {
  let state = setSignatureActionCount(create(), 3, idFactory);
  state = updateSignatureAction(state, state.input.actions[1].id, { label: "Call", destination: "tel:+15551212", accessibilityLabel: "Call us", plugComponentId: "CN-013" });
  const moved = reorderSignatureAction(state, 1, 0);
  assert.deepEqual(moved.input.actions[0], state.input.actions[1]);
});

test("topper substitution preserves identity and assembly content", () => {
  const initial = setSignatureActionCount(create(), 3, idFactory);
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  const alternate = family.variants.at(-1)!;
  const changed = setSignatureComponentVariant(initial, alternate.role, alternate.componentId);
  assert.deepEqual(changed.identityContent, initial.identityContent);
  assert.deepEqual(changed.input.actions, initial.input.actions);
  assert.equal(changed.input.componentVariants?.[alternate.role], alternate.componentId);
  assert.equal(compileSignatureAuthoringState(changed).ok, true);
});

test("plug selection does not infer or replace destination authority", () => {
  const initial = create();
  const action = initial.input.actions[0];
  const changed = updateSignatureAction(initial, action.id, { plugComponentId: "CN-036" });
  assert.equal(changed.input.actions[0].destination, action.destination);
});

test("informational line is a non-action standalone live-content insertion", () => {
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  const asset = family.informationalComponents[0];
  const payload = signatureAssetInsert(asset);
  assert.equal(payload.initialProps.actionType, "none");
  assert.equal(payload.initialProps.informationalText, "");
  assert.equal(payload.initialProps.decorative, false);
  assert.equal("href" in payload.initialProps, false);
});

test("optional decorative termination never breaks structural closure", () => {
  const initial = setSignatureActionCount(create(), 6, idFactory);
  const on = setSignatureDecorativeFurniture(initial, "decorative-termination", true);
  const off = setSignatureDecorativeFurniture(on, "decorative-termination", false);
  const compiledOn = compileSignatureAuthoringState(on);
  const compiledOff = compileSignatureAuthoringState(off);
  assert.equal(compiledOn.ok, true);
  assert.equal(compiledOff.ok, true);
  if (compiledOn.ok && compiledOff.ok) assert.equal(compiledOn.composition.block.nodes.length, compiledOff.composition.block.nodes.length + 1);
});

test("save/reload preserves identical canonical input and deterministic plan", () => {
  const state = setSignatureDecorativeFurniture(setSignatureActionCount(create("twin-rail"), 5, idFactory), "decorative-termination", true);
  const first = compileSignatureAuthoringState(state);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const saved = JSON.parse(JSON.stringify(first.composition.block));
  const second = compileSignatureAuthoringState(saved.signatureAssembly);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.deepEqual(second.composition.block.signatureAssembly, first.composition.block.signatureAssembly);
  assert.deepEqual(second.composition.block.nodes, first.composition.block.nodes);
  const fallback = { businessName: "Signature proof" };
  const config = defaultTapConnectCard(fallback);
  config.rootComposition = first.composition.block;
  const parsed = parseTapConnectCard(JSON.parse(JSON.stringify(config)), fallback);
  assert.deepEqual(parsed.rootComposition?.signatureAssembly, state);
  assert.deepEqual(parseCreativeComposition(JSON.parse(JSON.stringify(first.composition.block)))?.signatureAssembly, state);
});

test("assembly recompilation preserves standalone root content and replaces prior furniture", () => {
  const first = compileSignatureAuthoringState(create(), { blockId: "signature-root" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const informational = adaptSignatureStandaloneComponent({
    familyId: CABINET_NOIR_FAMILY_ID,
    familyVersion: "1.0.0",
    componentId: "CN-011",
    componentVersion: "1.0.0",
    instanceId: "standalone-information",
    liveText: "Private appointments",
  });
  assert.ok(informational);
  const current = {
    ...first.composition.block,
    nodes: [...first.composition.block.nodes, informational.nodes[0]],
  };
  const nextState = setSignatureActionCount(first.composition.block.signatureAssembly!, 4, idFactory);
  const next = compileSignatureAuthoringState(nextState, { blockId: current.id });
  assert.equal(next.ok, true);
  if (!next.ok) return;
  const merged = mergeSignatureAssemblyComposition(current, next.composition.block);
  assert.equal(merged.nodes.filter((node) => node.id === "standalone-information").length, 1);
  assert.equal(merged.nodes.filter((node) => typeof node.props.signatureRecipeId === "string").length, next.composition.block.nodes.length);
  assert.deepEqual(merged.signatureAssembly, nextState);
});

test("adapter persists the stable action identity on live nodes", () => {
  const state = create();
  const compiled = compileSignatureAuthoringState(state);
  assert.equal(compiled.ok, true);
  if (compiled.ok) assert.equal(compiled.composition.block.nodes.find((node) => node.props.signatureActionId)?.props.signatureActionId, state.input.actions[0].id);
});

test("reference assets cannot become assembly authority", () => {
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  assert.equal(family.previewAsset?.referenceOnly, true);
  assert.equal(family.plugs.some((asset) => asset.referenceOnly), false);
});

test("legacy families degrade to their existing component libraries", () => {
  const legacy = listSignatureAuthoringFamilies().filter((entry) => entry.family.id !== CABINET_NOIR_FAMILY_ID);
  assert.ok(legacy.length >= 2);
  assert.ok(legacy.every((entry) => entry.layouts.length === 0 && entry.access.selectable));
});

test("locked discovery cannot create an assembly through the drawer contract", () => {
  const locked = listSignatureAuthoringFamilies().find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID)!;
  assert.equal(locked.access.selectable, false);
  const source = readFileSync("components/fusion/creative-studio/visual-parts-cabinet-panel.tsx", "utf8");
  assert.match(source, /disabled={!selectedSignatureFamily\.access\.selectable}/);
});

test("generic authoring implementation contains no family-specific branch", () => {
  const files = [
    "lib/fusion/creative-studio/signature-assets/authoring.ts",
    "components/fusion/creative-studio/signature-assembly-authoring-controls.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /cabinet[_-]?noir|CN-\d+/i);
  }
  assert.ok(getSignatureAsset("master/cabinet-noir/cn-011/v1"));
});
