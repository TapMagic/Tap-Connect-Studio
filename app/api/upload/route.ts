import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";
import { prisma } from "@/lib/db";
import { MediaServiceError, storeUploadedImage } from "@/lib/media/service";

export async function POST(request: Request) {
  try {
    const placeholder = await uploadMediaPlaceholder();
    if (placeholder) return NextResponse.json(placeholder, { status: 503 });

    const { business } = await requireBusiness();
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
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      verifiedCampaignId = campaign.id;
    }

    let asset = await storeUploadedImage({
      businessId: business.id,
      filename: file.name,
      declaredMimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    if (verifiedCampaignId && asset.campaignId !== verifiedCampaignId) {
      asset = await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { campaignId: verifiedCampaignId },
      });
    }

    return NextResponse.json({
      ok: true,
      url: asset.url,
      asset,
      message:
        form.get("asLogo") === "true"
          ? "Upload saved. Approve it in Brand Kit before making it the primary logo."
          : undefined,
    });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
