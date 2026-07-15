import { NextResponse } from "next/server";
import { stashVCard } from "@/lib/services/vcard-temp";

export const dynamic = "force-dynamic";

/** Stash a vCard and return a short-lived URL browsers can open into Contacts. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { content?: string; filename?: string };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content.includes("BEGIN:VCARD") || content.length > 400_000) {
      return NextResponse.json({ error: "Invalid vCard" }, { status: 400 });
    }
    const filename =
      typeof body.filename === "string" && body.filename.trim()
        ? body.filename.trim()
        : "contact.vcf";
    const id = stashVCard(content, filename);
    return NextResponse.json({ id, url: `/api/public/vcard/${id}` });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
