import { NextResponse } from "next/server";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";

export async function POST() {
  const placeholder = await uploadMediaPlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }
  // TODO: Wire UploadThing + R2 when keys are added
  return NextResponse.json({ ok: true, url: "" });
}
