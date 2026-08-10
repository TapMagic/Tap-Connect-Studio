/**
 * Brand Recipe — named reusable Brand Color/Material relationship.
 * Stores anchor + refinement, not a final flat hex alone.
 * Consumed by Finish/Divider/Surface — does not invent a Material catalog.
 */

import type { FinishColorRefinement } from "./types";

export type BrandRecipe = Readonly<{
  id: string;
  label: string;
  anchorColor: string;
  refinement: FinishColorRefinement;
  /** Optional notes for future tApIt Brand Environment — not AI runtime. */
  notes?: string;
}>;

/** In-document proof recipes (Host may save more later via UI). */
export const BRAND_RECIPE_CATALOG: readonly BrandRecipe[] = [
  {
    id: "brand_recipe_tapit_primary_blue",
    label: "TapIt Primary Blue",
    anchorColor: "#155eef",
    refinement: { richness: 0.72, depth: 0.55, temperature: 0.35, contrast: 0.65, lightResponse: 0.7 },
  },
  {
    id: "brand_recipe_lacquer_green",
    label: "Bright Lacquer Green",
    anchorColor: "#16a34a",
    refinement: { richness: 0.8, depth: 0.5, temperature: 0.4, contrast: 0.6, lightResponse: 0.75 },
  },
  {
    id: "brand_recipe_industrial_navy",
    label: "Industrial Navy",
    anchorColor: "#0f172a",
    refinement: { richness: 0.45, depth: 0.85, temperature: 0.25, contrast: 0.7, lightResponse: 0.4 },
  },
] as const;

const BY_ID = new Map(BRAND_RECIPE_CATALOG.map((r) => [r.id, r]));

export function getBrandRecipe(id: string | null | undefined): BrandRecipe | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function listBrandRecipes(): BrandRecipe[] {
  return [...BRAND_RECIPE_CATALOG];
}

/** Apply Brand Recipe onto visual-parts host props without mutating Action. */
export function applyBrandRecipeToProps(
  props: Record<string, unknown>,
  recipeId: string
): Record<string, unknown> {
  const recipe = getBrandRecipe(recipeId);
  if (!recipe) return props;
  const prev = (props.visualParts && typeof props.visualParts === "object"
    ? props.visualParts
    : {}) as Record<string, unknown>;
  return {
    ...props,
    visualParts: {
      ...prev,
      brandRecipeId: recipe.id,
      baseColor: recipe.anchorColor,
      colorRefinement: { ...recipe.refinement },
    },
  };
}
