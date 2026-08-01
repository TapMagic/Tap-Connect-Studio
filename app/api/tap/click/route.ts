import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  eventType: z.string(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  businessId: z.string().optional(),
  blockId: z.string().optional(),
  tapEventId: z.string().optional(),
  cardPublicationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const [business, device, campaign, tap] = await Promise.all([
      body.businessId ? prisma.business.findUnique({ where: { id: body.businessId }, select: { id: true, workspaceKind: true } }) : null,
      body.deviceSlotId ? prisma.deviceSlot.findUnique({ where: { id: body.deviceSlotId }, select: { businessId: true } }) : null,
      body.campaignId ? prisma.campaign.findUnique({ where: { id: body.campaignId }, select: { businessId: true } }) : null,
      body.tapEventId ? prisma.tapEvent.findUnique({ where: { id: body.tapEventId }, select: { businessId: true } }) : null,
    ]);
    const tenantIds = [business?.id, device?.businessId, campaign?.businessId, tap?.businessId].filter(Boolean);
    if (tenantIds.length && new Set(tenantIds).size !== 1) {
      return NextResponse.json({ success: false, error: "Attribution context does not match." }, { status: 400 });
    }
    const click = await prisma.clickEvent.create({
      data: {
        eventType: body.eventType,
        campaignId: body.campaignId,
        deviceSlotId: body.deviceSlotId,
        businessId: body.businessId,
        blockId: body.blockId,
        tapEventId: body.tapEventId,
        cardPublicationId: body.cardPublicationId,
        fixture: ["DEMO", "TEST_FIXTURE", "PERSONAL_SANDBOX"].includes(business?.workspaceKind ?? ""),
      },
    });

    return NextResponse.json({ success: true, clickId: click.id });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
