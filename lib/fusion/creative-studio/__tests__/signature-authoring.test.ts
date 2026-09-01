import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultTapConnectCard, parseTapConnectCard } from "@/lib/brand/tap-card";
import { parseCreativeComposition } from "../composition";
import type { CreativeCompositionBlock } from "../composition";
import { CABINET_NOIR_ENTITLEMENT_KEY, CABINET_NOIR_FAMILY_ID } from "../signature-assets/cabinet-noir";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  applySignatureAssemblyMutation,
  listSignatureAuthoringFamilies,
  mergeSignatureAssemblyComposition,
  recompileSignatureAssemblyComposition,
  recompileSignatureAssemblyTree,
  reorderSignatureAction,
  setSignatureActionCount,
  setSignatureComponentVariant,
  setSignatureDecorativeFurniture,
  setSignatureLayout,
  updateSignatureAction,
  normalizeSignatureAssemblyAuthoringState,
} from "../signature-assets/authoring";
import { adaptSignatureStandaloneComponent } from "../signature-assets/composition-adapter";
import { getSignatureAsset, signatureAssetInsert } from "../signature-assets/registry";

let id = 0;
const idFactory = () => `stable-${++id}`;
const create = (layout: "standalone" | "single-stack" | "twin-rail" = "single-stack") => {
  id = 0;
  const state = createSignatureAssemblyAuthoringState(CABINET_NOIR_FAMILY_ID, layout, { idFactory, identityContent: { src: "/brand.png", alt: "Brand" } });
  assert.ok(state);
  return state;
};

test("standalone Cabinet Noir is one governed action without assembly furniture", () => {
  const state = create("standalone");
  const compiled = compileSignatureAuthoringState(state);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.equal(compiled.composition.block.signatureAssembly?.input.layoutMode, "standalone");
  assert.equal(compiled.composition.block.nodes.filter((node) => node.props.signatureClassification === "live-action").length, 1);
  assert.equal(compiled.composition.block.nodes.filter((node) => node.props.signatureClassification === "structural").length, 0);
});

