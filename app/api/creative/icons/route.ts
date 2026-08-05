import { NextRequest, NextResponse } from "next/server";
import { searchIconify } from "@/lib/fusion/creative-studio/providers/iconify";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (query.length < 2) return NextResponse.json({ icons: [] });
  try {
    return NextResponse.json({ icons: await searchIconify(query), fallback: false });
  } catch {
    return NextResponse.json({ icons: [], fallback: true }, { status: 200 });
  }
}
