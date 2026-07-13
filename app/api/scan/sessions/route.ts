import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { createScanSession } from "@/lib/services/scan";

const schema = z.object({
  sessionType: z
    .enum(["OWNER_PHONE", "DESKTOP_PHONE", "REMOTE_STAFF", "SUPPORT_ASSISTED"])
    .default("DESKTOP_PHONE"),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = schema.parse(await request.json().catch(() => ({})));

    const session = await createScanSession({
      businessId: business.id,
      userId: user.id,
      sessionType: body.sessionType,
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Create scan session error:", error);
    return NextResponse.json({ error: "Failed to start scan session" }, { status: 500 });
  }
}
