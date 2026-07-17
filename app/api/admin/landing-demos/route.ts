import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  LANDING_DEMO_MODES,
  listLandingDemoSlots,
  publishLandingCardDemo,
  upsertLandingDemoSlot,
} from "@/lib/services/landing-demos";

const putSchema = z.object({
  mode: z.enum(["card", "offer", "product", "review"]),
  campaignId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  showLogo: z.boolean().optional(),
  logoUrl: z.string().nullable().optional(),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const slots = await listLandingDemoSlots();
    const campaigns = await prisma.campaign.findMany({
      where: { status: { notIn: ["ARCHIVED", "CLOSED"] } },
      select: {
        id: true,
        title: true,
        status: true,
        campaignType: true,
        business: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      slots,
      modes: LANDING_DEMO_MODES,
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        campaignType: c.campaignType,
        businessName: c.business.name,
      })),
    });
  } catch (error) {
    console.error("landing-demos GET", error);
    return NextResponse.json({ error: "Failed to load landing demos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = putSchema.parse(await request.json());
    const slots = await upsertLandingDemoSlot(body);
    return NextResponse.json({ ok: true, slots });
  } catch (error) {
    console.error("landing-demos PUT", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save landing demo slot" }, { status: 500 });
  }
}

/** Legacy publish path used by Tap Card Builder — maps to card slot. */
export async function POST(request: Request) {
  try {
    const { business } = await requirePlatformAdmin();
    const body = z
      .object({ publish: z.boolean(), tapCard: z.any().optional() })
      .parse(await request.json());
    const result = await publishLandingCardDemo({
      businessId: business.id,
      publish: body.publish,
      tapCard: body.tapCard,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("landing-demos POST", error);
    return NextResponse.json({ error: "Failed to publish landing demo" }, { status: 500 });
  }
}
