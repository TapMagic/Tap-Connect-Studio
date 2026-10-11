import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";
import { prisma } from "@/lib/db";
import { MediaServiceError, storeUploadedImage } from "@/lib/media/service";
import {
  MAX_UPLOAD_REQUEST_BYTES,
  MAX_UPLOAD_SOURCE_MEGABYTES,
} from "@/lib/media/upload-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const placeholder = await uploadMediaPlaceholder();
    if (placeholder) return NextResponse.json(placeholder, { status: 503 });

    const { business } = await requireBusiness();
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
    const campaignId = form.get("campaignId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    let verifiedCampaignId: string | undefined;
    if (typeof campaignId === "string" && campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, businessId: business.id },
        select: { id: true },
      });
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      }
      verifiedCampaignId = campaign.id;
    }

    const stored = await storeUploadedImage({
      businessId: business.id,
      filename: file.name,
      declaredMimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    let asset = stored.asset;
    if (verifiedCampaignId && asset.campaignId !== verifiedCampaignId) {
      asset = await prisma.mediaAsset.update({
        where: { id: stored.asset.id },
        data: { campaignId: verifiedCampaignId },
      });
    }

    return NextResponse.json({
      ok: true,
      url: asset.url,
      asset,
      processing: stored.processing,
      message:
        form.get("asLogo") === "true"
          ? "Upload saved. Approve it in Brand Kit before making it the primary logo."
          : undefined,
    });
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
    console.error("Upload error:", error);
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
