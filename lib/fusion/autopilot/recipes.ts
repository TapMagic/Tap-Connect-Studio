import type { AutopilotMode } from "./types";

export type AutopilotRecipe = {
  id: string;
  /** Semver-ish recipe version stamped onto proposals */
  version: string;
  name: string;
  description: string;
  defaultMode: AutopilotMode;
  minPlan: "STUDIO" | "PRO" | "GROWTH" | "ENTERPRISE";
  outputKinds: ("campaign_draft" | "copy_block" | "theme")[];
};

export const AUTOPILOT_RECIPES: AutopilotRecipe[] = [
  {
    id: "campaign.full_draft",
    version: "1.1.0",
    name: "Full campaign draft",
    description:
      "Generate title, themed blocks, offer/capture modules from a natural-language brief.",
    defaultMode: "recommend",
    minPlan: "STUDIO",
    outputKinds: ["campaign_draft", "theme"],
  },
  {
    id: "campaign.copy_refresh",
    version: "1.0.0",
    name: "Copy refresh",
    description: "Rewrite headlines and body copy while preserving block structure.",
    defaultMode: "draft",
    minPlan: "STUDIO",
    outputKinds: ["copy_block"],
  },
  {
    id: "campaign.offer_pack",
    version: "1.0.1",
    name: "Offer + capture pack",
    description: "Coupon, contact capture, and FAQ tuned for promo campaigns.",
    defaultMode: "recommend",
    minPlan: "PRO",
    outputKinds: ["campaign_draft"],
  },
];

export function getRecipe(id: string): AutopilotRecipe | undefined {
  return AUTOPILOT_RECIPES.find((r) => r.id === id);
}

export function defaultRecipeId(): string {
  return "campaign.full_draft";
}
