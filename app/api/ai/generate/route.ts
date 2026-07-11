import { NextResponse } from "next/server";
import { aiGeneratePlaceholder } from "@/lib/integrations/placeholders";

export async function POST() {
  const placeholder = await aiGeneratePlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }
  // TODO: OpenAI campaign generation when key is added
  return NextResponse.json({ ok: true, blocks: [] });
}
