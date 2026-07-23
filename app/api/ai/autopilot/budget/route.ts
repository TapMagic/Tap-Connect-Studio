import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  AUTOPILOT_CATALOG_VERSION,
  getAutopilotBudgetSummary,
  listRecipes,
} from "@/lib/fusion/autopilot";
import { listCostLedger } from "@/lib/fusion/autopilot/knowledge";
import { recipesForPlan } from "@/lib/fusion/autopilot/recipes";

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const tier = business.subscriptionTier;
    const summary = await getAutopilotBudgetSummary(business.id, tier);
    const ledger = listCostLedger(business.id, 25);

    return NextResponse.json({
      ok: true,
      catalogVersion: AUTOPILOT_CATALOG_VERSION,
      budget: {
        used: summary.used,
        limit: summary.limit,
        monthKey: summary.monthKey,
        ok: summary.ok,
        source: summary.source,
        estimatedUsdMonth: summary.estimatedUsdMonth,
        ledgerEntryCount: summary.ledgerEntryCount,
      },
      ledger: ledger.map((e) => ({
        id: e.id,
        proposalId: e.proposalId,
        recipeId: e.recipeId,
        recipeVersion: e.recipeVersion,
        estimatedTokens: e.estimatedTokens,
        estimatedUsd: e.estimatedUsd,
        model: e.model,
        createdAt: e.createdAt,
      })),
      recipes: recipesForPlan(tier).map((r) => ({
        id: r.id,
        version: r.version,
        name: r.name,
        minPlan: r.minPlan,
      })),
      catalogSize: listRecipes().length,
    });
  } catch (error) {
    console.error("Autopilot budget error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
