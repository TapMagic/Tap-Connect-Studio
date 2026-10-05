import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createStudioAuthoringCommand,
  createStudioAuthoringRegistry,
  validateStudioAuthoringCommand,
} from "../platform/authoring-contract";
import { compatibleFamilyAppearanceOptions, resolveDeterministicTextTreatment, validateFamilyAppearanceSelection, type FamilyAppearanceContract } from "../platform/family-appearance";
import { CABINET_NOIR_APPEARANCE_CONTRACT, CABINET_NOIR_TEXT_TREATMENT_CONTRACT } from "../signature-assets/cabinet-noir-appearance";
import { createCuratedAuthoringCapability, curatedAuthoringSelection, curatedCommandPayloadToMutation } from "../reconstitution/curated-authoring-adapter";
import type { StudioStructuredAssemblyDescriptor } from "../platform/structured-assembly";
import { SYNTHETIC_GOVERNED_AUTHORING } from "./fixtures/synthetic-governed-authoring";
import { createIdentityVisualResourceFitContract, createStudioSemanticResourceSlot } from "../platform/semantic-resource-slot";
import { auditStudioAuthoringCompleteness } from "../platform/authoring-completeness";

const assembly: StudioStructuredAssemblyDescriptor = {
  contractId: "studioCuratedAssembly@1.0.0",
  adapterAuthority: "signatureAssemblyAuthoring@1.0.0",
  familyId: "cabinet-noir",
  familyLabel: "Cabinet Noir",
  objectId: "cn-object",
  layoutMode: "single-stack",
  recipeId: "cabinet-noir-single-stack",
  recipeVersion: "1.0.0",
  recipeLabel: "Single Stack",
  inputCount: 1,
  slots: [{ id: "action-1", label: "Call us", destination: "tel:+13526205901", actionType: "call", accessibleName: "Call us", plugComponentId: "CN-013", plugLabel: "Call / Phone", plugPreviewSrc: "/call.png", textAlign: "center", textSize: "medium", contentType: "action", required: true, order: 0 }],
  resourceSlots: [createStudioSemanticResourceSlot({ id: "identity", label: "Crown identity", semanticRole: "identity", acceptedKinds: ["logo", "image"], required: false, applicable: true, value: { src: "/brand.png", alt: "Brand", source: "brand", provenance: "brand" }, defaultValue: { src: "/brand.png", alt: "Brand", source: "brand", provenance: "brand" }, presentation: { ownership: "governed", fit: "contain", visualFit: createIdentityVisualResourceFitContract() }, operations: ["choose", "replace", "remove", "reset", "adjust"] })],
  allowedActionCounts: [1, 2, 3],
  layouts: [{ id: "single-stack", label: "Single Stack", description: "Stack", allowedActionCounts: [1, 2, 3] }, { id: "twin-rail", label: "Twin Rail", description: "Rails", allowedActionCounts: [2, 3] }],
  textSizes: [{ id: "small", label: "Small", phonePx: 12, recommendedCharacterCount: 26 }, { id: "medium", label: "Medium", phonePx: 14, recommendedCharacterCount: 20 }, { id: "large", label: "Large", phonePx: 17, recommendedCharacterCount: 15 }],
  appearance: { contractId: CABINET_NOIR_APPEARANCE_CONTRACT.id, contractVersion: CABINET_NOIR_APPEARANCE_CONTRACT.version, roles: [{ id: "structural-metal", label: "Certified finish", value: "champagne", optionLabel: "Champagne gold", preview: "#b68e49", governed: true, options: [{ id: "champagne", label: "Champagne gold", preview: "#b68e49", rendererValue: "champagne", availability: "enabled" }] }], textTreatmentLabel: "Raised enamel" },
  compatiblePlugs: [{ componentId: "CN-013", label: "Call / Phone", previewSrc: "/call.png", previewAlt: "Call plug" }],
  outputOwnership: "recipe-governed",
  compiler: "deterministic",
  mutationReadiness: "ready",
  preservedAuthorities: ["content identity", "entitlement"],
};

test("registry accepts a second governed family without shell changes", () => {
  const registry = createStudioAuthoringRegistry();
  const cabinet = registry.register(createCuratedAuthoringCapability(assembly));
  registry.register(SYNTHETIC_GOVERNED_AUTHORING);
  assert.equal(registry.list().length, 2);
  assert.equal(registry.resolve({ kind: "curated-system", familyId: "cabinet-noir" }), cabinet);
  assert.equal(registry.resolve({ kind: "curated-system", familyId: "test-only-orbit" }), SYNTHETIC_GOVERNED_AUTHORING);
  assert.notDeepEqual(cabinet.groups.map((group) => group.id), SYNTHETIC_GOVERNED_AUTHORING.groups.map((group) => group.id));
});

test("shared shell presentation contains no family-name branching", () => {
  const source = readFileSync(path.join(process.cwd(), "components/fusion/card/reconstitution/studio-authoring-shell.tsx"), "utf8");
  assert.doesNotMatch(source, /cabinet[_ -]?noir|arc[_ -]?ember|familyId\s*===/i);
  assert.match(source, /visual-layout/);
  assert.match(source, /visual-grid/);
});

