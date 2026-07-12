import { NextResponse } from "next/server";
import { z } from "zod";
import { isPlatformAdmin, requireBusiness } from "@/lib/auth";
import { PLAN_MEDIA_LIMITS } from "@/lib/config/limits";
import { aiGeneratePlaceholder } from "@/lib/integrations/placeholders";
import { generateCampaignDraft } from "@/lib/services/ai-generate";
import type { PlanTier } from "@prisma/client";

const schema = z.object({
  prompt: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  try {
    const placeholder = await aiGeneratePlaceholder();
    if (placeholder) {
      return NextResponse.json(placeholder, { status: 503 });
    }

    const { user, business } = await requireBusiness();
    if (!isPlatformAdmin(user)) {
      const tier = business.subscriptionTier as PlanTier;
      const aiLimit = PLAN_MEDIA_LIMITS[tier]?.aiRequestsPerMonth ?? 0;
      if (aiLimit <= 0) {
        return NextResponse.json(
          { error: "AI builder is available on Studio plan and above." },
          { status: 403 }
        );
      }
    }

    const body = schema.parse(await request.json());
    const draft = await generateCampaignDraft(body.prompt);

    return NextResponse.json({
      ok: true,
      title: draft.title,
      blocks: draft.blocks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Describe your campaign in a bit more detail (at least a short sentence)." },
        { status: 400 }
      );
    }
    console.error("AI generate error:", error);
    return NextResponse.json({ error: "Failed to generate campaign draft" }, { status: 500 });
  }
}
