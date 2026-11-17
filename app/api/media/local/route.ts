import { mediaByteRange, nativeMediaMimeForKey } from "@/lib/media/native-media";
import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  localMediaStorageEnabled,
  readLocalMediaObject,
} from "@/lib/media/storage";

function mimeForKey(storageKey: string): string {
  const media = nativeMediaMimeForKey(storageKey);
  if (media) return media;
  const extension = storageKey.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "avif") return "image/avif";
  return "image/jpeg";
}

export async function GET(request: Request) {
  if (!localMediaStorageEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { business } = await requireBusiness();
  const storageKey = new URL(request.url).searchParams.get("key") || "";
  if (storageKey.includes("/private/native-media/") || !storageKey.startsWith(`${business.id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const bytes = await readLocalMediaObject(storageKey);
    const range = mediaByteRange(request.headers.get("range"), bytes.byteLength);
    if (range === false) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.byteLength}` } });
    const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    return new Response(Uint8Array.from(body), {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": mimeForKey(storageKey),
        "Content-Length": String(body.byteLength),
        "Accept-Ranges": "bytes",
        ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${bytes.byteLength}` } : {}),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
