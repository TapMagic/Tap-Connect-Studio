import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { searchLogosAndIcons } from "@/lib/services/logo-search";

export async function GET(request: Request) {
  try {
    await requireBusiness();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    if (query.length < 2) {
      return NextResponse.json({ ok: true, results: [], query });
    }

    const results = await searchLogosAndIcons(query);
    return NextResponse.json({
      ok: true,
      query,
      results,
      enhanced: Boolean(
        process.env.LOGO_DEV_TOKEN?.trim() || process.env.BRAVE_SEARCH_API_KEY?.trim()
      ),
    });
  } catch (error) {
    console.error("Logo search error:", error);
    return NextResponse.json({ error: "Logo search failed" }, { status: 500 });
  }
}
