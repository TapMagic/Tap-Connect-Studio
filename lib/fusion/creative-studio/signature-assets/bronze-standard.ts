import { APPROVED_SIGNATURE_CONTRACT_IDS, type SignatureAssetDefinition, type SignatureFamilyDefinition } from "./types";
import { SIGNATURE_ASSEMBLY_CONTRACT_IDS, type SignatureAssemblyRecipe } from "./layout-recipes";
import type { FamilyAppearanceContract, FamilyAppearanceOption, FamilyTextTreatmentContract } from "../platform/family-appearance";

export const BRONZE_STANDARD_FAMILY_ID = "bronze-standard";
const root = "/visual-parts/signature/bronze-standard";
const geometryEvidence = `${root}/recipe.json`;
const socket = APPROVED_SIGNATURE_CONTRACT_IDS.semanticPlugSocket;
const layout = SIGNATURE_ASSEMBLY_CONTRACT_IDS.singleStack;
const zero = { top: 0, right: 0, bottom: 0, left: 0 };

export const BRONZE_STANDARD_FAMILY: SignatureFamilyDefinition = {
  id: BRONZE_STANDARD_FAMILY_ID, slug: "bronze-standard", label: "Bronze Standard", version: "1.0.0",
  lifecycle: "production", sortOrder: 45,
  discovery: { exposure: "active", category: "Curated", description: "Aged bronze hardware with independently editable mineral faces and a raised semantic emblem.", previewAssetId: "reference/bronze-standard/preview/v1", previewAlt: "Native Bronze Standard button", sortOrder: 45 },
};

function part(componentId: string, label: string, isPlug: boolean, hash: string): SignatureAssetDefinition {
  const width = isPlug ? 300 : 1200;
  const role = isPlug ? "semantic-plug" : "standard-action";
  const source = `${root}/${isPlug ? "round-plug" : "standard-frame"}.svg`;
  return {
    id: `master/bronze-standard/${componentId.toLowerCase()}/v1`, familyId: BRONZE_STANDARD_FAMILY_ID,
    label, role, subgroup: isPlug ? "micro-parts" : "actions", assetKind: isPlug ? "micro-part" : "action",
    variant: "standard-round", sourceAsset: source, sourceSha256: hash, width, height: 300, aspectRatio: width / 300,
    glowPadding: zero, safeInsets: zero, socketContract: isPlug ? { icon: true } : { title: true, description: true, action: true },
    layoutCapabilities: ["SINGLE"], responsiveContract: { proportional: true, phoneSafe: true, minRenderedWidthPx: isPlug ? 60 : 260 },
    stateContract: ["default", "hover", "pressed", "disabled"], tintCapabilities: [], tintMode: "none", energyMode: "fixed",
    sourceReadiness: "production-ready", lifecycle: "production", expressionTier: "signature", referenceOnly: false,
    nestingCapabilities: { canContainChildren: false, acceptedChildKinds: [] }, sortOrder: isPlug ? 4101 : 4100,
    tags: ["bronze", "mineral-glass", "native", role],
    normalizedContract: {
      familyId: BRONZE_STANDARD_FAMILY_ID, familyVersion: "1.0.0", componentId, componentVersion: "1.0.0", role, side: isPlug ? "none" : "left",
      layoutCompatibility: [layout], attachmentAnchors: [],
      sockets: [{ contractId: socket, ownership: isPlug ? "component" : "live-action", geometry: {
        bounds: { x: 0, y: 0, width: isPlug ? 1 : .25, height: 1 },
        safeArea: { x: isPlug ? .25 : .0625, y: .25, width: isPlug ? .5 : .125, height: .5 },
        center: { x: isPlug ? .5 : .125, y: .5 },
      } }],
      authority: "canonical", lifecycle: "production", runtimeEligibility: "runtime-eligible",
      certification: { state: "certified", geometryVersion: "1.0.0", evidence: [geometryEvidence] },
      sourceSha256: hash, finishId: "aged-bronze-mineral@1.0.0", entitlementKey: "signature.family.bronze_standard",
      accessibility: { furniture: "decorative", ariaHidden: true, interactive: false, liveContent: isPlug ? "none" : "socket-content", ...(isPlug ? {} : { accessibleNameSource: "live-label" as const }) },
      sourceGeometry: { widthPx: width, heightPx: 300 },
      materialSurfaceGeometry: { inset: isPlug ? { top: .14, right: .14, bottom: .14, left: .14 } : { top: .135, right: .035, bottom: .135, left: .035 }, cornerRadiusPx: isPlug ? 150 : 110 },
      ...(isPlug ? {} : { liveContentGeometry: {
        safeArea: { x: .27, y: .19, width: .59, height: .62 }, alignment: "center" as const, allowedAlignments: ["left", "center", "right"] as const,
        fontSizePxAt390: [14, 28] as const, lineHeightPxAt390: [16, 30] as const,
        textSizePresetsPxAt390: { small: 17, medium: 23, large: 28 }, lineHeightPresetsPxAt390: { small: 19, medium: 25, large: 30 },
        recommendedCharacterCounts: { small: 22, medium: 16, large: 12 }, textTreatment: "raised-metal" as const,
      } }),
      provenance: { sourceAssetPath: `public${source}`, authorityManifest: geometryEvidence, geometryAuthority: geometryEvidence, sourceMode: "styled-preserve", immutable: true },
    },
  };
}

