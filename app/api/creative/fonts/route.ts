import { NextResponse } from "next/server";
import { getGoogleFontsCatalog } from "@/lib/fusion/creative-studio/providers/google-fonts";

export async function GET() {
  const catalog = await getGoogleFontsCatalog();
  return NextResponse.json(catalog, { headers: { "Cache-Control": catalog.fallback ? "private, max-age=300" : "private, max-age=3600, stale-while-revalidate=86400" } });
}
