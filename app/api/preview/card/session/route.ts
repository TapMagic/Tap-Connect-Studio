import { NextResponse } from "next/server";
import {
  createPreviewSession,
  getPreviewSession,
  updatePreviewSession,
} from "@/lib/fusion/creative-studio/preview/tokens";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import {
  buildPreviewAbsoluteUrl,
  resolvePreviewBaseUrl,
} from "@/lib/fusion/creative-studio/preview/url";

export const runtime = "nodejs";

function ownerFacingError(
  error: string,
  consequence: string,
  recovery: string,
  status = 400
) {
  return NextResponse.json(
    { ok: false, error, consequence, recovery },
    { status }
  );
}

async function resolveBusinessId(): Promise<string> {
  const { business } = await requireBusinessCapability("preview.mutate");
  return business.id;
}

export async function POST(req: Request) {
  let businessId: string;
  try {
    businessId = await resolveBusinessId();
  } catch {
    return ownerFacingError(
      "Preview requires a signed-in Studio session",
      "Phone preview was not created.",
      "Sign in to TapConnect Studio, then try again.",
      401
    );
  }

  let body: {
    snapshot?: unknown;
    profile?: unknown;
    businessName?: string;
    cardName?: string;
    brandKitId?: string;
    logoUrl?: string | null;
    reviewUrl?: string | null;
    revision?: number;
    mode?: "follow" | "freeze";
  };
  try {
    body = await req.json();
  } catch {
    return ownerFacingError(
      "Preview request was incomplete",
      "Phone preview was not created.",
      "Try again from Live device in the editor."
    );
  }

  if (!body.snapshot || !body.profile) {
    return ownerFacingError(
      "Preview draft was missing",
      "Phone preview was not created.",
      "Save or refresh the editor, then try again."
    );
  }

  const assessment = resolvePreviewBaseUrl({
    requestOrigin: new URL(req.url).origin,
    preferLanPort: 3050,
  });
  const session = createPreviewSession({
    businessId,
    brandKitId: body.brandKitId || "local",
    cardName: body.cardName || body.businessName || "Card",
    businessName: body.businessName || "Business",
    snapshotJson: JSON.stringify(body.snapshot),
    profileJson: JSON.stringify(body.profile),
    logoUrl: body.logoUrl,
    reviewUrl: body.reviewUrl,
    revision: body.revision ?? 1,
    mode: body.mode === "freeze" ? "freeze" : "follow",
  });
  const { url } = buildPreviewAbsoluteUrl(session.path, assessment);
  const phoneSafeUrl =
    assessment.reachableForPhone && !/localhost|127\.0\.0\.1/.test(url) ? url : null;

  return NextResponse.json({
    ok: true,
    token: session.token,
    path: session.path,
    url: phoneSafeUrl || url,
    qrUrl: phoneSafeUrl,
    revision: session.record.revision,
    mode: session.record.mode,
    reachableForPhone: Boolean(phoneSafeUrl),
    isLocalhost: assessment.isLocalhost || !phoneSafeUrl,
    guidance: assessment.guidance,
    expiresAt: new Date(session.record.exp).toISOString(),
    lastSaveTime: session.record.lastSaveTime,
  });
}

export async function PATCH(req: Request) {
  let businessId: string;
  try {
    businessId = await resolveBusinessId();
  } catch {
    return ownerFacingError(
      "Preview update requires a signed-in Studio session",
      "Phone still shows the previous draft.",
      "Sign in to TapConnect Studio, then try again.",
      401
    );
  }
  let body: {
    token?: string;
    snapshot?: unknown;
    profile?: unknown;
    revision?: number;
    cardName?: string;
    mode?: "follow" | "freeze";
  };
  try {
    body = await req.json();
  } catch {
    return ownerFacingError(
      "Preview update was incomplete",
      "Phone still shows the previous draft.",
      "Try Update phone preview again."
    );
  }
  if (!body.token || !body.snapshot) {
    return ownerFacingError(
      "Preview session missing",
      "Phone was not updated.",
      "Generate a new Live device QR, then try again."
    );
  }
  const existing = getPreviewSession(body.token);
  if (!existing.ok || existing.record.businessId !== businessId) {
    return ownerFacingError(
      "Preview session does not belong to this workspace",
      "Phone was not updated.",
      "Generate a new preview from this workspace.",
      403
    );
  }
  const result = updatePreviewSession(body.token, {
    snapshotJson: body.snapshot ? JSON.stringify(body.snapshot) : undefined,
    profileJson: body.profile ? JSON.stringify(body.profile) : undefined,
    revision: body.revision ?? Date.now(),
    cardName: body.cardName,
    mode: body.mode,
  });
  if (!result.ok) {
    const map: Record<string, [string, string, string]> = {
      preview_expired: [
        "This phone preview has expired",
        "The QR link no longer opens the draft.",
        "Generate a new Live device preview from the editor.",
      ],
      preview_revoked: [
        "This phone preview was revoked",
        "The QR link no longer opens the draft.",
        "Generate a new Live device preview from the editor.",
      ],
      preview_unavailable: [
        "Phone preview is unavailable",
        "The draft could not be refreshed.",
        "Generate a new Live device preview from the editor.",
      ],
    };
    const [error, consequence, recovery] = map[result.reason] || [
      "Phone preview could not be updated",
      "The phone may be out of date.",
      "Generate a new Live device preview.",
    ];
    return ownerFacingError(error, consequence, recovery, 410);
  }
  const assessment = resolvePreviewBaseUrl({
    requestOrigin: new URL(req.url).origin,
    preferLanPort: 3050,
  });
  return NextResponse.json({
    ok: true,
    revision: result.revision,
    mode: result.mode,
    reachableForPhone: assessment.reachableForPhone,
    guidance: assessment.guidance,
  });
}
