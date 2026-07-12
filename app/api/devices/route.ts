import { NextResponse } from "next/server";
import { z } from "zod";
import { isPlatformAdmin, requireBusiness } from "@/lib/auth";
import { createDeviceForBusiness } from "@/lib/services/campaigns";

const schema = z.object({
  nickname: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = schema.parse(await request.json().catch(() => ({})));

    const device = await createDeviceForBusiness(business.id, body.nickname, {
      bypassLimit: isPlatformAdmin(user),
    });
    return NextResponse.json({ device });
  } catch (error) {
    if (error instanceof Error && error.message.includes("limit")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create device error:", error);
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 });
  }
}
