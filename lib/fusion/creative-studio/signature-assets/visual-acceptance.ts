import type { SignatureAssetDefinition } from "./types";
import type { SignatureAssemblyRecipe } from "./layout-recipes";

export type CuratedWholeObjectCheck =
  | "outer-geometry"
  | "text-safe-area"
  | "plug-envelope"
  | "crown-seating"
  | "rail-continuity"
  | "row-cadence"
  | "center-spine-continuity"
  | "center-seam"
  | "terminal-closure"
  | "whole-object-silhouette"
  | "phone-density";

export type CuratedPresentationVisualAcceptance = Readonly<{
  recipeId: string;
  presentationMode: SignatureAssemblyRecipe["presentationMode"];
  /** Immutable visual authority. Reference assets remain runtime-ineligible. */
  referenceAssetIds: readonly string[];
  /** Previously accepted runtime image used to detect visual regression. */
  acceptedRuntimeGolden: string;
  /** Current deterministic-route projection captured by the acceptance gate. */
  deterministicRuntimeProof: string;
  requiredChecks: readonly CuratedWholeObjectCheck[];
}>;

export type CuratedFamilyVisualAcceptanceContract = Readonly<{
  familyId: string;
  contractVersion: `${number}.${number}.${number}`;
  deterministicRuntimeRoute: `/${string}`;
  viewport: Readonly<{ widthPx: number; heightPx: number; density: "phone-authoritative" }>;
  humanQuestion: string;
  presentations: readonly CuratedPresentationVisualAcceptance[];
}>;

/**
 * Fail-closed registration gate for every launch-certified Curated recipe.
 * Pixel comparison remains an E2E concern; this contract prevents a family
 * from shipping a recipe that has no same-route whole-object authority.
 */
export function validateCuratedFamilyVisualAcceptance(
  contract: CuratedFamilyVisualAcceptanceContract,
  recipes: readonly SignatureAssemblyRecipe[],
  assets: readonly SignatureAssetDefinition[],
): readonly string[] {
  const errors: string[] = [];
  if (!contract.deterministicRuntimeRoute.startsWith("/")) errors.push("deterministic runtime route must be absolute");
  if (contract.viewport.widthPx <= 0 || contract.viewport.heightPx <= 0) errors.push("visual acceptance viewport must be positive");
  const familyRecipes = recipes.filter((recipe) => recipe.familyId === contract.familyId);
  const byRecipe = new Map(contract.presentations.map((presentation) => [presentation.recipeId, presentation]));
  for (const recipe of familyRecipes) {
    const presentation = byRecipe.get(recipe.recipeId);
    if (!presentation) {
      errors.push(`${recipe.recipeId} has no whole-object visual acceptance declaration`);
      continue;
    }
    if (presentation.presentationMode !== recipe.presentationMode) errors.push(`${recipe.recipeId} visual acceptance mode does not match its recipe`);
    if (!presentation.acceptedRuntimeGolden || !presentation.deterministicRuntimeProof) errors.push(`${recipe.recipeId} requires golden and deterministic runtime evidence`);
    if (!presentation.requiredChecks.includes("whole-object-silhouette")) errors.push(`${recipe.recipeId} must fail closed on whole-object silhouette`);
    if (!presentation.requiredChecks.includes("phone-density")) errors.push(`${recipe.recipeId} must be accepted at phone density`);
    for (const assetId of presentation.referenceAssetIds) {
      const asset = assets.find((candidate) => candidate.normalizedContract?.componentId === assetId);
      if (!asset) errors.push(`${recipe.recipeId} references unknown visual authority ${assetId}`);
      else if (!asset.referenceOnly) errors.push(`${recipe.recipeId} visual authority ${assetId} must remain runtime-ineligible`);
    }
  }
  for (const presentation of contract.presentations) {
    if (!familyRecipes.some((recipe) => recipe.recipeId === presentation.recipeId)) errors.push(`${presentation.recipeId} visual acceptance has no registered recipe`);
  }
  return errors;
}
