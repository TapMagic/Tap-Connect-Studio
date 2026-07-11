import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  eventType: z.string(),
  campaignId: z.string().optional(),
  deviceSlotId: z.string().optional(),
  businessId: z.string().optional(),
  blockId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    await prisma.clickEvent.create({
      data: {
        eventType: body.eventType,
        campaignId: body.campaignId,
        deviceSlotId: body.deviceSlotId,
        businessId: body.businessId,
        blockId: body.blockId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
