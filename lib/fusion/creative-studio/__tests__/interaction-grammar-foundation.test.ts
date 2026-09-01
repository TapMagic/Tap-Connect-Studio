import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStudioPrecision, stepStudioPrecision, STUDIO_LIVE_ADJUSTMENT_CONTRACT } from "../platform/live-adjustment";
import { applyStudioSurfaceParameters, applyStudioSurfaceTreatment, readStudioSurfaceState, STUDIO_SURFACE_CAPABILITY_CONTRACT } from "../platform/surface-capability";
import { STUDIO_AUTHORING_CAPABILITY_CONTRACT, STUDIO_AUTHORING_CAPABILITY_LEGACY_CONTRACT } from "../platform/authoring-contract";
import { createCuratedAuthoringCapability, curatedCommandPayloadToMutation } from "../reconstitution/curated-authoring-adapter";
import type { StudioStructuredAssemblyDescriptor } from "../platform/structured-assembly";

test("interaction authorities are explicitly versioned", () => {
  assert.equal(STUDIO_AUTHORING_CAPABILITY_LEGACY_CONTRACT, "studioAuthoringCapability@1.0.0");
  assert.equal(STUDIO_AUTHORING_CAPABILITY_CONTRACT, "studioAuthoringCapability@2.0.0");
  assert.equal(STUDIO_LIVE_ADJUSTMENT_CONTRACT, "studioLiveAdjustment@1.0.0");
  assert.equal(STUDIO_SURFACE_CAPABILITY_CONTRACT, "studioSurfaceCapability@1.0.0");
});

test("precision values clamp, quantize, and support fine keyboard steps", () => {
  const descriptor = { unit: "px" as const, min: 10, max: 28, step: 1, fineStep: .5, defaultValue: 14 };
  assert.equal(normalizeStudioPrecision(42, descriptor), 28);
  assert.equal(normalizeStudioPrecision(13.6, descriptor), 14);
  assert.equal(stepStudioPrecision(14, 1, descriptor, true), 14.5);
  assert.equal(stepStudioPrecision(10, -1, descriptor), 10);
});

test("Surface treatment reads legacy props and writes the shared semantic contract", () => {
  const legacy = readStudioSurfaceState({ containerTreatment: "solid", fill: "#123456" });
  assert.equal(legacy.treatment, "solid");
  assert.equal(legacy.fill, "#123456");
  const next = applyStudioSurfaceTreatment({ containerTreatment: "transparent" }, "smoked_glass");
  assert.equal((next.surfaceTreatment as { contractId: string }).contractId, STUDIO_SURFACE_CAPABILITY_CONTRACT);
  assert.equal(next.containerTreatment, "smoked_glass");
  assert.deepEqual(next.visualPlane, { kind: "solid", color: "rgba(12,20,24,.72)" });
});

test("image Surface parameters round-trip through one canonical visual plane", () => {
  const image = applyStudioSurfaceTreatment({}, "image", { mediaUrl: "/assets/blue-room.jpg", mediaAssetId: "asset-blue" });
  const adjusted = applyStudioSurfaceParameters(image, {
    fit: "contain", focalX: .25, focalY: .75, brightness: .8, tint: "#123456",
    overlayOpacity: .4, imageOpacity: .7, radiusPx: 22, borderWidthPx: 2,
    borderColor: "#abcdef", shadowPx: 24, opacity: .9,
  });
  const state = readStudioSurfaceState(adjusted);
  assert.equal(state.mediaAssetId, "asset-blue");
  assert.equal(state.fit, "contain");
  assert.equal(state.focalX, .25);
  assert.equal(state.focalY, .75);
  assert.equal(state.brightness, .8);
  assert.equal(state.tint, "#123456");
  assert.equal(state.overlayOpacity, .4);
  assert.equal(state.imageOpacity, .7);
  assert.equal(state.radiusPx, 22);
  assert.equal(state.borderWidthPx, 2);
  assert.equal(state.shadowPx, 24);
  assert.deepEqual(state.visualPlane, {
    kind: "image",
    media: { mediaAssetId: "asset-blue", fallbackUrl: "/assets/blue-room.jpg" },
    treatment: {
      focalPoint: { x: .25, y: .75 }, fit: "contain", scale: 1, position: { x: .5, y: .5 },
      opacity: .7, altText: "Background photography", decorative: true, repeat: "no-repeat",
      blurPx: 0, overlayOpacity: .4, blendMode: "normal", tint: "#123456",
    },
  });
  assert.deepEqual(applyStudioSurfaceTreatment(adjusted, "transparent").visualPlane, { kind: "none" });
  const removed = readStudioSurfaceState(applyStudioSurfaceTreatment(adjusted, "image", { mediaUrl: undefined, mediaAssetId: undefined }));
  assert.equal(removed.mediaUrl, undefined);
  assert.equal(removed.mediaAssetId, undefined);
  assert.deepEqual(removed.visualPlane, { kind: "solid", color: "transparent" });
});

