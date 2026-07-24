import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { adjust } from "@/lib/fusion/taploop";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";

const schema = z.object({
  enrollmentId: z.string().min(1),
  points: z.number().int().positive(),
  direction: z.enum(["credit", "debit"]),
  reason: z.string().trim().min(1).max(240),
  idempotencyKey: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());
    if (!isFeatureEnabled("loyalty.taploop", { overrides })) {
      return NextResponse.json(
        { error: "TapLoop disabled", feature: "loyalty.taploop" },
        { status: 403 }
      );
    }

    const body = schema.parse(await request.json());
    const result = await adjust({
      businessId: business.id,
      enrollmentId: body.enrollmentId,
      points: body.points,
      direction: body.direction,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid adjust payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Adjust failed" },
      { status: 400 }
    );
  }
}
