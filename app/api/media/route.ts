import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const assets = await prisma.mediaAsset.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

const createSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  mimeType: z.string().default("image/jpeg"),
  source: z.enum(["upload", "stock", "url"]).default("url"),
  campaignId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = createSchema.parse(await request.json());

    const asset = await prisma.mediaAsset.create({
      data: {
        businessId: business.id,
        campaignId: body.campaignId,
        url: body.url,
        filename: body.filename,
        mimeType: body.mimeType,
        source: body.source,
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid media data" }, { status: 400 });
    }
    console.error("Create media error:", error);
    return NextResponse.json({ error: "Failed to save media" }, { status: 500 });
  }
}
