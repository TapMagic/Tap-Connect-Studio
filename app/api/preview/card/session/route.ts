import { NextResponse } from "next/server";
import {
  createPreviewSession,
  getPreviewSession,
  updatePreviewSession,
} from "@/lib/fusion/creative-studio/preview/tokens";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import {
  buildPreviewAbsoluteUrl,
  portFromOrigin,
  resolvePreviewBaseUrl,
} from "@/lib/fusion/creative-studio/preview/url";
import { inspectPreviewVisualResourcePortability } from "@/lib/fusion/creative-studio/preview/visual-resources";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { getSavedPhonePreviewDraft } from "@/lib/fusion/creative-studio/preview/saved-draft";

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
    documentId?: string;
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

  if (!body.profile || (!body.documentId && !body.snapshot)) {
    return ownerFacingError(
      "Preview draft was missing",
      "Phone preview was not created.",
      "Save or refresh the editor, then try again."
    );
  }

  const saved = body.documentId
    ? await getSavedPhonePreviewDraft({ businessId, documentId: body.documentId })
    : null;
  if (body.documentId && !saved) {
    return ownerFacingError(
      "Saved Experience draft was unavailable",
      "Phone preview was not created.",
      "Save the Experience, then reopen Phone Preview.",
      404
    );
  }
  const snapshot = saved?.config ?? body.snapshot;
  const revision = saved?.revision ?? body.revision ?? 1;

  if (inspectPreviewVisualResourcePortability({ snapshot, profile: body.profile, logoUrl: body.logoUrl }).length > 0) {
    return ownerFacingError(
      "A committed image is not portable to Live Device",
      "Phone preview was not created because the image exists only in this browser or machine.",
      "Choose or upload the Asset through Studio so it receives a canonical MediaAsset reference, then try again.",
      422
    );
  }

  const requestOrigin = new URL(req.url).origin;
  const assessment = resolvePreviewBaseUrl({
    requestOrigin,
    preferLanPort: portFromOrigin(requestOrigin),
  });
  const session = createPreviewSession({
    businessId,
    brandKitId: body.brandKitId || "local",
    cardName: saved?.documentName || body.cardName || body.businessName || "Card",
    businessName: body.businessName || "Business",
    snapshotJson: JSON.stringify(snapshot),
    profileJson: JSON.stringify(body.profile),
    logoUrl: body.logoUrl,
    reviewUrl: body.reviewUrl,
    revision,
    mode: body.mode === "freeze" ? "freeze" : "follow",
    documentId: body.documentId,
  });
  const reviewPath = isLocalDevAuthEnabled() ? `${session.path}?debug=1` : session.path;
  const { url } = buildPreviewAbsoluteUrl(reviewPath, assessment);
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
    candidateKind: assessment.candidateKind,
    physicallyVerified: false,
    isLocalhost: assessment.isLocalhost || !phoneSafeUrl,
    guidance: assessment.guidance,
    expiresAt: new Date(session.record.exp).toISOString(),
    lastSaveTime: session.record.lastSaveTime,
    documentId: session.record.documentId,
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
  if (!body.token) {
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
  const saved = existing.record.documentId
    ? await getSavedPhonePreviewDraft({ businessId, documentId: existing.record.documentId })
    : null;
  if (existing.record.documentId && !saved) {
    return ownerFacingError(
      "Saved Experience draft was unavailable",
      "Phone still shows the previous saved Draft.",
      "Save the Experience, then refresh Phone Preview.",
      404
    );
  }
  const snapshot = saved?.config ?? body.snapshot;
  if (!snapshot) {
    return ownerFacingError(
      "Preview draft was missing",
      "Phone was not updated.",
      "Save the Experience, then refresh Phone Preview."
    );
  }
  if (inspectPreviewVisualResourcePortability({ snapshot, profile: body.profile }).length > 0) {
    return ownerFacingError(
      "A committed image is not portable to Live Device",
      "Phone preview was not updated because the image exists only in this browser or machine.",
      "Choose or upload the Asset through Studio so it receives a canonical MediaAsset reference, then try again.",
      422
    );
  }
  const result = updatePreviewSession(body.token, {
    snapshotJson: JSON.stringify(snapshot),
    profileJson: body.profile ? JSON.stringify(body.profile) : undefined,
    revision: saved?.revision ?? body.revision ?? existing.record.revision,
    cardName: saved?.documentName || body.cardName,
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
  const requestOrigin = new URL(req.url).origin;
  const assessment = resolvePreviewBaseUrl({
    requestOrigin,
    preferLanPort: portFromOrigin(requestOrigin),
  });
  const basePath = `/preview/live/${body.token}`;
  const path = isLocalDevAuthEnabled() ? `${basePath}?debug=1` : basePath;
  const { url } = buildPreviewAbsoluteUrl(path, assessment);
  const phoneSafeUrl =
    assessment.reachableForPhone && !/localhost|127\.0\.0\.1/.test(url) ? url : null;
  return NextResponse.json({
    ok: true,
    token: body.token,
    path,
    url: phoneSafeUrl || url,
    qrUrl: phoneSafeUrl,
    revision: result.revision,
    mode: result.mode,
    reachableForPhone: Boolean(phoneSafeUrl),
    candidateKind: assessment.candidateKind,
    physicallyVerified: false,
    isLocalhost: assessment.isLocalhost || !phoneSafeUrl,
    guidance: assessment.guidance,
    documentId: existing.record.documentId,
  });
}
