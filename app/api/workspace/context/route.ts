import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/control/audit";
import { prisma } from "@/lib/db";
import {
  CONTROL_RETURN_COOKIE,
  safeControlReturnPath,
  WORKSPACE_COOKIE,
} from "@/lib/workspace/context";
import { cookies } from "next/headers";

const requestSchema = z.object({
  businessId: z.string().min(1),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const user = await requireSessionUser();
    const membership = user.memberships.find(
      (candidate) => candidate.businessId === input.businessId,
    );
    const cookieStore = await cookies();
    const supportId = cookieStore.get("tapconnect_support_session")?.value;
    const support = !membership && supportId
      ? await prisma.supportSession.findFirst({
          where: {
            id: supportId,
            actorUserId: user.id,
            businessId: input.businessId,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
          },
        })
      : null;

    if (!membership && !support) {
      return NextResponse.json(
        { error: "You do not have access to that workspace." },
        { status: 403 },
      );
    }
    if (cookieStore.get("tapconnect_view_as")?.value) {
      return NextResponse.json(
        { error: "Exit read-only View as User before opening Studio." },
        { status: 409 },
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: input.businessId },
      select: { id: true, name: true, lifecycleState: true },
    });
    if (!business || ["DELETED", "DELETION_SCHEDULED"].includes(business.lifecycleState)) {
      return NextResponse.json(
        { error: "That workspace is not available in Studio." },
        { status: 409 },
      );
    }

    const returnTo = safeControlReturnPath(input.returnTo);
    const response = NextResponse.json({
      ok: true,
      workspace: { id: business.id, name: business.name },
      href: "/dashboard",
      returnTo,
    });
    response.cookies.set(WORKSPACE_COOKIE, business.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set(CONTROL_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    await appendAuditEvent({
      actorId: user.id,
      actingSubjectId: support?.subjectUserId,
      businessId: business.id,
      action: "workspace.enter_studio",
      permissionUsed: support ? "users.support_impersonate" : "business.membership",
      resourceType: "Business",
      resourceId: business.id,
      reason: support ? "Opened scoped workspace during Support Session" : "Opened owned workspace in Studio",
      supportSessionId: support?.id,
      newValue: { surface: "Studio", returnTo },
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Choose a valid workspace." }, { status: 400 });
    }
    console.error("Workspace context error:", error);
    return NextResponse.json({ error: "Workspace could not be opened." }, { status: 500 });
  }
}
