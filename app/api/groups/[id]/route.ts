import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CampaignStatus } from "@prisma/client";
import { requireBusiness } from "@/lib/auth";
import {
  attachDevicesByLocation,
  attachDevicesToGroup,
  buildGroupLivePreview,
  detachDeviceFromGroup,
  getCampaignGroup,
  updateCampaignGroup,
} from "@/lib/services/groups";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  defaultCampaignId: z.string().nullable().optional(),
  endCampaignId: z.string().nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  showUpcomingOnPages: z.boolean().optional(),
  industryHint: z.string().max(40).nullable().optional(),
});

const devicesSchema = z.object({
  deviceIds: z.array(z.string()).min(1).optional(),
  locationId: z.string().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const group = await getCampaignGroup(business.id, id);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const preview = buildGroupLivePreview(group);
    return NextResponse.json({ group, preview });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json({ error: "Failed to load group" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());

    const group = await updateCampaignGroup(business.id, id, body);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    revalidatePath(`/dashboard/groups/${id}`);
    revalidatePath("/dashboard/groups");
    return NextResponse.json({ group });
  } catch (error) {
    console.error("Patch group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const deviceId = new URL(request.url).searchParams.get("deviceId");

    if (deviceId) {
      await detachDeviceFromGroup({ businessId: business.id, deviceId });
      revalidatePath(`/dashboard/groups/${id}`);
      revalidatePath("/dashboard/devices");
      return NextResponse.json({ ok: true });
    }

    const existing = await prisma.campaignGroup.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.deviceSlot.updateMany({
      where: { campaignGroupId: id, businessId: business.id },
      data: { campaignGroupId: null },
    });
    await prisma.campaign.updateMany({
      where: { groupId: id, businessId: business.id },
      data: { groupId: null },
    });
    await prisma.campaignGroup.delete({ where: { id } });

    revalidatePath("/dashboard/groups");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}

/** Attach devices by id list and/or entire location */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const body = devicesSchema.parse(await request.json());

    if (body.locationId) {
      const result = await attachDevicesByLocation({
        businessId: business.id,
        groupId: id,
        locationId: body.locationId,
      });
      if (!result.group) return NextResponse.json({ error: "Not found" }, { status: 404 });
      revalidatePath(`/dashboard/groups/${id}`);
      revalidatePath("/dashboard/devices");
      return NextResponse.json({ group: result.group, attached: result.attached });
    }

    if (!body.deviceIds?.length) {
      return NextResponse.json({ error: "deviceIds or locationId required" }, { status: 400 });
    }

    const group = await attachDevicesToGroup({
      businessId: business.id,
      groupId: id,
      deviceIds: body.deviceIds,
    });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidatePath(`/dashboard/groups/${id}`);
    revalidatePath("/dashboard/devices");
    return NextResponse.json({ group, attached: body.deviceIds.length });
  } catch (error) {
    console.error("Attach devices error:", error);
    return NextResponse.json({ error: "Failed to attach devices" }, { status: 500 });
  }
}