test("Curated text precision is numeric and compiles to one action mutation", () => {
  const assembly = {
    contractId: "studioCuratedAssembly@1.0.0",
    adapterAuthority: "signatureAssemblyAuthoring@1.0.0",
    familyId: "cabinet-noir", familyLabel: "Cabinet Noir", objectId: "cn", layoutMode: "single-stack",
    recipeId: "cn", recipeVersion: "1.0.0", recipeLabel: "Single Stack", inputCount: 1,
    slots: [{ id: "a", label: "Call", plugComponentId: "CN-013", textSize: "medium", contentType: "action", required: true, order: 0 }],
    allowedActionCounts: [1, 2], layouts: [{ id: "single-stack", label: "Single Stack", description: "", allowedActionCounts: [1, 2] }],
    textSizes: [{ id: "small", label: "Small", phonePx: 12, recommendedCharacterCount: 26 }, { id: "medium", label: "Medium", phonePx: 14, recommendedCharacterCount: 20 }, { id: "large", label: "Large", phonePx: 17, recommendedCharacterCount: 15 }],
    appearance: { contractId: "appearance", contractVersion: "1", roles: [] }, compatiblePlugs: [], outputOwnership: "recipe-governed", compiler: "deterministic", mutationReadiness: "ready", preservedAuthorities: [],
  } satisfies StudioStructuredAssemblyDescriptor;
  const capability = createCuratedAuthoringCapability(assembly, "a");
  const control = capability.groups.flatMap((group) => group.controls).find((candidate) => candidate.id === "text-size");
  assert.equal(control?.type, "precision");
  assert.deepEqual(curatedCommandPayloadToMutation("curated.action.update", { controlId: "text-size", value: 15, actionId: "a" }, assembly), { type: "update-action", actionId: "a", patch: { textSizePx: 15 } });
  assert.deepEqual(curatedCommandPayloadToMutation("curated.action.update", { controlId: "action-intent", value: "call", actionId: "a" }, assembly), { type: "update-action", actionId: "a", patch: { actionType: "call", destination: "tel:" } });
  const inferred = curatedCommandPayloadToMutation("curated.action.update", { controlId: "destination", value: "tel:+13525550123", actionId: "a" }, {
    ...assembly,
    slots: [{ ...assembly.slots[0]!, actionType: "website" }],
  });
  assert.deepEqual(inferred, { type: "update-action", actionId: "a", patch: { actionType: "call", destination: "tel:+13525550123" } });
  const twin = createCuratedAuthoringCapability({
    ...assembly,
    layoutMode: "twin-rail",
    textSizes: assembly.textSizes.map((size) => ({ ...size, availability: size.id === "small" ? "enabled" as const : "disabled" as const })),
  }, "a");
  assert.equal(twin.groups.flatMap((group) => group.controls).some((candidate) => candidate.id === "text-size"), false);
  const appearance = twin.groups.flatMap((group) => group.controls).find((candidate) => candidate.id === "appearance");
  assert.ok(appearance?.type === "appearance-status" && appearance.roles.some((role) => role.optionLabel === "12px at phone density"));
});
