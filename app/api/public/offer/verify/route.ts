import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cancelOfferCheckoutSession,
  completeOfferCheckoutSession,
  getOfferCheckoutSession,
} from "@/lib/marketing/offer-checkout";

export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().min(1),
  action: z.enum(["complete", "cancel", "status"]),
  offerSlug: z.string().optional(),
});

/** Authoritative verification for offer checkout simulation. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { sessionId, action, offerSlug } = parsed.data;

  if (action === "status") {
    const session = getOfferCheckoutSession(sessionId);
    if (!session) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    return NextResponse.json({
      sessionId: session.sessionId,
      status: session.status,
      offerSlug: session.offerSlug,
      offerVersion: session.offerVersion,
      mock: true,
    });
  }

  if (action === "cancel") {
    cancelOfferCheckoutSession(sessionId);
    const session = getOfferCheckoutSession(sessionId);
    const slug = session?.offerSlug || offerSlug || "tapconnect";
    return NextResponse.json({
      ok: true,
      status: "canceled",
      returnUrl: `/offer/${slug}?canceled=1`,
      mock: true,
    });
  }

  const result = completeOfferCheckoutSession(sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    verified: true,
    mock: true,
    honesty: "Local simulation verified server-side — not a live payment.",
    offerSlug: result.offer.slug,
    offerId: result.offer.id,
    offerVersion: result.offer.version,
    billingFrequency: result.session.billingFrequency,
    returnUrl: `/offer/return?session=${encodeURIComponent(sessionId)}`,
  });
}
