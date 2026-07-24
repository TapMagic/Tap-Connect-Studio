import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { award } from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

const schema = z.object({
  enrollmentId: z.string().min(1),
  points: z.number().int().positive(),
  reason: z.string().trim().min(1).max(240),
  idempotencyKey: z.string().trim().min(1).max(120),
  evidenceId: z.string().optional(),
  campaignId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkFeatureGate("loyalty.taploop", featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
    }

    const body = schema.parse(await request.json());
    const result = await award({
      businessId: business.id,
      enrollmentId: body.enrollmentId,
      points: body.points,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
      evidenceId: body.evidenceId,
      campaignId: body.campaignId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid award payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Award failed" },
      { status: 400 }
    );
  }
}
