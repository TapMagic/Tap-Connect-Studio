import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignCampaignToDevice } from "@/lib/services/campaigns";

const assignSchema = z.object({
  deviceSlotId: z.string(),
  campaignId: z.string(),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = assignSchema.parse(await request.json());

    const assignment = await assignCampaignToDevice({
      businessId: business.id,
      deviceSlotId: body.deviceSlotId,
      campaignId: body.campaignId,
      userId: user.id,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Assign campaign error:", error);
    return NextResponse.json({ error: "Failed to assign campaign" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.update({
      where: { id, businessId: business.id },
      data: updates,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
