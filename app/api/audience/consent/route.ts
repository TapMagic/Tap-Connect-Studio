import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { recordConsent } from "@/lib/fusion/audience";

const schema = z.object({
  contactId: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS", "WALLET", "MARKETING"]),
  status: z.enum(["GRANTED", "DENIED", "WITHDRAWN"]),
  legalBasis: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());
    const consent = await recordConsent({
      businessId: business.id,
      contactId: body.contactId,
      channel: body.channel,
      status: body.status,
      legalBasis: body.legalBasis ?? "staff_recorded",
      sourceType: "audience_hub",
    });
    return NextResponse.json({ ok: true, consent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid consent payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Consent failed" },
      { status: 500 }
    );
  }
}
