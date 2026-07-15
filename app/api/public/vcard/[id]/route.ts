import { NextResponse } from "next/server";
import { peekVCard } from "@/lib/services/vcard-temp";

export const dynamic = "force-dynamic";

/**
 * Serve vCard for native Contacts import.
 * Content-Disposition: inline — iOS Safari opens Add Contact (Create);
 * Android Chrome often hands off to Contacts instead of a raw download.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const entry = peekVCard(id);
  if (!entry) {
    return new NextResponse("Contact link expired. Go back and tap Save again.", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(entry.content, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${entry.filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
