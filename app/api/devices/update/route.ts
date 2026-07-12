import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  deviceId: z.string(),
  status: z
    .enum([
      "UNASSIGNED",
      "ACTIVE",
      "INACTIVE",
      "ARCHIVED",
      "LOST",
      "REPLACED",
      "SUSPENDED",
      "CLOSED",
      "RETIRED",
    ])
    .optional(),
  nickname: z.string().max(80).optional(),
});

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());

    const existing = await prisma.deviceSlot.findFirst({
      where: { id: body.deviceId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const device = await prisma.deviceSlot.update({
      where: { id: body.deviceId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
      },
    });

    return NextResponse.json({ device });
  } catch (error) {
    console.error("Update device error:", error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}
