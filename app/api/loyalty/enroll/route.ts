import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { enroll } from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

const schema = z.object({
  programId: z.string().min(1),
  contactId: z.string().min(1),
  relationshipId: z.string().optional(),
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
    const enrollment = await enroll({
      businessId: business.id,
      programId: body.programId,
      contactId: body.contactId,
      relationshipId: body.relationshipId,
    });
    return NextResponse.json({ ok: true, enrollment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid enroll payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Enroll failed";
    const status = message.includes("Consent") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
