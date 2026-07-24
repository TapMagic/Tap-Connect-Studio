import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  listPublicationSnapshots,
  restoreCampaignFromSnapshot,
  restoreCardFromSnapshot,
} from "@/lib/fusion/publication/snapshots";
import { prisma } from "@/lib/db";

const listSchema = z.object({
  subjectType: z.enum(["campaign", "card"]),
  subjectId: z.string().min(1),
});

const restoreSchema = z.object({
  action: z.literal("restore"),
  subjectType: z.enum(["campaign", "card"]),
  subjectId: z.string().min(1),
  snapshotId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const parsed = listSchema.parse({
      subjectType: url.searchParams.get("subjectType"),
      subjectId: url.searchParams.get("subjectId"),
    });

    if (parsed.subjectType === "campaign") {
      const campaign = await prisma.campaign.findFirst({
        where: { id: parsed.subjectId, businessId: business.id },
        select: { id: true },
      });
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
    } else {
      const kit = await prisma.brandKit.findFirst({
        where: { id: parsed.subjectId, businessId: business.id },
        select: { id: true },
      });
      if (!kit) {
        return NextResponse.json({ error: "Brand kit not found" }, { status: 404 });
      }
    }

    const snapshots = await listPublicationSnapshots({
      businessId: business.id,
      subjectType: parsed.subjectType,
      subjectId: parsed.subjectId,
    });

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        version: s.version,
        label: s.label,
        contentHash: s.contentHash,
        publishedAt: s.publishedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }
    console.error("Publication list error:", error);
    return NextResponse.json({ error: "Failed to list snapshots" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = restoreSchema.parse(await request.json());

    if (body.subjectType === "campaign") {
      const result = await restoreCampaignFromSnapshot({
        businessId: business.id,
        campaignId: body.subjectId,
        snapshotId: body.snapshotId,
        publishedById: user.id,
      });
      return NextResponse.json({
        ok: true,
        campaign: result.campaign,
        restoredFrom: {
          id: result.restoredFrom.id,
          version: result.restoredFrom.version,
          label: result.restoredFrom.label,
        },
      });
    }

    const result = await restoreCardFromSnapshot({
      businessId: business.id,
      brandKitId: body.subjectId,
      snapshotId: body.snapshotId,
      publishedById: user.id,
    });
    return NextResponse.json({
      ok: true,
      brandKit: result.brandKit,
      restoredFrom: {
        id: result.restoredFrom.id,
        version: result.restoredFrom.version,
        label: result.restoredFrom.label,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to restore";
    const status = /not found/i.test(message) ? 404 : 500;
    console.error("Publication restore error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
