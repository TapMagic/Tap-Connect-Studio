import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";
import { MediaServiceError, storeUploadedImage } from "@/lib/media/service";

export async function POST(request: Request) {
  const placeholder = await uploadMediaPlaceholder();
  if (placeholder) return NextResponse.json(placeholder, { status: 503 });

  try {
    const { business } = await requireBusiness();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const asset = await storeUploadedImage({
      businessId: business.id,
      filename: file.name,
      declaredMimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, url: asset.url, asset });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
