import { NextResponse } from "next/server";
import { stockSearchPlaceholder } from "@/lib/integrations/placeholders";

type StockResult = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  source: "pexels" | "unsplash";
};

export async function GET(request: Request) {
  const placeholder = await stockSearchPlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ ok: true, results: [], query });
  }

  const results: StockResult[] = [];

  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
        { headers: { Authorization: pexelsKey }, next: { revalidate: 0 } }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          photos?: {
            id: number;
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
            source: "pexels",
          });
        }
      }
    } catch (error) {
      console.error("Pexels search error:", error);
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
            source: "unsplash",
          });
        }
      }
    } catch (error) {
      console.error("Unsplash search error:", error);
    }
  }

  return NextResponse.json({ ok: true, results, query });
}
