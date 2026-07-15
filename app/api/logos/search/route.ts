import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  searchLogosAndIcons,
  type LogoDevTheme,
} from "@/lib/services/logo-search";

export async function GET(request: Request) {
  try {
    await requireBusiness();

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

    const results = await searchLogosAndIcons(query, { theme, greyscale });
    return NextResponse.json({
      ok: true,
      query,
      theme,
      greyscale,
      results,
      logoDev: Boolean(process.env.LOGO_DEV_TOKEN?.trim()),
    });
  } catch (error) {
    console.error("Logo search error:", error);
    return NextResponse.json({ error: "Logo search failed" }, { status: 500 });
  }
}
