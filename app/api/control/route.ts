import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getControlActor } from "@/lib/control/identity";
import { performControlMutation } from "@/lib/control/mutations";
import { supportSessionAllows, supportSessionIsActive } from "@/lib/control/support-policy";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function supportPolicyAction(operation: string): string {
  const aliases: Record<string, string> = {
    "role.assign": "roles.assign",
    "user.permission": "users.permissions.manage",
    "business.schedule_deletion": "deletion.permanent",
    "demo.publish": "publication.publish",
    "demo.binding.activate": "demo.bind_landing",
  };
  return aliases[operation] ?? operation;
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  if (!sameOrigin(requestHeaders.get("origin"), requestHeaders.get("host"))) {
    return NextResponse.json({ ok: false, error: "Cross-origin mutation rejected." }, { status: 403 });
  }
  const actor = await getControlActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Control Room authorization required." }, { status: 401 });
  }

  let input: { operation?: unknown; data?: unknown };
  try {
    input = (await request.json()) as { operation?: unknown; data?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }
  const operation = typeof input.operation === "string" ? input.operation : "";
  const cookieStore = await cookies();
  const viewAsUserId = cookieStore.get("tapconnect_view_as")?.value;
  if (viewAsUserId && !["view_as.exit"].includes(operation)) {
    return NextResponse.json(
      { ok: false, error: "View as User is permanently read-only. Exit it before making changes." },
      { status: 403 },
    );
  }

  const supportSessionId = cookieStore.get("tapconnect_support_session")?.value;
  if (supportSessionId && operation !== "support.exit") {
    const supportSession = await prisma.supportSession.findUnique({
      where: { id: supportSessionId },
    });
    if (!supportSession || !supportSessionIsActive(supportSession)) {
      const response = NextResponse.json(
        { ok: false, error: "Support Session expired. Exit and start a new governed session." },
        { status: 403 },
      );
      response.cookies.set("tapconnect_support_session", "", { maxAge: 0, path: "/" });
      return response;
    }
    const decision = supportSessionAllows(supportPolicyAction(operation));
    if (!decision.allowed) {
      return NextResponse.json({ ok: false, error: decision.reason }, { status: 403 });
    }
  }

  try {
    const result = await performControlMutation(actor, input);
    const response = NextResponse.json(result);
    if (result.cookie) {
      response.cookies.set(result.cookie.name, result.cookie.value, {
        maxAge: result.cookie.maxAge,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Control Room action failed.";
    const status = /forbidden|authorization|required permission/i.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

