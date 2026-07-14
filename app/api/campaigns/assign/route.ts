import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignCampaignToDevice, endDeviceAssignment } from "@/lib/services/campaigns";
import type { Prisma } from "@prisma/client";

const assignSchema = z.object({
  deviceSlotId: z.string(),
  campaignId: z.string(),
});

const unassignSchema = z.object({
  deviceSlotId: z.string(),
  reopenSlot: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120).optional(),
  contentBlocks: z.array(z.unknown()).optional(),
  themeOverrides: z.record(z.string(), z.unknown()).optional(),
  status: z
    .enum(["DRAFT", "READY", "LIVE", "PAUSED", "ARCHIVED", "CLOSED", "SCHEDULED"])
    .optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  endExperience: z.any().optional(),
  formSettings: z.any().optional(),
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
    const body = updateSchema.parse(await request.json());
    const { id, ...updates } = body;

    const existing = await prisma.campaign.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const data: Prisma.CampaignUpdateInput = {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.contentBlocks !== undefined
        ? { contentBlocks: updates.contentBlocks as Prisma.InputJsonValue }
        : {}),
      ...(updates.themeOverrides !== undefined
        ? { themeOverrides: updates.themeOverrides as Prisma.InputJsonValue }
        : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.scheduledStart !== undefined
        ? { scheduledStart: updates.scheduledStart ? new Date(updates.scheduledStart) : null }
        : {}),
      ...(updates.scheduledEnd !== undefined
        ? { scheduledEnd: updates.scheduledEnd ? new Date(updates.scheduledEnd) : null }
        : {}),
      ...(updates.endExperience !== undefined
        ? { endExperience: updates.endExperience as Prisma.InputJsonValue }
        : {}),
      ...(updates.formSettings !== undefined
        ? { formSettings: updates.formSettings as Prisma.InputJsonValue }
        : {}),
    };

    const campaign = await prisma.campaign.update({
      where: { id },
      data,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid campaign data" }, { status: 400 });
    }
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
