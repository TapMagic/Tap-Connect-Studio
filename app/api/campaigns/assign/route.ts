import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignCampaignToDevice, endDeviceAssignment } from "@/lib/services/campaigns";

const assignSchema = z.object({
  deviceSlotId: z.string(),
  campaignId: z.string(),
});

const unassignSchema = z.object({
  deviceSlotId: z.string(),
  reopenSlot: z.boolean().optional().default(true),
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

export async function DELETE(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = unassignSchema.parse(await request.json());

    const device = await prisma.deviceSlot.findFirst({
      where: { id: body.deviceSlotId, businessId: business.id },
    });
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const result = await endDeviceAssignment({
      businessId: business.id,
      deviceSlotId: body.deviceSlotId,
      reopenSlot: body.reopenSlot,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("Unassign campaign error:", error);
    return NextResponse.json({ error: "Failed to clear assignment" }, { status: 500 });
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
