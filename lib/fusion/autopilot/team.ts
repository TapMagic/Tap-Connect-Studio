/**
 * Autopilot / Automation Team — replaces V1 AI as the quality standard.
 * Entry points preserved; architecture is new.
 */

export type AutomationMode =
  | "disabled"
  | "draft"
  | "recommend"
  | "low_risk_auto"
  | "approval_required"
  | "human_takeover"
  | "emergency_paused";

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

export type AutopilotRecipe = {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

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

export function hostFacingAutomationLabel(): string {
  return "Automation Team";
}

export function canAutoRun(mode: AutomationMode, risk: "low" | "medium" | "high"): boolean {
  if (mode === "disabled" || mode === "emergency_paused" || mode === "human_takeover") return false;
  if (mode === "low_risk_auto") return risk === "low";
  return false;
}
