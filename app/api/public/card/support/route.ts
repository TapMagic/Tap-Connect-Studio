import { NextResponse } from "next/server";
import { z } from "zod";
import { submitCardSupportEntry } from "@/lib/fusion/card/support-entry";
import { loadFeatureContext } from "@/lib/fusion/features/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  businessId: z.string().min(1),
  email: z.string().email(),
  name: z.string().max(120).optional(),
  question: z.string().min(3).max(4000),
  requestType: z.enum(["question", "feedback", "complaint", "billing"]).default("question"),
  consentGiven: z.boolean(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  sectionId: z.string().optional(),
});

/**
 * Public Card Support entry — no auth.
 * Creates Contact/Consent/Relationship → TapInbox (+ optional TapCase).
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const featureCtx = await loadFeatureContext().catch(() => ({}));
    const result = await submitCardSupportEntry({
      ...body,
      featureOverrides: featureCtx,
    });

    if (!result.ok) {
      const status =
        result.code === "consent_required" || result.code === "validation"
          ? 400
          : result.code === "feature_off"
            ? 503
            : result.code === "business_not_found"
              ? 404
              : 500;
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          code: result.code,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      threadId: result.threadId,
      caseId: result.caseId,
      myTapPath: result.myTapPath,
      relationshipToken: result.publicToken,
      /** Host suggestion is not returned to the public visitor */
      mock: true,
      classification: result.classification,
      message:
        "Thanks — your question was sent. We’ll follow up by email. You can also reopen this relationship from MyTap.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid support form", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Card support entry error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to submit question", code: "server" },
      { status: 500 }
    );
  }
}
