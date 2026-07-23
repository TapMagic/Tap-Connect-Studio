import { NextResponse } from "next/server";
import { z } from "zod";
import { updateTapSavePreferences } from "@/lib/fusion/tapsave";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";

const prefsSchema = z.object({
  publicToken: z.string().min(1),
  preferences: z.object({
    emailOptIn: z.boolean().optional(),
    smsOptIn: z.boolean().optional(),
    walletOptIn: z.boolean().optional(),
    frequency: z.enum(["immediate", "weekly", "monthly", "off"]).optional(),
  }),
});

export async function PATCH(request: Request) {
  try {
    const body = prefsSchema.parse(await request.json());
    const overrides = toResolveOverrides(await listFeatureOverrides());
    const result = await updateTapSavePreferences({
      publicToken: body.publicToken,
      preferences: body.preferences,
      overrides,
    });

    if (!result.ok) {
      const status =
        result.code === "feature_disabled" ? 503 : result.code === "not_found" ? 404 : 500;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      preferences: result.preferences,
      moment: result.moment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid preferences payload" }, { status: 400 });
    }
    console.error("TapSave preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
