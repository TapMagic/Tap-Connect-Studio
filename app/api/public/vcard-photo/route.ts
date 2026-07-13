import { NextResponse } from "next/server";

/** Fetch a remote logo and return base64 for vCard PHOTO (size-capped). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 400 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 350_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const type = contentType.includes("png") ? "PNG" : "JPEG";

    return NextResponse.json({
      base64: buf.toString("base64"),
      type,
    });
  } catch (error) {
    console.error("vcard-photo error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
