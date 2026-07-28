import { NextResponse } from "next/server";
import { z } from "zod";
import { createOfferCheckoutSession } from "@/lib/marketing/offer-checkout";
import { getPublishedOffer } from "@/lib/marketing/offer-catalog";

export const dynamic = "force-dynamic";

const Body = z.object({
  offerSlug: z.string().min(1),
  billingFrequency: z.enum(["monthly", "annual", "one_time"]).optional(),
  referralCode: z.string().max(64).optional().nullable(),
});

/**
 * Initiate checkout from a published offer Card.
 * Returns a TapConnect-owned simulation URL — never a raw Stripe Payment Link.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!getPublishedOffer(parsed.data.offerSlug)) {
      return NextResponse.json({ error: "unknown_offer" }, { status: 404 });
    }
    const result = createOfferCheckoutSession({
      offerSlug: parsed.data.offerSlug,
      billingFrequency: parsed.data.billingFrequency,
      referralCode: parsed.data.referralCode ?? null,
    });
    return NextResponse.json({
      mock: true,
      honesty: result.honesty,
      sessionId: result.session.sessionId,
      checkoutUrl: result.checkoutUrl,
      offerSlug: result.session.offerSlug,
      /** Price key only — mapped server-side; not a secret */
      stripePriceKey: result.session.stripePriceKey,
    });
  } catch {
    return NextResponse.json({ error: "checkout_init_failed" }, { status: 500 });
  }
}
