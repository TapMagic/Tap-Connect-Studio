import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const size = Math.min(1200, Math.max(128, Number(searchParams.get("size") || 400) || 400));
  const dark = searchParams.get("dark") || "#0b0f19";
  const lightParam = searchParams.get("light");
  const transparent = searchParams.get("transparent") === "1" || searchParams.get("transparent") === "true";
  // Transparent = fully transparent light modules (works in PNG data URL)
  const light = transparent ? "#00000000" : lightParam || "#ffffff";
  const margin = Math.min(8, Math.max(0, Number(searchParams.get("margin") || 2) || 2));

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin,
      color: { dark, light },
      errorCorrectionLevel: "M",
    });
    return NextResponse.json({
      ok: true,
      dataUrl,
      url,
      size,
      dark,
      light,
      transparent,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR" }, { status: 500 });
  }
}
