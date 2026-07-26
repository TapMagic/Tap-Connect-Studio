import { NextResponse } from "next/server";
import { z } from "zod";
import { keepCard } from "@/lib/fusion/tapsave";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";

const keepSchema = z.object({
  businessId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  visitorRef: z.string().optional(),
  /** Opt-in only — never preselect marketing consent */
  consentGiven: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const body = keepSchema.parse(await request.json());
    const overrides = toResolveOverrides(await listFeatureOverrides());
    const result = await keepCard({ ...body, overrides });

    if (!result.ok) {
      const status =
        result.code === "feature_disabled"
          ? 503
          : result.code === "invalid_email"
            ? 400
            : 500;
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          ...(result.code === "feature_disabled"
            ? { placeholder: true, feature: "tapsave.core" }
            : {}),
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      publicToken: result.publicToken,
      myTapUrl: result.myTapUrl,
      firstSave: result.firstSave,
      moment: result.moment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Keep Card payload" }, { status: 400 });
    }
    console.error("TapSave keep error:", error);
    return NextResponse.json({ error: "Failed to keep card" }, { status: 500 });
  }
}
