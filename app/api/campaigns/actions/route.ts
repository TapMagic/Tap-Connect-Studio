import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { cloneCampaign } from "@/lib/services/campaigns";
import { prisma } from "@/lib/db";

const cloneSchema = z.object({
  campaignId: z.string(),
});

const statusSchema = z.object({
  campaignId: z.string(),
  status: z.enum(["DRAFT", "READY", "LIVE", "PAUSED", "ARCHIVED", "CLOSED"]),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = cloneSchema.parse(await request.json());

    const source = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
    });
    if (!source) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await cloneCampaign(body.campaignId, user.id);
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Clone campaign error:", error);
    return NextResponse.json({ error: "Failed to clone" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = statusSchema.parse(await request.json());

    const existing = await prisma.campaign.findFirst({
      where: { id: body.campaignId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.update({
      where: { id: body.campaignId },
      data: { status: body.status },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Update campaign status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
