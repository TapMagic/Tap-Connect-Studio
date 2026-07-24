import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { reverse } from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

const schema = z.object({
  entryId: z.string().min(1),
  reason: z.string().trim().min(1).max(240),
  idempotencyKey: z.string().trim().min(1).max(120),
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
    const result = await reverse({
      businessId: business.id,
      entryId: body.entryId,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid reverse payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reverse failed" },
      { status: 400 }
    );
  }
}