export const BRONZE_STANDARD_ASSETS: readonly SignatureAssetDefinition[] = [
  part("BS-001", "Standard bronze holder", false, "3efeaa51ec175334da796a3bbeb01d95f74c59a43dac481dbabf698ad3c7ac4d"),
  part("BS-002", "Round bronze plug", true, "f910bc25f7262c63310a0e0c3c1e0b8517172fb9600b3f8e9e0806cf2c742152"),
  {
    id: "reference/bronze-standard/preview/v1", familyId: BRONZE_STANDARD_FAMILY_ID,
    label: "Bronze Standard native runtime preview", role: "assembly-preset", subgroup: "actions", assetKind: "stage", variant: "standard-round-preview",
    sourceAsset: `${root}/preview.png`, sourceSha256: "6607fbfcf020bfd6f0d931f80a6cb9e3dcc548715a5e5cc1f0c9c638cfeecfeb",
    width: 380, height: 106, aspectRatio: 380 / 106, glowPadding: zero, safeInsets: zero, socketContract: {},
    layoutCapabilities: [], responsiveContract: { proportional: true, phoneSafe: true }, stateContract: [],
    tintCapabilities: [], tintMode: "none", energyMode: "fixed", sourceReadiness: "production-ready", lifecycle: "reference", expressionTier: "signature", referenceOnly: true,
    nestingCapabilities: { canContainChildren: false, acceptedChildKinds: [] }, sortOrder: 4102, tags: ["reference-only", "runtime-capture"],
  },
];

export const BRONZE_STANDARD_RECIPE: SignatureAssemblyRecipe = {
  contractId: layout, familyId: BRONZE_STANDARD_FAMILY_ID, familyVersion: "1.0.0", recipeId: "bronze-standard-round", recipeVersion: "1.0.0", presentationMode: "standalone",
  presentation: {
    id: "bronze-standard-round", label: "Standard · Round Plug", description: "One native bronze and mineral-glass action.", previewAssetId: "reference/bronze-standard/preview/v1",
    density: { mode: "full", preferredFlowWidthPercent: 100, minimumFlowWidthPercent: 84, maximumFlowWidthPercent: 100, defaultFlowAlignment: "stretch", minimumTouchTargetPx: 60 },
    capabilities: {
      semanticIcon: { supported: true, defaultCanonicalIconId: "lucide:music-2", treatment: { mode: "embossed", safeInset: .27, scale: 1, materialId: "aged_brass" } },
      sublabel: { supported: true, maxLength: 28 }, plugSide: { mode: "fixed", side: "left" },
      plug: { supported: true, optional: false, defaultEnabled: true, visualMode: "composed", depthTreatment: "raised-contact", renderedSizePx: 300 },
      responsiveTypography: { density: "full", renderedWidthPx: { min: 260, max: 390 }, title: { minPx: 17, maxPx: 28, defaultPx: 23, lineHeight: 1.05, trackingEm: .035 }, sublabel: { minPx: 9, maxPx: 12, defaultPx: 11, lineHeight: 1.1, trackingEm: .1 }, safeAreaPaddingPx: 0, affordanceReservePx: 0 },
    },
    defaultActions: [{ label: "MUSIC", sublabel: "Stream Here", canonicalIconId: "lucide:music-2", semanticLabel: "Music", accessibilityLabel: "Music — Stream Here", destination: "https://example.com/music", actionType: "website", textAlign: "center" }],
  },
  fixedTop: [], actionUnit: { id: "standard-action", kind: "row", capacity: 1, masterStrategy: { mode: "single", master: { role: "standard-action", componentId: "BS-001", side: "left", ownsSockets: [socket] } }, socketOwnership: "action-master" },
  oddActionTreatment: { mode: "not-applicable" }, attachmentOrder: ["standard-action"],
  certificationLimits: { minimumActions: 1, maximumLaunchCertifiedActions: 1, launchCertifiedActionCounts: [1] },
  geometry: { coordinateWidthPx: 1200, unitStridePx: 300, flowBox: { mode: "action-bar-owned", xPx: 0, widthPx: 1200, firstRowOffsetPx: 0, rowHeightPx: 300 }, fixedTop: [], actionSlots: [{ role: "standard-action", side: "left", verticalReference: "unit-start", xPx: 0, yOffsetPx: 0, scale: 1, zOrder: 20 }], repeatComponents: [] },
};

