/**
 * @deprecated Legacy Automation Team type world (pre-F0).
 *
 * Authoritative Autopilot contracts live in:
 * - ./types.ts — AutopilotMode, AutopilotProposal, proposal lifecycle (J16)
 * - ./recipes.ts — campaign generation recipe catalog (J16)
 * - ./plan.ts — AutopilotPlan
 * - ./knowledge-fact.ts — KnowledgeFact
 * - ./approval-policy.ts — Approval Policy Engine
 * - ./outcome-recipe.ts — certified outcome recipes (card.offer.measurable)
 * - ./intervention.ts — structured human-intervention reasons
 *
 * This module is retained as a compatibility shim. It is not imported by active
 * runtime consumers as of F0. Prefer importing from `@/lib/fusion/autopilot`.
 * Do not add new worker-swarm or duplicate recipe catalogs here.
 */

import type { AutopilotMode, AutopilotProposal as AuthoritativeProposal } from "./types";
import {
  AUTOPILOT_RECIPES as CATALOG_RECIPES,
  type AutopilotRecipe as CatalogRecipe,
} from "./recipes";

/** @deprecated Use AutopilotMode from ./types */
export type AutomationMode =
  | AutopilotMode
  | "low_risk_auto"
  | "approval_required"
  | "human_takeover"
  | "emergency_paused";

/**
 * @deprecated Worker-role swarm is not part of the F0 Autopilot outcome system.
 * Retained only for compatibility with historical docs / unused imports.
 */
export type AutomationWorkerRole =
  | "inbox_scout"
  | "communications_clerk"
  | "conversation"
  | "campaign"
  | "offer"
  | "relationship"
  | "integration_scout"
  | "recovery"
  | "insight"
  | "documentation"
  | "security"
  | "ux"
  | "build_foreman"
  | "reviewer";

/**
 * @deprecated Use AutopilotProposal from ./types (authoritative proposal lifecycle).
 * Legacy shape kept for type compatibility only — do not persist new instances.
 */
export type AutopilotProposal = {
  id: string;
  businessId: string;
  role: AutomationWorkerRole;
  mode: AutomationMode;
  title: string;
  summary: string;
  artifacts: Array<{
    type: "card" | "campaign" | "email" | "journey" | "form" | "brand";
    payload: Record<string, unknown>;
  }>;
  provenance: Array<{ source: string; ref?: string }>;
  gaps: string[];
  questions: string[];
  model?: string;
  promptVersion?: string;
  recipeId?: string;
  estimatedCostUsd?: number;
  qualityScore?: number;
  createdAt: string;
  status: "draft" | "proposed" | "accepted" | "rejected" | "partial";
};

/**
 * @deprecated Use AutopilotRecipe from ./recipes (generation catalog)
 * or CertifiedOutcomeRecipe from ./outcome-recipe.
 */
export type AutopilotRecipe = {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

/**
 * @deprecated Legacy stub catalog. Authoritative generation catalog is ./recipes.ts.
 * Certified outcome recipes are ./outcome-recipe.ts.
 */
export const AUTOPILOT_RECIPES: AutopilotRecipe[] = [
  {
    id: "card.from_website",
    name: "Card from website",
    description: "Extract business facts and propose a complete Tap Card",
    inputs: ["website_url", "brand_kit"],
    outputs: ["card", "action_deck"],
  },
  {
    id: "campaign.from_offer",
    name: "Campaign from offer brief",
    description: "Build offer page + schedule suggestion",
    inputs: ["offer_text", "timezone"],
    outputs: ["campaign", "schedule_hint"],
  },
  {
    id: "email.follow_up",
    name: "Follow-up email",
    description: "Consent-aware thank-you / promo email draft",
    inputs: ["lead", "brand_kit"],
    outputs: ["email"],
  },
];

/** Map a legacy team proposal status toward the authoritative lifecycle where possible */
export function mapLegacyProposalStatus(
  status: AutopilotProposal["status"]
): AuthoritativeProposal["status"] | "pending" {
  switch (status) {
    case "proposed":
    case "draft":
      return "pending";
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "partial":
      return "partial";
    default:
      return "pending";
  }
}

/** Bridge helper: catalog recipes remain the generation source of truth */
export function authoritativeGenerationRecipes(): CatalogRecipe[] {
  return [...CATALOG_RECIPES];
}

export function hostFacingAutomationLabel(): string {
  return "Automation Team";
}

/** @deprecated Prefer Approval Policy Engine + AutopilotMode helpers in ./types */
export function canAutoRun(mode: AutomationMode, risk: "low" | "medium" | "high"): boolean {
  if (mode === "disabled" || mode === "emergency_paused" || mode === "human_takeover") return false;
  if (mode === "low_risk_auto") return risk === "low";
  if (mode === "auto_apply" || mode === "internal_only") return risk === "low";
  return false;
}
