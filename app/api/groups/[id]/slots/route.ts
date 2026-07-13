import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { createGroupSlot, cloneGroupSlot } from "@/lib/services/groups";
import { prisma } from "@/lib/db";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";

const createSchema = z.object({
  campaignId: z.string(),
  label: z.string().min(1).max(80),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  priority: z.number().int().min(0).max(100).default(0),
  enabled: z.boolean().default(true),
});

const cloneSchema = z.object({
  action: z.literal("clone"),
  slotId: z.string(),
});

const patchSchema = createSchema.partial().extend({
  id: z.string(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id: groupId } = await context.params;
    const raw = await request.json();

    if (raw?.action === "clone") {
      const body = cloneSchema.parse(raw);
      const result = await cloneGroupSlot({
        businessId: business.id,
        groupId,
        slotId: body.slotId,
        userId: user.id,
      });
      if (!result) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      revalidatePath(`/dashboard/groups/${groupId}`);
      revalidatePath("/dashboard/campaigns");
      return NextResponse.json(result);
    }

    const body = createSchema.parse(raw);
    const slot = await createGroupSlot({
      businessId: business.id,
      groupId,
      ...body,
    });
    if (!slot) return NextResponse.json({ error: "Group or campaign not found" }, { status: 404 });

    revalidatePath(`/dashboard/groups/${groupId}`);
    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Create group slot error:", error);
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id: groupId } = await context.params;
    const body = patchSchema.parse(await request.json());
    await ensureCampaignGroupTables();

    const existing = await prisma.campaignGroupSlot.findFirst({
      where: { id: body.id, groupId, businessId: business.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { id, ...rest } = body;
    const slot = await prisma.campaignGroupSlot.update({
      where: { id },
      data: {
        ...(rest.label !== undefined ? { label: rest.label } : {}),
        ...(rest.campaignId !== undefined ? { campaignId: rest.campaignId } : {}),
        ...(rest.daysOfWeek !== undefined ? { daysOfWeek: rest.daysOfWeek } : {}),
        ...(rest.startTime !== undefined ? { startTime: rest.startTime } : {}),
        ...(rest.endTime !== undefined ? { endTime: rest.endTime } : {}),
        ...(rest.priority !== undefined ? { priority: rest.priority } : {}),
        ...(rest.enabled !== undefined ? { enabled: rest.enabled } : {}),
      },
      include: { campaign: { select: { id: true, title: true, status: true } } },
    });

    revalidatePath(`/dashboard/groups/${groupId}`);
    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Patch group slot error:", error);
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id: groupId } = await context.params;
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("slotId");
    if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

    await ensureCampaignGroupTables();
    const existing = await prisma.campaignGroupSlot.findFirst({
      where: { id: slotId, groupId, businessId: business.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.campaignGroupSlot.delete({ where: { id: slotId } });
    revalidatePath(`/dashboard/groups/${groupId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete group slot error:", error);
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}
