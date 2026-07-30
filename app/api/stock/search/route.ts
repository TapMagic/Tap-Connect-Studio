import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { signProviderCandidate } from "@/lib/media/candidate-token";
import {
  getPexelsProvider,
  type PexelsOrientation,
} from "@/lib/media/providers/pexels";

export async function GET(request: Request) {
  const { business } = await requireBusiness();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Math.min(50, Number(searchParams.get("page") || 1) || 1));
  const orientation = searchParams.get("orientation");
  const safeOrientation: PexelsOrientation | undefined =
    orientation === "landscape" ||
    orientation === "portrait" ||
    orientation === "square"
      ? orientation
      : undefined;
  const color = (searchParams.get("color") ?? "").trim().replace(/^#/, "");
  if (query.length < 2) {
    return NextResponse.json({ ok: true, results: [], query, page, nextPage: null });
  }

  const result = await getPexelsProvider().search({
    query,
    page,
    perPage: 18,
    orientation: safeOrientation,
    color,
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        provider: "pexels",
        unavailable: true,
        code: result.code,
        error: result.message,
        message: result.message,
        retryAfterSeconds: result.retryAfterSeconds,
        results: [],
      },
      {
        status: result.status,
        headers: result.retryAfterSeconds
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "pexels",
    available: true,
    results: result.candidates.map((candidate) => ({
      id: `pexels-${candidate.providerAssetId}`,
      url: candidate.previewUrl,
      thumb: candidate.thumbnailUrl,
      alt: candidate.altText,
      photographer: candidate.creatorName || "Pexels contributor",
      photographerUrl: candidate.creatorUrl,
      sourceUrl: candidate.sourcePageUrl,
      width: candidate.width,
      height: candidate.height,
      providerId: candidate.providerAssetId,
      rights: candidate.rightsNote,
      attributionText: candidate.attributionText,
      licenseUrl: candidate.licenseUrl,
      source: "pexels",
      candidateToken: signProviderCandidate(business.id, candidate),
    })),
    query,
    page: result.page,
    nextPage: result.nextPage,
  });
}