const faceOptions = (roleId: string, target: "action-surface" | "plug-surface"): FamilyAppearanceOption[] => ["midnight", "obsidian", "petrol"].flatMap((color) => ["glass", "satin"].map((finish) => ({
  id: `${roleId}-${color}-${finish}`, roleId,
  label: `${color === "midnight" ? "Midnight blue" : color === "obsidian" ? "Obsidian" : "Petrol teal"} · ${finish === "glass" ? "Polished glass" : "Satin mineral"}`,
  preview: `material:mineral_${color}_${finish}`, rendererValue: `mineral_${color}_${finish}`, certified: true, governance: "configurable", materialProjection: { materialId: `mineral_${color}_${finish}`, target },
})));
const faceColorPicker = { defaultColor: "#091827", palette: ["#091827", "#13151b", "#694620", "#510b0c", "#063b25", "#3b0c58", "#054653", "#7d8791", "#9b6816", "#d3cbb9"] };
const bodyOptions = faceOptions("text-bar-surface", "action-surface");
const plugOptions = faceOptions("plug-surface", "plug-surface");
export const BRONZE_STANDARD_APPEARANCE: FamilyAppearanceContract = {
  contractId: "familyAppearance@1.0.0", id: "bronze-standard-appearance", version: "1.0.0", familyId: BRONZE_STANDARD_FAMILY_ID,
  roles: [
    { id: "text-bar-surface", label: "Button face · color and finish", options: bodyOptions, colorPicker: faceColorPicker },
    { id: "plug-surface", label: "Round plug face · color and finish", options: plugOptions, colorPicker: faceColorPicker },
    { id: "accent", label: "Raised emblem", options: [{ id: "bronze-emblem", roleId: "accent", label: "Dimensional aged brass", preview: "material:aged_brass", rendererValue: "aged_brass", certified: true, governance: "fixed", materialProjection: { materialId: "aged_brass", target: "icon-artwork" } }] },
  ],
  defaults: { "text-bar-surface": bodyOptions[0].id, "plug-surface": plugOptions[0].id, accent: "bronze-emblem" },
  certifiedCombinations: bodyOptions.flatMap((body) => plugOptions.map((plug) => ({ id: `${body.id}-${plug.id}`, optionIds: [body.id, plug.id, "bronze-emblem"], recommended: body === bodyOptions[0] && plug === plugOptions[0] }))),
  accessibilityRules: [{ id: "legible-copy", description: "Warm metallic live titles and ivory sublabels remain legible across the dark face palette." }],
  migration: { unknownOption: "preserve-read-only", invalidExplicitChoice: "block-with-reason" },
};
export const BRONZE_STANDARD_TEXT: FamilyTextTreatmentContract = {
  contractId: "familyTextTreatment@1.0.0", id: "bronze-standard-text", version: "1.0.0", familyId: BRONZE_STANDARD_FAMILY_ID,
  options: [{ id: "raised", label: "Raised bronze", certified: true, rendererRecipe: "raised-metal", compatibleRoleIds: ["text", "subtext"], compatibleSizeIds: ["small", "medium", "large"] }],
  deterministicAuto: { enabled: false, inputs: ["family", "appearance", "text-role", "text-size", "renderer-version"] }, migration: { unsupportedTreatment: "preserve-read-only" },
};
