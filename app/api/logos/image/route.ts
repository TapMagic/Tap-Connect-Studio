import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  logoDevUpstreamUrl,
  type LogoDevTheme,
} from "@/lib/services/logo-search";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function GET(request: Request) {
  await requireBusiness();
  const params = new URL(request.url).searchParams;
  const domain = (params.get("domain") || "").trim().toLowerCase();
  const name = (params.get("name") || "").trim();
  const themeRaw = params.get("theme");
  const theme: LogoDevTheme =
    themeRaw === "light" || themeRaw === "dark" ? themeRaw : "auto";
  const size = Number(params.get("size") || 256);

  if (!domain && !name) {
    return NextResponse.json({ error: "domain or name required" }, { status: 400 });
  }

  const upstream = logoDevUpstreamUrl({
    domain: domain || undefined,
    name: name || undefined,
    theme,
    greyscale: params.get("greyscale") === "1",
    size,
  });
  if (!upstream) {
    return NextResponse.json(
      { error: "Logo.dev unavailable", message: "Logo.dev is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Logo.dev image unavailable",
          message: `Logo.dev returned ${response.status}.`,
        },
        { status: response.status === 404 ? 404 : 502 }
      );
    }
    const contentType = (response.headers.get("content-type") || "").split(";")[0];
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported logo response" }, { status: 502 });
    }
    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Logo.dev unavailable",
        message: "Logo.dev could not be reached. Retry or use an uploaded Brand asset.",
      },
      { status: 503 }
    );
  }
}

