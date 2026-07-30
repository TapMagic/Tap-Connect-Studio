import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { signProviderCandidate } from "@/lib/media/candidate-token";
import { getLogoDevProvider } from "@/lib/media/providers/logo-dev";
import type { LogoDevTheme } from "@/lib/services/logo-search";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    if (query.length < 2) {
      return NextResponse.json({ ok: true, results: [], query });
    }

    const themeRaw = (searchParams.get("theme") ?? "auto").toLowerCase();
    const theme: LogoDevTheme =
      themeRaw === "light" || themeRaw === "dark" || themeRaw === "auto"
        ? themeRaw
        : "auto";
    const greyscale =
      searchParams.get("greyscale") === "1" ||
      searchParams.get("greyscale") === "true";

    const result = await getLogoDevProvider().search({ query, theme, greyscale });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          provider: "logo_dev",
          logoDev: false,
          unavailable: true,
          code: result.code,
          error: result.message,
          message: result.message,
          results: [],
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      query,
      theme,
      greyscale,
      results: result.candidates.map((candidate) => ({
        id: `logo-dev-${candidate.providerAssetId}-${theme}-${greyscale ? "g" : "c"}`,
        url: candidate.previewUrl,
        thumb: candidate.thumbnailUrl,
        alt: candidate.altText,
        source: "logo_dev",
        sourceUrl: candidate.sourcePageUrl,
        providerId: candidate.providerAssetId,
        width: candidate.width,
        height: candidate.height,
        rights: candidate.rightsNote,
        attributionText: candidate.attributionText,
        treatment: candidate.treatment,
        candidateToken: signProviderCandidate(business.id, candidate),
      })),
      logoDev: true,
    });
  } catch (error) {
    console.error("Logo search error:", error);
    return NextResponse.json({ error: "Logo search failed" }, { status: 500 });
  }
}
