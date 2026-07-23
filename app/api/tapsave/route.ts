import { NextResponse } from "next/server";
import { z } from "zod";
import { keepCard, updateTapSavePreferences } from "@/lib/fusion/tapsave/service";
import { defaultTapSavePreferences } from "@/lib/fusion/tapsave/moments";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";

const keepSchema = z.object({
  businessId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  consentMarketing: z.boolean().optional(),
  source: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = keepSchema.parse(await request.json());
    const featureCtx = await loadFeatureContext();
    const result = await keepCard({
      businessId: body.businessId,
      email: body.email,
      name: body.name,
      phone: body.phone,
      campaignId: body.campaignId,
      deviceSlotId: body.deviceSlotId,
      consentGiven: body.consentMarketing,
      overrides: featureCtx.overrides,
    });
    if (!result.ok) {
      const status = result.code === "feature_disabled" ? 503 : 400;
      return NextResponse.json(
        {
          ok: false,
          error: result.message,
          code: result.code,
          placeholder: result.code === "feature_disabled",
          feature: "tapsave.core",
        },
        { status }
      );
    }
    return NextResponse.json({
      ok: true,
      publicToken: result.publicToken,
      myTapPath: result.myTapUrl,
      alreadySaved: !result.firstSave,
      momentKind: result.moment.kind,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Keep Card request" }, { status: 400 });
    }
    console.error("TapSave keep error:", error);
    return NextResponse.json({ error: "Failed to keep card" }, { status: 500 });
  }
}

const prefsSchema = z.object({
  publicToken: z.string().min(1),
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  walletOptIn: z.boolean().optional(),
  frequency: z.enum(["immediate", "weekly", "monthly", "off"]).optional(),
});

export async function PATCH(request: Request) {
  try {
    const featureCtx = await loadFeatureContext();
    if (!isFeatureEnabled("tapsave.core", featureCtx)) {
      return NextResponse.json(
        {
          ok: false,
          error: "TapSave is not enabled for this workspace.",
          code: "feature_disabled",
          placeholder: true,
          feature: "tapsave.core",
        },
        { status: 503 }
      );
    }
    const body = prefsSchema.parse(await request.json());
    const result = await updateTapSavePreferences({
      publicToken: body.publicToken,
      preferences: {
        emailOptIn: body.emailOptIn,
        smsOptIn: body.smsOptIn,
        walletOptIn: body.walletOptIn,
        frequency: body.frequency,
      },
      overrides: featureCtx.overrides,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, preferences: result.preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }
    console.error("TapSave prefs error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

/** Defaults for clients — no PII. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    defaults: defaultTapSavePreferences(),
    feature: "tapsave.core",
  });
}
