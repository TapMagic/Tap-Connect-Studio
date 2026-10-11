import { NextResponse } from "next/server";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";
import { MediaServiceError, storeUploadedImage } from "@/lib/media/service";
import {
  MAX_UPLOAD_REQUEST_BYTES,
  MAX_UPLOAD_SOURCE_MEGABYTES,
} from "@/lib/media/upload-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const placeholder = await uploadMediaPlaceholder();
  if (placeholder) return NextResponse.json(placeholder, { status: 503 });

  try {
    const { business } = await requireBusinessCapability("brand.propose");
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_UPLOAD_REQUEST_BYTES) {
      return NextResponse.json(
        {
          error: `Upload request is too large. Source images may be at most ${MAX_UPLOAD_SOURCE_MEGABYTES} MB.`,
          code: "request_too_large",
        },
        { status: 413 },
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const { asset, processing } = await storeUploadedImage({
      businessId: business.id,
      filename: file.name,
      declaredMimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, url: asset.url, asset, processing });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (
      error instanceof TypeError &&
      /formdata|form data|boundary|body/i.test(error.message)
    ) {
      return NextResponse.json(
        {
          error:
            "Upload request was incomplete and could not be read. Retry the file; if it continues, use an image under 32 MB.",
          code: "incomplete_upload",
        },
        { status: 400 },
      );
    }
    console.error("Media upload error:", error);
    return NextResponse.json(
      {
        error:
          "The server could not complete image processing. Nothing was saved; retry the file, then contact support if this exact file continues to fail.",
        code: "unexpected_upload_failure",
      },
      { status: 500 },
    );
  }
}
