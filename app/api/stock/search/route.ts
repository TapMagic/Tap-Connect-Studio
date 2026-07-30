import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { stockSearchPlaceholder } from "@/lib/integrations/placeholders";

type StockResult = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  providerId?: string;
  rights?: string;
  source: "pexels" | "unsplash";
};

export async function GET(request: Request) {
  await requireBusiness();
  const placeholder = await stockSearchPlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Math.min(50, Number(searchParams.get("page") || 1) || 1));
  const orientation = searchParams.get("orientation");
  const safeOrientation =
    orientation === "landscape" ||
    orientation === "portrait" ||
    orientation === "square"
      ? orientation
      : undefined;
  const color = (searchParams.get("color") ?? "").trim().replace(/^#/, "");
  if (query.length < 2) {
    return NextResponse.json({ ok: true, results: [], query, page, nextPage: null });
  }

  const results: StockResult[] = [];

  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  if (pexelsKey) {
    try {
      const params = new URLSearchParams({
        query,
        per_page: "18",
        page: String(page),
      });
      if (safeOrientation) params.set("orientation", safeOrientation);
      if (color) params.set("color", color);
      const res = await fetch(
        `https://api.pexels.com/v1/search?${params}`,
        { headers: { Authorization: pexelsKey }, next: { revalidate: 0 } }
      );
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || 60);
        return NextResponse.json(
          {
            ok: false,
            provider: "pexels",
            unavailable: true,
            error: "Pexels rate limit reached",
            message: "Pexels is temporarily rate-limited. Retry after the indicated wait.",
            retryAfterSeconds: retryAfter,
            results: [],
          },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
      if (res.ok) {
        const data = (await res.json()) as {
          next_page?: string;
          photos?: {
            id: number;
            width: number;
            height: number;
            url: string;
            alt: string;
            photographer: string;
            photographer_url: string;
            src: { large: string; medium: string };
          }[];
        };
        for (const photo of data.photos ?? []) {
          results.push({
            id: `pexels-${photo.id}`,
            url: photo.src.large,
            thumb: photo.src.medium,
            alt: photo.alt || query,
            photographer: photo.photographer,
            photographerUrl: photo.photographer_url,
            sourceUrl: photo.url,
            width: photo.width,
            height: photo.height,
            providerId: String(photo.id),
            rights: "Pexels license; attribution retained with imported asset.",
            source: "pexels",
          });
        }
        return NextResponse.json({
          ok: true,
          provider: "pexels",
          available: true,
          results,
          query,
          page,
          nextPage: data.next_page ? page + 1 : null,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          provider: "pexels",
          unavailable: true,
          error: "Pexels search failed",
          message: `Pexels returned ${res.status}. Retry or use another media source.`,
          results: [],
        },
        { status: 502 }
      );
    } catch (error) {
      console.error("Pexels search error:", error);
      return NextResponse.json(
        {
          ok: false,
          provider: "pexels",
          unavailable: true,
          error: "Pexels unavailable",
          message: "Pexels could not be reached. Retry or use another media source.",
          results: [],
        },
        { status: 503 }
      );
    }
  }

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (unsplashKey && results.length < 8) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8`,
        {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
          next: { revalidate: 0 },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          results?: {
            id: string;
            alt_description: string | null;
            urls: { regular: string; small: string };
            user: { name: string; links: { html: string } };
          }[];
        };
        for (const photo of data.results ?? []) {
          results.push({
            id: `unsplash-${photo.id}`,
            url: photo.urls.regular,
            thumb: photo.urls.small,
            alt: photo.alt_description || query,
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
            sourceUrl: photo.user.links.html,
            providerId: photo.id,
            rights: "Unsplash source; verify license and attribution requirements.",
            source: "unsplash",
          });
        }
      }
    } catch (error) {
      console.error("Unsplash search error:", error);
    }
  }

  return NextResponse.json({
    ok: true,
    provider: results[0]?.source || "stock",
    available: results.length > 0,
    results,
    query,
    page,
    nextPage: null,
  });
}