test("registry discovery exposes advanced family metadata and reference-only preview", () => {
  const family = listSignatureAuthoringFamilies([CABINET_NOIR_ENTITLEMENT_KEY]).find((entry) => entry.family.id === CABINET_NOIR_FAMILY_ID);
  assert.ok(family);
  assert.equal(family.runtimeEligible, true);
  assert.equal(family.previewAsset?.referenceOnly, true);
  assert.deepEqual(family.layouts.map((layout) => layout.layoutMode), ["standalone", "single-stack", "twin-rail"]);
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
  assert.deepEqual(family.layouts.find((layout) => layout.layoutMode === "standalone")?.launchCertifiedActionCounts, [1]);
  assert.deepEqual(family.layouts.find((layout) => layout.layoutMode === "single-stack")?.launchCertifiedActionCounts, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(family.layouts.find((layout) => layout.layoutMode === "twin-rail")?.launchCertifiedActionCounts, [2, 3, 4, 5, 6]);
  assert.deepEqual(family.layouts.find((layout) => layout.layoutMode === "twin-rail")?.structuralProofOnlyActionCounts, [7]);
});

test("single-stack add/remove preserves action identities and recompiles", () => {
  const initial = create();
  const four = setSignatureActionCount(initial, 4, idFactory);
  const two = setSignatureActionCount(four, 2, idFactory);
  assert.deepEqual(two.input.actions.map((action) => action.id), ["stable-1", "stable-2"]);
  assert.equal(compileSignatureAuthoringState(four).ok, true);
  assert.equal(compileSignatureAuthoringState(two).ok, true);
});

test("Curated action copy removes only sloppy punctuation spacing", () => {
  const state = create();
  const action = state.input.actions[0];
  const updated = updateSignatureAction(state, action.id, {
    label: "  Call Us !  ",
    accessibilityLabel: "  Call Us !  ",
  });
  assert.equal(updated.input.actions[0].label, "Call Us!");
  assert.equal(updated.input.actions[0].accessibilityLabel, "Call Us!");
  const compiled = compileSignatureAuthoringState({
    ...state,
    input: { ...state.input, actions: [{ ...action, label: "Call Us !", accessibilityLabel: "Call Us !" }] },
  });
  assert.equal(compiled.ok, true);
  if (compiled.ok) {
    assert.equal(compiled.composition.block.signatureAssembly?.input.actions[0].label, "Call Us!");
    assert.equal(compiled.composition.block.nodes.find((node)=>node.props.signatureClassification==="live-action")?.props.label, "Call Us!");
  }
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
  let state: ReturnType<typeof create> = setSignatureDecorativeFurniture(setSignatureActionCount(create("twin-rail"), 5, idFactory), "decorative-termination", true);
  state = updateSignatureAction(state, state.input.actions[0].id, { textAlign: "right", textSize: "large" });
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
  assert.equal(state.appearance?.contractId, "cabinetNoirAppearance@1.0.0");
  assert.equal(state.appearance?.contractVersion, "1.0.0");
  assert.equal(Object.keys(state.appearance?.semanticOptionIds || {}).length, 6);
  assert.deepEqual(state.textTreatment, { contractId: "cabinetNoirTextTreatment@1.0.0", contractVersion: "1.0.0", requested: "raised" });
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

test("saved canonical inputs reconstitute corrected Curated furniture without migration", () => {
  let state = setSignatureActionCount(create(), 4, idFactory);
  state = updateSignatureAction(state, state.input.actions[0].id, {
    label: "Call the studio",
    actionType: "call",
    destination: "tel:+13526205901",
    plugComponentId: "CN-013",
  });
  const compiled = compileSignatureAuthoringState(state, { blockId: "saved-curated-system" });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const standalone = adaptSignatureStandaloneComponent({
    familyId: CABINET_NOIR_FAMILY_ID,
    familyVersion: "1.0.0",
    componentId: "CN-011",
    componentVersion: "1.0.0",
    instanceId: "preserved-independent-object",
    liveText: "Private appointments",
  });
  assert.ok(standalone);
  const canonicalBefore = structuredClone(compiled.composition.block.signatureAssembly);
  const staleProjection = {
    ...compiled.composition.block,
    nodes: [
      ...compiled.composition.block.nodes.filter((node) => !(
        node.props.signatureRole === "single-stack-repeat-rails"
        && node.props.signatureRepeatIndex === 0
      )),
      standalone.nodes[0],
    ],
  };
  assert.equal(staleProjection.nodes.filter((node) => node.props.signatureRole === "single-stack-repeat-rails").length, 3);

  const reconstituted = recompileSignatureAssemblyComposition(staleProjection);
  assert.deepEqual(reconstituted.signatureAssembly, canonicalBefore);
  assert.equal(reconstituted.nodes.filter((node) => node.props.signatureRole === "single-stack-repeat-rails").length, 4);
  assert.ok(reconstituted.nodes.some((node) => node.props.signatureRole === "single-stack-repeat-rails" && node.props.signatureRepeatIndex === 0));
  assert.equal(reconstituted.nodes.filter((node) => node.id === "preserved-independent-object").length, 1);
  const call = reconstituted.signatureAssembly!.input.actions[0];
  assert.equal(call.label, "Call the studio");
  assert.equal(call.destination, "tel:+13526205901");
  assert.equal(call.plugComponentId, "CN-013");
});

test("adapter persists the stable action identity on live nodes", () => {
  const state = create();
  const compiled = compileSignatureAuthoringState(state);
  assert.equal(compiled.ok, true);
  if (compiled.ok) assert.equal(compiled.composition.block.nodes.find((node) => node.props.signatureActionId)?.props.signatureActionId, state.input.actions[0].id);
});

test("Curated mutation recompiles certified output while preserving canonical action identity and tel semantics", () => {
  const first = compileSignatureAuthoringState(setSignatureActionCount(create("twin-rail"), 3, idFactory), { blockId: "curated-mutation" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const actionId = first.composition.block.signatureAssembly!.input.actions[1].id;
  const updated = applySignatureAssemblyMutation(first.composition.block, {
    type: "update-action",
    actionId,
    patch: {
      label: "Call the studio",
      actionType: "call",
      destination: "tel:+13525550123",
      accessibilityLabel: "Call the studio",
      plugComponentId: "CN-013",
    },
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  const canonical = updated.block.signatureAssembly!.input.actions.find((action) => action.id === actionId)!;
  const rendered = updated.block.nodes.find((node) => node.props.signatureActionId === actionId)!;
  assert.equal(canonical.id, actionId);
  assert.equal(canonical.destination, "tel:+13525550123");
  assert.equal(rendered.props.actionType, "call");
  assert.equal(rendered.props.href, "tel:+13525550123");
  assert.equal(updated.block.nodes.every((node) => node.locked), true);
});

test("shared authoring commands persist provenance and layout through canonical assembly state", () => {
  const first = compileSignatureAuthoringState(create("single-stack"), { blockId: "curated-command" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const updated = applySignatureAssemblyMutation(first.composition.block, {
    type: "set-layout",
    layoutMode: "twin-rail",
    commandId: "curated.layout.set",
    provenance: "host",
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(updated.block.signatureAssembly?.input.layoutMode, "twin-rail");
  assert.deepEqual(updated.block.signatureAssembly?.lastAuthoringCommand, { commandId: "curated.layout.set", provenance: "host" });
  assert.equal(updated.block.nodes.every((node) => node.props.signatureRecipeId === "cabinet-noir-twin-rail"), true);
});

test("semantic identity replacement, removal, and layout changes preserve canonical Curated state", () => {
  const first = compileSignatureAuthoringState(create("single-stack"), { blockId: "curated-identity" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const replacement = { src: "/selected-logo.png", alt: "Selected identity", assetId: "asset-selected", source: "upload" as const, provenance: "host-selected" as const, visual: { intrinsicWidth: 1200, intrinsicHeight: 600, visibleBounds: { x: .1, y: .2, width: .8, height: .6 }, boundsSource: "asset-metadata" as const, compatibility: "compatible" as const, fitMode: "visible-contain" as const, crop: { zoom: 1.36, offsetX: .08, offsetY: -.04 } } };
  const changed = applySignatureAssemblyMutation(first.composition.block, { type: "set-resource-slot", slotId: "identity", resource: replacement, commandId: "curated.resource-slot.set", provenance: "host" });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.deepEqual(changed.block.signatureAssembly?.identityContent, replacement);
  const standalone = applySignatureAssemblyMutation(changed.block, { type: "set-layout", layoutMode: "standalone" });
  assert.equal(standalone.ok, true);
  if (!standalone.ok) return;
  assert.deepEqual(standalone.block.signatureAssembly?.identityContent, replacement, "hidden Standalone identity remains canonical");
  const twin = applySignatureAssemblyMutation(standalone.block, { type: "set-layout", layoutMode: "twin-rail" });
  assert.equal(twin.ok, true);
  if (!twin.ok) return;
  assert.deepEqual(twin.block.signatureAssembly?.identityContent, replacement);
  assert.ok(twin.block.nodes.some((node) => node.props.identityContentUrl === replacement.src));
  assert.ok(twin.block.nodes.some((node) => JSON.stringify(node.props.identityResourceVisual) === JSON.stringify(replacement.visual)), "renderer receives the exact committed crop treatment");
  const saved = JSON.parse(JSON.stringify(twin.block));
  assert.deepEqual(saved.signatureAssembly.identityContent, replacement);
  const removed = applySignatureAssemblyMutation(twin.block, { type: "set-resource-slot", slotId: "identity" });
  assert.equal(removed.ok, true);
  if (removed.ok) assert.equal(removed.block.signatureAssembly?.identityContent, undefined);
});

test("canonical Curated mutation rejects unsafe phone-scale label and size combinations", () => {
  const first = compileSignatureAuthoringState(create(), { blockId: "curated-copy-constraint" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const actionId = first.composition.block.signatureAssembly!.input.actions[0].id;
  const rejected = applySignatureAssemblyMutation(first.composition.block, {
    type: "update-action",
    actionId,
    patch: { label: "This label is too long for large", textSize: "large" },
    commandId: "curated.action.update",
    provenance: "tapit",
  });
  assert.deepEqual(rejected, { ok: false, message: "Shorten this label to 15 characters or fewer for large text." });
});

test("presentation-specific precision accepts safe steps and rejects range overflow", () => {
  const cases = [
    { layout: "standalone" as const, min: 12, max: 18, step: 12.5 },
    { layout: "single-stack" as const, min: 12, max: 17, step: 12.5 },
    { layout: "twin-rail" as const, min: 11, max: 15, step: 11.5 },
  ];
  for (const entry of cases) {
    const compiled = compileSignatureAuthoringState(create(entry.layout), { blockId: `precision-${entry.layout}` });
    assert.equal(compiled.ok, true);
    if (!compiled.ok) continue;
    const actionId = compiled.composition.block.signatureAssembly!.input.actions[0].id;
    for (const px of [entry.min, entry.step, entry.max]) {
      const updated = applySignatureAssemblyMutation(compiled.composition.block, { type: "update-action", actionId, patch: { textSizePx: px } });
      assert.equal(updated.ok, true, `${entry.layout} should accept ${px}px`);
      if (updated.ok) {
        assert.equal(updated.block.signatureAssembly!.input.actions[0].textSizePx, px);
        assert.equal(updated.block.nodes.find((node) => node.props.signatureActionId === actionId)?.props.signatureTextSizePx, px);
      }
    }
    assert.equal(applySignatureAssemblyMutation(compiled.composition.block, { type: "update-action", actionId, patch: { textSizePx: entry.min - .5 } }).ok, false);
    assert.equal(applySignatureAssemblyMutation(compiled.composition.block, { type: "update-action", actionId, patch: { textSizePx: entry.max + .5 } }).ok, false);
  }
});

test("fresh, reset, save/reload, and layout changes share one typography authority in every layout", () => {
  const defaults = { standalone: 14, "single-stack": 14, "twin-rail": 13 } as const;
  for (const layout of Object.keys(defaults) as Array<keyof typeof defaults>) {
    const fresh = create(layout);
    const actionId = fresh.input.actions[0].id;
    assert.equal(fresh.input.actions[0].textSizePx, defaults[layout], `${layout} initializes to its certified default`);
    const initial = compileSignatureAuthoringState(fresh, { blockId: `normalized-type-${layout}` });
    assert.equal(initial.ok, true);
    if (!initial.ok) continue;
    const initialNode = initial.composition.block.nodes.find((node) => node.props.signatureActionId === actionId)!;
    const initialGeometry = { x: initialNode.x, y: initialNode.y, width: initialNode.width, height: initialNode.height, px: initialNode.props.signatureTextSizePx };

    const changed = applySignatureAssemblyMutation(initial.composition.block, { type: "update-action", actionId, patch: { textSizePx: defaults[layout] === 13 ? 14 : 15 } });
    assert.equal(changed.ok, true);
    if (!changed.ok) continue;
    const reset = applySignatureAssemblyMutation(changed.block, { type: "update-action", actionId, patch: { textSizePx: defaults[layout] } });
    assert.equal(reset.ok, true);
    if (!reset.ok) continue;
    const resetNode = reset.block.nodes.find((node) => node.props.signatureActionId === actionId)!;
    assert.deepEqual({ x: resetNode.x, y: resetNode.y, width: resetNode.width, height: resetNode.height, px: resetNode.props.signatureTextSizePx }, initialGeometry, `${layout} Reset reproduces initial geometry exactly`);

    const saved = JSON.parse(JSON.stringify(reset.block.signatureAssembly));
    const reloaded = compileSignatureAuthoringState(saved, { blockId: `normalized-type-${layout}` });
    assert.equal(reloaded.ok, true);
    if (reloaded.ok) {
      const node = reloaded.composition.block.nodes.find((candidate) => candidate.props.signatureActionId === actionId)!;
      assert.deepEqual({ x: node.x, y: node.y, width: node.width, height: node.height, px: node.props.signatureTextSizePx }, initialGeometry, `${layout} save/reload preserves applied geometry`);
    }

    const legacy = structuredClone(fresh);
    delete legacy.input.actions[0].textSizePx;
    assert.equal(normalizeSignatureAssemblyAuthoringState(legacy).input.actions[0].textSizePx, defaults[layout], `${layout} legacy state normalizes through the same default`);
  }

  const preserved = updateSignatureAction(create("single-stack"), "stable-1", { textSizePx: 15 });
  assert.equal(setSignatureLayout(preserved, "twin-rail", idFactory).input.actions[0].textSizePx, 15, "valid authored size survives a layout change");
  const oversized = updateSignatureAction(create("standalone"), "stable-1", { textSizePx: 18 });
  assert.equal(setSignatureLayout(oversized, "twin-rail", idFactory).input.actions[0].textSizePx, 15, "invalid authored size clamps to the new certified range");
});

test("representative Website, Call, Directions, Reviews, and social plugs preserve canonical identity through compile and reload", () => {
  for (const componentId of ["CN-013", "CN-014", "CN-015", "CN-016", "CN-026"]) {
    const state = create("single-stack");
    const actionId = state.input.actions[0].id;
    const selected = updateSignatureAction(state, actionId, { plugComponentId: componentId });
    const compiled = compileSignatureAuthoringState(selected, { blockId: `plug-parity-${componentId}` });
    assert.equal(compiled.ok, true);
    if (!compiled.ok) continue;
    const plug = compiled.composition.block.nodes.find((node) => node.props.signatureRole === "semantic-plug")!;
    assert.equal(plug.props.signatureComponentId, componentId);
    assert.equal(compiled.composition.block.signatureAssembly?.input.actions[0].plugComponentId, componentId);
    const reloaded = compileSignatureAuthoringState(JSON.parse(JSON.stringify(compiled.composition.block.signatureAssembly)), { blockId: `plug-parity-${componentId}` });
    assert.equal(reloaded.ok, true);
    if (reloaded.ok) {
      const reloadedPlug = reloaded.composition.block.nodes.find((node) => node.props.signatureRole === "semantic-plug")!;
      assert.equal(reloadedPlug.props.signatureComponentId, componentId);
      assert.equal(reloadedPlug.props.src, plug.props.src);
      assert.deepEqual(reloadedPlug.props.signatureAppearanceOptionIds, plug.props.signatureAppearanceOptionIds);
    }
  }
});

test("canonical appearance and plug treatment metadata survive compile and reload", () => {
  const state = create("single-stack");
  const first = compileSignatureAuthoringState(state, { blockId: "appearance-parity" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const plug = first.composition.block.nodes.find((node) => node.props.signatureRole === "semantic-plug")!;
  assert.equal(plug.props.signatureComponentId, state.input.actions[0].plugComponentId);
  assert.equal(plug.props.signatureDepthTreatment, "raised-contact");
  assert.equal(plug.props.signatureAppearanceContractId, "cabinetNoirAppearance@1.0.0");
  assert.equal((plug.props.signatureAppearanceOptionIds as Record<string, string>)["plug-face"], "cabinet-noir-plug-face-certified-source@1.0.0");
  assert.equal((plug.props.signatureAppearanceRendererValues as Record<string, string>)["plug-face"], "certified-source");
  assert.equal(plug.props.signatureTextTreatmentRecipe, "raised-enamel");

  assert.equal(applySignatureAssemblyMutation(first.composition.block, { type: "set-appearance-option", roleId: "plug-face", optionId: "invented-brass" }).ok, false);

  const reloaded = compileSignatureAuthoringState(first.composition.block.signatureAssembly!, { blockId: "appearance-parity" });
  assert.equal(reloaded.ok, true);
  if (!reloaded.ok) return;
  const reloadedPlug = reloaded.composition.block.nodes.find((node) => node.props.signatureRole === "semantic-plug")!;
  assert.equal(reloadedPlug.props.src, plug.props.src);
  assert.deepEqual(reloadedPlug.props.signatureAppearanceOptionIds, plug.props.signatureAppearanceOptionIds);
  assert.deepEqual(reloadedPlug.props.signatureAppearanceRendererValues, plug.props.signatureAppearanceRendererValues);
});

test("runtime recompilation repairs nested Curated projections, not only the Card root", () => {
  const compiled = compileSignatureAuthoringState(create("single-stack"), { blockId: "nested-curated" });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  const staleNested = structuredClone(compiled.composition.block);
  staleNested.nodes.forEach((node) => {
    delete node.props.signatureAppearanceContractId;
    delete node.props.signatureAppearanceOptionIds;
  });
  const root = {
    version: 1,
    id: "card-root",
    label: "Card root",
    nodes: [{ id: "host", primitive: "frame", x: 0, y: 0, width: 1, height: 1, zIndex: 1, name: "Curated host", locked: false, visible: true, anchor: "top-left", props: {}, moduleComposition: staleNested }],
    background: { kind: "none" },
    mobileFallback: "scale",
  } as CreativeCompositionBlock;
  const repaired = recompileSignatureAssemblyTree(root);
  const repairedPlug = repaired.nodes[0].moduleComposition?.nodes.find((node) => node.props.signatureRole === "semantic-plug");
  assert.equal(repairedPlug?.props.signatureAppearanceContractId, "cabinetNoirAppearance@1.0.0");
  assert.equal((repairedPlug?.props.signatureAppearanceOptionIds as Record<string, string>)["plug-face"], "cabinet-noir-plug-face-certified-source@1.0.0");
});

test("historic injected Cabinet Noir black host self-corrects during recompilation", () => {
  const compiled = compileSignatureAuthoringState(create("twin-rail"), { blockId: "historic-black-host", background: "#030303" });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;
  assert.deepEqual(recompileSignatureAssemblyComposition(compiled.composition.block).background, { kind: "none" });
});

test("Curated count and reorder mutations preserve recipe authority in one compiled block", () => {
  const first = compileSignatureAuthoringState(create("single-stack"), { blockId: "curated-count" });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const grown = applySignatureAssemblyMutation(first.composition.block, { type: "set-action-count", count: 4 });
  assert.equal(grown.ok, true);
  if (!grown.ok) return;
  const before = grown.block.signatureAssembly!.input.actions.map((action) => action.id);
  const reordered = applySignatureAssemblyMutation(grown.block, { type: "reorder-action", from: 3, to: 0 });
  assert.equal(reordered.ok, true);
  if (!reordered.ok) return;
  assert.equal(reordered.block.signatureAssembly!.input.actions[0].id, before[3]);
  assert.equal(reordered.block.nodes.some((node) => node.props.signatureRecipeId === undefined), false);
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