test("selection context distinguishes Module and Module Internal", () => {
  const moduleSelection = curatedAuthoringSelection(assembly, "node-1");
  const internal = curatedAuthoringSelection(assembly, "node-1", "action-1");
  assert.equal(moduleSelection.level, "module");
  assert.equal(internal.level, "module-internal");
  assert.equal(internal.internalId, "action-1");
  assert.equal(internal.governance, "curated");
});

test("Host and tApIt share typed commands with provenance and policy", () => {
  const capability = createCuratedAuthoringCapability(assembly, "action-1");
  const target = curatedAuthoringSelection(assembly, "node-1", "action-1");
  const host = createStudioAuthoringCommand(capability, { commandId: "curated.action.update", target, payload: { controlId: "label", value: "Call now", actionId: "action-1" }, historyLabel: "Edited label", provenance: "host" });
  const tapit = createStudioAuthoringCommand(capability, { commandId: "curated.action.update", target, payload: { controlId: "plug", value: "CN-013", actionId: "action-1" }, historyLabel: "Suggested compatible plug", provenance: "tapit" });
  assert.deepEqual(validateStudioAuthoringCommand(capability, host), { ok: true });
  assert.deepEqual(validateStudioAuthoringCommand(capability, tapit), { ok: true });
  assert.equal(host.provenance, "host");
  assert.equal(tapit.provenance, "tapit");
  assert.deepEqual(curatedCommandPayloadToMutation(host.commandId, host.payload, assembly), { type: "update-action", actionId: "action-1", patch: { label: "Call now" } });
  assert.throws(() => createStudioAuthoringCommand(capability, { commandId: "curated.layout.set", target, payload: {}, historyLabel: "No", provenance: "tapit" }));
});

test("declared Curated identity is reachable through one shared asset-slot command", () => {
  const capability = createCuratedAuthoringCapability(assembly);
  const control = capability.groups.flatMap((group) => group.controls).find((candidate) => candidate.id === "resource-slot:identity");
  assert.equal(control?.type, "asset-slot");
  assert.equal(control?.type === "asset-slot" ? control.slot.value?.src : undefined, "/brand.png");
  assert.deepEqual(auditStudioAuthoringCompleteness(capability.capabilityDeclarations ?? [], capability), []);
  const replacement = { src: "/upload.png", alt: "New identity", assetId: "asset-1", source: "upload" as const, provenance: "host-selected" as const };
  assert.deepEqual(curatedCommandPayloadToMutation("curated.resource-slot.set", { controlId: "resource-slot:identity", slotId: "identity", resource: replacement }, assembly), { type: "set-resource-slot", slotId: "identity", resource: replacement });
  assert.deepEqual(curatedCommandPayloadToMutation("curated.resource-slot.set", { controlId: "resource-slot:identity", slotId: "identity" }, assembly), { type: "set-resource-slot", slotId: "identity" });
});

test("completeness invariant rejects renderer support without reachable authoring", () => {
  const capability = createCuratedAuthoringCapability({ ...assembly, resourceSlots: [] });
  const broken = [{
    contractId: "studioAuthoringCompleteness@1.0.0" as const,
    id: "orphaned.identity", label: "Orphaned identity", classification: "editable-reachable" as const, applicable: true,
    stateAuthority: "state", compilerAuthority: "compiler", rendererAuthority: "renderer", persistenceAuthority: "persistence", validationAuthority: "validation", historyAuthority: "history",
    controlId: "resource-slot:identity", commandId: "curated.resource-slot.set", parityAuthorities: ["canvas", "preview", "public", "live-device"] as const,
  }];
  assert.ok(auditStudioAuthoringCompleteness(broken, capability).some((issue) => issue.code === "unreachable-control"));
});

test("family appearance accepts only the certified Cabinet Noir state", () => {
  const finish = CABINET_NOIR_APPEARANCE_CONTRACT.roles[0].options[0].id;
  const certified = Object.values(CABINET_NOIR_APPEARANCE_CONTRACT.defaults);
  assert.deepEqual(validateFamilyAppearanceSelection(CABINET_NOIR_APPEARANCE_CONTRACT, certified), { ok: true, combinationId: "cabinet-noir-original-finish" });
  assert.equal(validateFamilyAppearanceSelection(CABINET_NOIR_APPEARANCE_CONTRACT, ["invented-brass"]).ok, false);
  assert.equal(CABINET_NOIR_APPEARANCE_CONTRACT.migration.unknownOption, "preserve-read-only");
  assert.deepEqual(CABINET_NOIR_APPEARANCE_CONTRACT.roles.map((role) => role.id), ["structural-metal", "body-surface", "plug-face", "plug-base", "text", "accent"]);
  assert.equal(CABINET_NOIR_APPEARANCE_CONTRACT.roles.every((role) => role.options.length === 1 && role.options[0].certified), true);
});

