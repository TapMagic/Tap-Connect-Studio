import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transitionCampaign } from "@/lib/services/campaign-commands";

const createSchema = z.object({
  deviceSlotId: z.string(),
  campaignId: z.string(),
  label: z.string().min(1).max(80),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  priority: z.number().int().min(0).max(100).default(0),
  enabled: z.boolean().default(true),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string(),
});

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const { searchParams } = new URL(request.url);
    const deviceSlotId = searchParams.get("deviceSlotId");
    const campaignId = searchParams.get("campaignId");

    const rules = await prisma.scheduleRule.findMany({
      where: {
        businessId: business.id,
        ...(deviceSlotId ? { deviceSlotId } : {}),
        ...(campaignId ? { campaignId } : {}),
      },
      include: {
        campaign: { select: { id: true, title: true, status: true } },
        deviceSlot: { select: { id: true, nickname: true, deviceCode: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("List schedule rules error:", error);
    return NextResponse.json({ error: "Failed to load schedules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = createSchema.parse(await request.json());

    const [device, campaign] = await Promise.all([
      prisma.deviceSlot.findFirst({
        where: { id: body.deviceSlotId, businessId: business.id },
      }),
      prisma.campaign.findFirst({
        where: { id: body.campaignId, businessId: business.id },
      }),
    ]);

    if (!device || !campaign) {
      return NextResponse.json({ error: "Device or campaign not found" }, { status: 404 });
    }
    if (!["READY", "SCHEDULED", "LIVE"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Mark this Campaign Ready before scheduling it." },
        { status: 409 },
      );
    }

    const rule = await prisma.$transaction(async (tx) => {
      if (campaign.status === "READY") {
        await transitionCampaign({
          businessId: business.id,
          campaignId: campaign.id,
          toStatus: "SCHEDULED",
          command: "schedule",
          actorId: user.id,
          externalSchedule: true,
          client: tx,
        });
      }
      return tx.scheduleRule.create({
        data: {
          businessId: business.id,
          deviceSlotId: body.deviceSlotId,
          campaignId: body.campaignId,
          label: body.label,
          daysOfWeek: body.daysOfWeek,
          startTime: body.startTime ?? null,
          endTime: body.endTime ?? null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          priority: body.priority,
          enabled: body.enabled,
        },
      });
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid schedule data" }, { status: 400 });
    }
    console.error("Create schedule rule error:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = updateSchema.parse(await request.json());
    const { id, ...data } = body;

    const existing = await prisma.scheduleRule.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const rule = await prisma.scheduleRule.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.daysOfWeek !== undefined ? { daysOfWeek: data.daysOfWeek } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.campaignId !== undefined ? { campaignId: data.campaignId } : {}),
        ...(data.deviceSlotId !== undefined ? { deviceSlotId: data.deviceSlotId } : {}),
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid schedule data" }, { status: 400 });
    }
    console.error("Update schedule rule error:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = z.object({ id: z.string() }).parse(await request.json());

    const existing = await prisma.scheduleRule.findFirst({
      where: { id: body.id, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await prisma.scheduleRule.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete schedule rule error:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
