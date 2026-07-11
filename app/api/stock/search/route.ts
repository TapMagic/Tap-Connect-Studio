import { NextResponse } from "next/server";
import { stockSearchPlaceholder } from "@/lib/integrations/placeholders";

export async function GET(request: Request) {
  const placeholder = await stockSearchPlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  // TODO: Search Unsplash/Pexels when keys are added
  return NextResponse.json({ ok: true, results: [], query });
}