test("shared Appearance controls register future certified choices without family-specific UI", () => {
  const future: FamilyAppearanceContract = {
    contractId: "familyAppearance@1.0.0",
    id: "testAppearance@1.0.0",
    version: "1.0.0",
    familyId: "test-family",
    roles: [
      { id: "body-surface", label: "Body", options: [
        { id: "black", label: "Black", roleId: "body-surface", preview: "#000", rendererValue: "surface:black", certified: true },
        { id: "ivory", label: "Ivory", roleId: "body-surface", preview: "#fff", rendererValue: "surface:ivory", certified: true },
      ] },
      { id: "text", label: "Text", options: [
        { id: "white", label: "White", roleId: "text", preview: "#fff", rendererValue: "text:white", certified: true },
        { id: "black-text", label: "Black", roleId: "text", preview: "#000", rendererValue: "text:black", certified: true },
      ] },
    ],
    defaults: { "body-surface": "black", text: "white" },
    certifiedCombinations: [
      { id: "dark", optionIds: ["black", "white"], recommended: true },
      { id: "light", optionIds: ["ivory", "black-text"] },
    ],
    accessibilityRules: [{ id: "contrast", description: "Only certified contrast pairs." }],
    migration: { unknownOption: "preserve-read-only", invalidExplicitChoice: "block-with-reason" },
  };
  const bodyOptions = compatibleFamilyAppearanceOptions(future, future.defaults, "body-surface");
  assert.equal(bodyOptions.find((option) => option.id === "black")?.availability, "enabled");
  assert.equal(bodyOptions.find((option) => option.id === "black")?.recommended, true);
  assert.equal(bodyOptions.find((option) => option.id === "ivory")?.availability, "disabled", "invalid text/body pair is disabled before mutation");

  const configurable: StudioStructuredAssemblyDescriptor = {
    ...assembly,
    appearance: {
      contractId: future.id,
      contractVersion: future.version,
      roles: [{
        id: "body-surface", label: "Body", value: "black", optionLabel: "Black", preview: "#000", governed: false,
        options: [
          { id: "black", label: "Black", preview: "#000", rendererValue: "surface:black", availability: "enabled", recommended: true },
          { id: "ivory", label: "Ivory", preview: "#fff", rendererValue: "surface:ivory", availability: "disabled", disabledReason: "Choose compatible text first." },
        ],
      }],
    },
  };
  const capability = createCuratedAuthoringCapability(configurable);
  const control = capability.groups.flatMap((group) => group.controls).find((candidate) => candidate.id === "appearance:body-surface");
  assert.equal(control?.type, "visual-grid");
  assert.equal(control?.type === "visual-grid" ? control.options[1].availability : undefined, "disabled");
  assert.deepEqual(curatedCommandPayloadToMutation("curated.appearance.set", { controlId: "appearance:body-surface", roleId: "body-surface", value: "black" }, configurable), { type: "set-appearance-option", roleId: "body-surface", optionId: "black" });
  assert.equal(curatedCommandPayloadToMutation("curated.appearance.set", { controlId: "appearance:body-surface", roleId: "body-surface", value: "ivory" }, configurable), null);
  const shellSource = readFileSync(path.join(process.cwd(), "components/fusion/card/reconstitution/studio-authoring-shell.tsx"), "utf8");
  assert.doesNotMatch(shellSource, /test-family|body-surface\s*===/);
  assert.match(shellSource, /option\.metadata\?\.roleId/, "the shared Visual Grid must forward its declared appearance role through the command payload");
});

test("uncertified treatment and Auto remain unavailable deterministically", () => {
  const input = { appearanceOptionIds: [CABINET_NOIR_APPEARANCE_CONTRACT.roles[0].options[0].id], roleId: "text", sizeId: "medium" as const, rendererVersion: "1.0.0" };
  assert.deepEqual(resolveDeterministicTextTreatment(CABINET_NOIR_TEXT_TREATMENT_CONTRACT, "raised", input), { ok: true, treatmentId: "raised" });
  assert.equal(resolveDeterministicTextTreatment(CABINET_NOIR_TEXT_TREATMENT_CONTRACT, "engraved", input).ok, false);
  assert.equal(resolveDeterministicTextTreatment(CABINET_NOIR_TEXT_TREATMENT_CONTRACT, "auto", input).ok, false);
});

test("numeric size authority preserves certified phone geometry and constrains unsafe long labels", () => {
  const capability = createCuratedAuthoringCapability({ ...assembly, slots: [{ ...assembly.slots[0], label: "A deliberately overlong action label" }] }, "action-1");
  const size = capability.groups.flatMap((group) => group.controls).find((control) => control.id === "text-size");
  assert.ok(size?.type === "precision");
  assert.deepEqual(assembly.textSizes.map((option) => option.phonePx), [12, 14, 17]);
  assert.equal(size.min, 12);
  assert.equal(size.max, 12);
  const target = curatedAuthoringSelection(assembly, "node-1", "action-1");
  const command = createStudioAuthoringCommand(capability, { commandId: "curated.action.update", target, payload: { controlId: "text-size", value: 17, actionId: "action-1" }, historyLabel: "Unsafe size", provenance: "host" });
  assert.deepEqual(validateStudioAuthoringCommand(capability, command), { ok: false, message: "That value must be between 12 and 12 px." });
});
