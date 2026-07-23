import type { AutopilotMode } from "./types";

export type AutopilotRecipe = {
  id: string;
  /** Semver-ish recipe version stamped onto proposals */
  version: string;
  name: string;
  description: string;
  defaultMode: AutopilotMode;
  minPlan: "STUDIO" | "PRO" | "GROWTH" | "ENTERPRISE";
  outputKinds: ("campaign_draft" | "copy_block" | "theme" | "schedule_hint")[];
};

/** Bump when catalog membership or default versions change */
export const AUTOPILOT_CATALOG_VERSION = "1.2.0";

export const AUTOPILOT_RECIPES: AutopilotRecipe[] = [
  {
    id: "campaign.full_draft",
    version: "1.2.0",
    name: "Full campaign draft",
    description:
      "Generate title, themed blocks, offer/capture modules from a natural-language brief.",
    defaultMode: "recommend",
    minPlan: "STUDIO",
    outputKinds: ["campaign_draft", "theme"],
  },
  {
    id: "campaign.copy_refresh",
    version: "1.1.0",
    name: "Copy refresh",
    description: "Rewrite headlines and body copy while preserving block structure.",
    defaultMode: "draft",
    minPlan: "STUDIO",
    outputKinds: ["copy_block"],
  },
  {
    id: "campaign.offer_pack",
    version: "1.1.0",
    name: "Offer + capture pack",
    description: "Coupon, contact capture, and FAQ tuned for promo campaigns.",
    defaultMode: "recommend",
    minPlan: "PRO",
    outputKinds: ["campaign_draft"],
  },
  {
    id: "campaign.theme_refresh",
    version: "1.0.0",
    name: "Theme refresh",
    description: "Propose palette and typography adjustments without rewriting blocks.",
    defaultMode: "draft",
    minPlan: "STUDIO",
    outputKinds: ["theme"],
  },
  {
    id: "campaign.schedule_pack",
    version: "1.0.0",
    name: "Schedule pack",
    description: "Timezone-aware launch windows and reminder schedule hints.",
    defaultMode: "recommend",
    minPlan: "PRO",
    outputKinds: ["schedule_hint", "campaign_draft"],
  },
];

const PLAN_RANK: Record<string, number> = {
  BASIC: 0,
  STUDIO: 1,
  PRO: 2,
  GROWTH: 3,
  ENTERPRISE: 4,
};

export function getRecipe(id: string): AutopilotRecipe | undefined {
  return AUTOPILOT_RECIPES.find((r) => r.id === id);
}

export function listRecipes(): AutopilotRecipe[] {
  return [...AUTOPILOT_RECIPES];
}

export function defaultRecipeId(): string {
  return "campaign.full_draft";
}

export function recipeAllowedForPlan(recipe: AutopilotRecipe, planTier?: string): boolean {
  if (!planTier || planTier === "BASIC") return false;
  const need = PLAN_RANK[recipe.minPlan] ?? 99;
  const have = PLAN_RANK[planTier] ?? 0;
  return have >= need;
}

export function recipesForPlan(planTier?: string): AutopilotRecipe[] {
  return AUTOPILOT_RECIPES.filter((r) => recipeAllowedForPlan(r, planTier));
}
