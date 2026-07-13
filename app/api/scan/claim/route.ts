import { NextResponse } from "next/server";
import { z } from "zod";
import { claimScanSession } from "@/lib/services/scan";

const schema = z.object({
  deviceCode: z.string().min(4),
  accessCode: z.string().optional().nullable(),
});

/** Public — called when a phone taps a tag during an active scan session. */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await claimScanSession({
      deviceCode: body.deviceCode,
      accessCode: body.accessCode,
    });

    if (!result.claimed) {
      return NextResponse.json({ claimed: false, reason: result.reason });
    }

    return NextResponse.json({
      claimed: true,
      sessionId: result.session.id,
      device: result.device,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Claim scan error:", error);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
