import { NextResponse } from "next/server";
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
    const { user, business } = await requireBusiness();
    const params = new URL(request.url).searchParams;
    const usedOnly = params.get("usedOnly") === "1";
    const favoriteOnly = params.get("favorite") === "1";
    const recentOnly = params.get("recent") === "1";
    const approval = params.get("approval");
    const query = (params.get("query") || "").trim();
    const take = Math.max(1, Math.min(100, Number(params.get("limit") || 80) || 80));

    const [assets, campaigns] = await Promise.all([
      prisma.mediaAsset.findMany({
        where: {
          businessId: business.id,
          ...(approval === "APPROVED" ||
          approval === "UNREVIEWED" ||
          approval === "REJECTED"
            ? { approvalStatus: approval }
            : {}),
          ...(favoriteOnly
            ? { favorites: { some: { businessId: business.id, userId: user.id } } }
            : {}),
          ...(recentOnly
            ? { recents: { some: { businessId: business.id, userId: user.id } } }
            : {}),
          ...(query
            ? {
                OR: [
                  { filename: { contains: query, mode: "insensitive" } },
                  { creatorName: { contains: query, mode: "insensitive" } },
                  { attributionText: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          favorites: {
            where: { businessId: business.id, userId: user.id },
            select: { id: true },
          },
          recents: {
            where: { businessId: business.id, userId: user.id },
            select: { lastUsedAt: true, useCount: true },
          },
          usages: {
            where: { businessId: business.id },
            select: {
              surface: true,
              subjectId: true,
              documentPath: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      usedOnly
        ? prisma.campaign.findMany({
            where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
            select: { contentBlocks: true, themeOverrides: true, primaryMedia: true },
          })
        : Promise.resolve([]),
    ]);

    const normalized = assets.map(({ favorites, recents, usages, ...asset }) => ({
      ...asset,
      isFavorite: favorites.length > 0,
      recent: recents[0] ?? null,
      usages,
    }));
    if (!usedOnly) return NextResponse.json({ assets: normalized });

    const used = collectUsedUrls({
      logoUrl: business.logoUrl,
      campaigns,
    });

    const filtered = normalized.filter((asset) => asset.usages.length > 0 || used.has(asset.url));
    return NextResponse.json({ assets: filtered, usedCount: filtered.length });
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}

export async function POST() {
  await requireBusiness();
  return NextResponse.json(
    {
      error: "Direct media registration is retired",
      message: "Use media upload, provider import, or Advanced URL import.",
    },
    { status: 410 }
  );
}
