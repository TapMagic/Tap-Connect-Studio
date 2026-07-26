import { NextResponse } from "next/server";
import { z } from "zod";
import { submitCardOfferEntry } from "@/lib/fusion/card/offer-entry";
import { loadFeatureContext } from "@/lib/fusion/features/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  businessId: z.string().min(1),
  action: z.enum(["view", "claim", "lead", "keep"]),
  campaignId: z.string().min(1),
  sectionId: z.string().optional(),
  offerBlockId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  consentGiven: z.boolean().optional(),
  requestFollowUp: z.boolean().optional(),
});

/**
 * Public Card Offer entry — view / claim / lead / keep.
 * No auth. Campaign owns authoritative offer; Card is projection.
 */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const featureCtx = await loadFeatureContext().catch(() => ({}));
    const result = await submitCardOfferEntry({
      ...body,
      featureOverrides: featureCtx,
    });

    if (!result.ok) {
      const status =
        result.code === "consent_required" || result.code === "validation"
          ? 400
          : result.code === "feature_off"
            ? 503
            : result.code === "business_not_found" ||
                result.code === "offer_not_found" ||
                result.code === "campaign_not_found"
              ? 404
              : 500;
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      action: result.action,
      confirmation: result.confirmation,
      statusLabel: result.statusLabel,
      offer: {
        title: result.offer.title,
        description: result.offer.description,
        code: result.offer.code,
        expiresAt: result.offer.expiresAt,
        ctaLabel: result.offer.ctaLabel,
        campaignId: result.offer.campaignId,
        offerBlockId: result.offer.offerBlockId,
      },
      leadId: result.leadId,
      myTapPath: result.myTapPath,
      relationshipToken: result.publicToken,
      followUp: result.followUp,
      mock: true,
      classification: result.classification,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid offer form", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Card offer entry error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process offer", code: "server" },
      { status: 500 }
    );
  }
}
