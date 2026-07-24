import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { redeem } from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

const schema = z.object({
  enrollmentId: z.string().min(1),
  points: z.number().int().positive(),
  reason: z.string().trim().min(1).max(240),
  idempotencyKey: z.string().trim().min(1).max(120),
  rewardId: z.string().optional(),
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
    const result = await redeem({
      businessId: business.id,
      enrollmentId: body.enrollmentId,
      points: body.points,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
      rewardId: body.rewardId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid redeem payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Redeem failed" },
      { status: 400 }
    );
  }
}
