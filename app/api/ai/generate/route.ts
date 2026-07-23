import { NextResponse } from "next/server";
import { z } from "zod";
import { isPlatformAdmin, requireBusiness } from "@/lib/auth";
import { PLAN_MEDIA_LIMITS } from "@/lib/config/limits";
import { runAutopilotGenerate } from "@/lib/fusion/autopilot";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import type { PlanTier } from "@prisma/client";

const schema = z.object({
  prompt: z.string().trim().min(8).max(2000),
  recipeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());

    if (!isPlatformAdmin(user)) {
      const tier = business.subscriptionTier as PlanTier;
      const aiLimit = PLAN_MEDIA_LIMITS[tier]?.aiRequestsPerMonth ?? 0;
      if (aiLimit <= 0) {
        return NextResponse.json(
          { error: "Automation Team is available on Studio plan and above." },
          { status: 403 }
        );
      }
    }

    const body = schema.parse(await request.json());
    const result = await runAutopilotGenerate({
      prompt: body.prompt,
      recipeId: body.recipeId,
      planTier: business.subscriptionTier,
      overrides,
      businessId: business.id,
      actorId: user.id,
    });

    if (!result.ok) {
      if (result.code === "credentials_missing" && result.setup) {
        return NextResponse.json(
          {
            placeholder: true,
            feature: "automation_team",
            message: result.message,
            setup: result.setup,
          },
          { status: 503 }
        );
      }
      if (result.code === "feature_disabled") {
        return NextResponse.json(
          {
            placeholder: true,
            feature: "ai.autopilot",
            message: result.message,
          },
          { status: 503 }
        );
      }
      if (result.code === "budget_exhausted") {
        return NextResponse.json(
          {
            error: result.message,
            budget: result.budget,
          },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    const { draft, proposal, autoApplied, budget } = result;

    return NextResponse.json({
      ok: true,
      title: draft.title,
      industry: draft.industry,
      theme: draft.theme,
      blocks: draft.blocks,
      autopilot: {
        proposalId: proposal.id,
        recipeId: proposal.recipeId,
        recipeVersion: proposal.recipeVersion,
        mode: proposal.mode,
        status: proposal.status,
        summary: proposal.summary,
        autoApplied,
        warnings: proposal.warnings,
        artifacts: proposal.artifacts.map((a) => ({ kind: a.kind, label: a.label })),
        budget,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Describe your campaign in a bit more detail (at least a short sentence)." },
        { status: 400 }
      );
    }
    console.error("Autopilot generate error:", error);
    return NextResponse.json({ error: "Failed to generate campaign draft" }, { status: 500 });
  }
}
