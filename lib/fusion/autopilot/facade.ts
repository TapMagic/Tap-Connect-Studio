/**
 * Autopilot facade — single entry for /api/ai/generate and Automation Team UI.
 */

import { nanoid } from "nanoid";
import { isFeatureExecutable, type FeatureOverride, type ResolveContext } from "@/lib/fusion/features/resolve";
import { isAiReady } from "@/lib/config/integrations";
import { generateCampaignDraft, type AiGenerateResult } from "@/lib/services/ai-generate";
import {
  checkAutopilotBudget,
  recordAutopilotBudgetUse,
} from "./budget";
import {
  estimateGenerationCost,
  groundPromptWithKnowledge,
  recordCostLedgerEntry,
} from "./knowledge";
import { defaultRecipeId, getRecipe } from "./recipes";
import { createProposal } from "./proposals";
import {
  modeAllowsGeneration,
  modeAutoApplies,
  resolveAutopilotMode,
  type AutopilotMode,
  type AutopilotProposal,
} from "./types";

export type AutopilotGenerateInput = {
  prompt: string;
  recipeId?: string;
  modeOverride?: AutopilotMode;
  planTier?: string;
  overrides?: FeatureOverride[];
  businessId?: string;
  actorId?: string;
};

export type AutopilotGenerateResult =
  | {
      ok: true;
      proposal: AutopilotProposal;
      draft: AiGenerateResult;
      autoApplied: boolean;
      budget?: { used: number; limit: number; monthKey: string };
    }
  | {
      ok: false;
      code:
        | "feature_disabled"
        | "mode_disabled"
        | "credentials_missing"
        | "plan_blocked"
        | "recipe_unknown"
        | "budget_exhausted";
      message: string;
      setup?: { envVars: string[]; signupUrl: string };
      budget?: { used: number; limit: number; monthKey: string };
    };

function planAllowsAutopilot(tier?: string): boolean {
  return tier !== "BASIC" && tier !== undefined;
}

export async function runAutopilotGenerate(
  input: AutopilotGenerateInput
): Promise<AutopilotGenerateResult> {
  const ctx: ResolveContext = { overrides: input.overrides, plan: input.planTier };
  const featureOn = isFeatureExecutable("ai.autopilot", ctx);
  const mode = resolveAutopilotMode(input.modeOverride, featureOn);

  // Kill switch / feature registry — refuse generation when disabled
  if (!featureOn) {
    return {
      ok: false,
      code: "feature_disabled",
      message:
        "Automation Team is disabled. Platform Admin can enable ai.autopilot in the Feature Registry.",
    };
  }

  if (!modeAllowsGeneration(mode)) {
    return {
      ok: false,
      code: "mode_disabled",
      message: "Automation Team is paused (mode: disabled).",
    };
  }

  if (!planAllowsAutopilot(input.planTier)) {
    return {
      ok: false,
      code: "plan_blocked",
      message: "Automation Team is available on Studio plan and above.",
    };
  }

  if (input.businessId) {
    const budget = await checkAutopilotBudget(input.businessId);
    if (!budget.ok) {
      return {
        ok: false,
        code: "budget_exhausted",
        message: budget.message ?? "Monthly Automation Team budget exhausted.",
        budget: { used: budget.used, limit: budget.limit, monthKey: budget.monthKey },
      };
    }
  }

  if (!isAiReady()) {
    return {
      ok: false,
      code: "credentials_missing",
      message: "OpenAI credentials required for Automation Team generation.",
      setup: {
        envVars: ["OPENAI_API_KEY"],
        signupUrl: "https://platform.openai.com",
      },
    };
  }

  const recipeId = input.recipeId ?? defaultRecipeId();
  const recipe = getRecipe(recipeId);
  if (!recipe) {
    return { ok: false, code: "recipe_unknown", message: `Unknown recipe: ${recipeId}` };
  }

  const grounded = input.businessId
    ? groundPromptWithKnowledge(input.businessId, input.prompt)
    : { groundedPrompt: input.prompt, snippets: [] };

  const draft = await generateCampaignDraft(grounded.groundedPrompt);
  const proposalId = nanoid();
  const autoApplied = modeAutoApplies(mode);
  const cost = estimateGenerationCost(grounded.groundedPrompt);

  const draftProposal: AutopilotProposal = {
    id: proposalId,
    businessId: input.businessId,
    recipeId,
    recipeVersion: recipe.version,
    mode,
    status: autoApplied ? "accepted" : "pending",
    prompt: input.prompt,
    summary: `Generated “${draft.title}” via ${recipe.name} v${recipe.version}`,
    artifacts: [
      {
        kind: "campaign_draft",
        label: draft.title,
        payload: { title: draft.title, blocks: draft.blocks, industry: draft.industry },
      },
      {
        kind: "theme",
        label: "Theme palette",
        payload: draft.theme,
      },
    ],
    warnings: [
      ...(mode === "recommend" ? ["Review blocks before Save — recommend mode"] : []),
      ...(grounded.snippets.length
        ? [`Grounded with ${grounded.snippets.length} Knowledge snippet(s)`]
        : ["No tenant Knowledge matched — generation used prompt only"]),
    ],
    createdAt: new Date().toISOString(),
  };

  let proposal = draftProposal;
  if (input.businessId) {
    proposal = await createProposal({
      id: proposalId,
      businessId: input.businessId,
      recipeId,
      recipeVersion: recipe.version,
      mode,
      status: draftProposal.status,
      prompt: input.prompt,
      summary: draftProposal.summary,
      artifacts: draftProposal.artifacts,
      warnings: draftProposal.warnings,
      actorId: input.actorId,
    });
    recordAutopilotBudgetUse(input.businessId);
    recordCostLedgerEntry({
      businessId: input.businessId,
      proposalId,
      recipeId,
      recipeVersion: recipe.version,
      estimatedTokens: cost.estimatedTokens,
      estimatedUsd: cost.estimatedUsd,
      model: cost.model,
    });
  }

  const budgetAfter = input.businessId
    ? await checkAutopilotBudget(input.businessId)
    : undefined;

  return {
    ok: true,
    proposal,
    draft,
    autoApplied,
    budget: budgetAfter
      ? { used: budgetAfter.used, limit: budgetAfter.limit, monthKey: budgetAfter.monthKey }
      : undefined,
  };
}

export function getAutopilotStatus(ctx: ResolveContext = {}) {
  const executable = isFeatureExecutable("ai.autopilot", ctx);
  const mode = resolveAutopilotMode(undefined, executable);
  return {
    featureId: "ai.autopilot",
    executable,
    mode,
    openaiConfigured: isAiReady(),
  };
}
