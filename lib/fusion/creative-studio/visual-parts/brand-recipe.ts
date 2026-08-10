/**
 * Brand Recipe — named reusable Brand Color/Material relationship.
 * Stores anchor + refinement, not a final flat hex alone.
 * Consumed by Finish/Divider/Surface — does not invent a Material catalog.
 * Host-saved recipes persist on Card document (portable → future Business scope).
 */

import type { FinishColorRefinement } from "./types";

export type BrandRecipe = Readonly<{
  id: string;
  label: string;
  anchorColor: string;
  refinement: FinishColorRefinement;
  /** Optional notes for future tApIt Brand Environment — not AI runtime. */
  notes?: string;
  /** Host-authored vs catalog proof. */
  source?: "catalog" | "host";
  createdAt?: string;
}>;

/** In-document proof recipes (Host may save more via UI onto Card). */
export const BRAND_RECIPE_CATALOG: readonly BrandRecipe[] = [
  {
    id: "brand_recipe_tapit_primary_blue",
    label: "TapIt Primary Blue",
    anchorColor: "#155eef",
    refinement: { richness: 0.72, depth: 0.55, temperature: 0.35, contrast: 0.65, lightResponse: 0.7 },
    source: "catalog",
  },
  {
    id: "brand_recipe_lacquer_green",
    label: "Bright Lacquer Green",
    anchorColor: "#16a34a",
    refinement: { richness: 0.8, depth: 0.5, temperature: 0.4, contrast: 0.6, lightResponse: 0.75 },
    source: "catalog",
  },
  {
    id: "brand_recipe_industrial_navy",
    label: "Industrial Navy",
    anchorColor: "#0f172a",
    refinement: { richness: 0.45, depth: 0.85, temperature: 0.25, contrast: 0.7, lightResponse: 0.4 },
    source: "catalog",
  },
] as const;

const BY_ID = new Map(BRAND_RECIPE_CATALOG.map((r) => [r.id, r]));

export function getBrandRecipe(
  id: string | null | undefined,
  hostRecipes: readonly BrandRecipe[] = []
): BrandRecipe | undefined {
  if (!id) return undefined;
  return hostRecipes.find((r) => r.id === id) || BY_ID.get(id);
}

export function listBrandRecipes(hostRecipes: readonly BrandRecipe[] = []): BrandRecipe[] {
  const host = hostRecipes.filter((r) => r && r.id && r.label);
  const hostIds = new Set(host.map((r) => r.id));
  return [...BRAND_RECIPE_CATALOG.filter((r) => !hostIds.has(r.id)), ...host];
}

export function createHostBrandRecipe(input: {
  label: string;
  anchorColor: string;
  refinement: FinishColorRefinement;
  id?: string;
}): BrandRecipe {
  const slug = input.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return {
    id: input.id || `brand_recipe_host_${slug || "custom"}_${Date.now().toString(36)}`,
    label: input.label.trim() || "Host Brand Recipe",
    anchorColor: input.anchorColor,
    refinement: { ...input.refinement },
    source: "host",
    createdAt: new Date().toISOString(),
  };
}

export function upsertHostBrandRecipe(
  hostRecipes: readonly BrandRecipe[],
  recipe: BrandRecipe
): BrandRecipe[] {
  const next = hostRecipes.filter((r) => r.id !== recipe.id);
  next.push(recipe);
  return next;
}

/** Apply Brand Recipe onto visual-parts host props without mutating Action. */
export function applyBrandRecipeToProps(
  props: Record<string, unknown>,
  recipeId: string,
  hostRecipes: readonly BrandRecipe[] = []
): Record<string, unknown> {
  const recipe = getBrandRecipe(recipeId, hostRecipes);
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

/** Read current color refinement from props for Save Brand Recipe flow. */
export function readRefinementFromProps(props: Record<string, unknown>): {
  anchorColor: string;
  refinement: FinishColorRefinement;
} {
  const vp = (props.visualParts && typeof props.visualParts === "object"
    ? props.visualParts
    : {}) as Record<string, unknown>;
  const refinement = (vp.colorRefinement && typeof vp.colorRefinement === "object"
    ? vp.colorRefinement
    : {}) as FinishColorRefinement;
  return {
    anchorColor: String(vp.baseColor || props.fill || "#155eef"),
    refinement: {
      richness: Number(refinement.richness ?? 0.55),
      depth: Number(refinement.depth ?? 0.5),
      temperature: Number(refinement.temperature ?? 0.5),
      contrast: Number(refinement.contrast ?? 0.55),
      lightResponse: Number(refinement.lightResponse ?? 0.55),
    },
  };
}
