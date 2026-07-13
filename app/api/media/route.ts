import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

function collectUsedUrls(params: {
  logoUrl?: string | null;
  campaigns: { contentBlocks: unknown; themeOverrides: unknown; primaryMedia: unknown }[];
}): Set<string> {
  const used = new Set<string>();
  if (params.logoUrl) used.add(params.logoUrl);

  for (const c of params.campaigns) {
    const blobs = [c.contentBlocks, c.themeOverrides, c.primaryMedia];
    for (const blob of blobs) {
      const text = JSON.stringify(blob ?? {});
      // http(s) and data URLs used as image sources
      const matches = text.match(/https?:\/\/[^"\\\s]+|data:image\/[^"\\\s]+/g);
      if (matches) {
        for (const m of matches) used.add(m);
      }
    }
  }
  return used;
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const usedOnly = new URL(request.url).searchParams.get("usedOnly") === "1";

    const [assets, campaigns] = await Promise.all([
      prisma.mediaAsset.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      usedOnly
        ? prisma.campaign.findMany({
            where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
            select: { contentBlocks: true, themeOverrides: true, primaryMedia: true },
          })
        : Promise.resolve([]),
    ]);

    if (!usedOnly) {
      return NextResponse.json({ assets });
    }

    const used = collectUsedUrls({
      logoUrl: business.logoUrl,
      campaigns,
    });

    const filtered = assets.filter((a) => used.has(a.url));
    return NextResponse.json({ assets: filtered, usedCount: filtered.length });
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

const createSchema = z.object({
  url: z.string().min(1),
  filename: z.string().optional(),
  mimeType: z.string().default("image/jpeg"),
  source: z.enum(["upload", "stock", "url"]).default("url"),
  campaignId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = createSchema.parse(await request.json());

    // Skip giant data-URLs in DB (keep library lean — those are campaign-embedded)
    if (body.url.startsWith("data:") && body.url.length > 200_000) {
      return NextResponse.json({ skipped: true, reason: "data-url too large" });
    }

    const existing = await prisma.mediaAsset.findFirst({
      where: { businessId: business.id, url: body.url },
    });
    if (existing) {
      return NextResponse.json({ asset: existing });
    }

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
