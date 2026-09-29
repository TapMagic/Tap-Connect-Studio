import type { FamilyAppearanceContract } from "../platform/family-appearance";
import { CABINET_NOIR_ASSEMBLY_RECIPES, CABINET_NOIR_ASSETS } from "./cabinet-noir";
import type { SignatureAssemblyRecipe, SignaturePresentationContract } from "./layout-recipes";
import type { SignatureAssetDefinition, SignatureFamilyDefinition } from "./types";

/**
 * Development/test-only runtime proof for the shared Curated contracts.
 * It is deliberately hidden from discovery and is excluded from production.
 */
export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_ENABLED = process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_TAPCONNECT_CURATED_RUNTIME_FIXTURE === "1";
export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID = "family_curated_neutral_runtime_fixture";

const componentIds = new Set([
  "CN-002", "CN-004", "CN-005", "CN-010", "CN-013", "CN-037", "CN-038",
  "CN-039", "CN-040", "CN-041", "CN-042", "CN-043", "CN-044", "CN-045",
]);
const renamedComponentId = (componentId: string) => `FNF-${componentId}`;

export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_FAMILY: SignatureFamilyDefinition = {
  id: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
  slug: "family-neutral-runtime-fixture",
  label: "Family Neutral Runtime Fixture",
  version: "1.0.0",
  lifecycle: "candidate",
  sortOrder: 9_999,
  discovery: {
    exposure: "hidden",
    category: "Test",
    description: "Development-only Curated renderer acceptance fixture.",
    sortOrder: 9_999,
  },
};

const fixtureSource = (asset: SignatureAssetDefinition) => {
  if (asset.normalizedContract?.role === "semantic-plug") {
    return {
      sourceAsset: "/visual-parts/signature/family-neutral-fixture/plug-chassis.svg",
      sourceSha256: "f0d244733b5c74552649e3ef46067f6345a4218d14a9d160c102ebb0babab63b",
    };
  }
  if (asset.assetKind === "action") {
    return {
      sourceAsset: "/visual-parts/signature/family-neutral-fixture/action-shell.svg",
      sourceSha256: "c866f4a84190a5d12a6e9a3ca10aeb22f7015cfa53c9f0afa156cd9302043ab0",
    };
  }
  if (asset.assetKind === "identity") {
    return {
      sourceAsset: "/visual-parts/signature/family-neutral-fixture/identity.svg",
      sourceSha256: "ed20c254b09765c4d6b7304bac2676d87762a7f8b5c7e24df73be0c2b5a00737",
    };
  }
  return {
    sourceAsset: "/visual-parts/signature/family-neutral-fixture/structure.svg",
    sourceSha256: "8e75d127b48f670b9a35857aadaa19375e6f94e7668c32a231139d520d0b5c16",
  };
};

export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_ASSETS: readonly SignatureAssetDefinition[] = CABINET_NOIR_ASSETS
  .filter((asset) => asset.normalizedContract && componentIds.has(asset.normalizedContract.componentId))
  .map((asset) => ({
    ...asset,
    ...fixtureSource(asset),
    id: `fixture/family-neutral/${asset.normalizedContract!.componentId.toLowerCase()}`,
    familyId: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
    label: `Fixture ${asset.normalizedContract!.role}`,
    normalizedContract: {
      ...asset.normalizedContract!,
      familyId: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
      componentId: renamedComponentId(asset.normalizedContract!.componentId),
    },
  }));

function renameRecipeReferences<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => renameRecipeReferences(entry)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    key === "componentId" && typeof entry === "string" ? renamedComponentId(entry) : renameRecipeReferences(entry),
  ])) as T;
}

function fixturePresentation(recipe: SignatureAssemblyRecipe): SignaturePresentationContract {
  const label = recipe.presentationMode === "standalone" ? "Fixture Hero" : recipe.presentationMode === "single-stack" ? "Fixture Single Stack" : "Fixture Twin Rail";
  return {
    id: `fixture-${recipe.presentationMode}`,
    label,
    description: "A hidden runtime proof of family-neutral Curated projection.",
    capabilities: {
      semanticIcon: {
        supported: true,
        defaultCanonicalIconId: "simple-icons:spotify",
        treatment: { mode: "engraved", safeInset: .23, scale: .9, color: "#171107", materialId: "brushed_gold" },
      },
      sublabel: { supported: true, maxLength: 52 },
      plugSide: { mode: "derived" },
    },
  };
}

export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_RECIPES: readonly SignatureAssemblyRecipe[] = CABINET_NOIR_ASSEMBLY_RECIPES.map((source) => {
  const recipe = renameRecipeReferences(source);
  return {
    ...recipe,
    familyId: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
    familyVersion: "1.0.0",
    recipeId: `family-neutral-fixture-${recipe.presentationMode}`,
    recipeVersion: "1.0.0",
    presentation: fixturePresentation(recipe),
  };
});

export const FAMILY_NEUTRAL_RUNTIME_FIXTURE_APPEARANCE: FamilyAppearanceContract = {
  contractId: "familyAppearance@1.0.0",
  id: "family-neutral-runtime-fixture-appearance",
  version: "1.0.0",
  familyId: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
  roles: [
    { id: "text-bar-surface", label: "Action surface", options: [{ id: "fixture-smoked-glass", label: "Smoked glass", roleId: "text-bar-surface", preview: "smoked glass", rendererValue: "smoked_glass", certified: true, governance: "fixed", materialProjection: { materialId: "smoked_glass", target: "action-surface" } }] },
    { id: "plug-surface", label: "Plug surface", options: [{ id: "fixture-brushed-gold", label: "Brushed gold", roleId: "plug-surface", preview: "brushed gold", rendererValue: "brushed_gold", certified: true, governance: "fixed", materialProjection: { materialId: "brushed_gold", target: "plug-surface" } }] },
    { id: "accent", label: "Icon treatment", options: [{ id: "fixture-engraved-icon", label: "Engraved icon", roleId: "accent", preview: "engraved", rendererValue: "brushed_gold", certified: true, governance: "fixed", materialProjection: { materialId: "brushed_gold", target: "icon-artwork" } }] },
  ],
  defaults: { "text-bar-surface": "fixture-smoked-glass", "plug-surface": "fixture-brushed-gold", accent: "fixture-engraved-icon" },
  certifiedCombinations: [{ id: "fixture-runtime-certified", optionIds: ["fixture-smoked-glass", "fixture-brushed-gold", "fixture-engraved-icon"], recommended: true }],
  accessibilityRules: [{ id: "fixture-phone-legibility", description: "Primary and secondary copy remain legible at the canonical 390px viewport." }],
  migration: { unknownOption: "preserve-read-only", invalidExplicitChoice: "block-with-reason" },
};
