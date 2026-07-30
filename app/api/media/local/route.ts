import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  localMediaStorageEnabled,
  readLocalMediaObject,
} from "@/lib/media/storage";

function mimeForKey(storageKey: string): string {
  const extension = storageKey.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}

export async function GET(request: Request) {
  if (!localMediaStorageEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { business } = await requireBusiness();
  const storageKey = new URL(request.url).searchParams.get("key") || "";
  if (!storageKey.startsWith(`${business.id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const bytes = await readLocalMediaObject(storageKey);
    return new Response(Uint8Array.from(bytes), {
      headers: {
        "Content-Type": mimeForKey(storageKey),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
