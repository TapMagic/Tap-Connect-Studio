import { NextResponse } from "next/server";
import { getPreviewSession } from "@/lib/fusion/creative-studio/preview/tokens";
import { collectPreviewLocalMediaKeys, collectPreviewMediaAssetIds } from "@/lib/fusion/creative-studio/preview/visual-resources";
import { normalizePreviewMedia, readPreviewMediaAsset } from "@/lib/fusion/creative-studio/preview/canonical-media";
import { prisma } from "@/lib/db";
import { getSavedPhonePreviewDraft } from "@/lib/fusion/creative-studio/preview/saved-draft";
import { readMediaObject } from "@/lib/media/storage";

export const runtime = "nodejs";

function mimeForKey(storageKey: string): string {
  const extension = storageKey.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "avif") return "image/avif";
  return "image/jpeg";
}

function unavailableImage(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" fill="#111827"/><circle cx="360" cy="198" r="48" fill="none" stroke="#b8ff2c" stroke-width="8" opacity=".7"/><path d="m326 232 26-30 22 20 18-16 30 35" fill="none" stroke="#b8ff2c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><text x="360" y="302" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="22" text-anchor="middle">Image unavailable in device preview.</text></svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-TapConnect-Preview-Resource": "unavailable",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const session = getPreviewSession(token);
  if (!session.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assetId = new URL(request.url).searchParams.get("assetId");
  if (assetId) {
    try {
      const referenced = collectPreviewMediaAssetIds({
        snapshot: JSON.parse(session.record.snapshotJson),
        profile: JSON.parse(session.record.profileJson),
        logoUrl: session.record.logoUrl,
      });
      if (session.record.mode === "follow") {
        const latest = await getSavedPhonePreviewDraft({ businessId: session.record.businessId, documentId: session.record.documentId || "main-card" });
        if (latest) {
          const normalized = await normalizePreviewMedia(latest.config, session.record.businessId);
          for (const id of normalized.assetIds) referenced.add(id);
        }
      }
      if (!referenced.has(assetId)) return unavailableImage();
      const asset = await prisma.mediaAsset.findFirst({ where: { id: assetId, businessId: session.record.businessId } });
      if (!asset) return unavailableImage();
      const { bytes, mimeType } = await readPreviewMediaAsset(asset, session.record.businessId);
      return new Response(Uint8Array.from(bytes), { headers: {
        "Content-Type": mimeType, "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "X-TapConnect-Preview-Resource": "resolved",
      } });
    } catch { return unavailableImage(); }
  }

  const storageKey = new URL(request.url).searchParams.get("key") || "";
  if (!storageKey.startsWith(`${session.record.businessId}/`)) {
    return unavailableImage();
  }
  const referenced = new Set<string>();
  try {
    for (const key of collectPreviewLocalMediaKeys({
      snapshot: JSON.parse(session.record.snapshotJson),
      profile: JSON.parse(session.record.profileJson),
      logoUrl: session.record.logoUrl,
    })) referenced.add(key);
    if (session.record.mode === "follow") {
      // Follow the selected Experience, never an unrelated tenant main Card.
      // A missing legacy Card must not strand otherwise valid signed assets.
      const latest = await getSavedPhonePreviewDraft({
        businessId: session.record.businessId,
        documentId: session.record.documentId || "main-card",
      }).catch(() => null);
      if (latest) {
        for (const key of collectPreviewLocalMediaKeys(latest.config)) referenced.add(key);
      }
    }
  } catch {
    return unavailableImage();
  }
  if (!referenced.has(storageKey)) return unavailableImage();

  try {
    const bytes = await readMediaObject(storageKey);
    return new Response(Uint8Array.from(bytes), {
      headers: {
        "Content-Type": mimeForKey(storageKey),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-TapConnect-Preview-Resource": "resolved",
      },
    });
  } catch {
    return unavailableImage();
  }
}
