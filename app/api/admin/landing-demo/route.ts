import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import { publishLandingCardDemo } from "@/lib/services/landing-demos";

const schema = z.object({
  publish: z.boolean(),
  tapCard: z.any().optional(),
});

/** Admin-only: publish this workspace's Tap Connect Card to the public landing demo (card slot). */
export async function POST(request: Request) {
  try {
    const { business } = await requirePlatformAdmin();
    const body = schema.parse(await request.json());
    const result = await publishLandingCardDemo({
      businessId: business.id,
      publish: body.publish,
      tapCard: body.tapCard,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("landing-demo publish", error);
    return NextResponse.json({ error: "Failed to publish landing demo" }, { status: 500 });
  }
}
