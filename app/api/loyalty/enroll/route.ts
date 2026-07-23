import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { enroll } from "@/lib/fusion/taploop";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";

const schema = z.object({
  programId: z.string().min(1),
  contactId: z.string().min(1),
  relationshipId: z.string().optional(),
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
