import { NextResponse } from "next/server";
import { sendEmailPlaceholder } from "@/lib/integrations/placeholders";

export async function POST() {
  const placeholder = await sendEmailPlaceholder();
  if (placeholder) {
    return NextResponse.json(placeholder, { status: 503 });
  }
  // TODO: Resend branded email when key is added
  return NextResponse.json({ ok: true, sent: false });
}
