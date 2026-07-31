import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { acceptControlInvitation } from "@/lib/control/invitation-acceptance";
import { resolveControlIdentity } from "@/lib/control/identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (origin && (!host || new URL(origin).host !== host)) {
    return NextResponse.json({ ok: false, error: "Cross-origin mutation rejected." }, { status: 403 });
  }
  const identity = await resolveControlIdentity();
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: "Authenticate before accepting this invitation." },
      { status: 401 },
    );
  }
  try {
    const input = (await request.json()) as { token?: unknown };
    if (typeof input.token !== "string" || input.token.length < 20) {
      throw new Error("A valid invitation token is required.");
    }
    return NextResponse.json(
      await acceptControlInvitation({ token: input.token, identity }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invitation acceptance failed.",
      },
      { status: 400 },
    );
  }
}
