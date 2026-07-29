import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  createPreviewSession,
  updatePreviewSession,
} from "@/lib/fusion/creative-studio/preview/tokens";
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
  try {
    const { business } = await requireBusiness();
    return business.id;
  } catch {
    if (
      process.env.PREVIEW_RUNTIME_MODE === "local_test" ||
      process.env.NODE_ENV !== "production"
    ) {
      return "local-dev-business";
    }
    throw new Error("auth_required");
  }
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
  });
  const { url } = buildPreviewAbsoluteUrl(session.path, assessment);

  return NextResponse.json({
    ok: true,
    token: session.token,
    path: session.path,
    url,
    revision: session.record.revision,
    reachableForPhone: assessment.reachableForPhone,
    isLocalhost: assessment.isLocalhost,
    guidance: assessment.guidance,
    expiresAt: new Date(session.record.exp).toISOString(),
  });
}

export async function PATCH(req: Request) {
  let body: {
    token?: string;
    snapshot?: unknown;
    profile?: unknown;
    revision?: number;
    cardName?: string;
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
  const result = updatePreviewSession(body.token, {
    snapshotJson: JSON.stringify(body.snapshot),
    profileJson: body.profile ? JSON.stringify(body.profile) : undefined,
    revision: body.revision ?? Date.now(),
    cardName: body.cardName,
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
  });
  return NextResponse.json({
    ok: true,
    revision: result.revision,
    reachableForPhone: assessment.reachableForPhone,
    guidance: assessment.guidance,
  });
}
