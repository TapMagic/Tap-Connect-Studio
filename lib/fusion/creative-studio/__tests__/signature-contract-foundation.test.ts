import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  SIGNATURE_ASSEMBLY_CONTRACT_IDS,
  validateSignatureAssemblyRecipe,
  type SignatureAssemblyRecipe,
} from "../signature-assets/layout-recipes";
import {
  APPROVED_SIGNATURE_CONTRACT_IDS,
  isSignatureComponentRuntimeEligible,
  isSignatureContractId,
  resolveSignatureAccess,
  type SignatureComponentContract,
  type SignatureEntitlementResolutionContract,
} from "../signature-assets/types";

const familyId = "family-contract-fixture";
const familyVersion = "1.0.0" as const;
const sourceSha256 = "a".repeat(64);
const socketGeometry = {
  bounds: { x: 0.05, y: 0.2, width: 0.18, height: 0.6 },
  safeArea: { x: 0.07, y: 0.23, width: 0.14, height: 0.54 },
  center: { x: 0.14, y: 0.5 },
} as const;

function component(overrides: Partial<SignatureComponentContract> = {}): SignatureComponentContract {
  return {
    familyId,
    familyVersion,
    componentId: "component/action/left",
    componentVersion: "1.0.0",
    role: "action-master",
    side: "left",
    layoutCompatibility: ["single-stack", "twin-rail"],
    sockets: [{
      contractId: APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket,
      geometry: socketGeometry,
      ownership: "live-action",
    }],
    attachmentAnchors: [
      { id: "top", point: { x: 0.5, y: 0 }, edge: "top", accepts: ["bottom"] },
      { id: "bottom", point: { x: 0.5, y: 1 }, edge: "bottom", accepts: ["top"] },
    ],
    authority: "canonical",
    lifecycle: "production",
    runtimeEligibility: "runtime-eligible",
    certification: { state: "certified", geometryVersion: "1.0.0" },
    sourceSha256,
    finishId: "fixture-finish-v1",
    entitlementKey: "signature.family.fixture",
    accessibility: {
      furniture: "decorative",
      ariaHidden: true,
      interactive: false,
      liveContent: "socket-content",
      accessibleNameSource: "live-label",
    },
    ...overrides,
  };
}

const entitlementContract: SignatureEntitlementResolutionContract = {
  contractId: APPROVED_SIGNATURE_CONTRACT_IDS.entitlementResolution,
  entitlementKey: "signature.family.cabinet_noir",
  entitled: { visible: true, selectable: true, publishable: true },
  nonEntitled: { visible: true, selectable: false, publishable: false },
  afterLoss: {
    existingObjects: "read-only",
    existingPublishedOutput: "remain-live",
    newInsertion: "block",
    restrictedReplacement: "block",
  },
  publicRenderRequiresCurrentEntitlement: false,
  publicationEnforcement: "server-required",
};

