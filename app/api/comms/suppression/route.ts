import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { checkAnyFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  addSuppression,
  listSuppressions,
  removeSuppression,
} from "@/lib/fusion/comms/suppression";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkAnyFeatureGate(["comms.email", "comms.messaging"], featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
    }
    const rows = await listSuppressions(business.id);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    channel: z.string().min(1),
    address: z.string().min(1),
    reason: z.string().optional(),
    sourceType: z.string().optional(),
  }),
  z.object({
    action: z.literal("remove"),
    channel: z.string().min(1),
    address: z.string().min(1),
  }),
]);

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const featureEnabled =
      isFeatureEnabled("comms.email", featureCtx) ||
      isFeatureEnabled("comms.messaging", featureCtx);
    if (!featureEnabled) {
      const gate = checkAnyFeatureGate(["comms.email", "comms.messaging"], featureCtx);
      if (!gate.ok) {
        return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
      }
    }

    const body = postSchema.parse(await request.json());

    if (body.action === "add") {
      const result = await addSuppression({
        businessId: business.id,
        channel: body.channel as Parameters<typeof addSuppression>[0]["channel"],
        address: body.address,
        reason: body.reason,
        sourceType: body.sourceType ?? "manual",
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, row: result.row });
    }

    const removed = await removeSuppression({
      businessId: business.id,
      channel: body.channel as Parameters<typeof removeSuppression>[0]["channel"],
      address: body.address,
    });
    if (!removed) {
      return NextResponse.json({ error: "Not found or invalid" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
