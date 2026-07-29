import { NextResponse } from "next/server";
import { revokePreviewSession } from "@/lib/fusion/creative-studio/preview/tokens";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token || "";
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Revoke request was incomplete",
        consequence: "Preview may still be reachable until it expires.",
        recovery: "Provide the preview token and try again.",
      },
      { status: 400 }
    );
  }
  const result = revokePreviewSession(token);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Preview could not be revoked",
        consequence: "The link may remain valid until expiry.",
        recovery: "Wait for expiry or generate a new session.",
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