const singleStackRecipe: SignatureAssemblyRecipe = {
  contractId: SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack,
  familyId,
  familyVersion,
  recipeId: "fixture-single-stack",
  recipeVersion: "1.0.0",
  fixedTop: [{ role: "identity-topper" }, { role: "top-bridge" }],
  actionUnit: {
    id: "action-row",
    kind: "row",
    capacity: 1,
    masterStrategy: {
      mode: "alternating",
      sequence: [
        { role: "standard-action", side: "left", ownsSockets: [APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket] },
        { role: "standard-action", side: "right", ownsSockets: [APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket] },
      ],
    },
    socketOwnership: "action-master",
  },
  repeatInterval: {
    id: "row-interval",
    components: [{ role: "outer-rail" }],
    axis: "y",
    cadence: "action-row",
    nativeStridePx: 724,
    normalizedStride: 1,
    preferredOverlapPx: 0,
    maximumSeamOverlapPx: 2,
    placement: "between-action-units",
  },
  structuralTermination: { role: "bottom-cap" },
  optionalDecorativeTermination: { role: "decorative-footer" },
  oddActionTreatment: { mode: "not-applicable" },
  attachmentOrder: ["identity-topper", "top-bridge", "action-row", "row-interval", "bottom-cap", "decorative-footer"],
  certificationLimits: {
    minimumActions: 1,
    launchCertifiedActionCounts: [1, 2, 4, 6],
    maximumLaunchCertifiedActions: 6,
  },
  geometry: {
    coordinateWidthPx: 2172,
    unitStridePx: 724,
    fixedTop: [
      { role: "identity-topper", verticalReference: "assembly-origin", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
      { role: "top-bridge", verticalReference: "assembly-origin", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
    ],
    actionSlots: [
      { role: "standard-action", side: "left", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 20 },
      { role: "standard-action", side: "right", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 20 },
    ],
    repeatComponents: [{ role: "outer-rail", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 }],
    structuralTermination: { role: "bottom-cap", verticalReference: "content-end", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
    decorativeTermination: { role: "decorative-footer", verticalReference: "content-end", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 5 },
  },
};

const twinRailRecipe: SignatureAssemblyRecipe = {
  contractId: SIGNATURE_ASSEMBLY_CONTRACT_IDS.twinRail,
  familyId,
  familyVersion,
  recipeId: "fixture-twin-rail",
  recipeVersion: "1.0.0",
  fixedTop: [{ role: "identity-topper" }, { role: "twin-rail-top-bridge" }],
  actionUnit: {
    id: "paired-level",
    kind: "paired-level",
    capacity: 2,
    masterStrategy: {
      mode: "side-specific",
      masters: {
        left: { role: "standard-action", side: "left", ownsSockets: [APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket] },
        right: { role: "standard-action", side: "right", ownsSockets: [APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket] },
      },
    },
    socketOwnership: "action-master",
  },
  repeatInterval: {
    id: "paired-interval",
    components: [{ role: "outer-rail" }, { role: "center-spine", side: "center" }],
    axis: "y",
    cadence: "paired-level",
    nativeStridePx: 362,
    normalizedStride: 1,
    preferredOverlapPx: 0,
    maximumSeamOverlapPx: 2,
    placement: "between-action-units",
  },
  structuralTermination: { role: "twin-rail-bottom-cap" },
  oddActionTreatment: {
    mode: "full-width-after-complete-pairs",
    terminateRepeatsAfterLastCompleteUnit: true,
    finalActionMaster: { role: "full-width-action" },
    transitionFurniture: { role: "odd-row-transition" },
    transitionIsInteractive: false,
    structuralTerminationFollows: true,
  },
  attachmentOrder: ["identity-topper", "twin-rail-top-bridge", "paired-level", "paired-interval", "odd-action", "odd-row-transition", "twin-rail-bottom-cap"],
  certificationLimits: {
    minimumActions: 2,
    launchCertifiedActionCounts: [2, 4, 6],
    structuralProofOnlyActionCounts: [7],
    maximumLaunchCertifiedActions: 6,
  },
  geometry: {
    coordinateWidthPx: 2172,
    unitStridePx: 362,
    fixedTop: [
      { role: "identity-topper", verticalReference: "assembly-origin", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
      { role: "twin-rail-top-bridge", verticalReference: "assembly-origin", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
    ],
    actionSlots: [
      { role: "standard-action", side: "left", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: .5, zOrder: 20 },
      { role: "standard-action", side: "right", verticalReference: "unit-start", xPx: 1086, yOffsetPx: 0, scale: .5, zOrder: 20 },
    ],
    repeatComponents: [
      { role: "outer-rail", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
      { role: "center-spine", side: "center", verticalReference: "unit-start", xPx: 1086, yOffsetPx: 0, scale: .25, zOrder: 15 },
    ],
    structuralTermination: { role: "twin-rail-bottom-cap", verticalReference: "content-end", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
    oddAction: {
      action: { role: "full-width-action", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 20 },
      transition: { role: "odd-row-transition", verticalReference: "odd-action-end", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 10 },
    },
  },
};

test("named Signature contracts require a name and semantic version while allowing future versions", () => {
  for (const id of Object.values(APPROVED_SIGNATURE_CONTRACT_IDS)) assert.equal(isSignatureContractId(id), true, id);
  assert.equal(isSignatureContractId("semanticPlugSocket@2.1.0", "semanticPlugSocket"), true);
  assert.equal(isSignatureContractId("semanticPlugSocket@1", "semanticPlugSocket"), false);
  assert.equal(isSignatureContractId("identityHeaderSocket@1.0.0", "semanticPlugSocket"), false);
});

test("repeat contracts preserve native stride with zero preferred overlap", () => {
  assert.deepEqual(validateSignatureAssemblyRecipe(singleStackRecipe), []);
  assert.deepEqual(validateSignatureAssemblyRecipe(twinRailRecipe), []);
  assert.equal(singleStackRecipe.repeatInterval?.nativeStridePx, 724);
  assert.equal(singleStackRecipe.repeatInterval?.preferredOverlapPx, 0);
  assert.equal(twinRailRecipe.repeatInterval?.nativeStridePx, 362);
  assert.equal(twinRailRecipe.repeatInterval?.preferredOverlapPx, 0);
});

test("runtime eligibility excludes reference, superseded, duplicate, and quarantined authorities", () => {
  assert.equal(isSignatureComponentRuntimeEligible(component()), true);
  for (const [authority, lifecycle] of [
    ["reference-only", "reference"],
    ["audit-only", "superseded"],
    ["audit-only", "duplicate"],
    ["audit-only", "quarantined"],
  ] as const) {
    assert.equal(isSignatureComponentRuntimeEligible(component({ authority, lifecycle, runtimeEligibility: "runtime-ineligible" })), false);
  }
});

test("entitlement resolution keeps visible, selectable, and publishable independent", () => {
  assert.deepEqual(resolveSignatureAccess(entitlementContract, true), { visible: true, selectable: true, publishable: true });
  assert.deepEqual(resolveSignatureAccess(entitlementContract, false), { visible: true, selectable: false, publishable: false });
  assert.equal(entitlementContract.publicRenderRequiresCurrentEntitlement, false);
  assert.equal(entitlementContract.publicationEnforcement, "server-required");
});

test("family-neutral recipes express Single-Stack, Twin-Rail, sockets, attachments, and odd actions", () => {
  assert.equal(singleStackRecipe.actionUnit.masterStrategy.mode, "alternating");
  assert.equal(twinRailRecipe.actionUnit.masterStrategy.mode, "side-specific");
  assert.equal(twinRailRecipe.oddActionTreatment.mode, "full-width-after-complete-pairs");
  if (twinRailRecipe.oddActionTreatment.mode === "full-width-after-complete-pairs") {
    assert.equal(twinRailRecipe.oddActionTreatment.transitionIsInteractive, false);
    assert.equal(twinRailRecipe.oddActionTreatment.terminateRepeatsAfterLastCompleteUnit, true);
  }
  assert.ok(singleStackRecipe.fixedTop.length > 0);
  assert.ok(twinRailRecipe.attachmentOrder.includes("twin-rail-bottom-cap"));
});

test("reference-only presets remain serializable audit records but cannot become runtime authorities", () => {
  const preset = component({
    componentId: "preset/reference/two-column",
    role: "assembled-preset",
    authority: "reference-only",
    lifecycle: "reference",
    runtimeEligibility: "runtime-ineligible",
  });
  assert.equal(isSignatureComponentRuntimeEligible(preset), false);
  assert.equal(JSON.parse(JSON.stringify(preset)).authority, "reference-only");
});

test("component hashes and family/component versions survive JSON serialization", () => {
  const original = component({ liveContentContract: APPROVED_SIGNATURE_CONTRACT_IDS.informationalLine });
  const restored = JSON.parse(JSON.stringify(original)) as SignatureComponentContract;
  assert.equal(restored.familyId, familyId);
  assert.equal(restored.familyVersion, "1.0.0");
  assert.equal(restored.componentId, original.componentId);
  assert.equal(restored.componentVersion, "1.0.0");
  assert.equal(restored.sourceSha256, sourceSha256);
  assert.equal(restored.sockets[0]?.contractId, APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket);
});

test("generic contract modules contain no Cabinet Noir component IDs or family branches", () => {
  const root = process.cwd();
  const source = ["types.ts", "layout-recipes.ts"]
    .map((file) => readFileSync(path.join(root, "lib/fusion/creative-studio/signature-assets", file), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /cabinet[_ -]?noir/i);
  assert.doesNotMatch(source, /CN-\d{3}/);
});
