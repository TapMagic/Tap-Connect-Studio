import { NextResponse } from "next/server";
import {
  getPreviewSession,
  revokePreviewSession,
} from "@/lib/fusion/creative-studio/preview/tokens";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let businessId: string;
  try {
    const context = await requireBusinessCapability("preview.mutate");
    businessId = context.business.id;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Preview revoke requires a signed-in Studio session",
        consequence: "Preview remains reachable until it expires.",
        recovery: "Sign in to the owning workspace and try again.",
      },
      { status: 401 }
    );
  }
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
  const existing = getPreviewSession(token);
  if (!existing.ok || existing.record.businessId !== businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Preview session does not belong to this workspace",
        consequence: "No preview was revoked.",
        recovery: "Open the owning workspace and try again.",
      },
      { status: 403 }
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
