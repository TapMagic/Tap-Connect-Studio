import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireBusiness } from "@/lib/auth";
import { isMediaUploadReady } from "@/lib/config/integrations";
import { uploadMediaPlaceholder } from "@/lib/integrations/placeholders";
import { prisma } from "@/lib/db";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(request: Request) {
  try {
    const placeholder = await uploadMediaPlaceholder();
    if (placeholder || !isMediaUploadReady()) {
      return NextResponse.json(
        placeholder ?? { error: "Media upload not configured" },
        { status: 503 }
      );
    }

    const { business } = await requireBusiness();
    const form = await request.formData();
    const file = form.get("file");
    const campaignId = form.get("campaignId");
    const asLogo = form.get("asLogo") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only images and PDFs allowed" }, { status: 400 });
    }

    const maxMb = 8;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `Max file size is ${maxMb}MB` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `${business.id}/${nanoid(12)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: bytes,
        ContentType: file.type,
      })
    );

    const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    const url = `${base}/${key}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        businessId: business.id,
        campaignId: typeof campaignId === "string" ? campaignId : undefined,
        url,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        source: "upload",
      },
    });

    if (asLogo) {
      await prisma.business.update({
        where: { id: business.id },
        data: { logoUrl: url },
      });
    }

    return NextResponse.json({ ok: true, url, asset });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
