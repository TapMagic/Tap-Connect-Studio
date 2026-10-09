import { NextResponse } from "next/server";
import { ensureLocalControlFixtures } from "@/lib/control/bootstrap";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { prisma } from "@/lib/db";
import { CONTROL_RETURN_COOKIE, WORKSPACE_COOKIE } from "@/lib/workspace/context";
import { prepareCompositionParentReviewDraft } from "@/lib/fusion/card/review-composition-fixture";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { Prisma } from "@prisma/client";

/**
 * Stable protected Studio entry. Production authentication is enforced by the
 * route proxy; local development additionally selects the deterministic Rich
 * workspace before entering the production-backed Experience Library.
 */
export async function GET(request: Request) {
  const host = request.headers.get("host") || "127.0.0.1:3050";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const destination = new URL("/dashboard/experiences/library", `${protocol}://${host}`);
  if (!isLocalDevAuthEnabled()) return NextResponse.redirect(destination);
  await ensureLocalControlFixtures();
  const [rich, business] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId: "local:rich" }, select: { id: true } }),
    prisma.business.findUnique({ where: { slug: "the-monkey-cage" }, select: { id: true } }),
  ]);
  if (!rich || !business) return new Response("Local review fixtures are unavailable.", { status: 503 });
  const membership = await prisma.businessUser.findUnique({
    where: { businessId_userId: { businessId: business.id, userId: rich.id } },
    select: { role: true },
  });
  if (!membership) return new Response("Rich review access is unavailable.", { status: 503 });

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
    select: { tapCardDraft: true, tapCard: true, tapCardDraftRevision: true },
  });
  if (!brandKit) return new Response("Rich review Card is unavailable.", { status: 503 });
  const reviewDraft = prepareCompositionParentReviewDraft(
    (brandKit.tapCardDraft ?? brandKit.tapCard) as unknown as TapConnectCardConfig,
  );
  if (reviewDraft.changed) {
    await prisma.brandKit.update({
      where: { businessId: business.id },
      data: {
        tapCardDraft: reviewDraft.config as unknown as Prisma.InputJsonValue,
        tapCardDraftRevision: { increment: 1 },
        tapCardDraftUpdatedAt: new Date(),
      },
    });
  }

  const response = NextResponse.redirect(destination);
  const options = { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/", maxAge: 60 * 60 * 8 };
  response.cookies.set("tapconnect_control_identity", "rich", options);
  response.cookies.set(WORKSPACE_COOKIE, business.id, options);
  response.cookies.set(CONTROL_RETURN_COOKIE, "/control?section=demo", options);
  response.cookies.delete("tapconnect_view_as");
  response.cookies.delete("tapconnect_support_session");
  return response;
}
