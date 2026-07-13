import { nanoid } from "nanoid";
import type { CampaignType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTemplateById } from "@/lib/campaign-templates";
import type { ContentBlock } from "@/lib/types/campaign";

export async function createCampaignFromTemplate(params: {
  businessId: string;
  templateId: string;
  title: string;
  userId?: string;
}) {
  const template = getTemplateById(params.templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  const blocks: ContentBlock[] = template.defaultBlocks.map((block, index) => ({
    ...block,
    id: nanoid(8),
    order: index,
  }));

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: params.businessId },
  });
  const business = await prisma.business.findUnique({
    where: { id: params.businessId },
    select: { logoUrl: true },
  });

  const themeOverrides = brandKit
    ? {
        primaryColor: brandKit.primaryColor,
        secondaryColor: brandKit.secondaryColor,
        backgroundColor: brandKit.backgroundColor,
        textColor: brandKit.textColor,
        ...(business?.logoUrl ? { logoUrl: business.logoUrl } : {}),
      }
    : {};

  return prisma.campaign.create({
    data: {
      businessId: params.businessId,
      title: params.title,
      campaignType: template.campaignType as CampaignType,
      templateId: template.id,
      contentBlocks: blocks as unknown as Prisma.InputJsonValue,
      themeOverrides: themeOverrides as Prisma.InputJsonValue,
      status: "DRAFT",
      createdById: params.userId,
      updatedById: params.userId,
    },
  });
}

export async function cloneCampaign(campaignId: string, userId?: string) {
  const source = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  return prisma.campaign.create({
    data: {
      businessId: source.businessId,
      title: `${source.title} (Copy)`,
      campaignType: source.campaignType,
      templateId: source.templateId,
      contentBlocks: source.contentBlocks ?? [],
      primaryMedia: source.primaryMedia ?? {},
      offerSettings: source.offerSettings ?? {},
      formSettings: source.formSettings ?? {},
      complianceSettings: source.complianceSettings ?? {},
      themeOverrides: source.themeOverrides ?? {},
      status: "DRAFT",
      createdById: userId,
      updatedById: userId,
    },
  });
}

export async function assignCampaignToDevice(params: {
  businessId: string;
  deviceSlotId: string;
  campaignId: string;
  userId?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const [device, campaign] = await Promise.all([
    prisma.deviceSlot.findFirstOrThrow({
      where: { id: params.deviceSlotId, businessId: params.businessId },
    }),
    prisma.campaign.findFirstOrThrow({
      where: { id: params.campaignId, businessId: params.businessId },
    }),
  ]);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.deviceAssignment.findMany({
      where: { deviceSlotId: device.id, status: "ACTIVE" },
    });

    for (const assignment of existing) {
      await tx.deviceAssignment.update({
        where: { id: assignment.id },
        data: { status: "REPLACED", endsAt: new Date() },
      });
    }

    const assignment = await tx.deviceAssignment.create({
      data: {
        deviceSlotId: device.id,
        campaignId: campaign.id,
        businessId: params.businessId,
        status: "ACTIVE",
        startsAt: params.startsAt ?? new Date(),
        endsAt: params.endsAt,
        assignedById: params.userId,
      },
    });

    await tx.deviceSlot.update({
      where: { id: device.id },
      data: {
        status: "ACTIVE",
        activatedAt: device.activatedAt ?? new Date(),
      },
    });

    await tx.campaign.update({
      where: { id: campaign.id },
      data: { status: "LIVE" },
    });

    return assignment;
  });
}

export async function endDeviceAssignment(params: {
  businessId: string;
  deviceSlotId: string;
  reopenSlot?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const active = await tx.deviceAssignment.findMany({
      where: {
        deviceSlotId: params.deviceSlotId,
        businessId: params.businessId,
        status: "ACTIVE",
      },
    });

    for (const assignment of active) {
      await tx.deviceAssignment.update({
        where: { id: assignment.id },
        data: { status: "ENDED", endsAt: new Date() },
      });
    }

    const device = await tx.deviceSlot.update({
      where: { id: params.deviceSlotId },
      data: params.reopenSlot === false ? {} : { status: "UNASSIGNED" },
    });

    return { ended: active.length, device };
  });
}

export async function deleteCampaign(params: {
  businessId: string;
  campaignId: string;
}) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, businessId: params.businessId },
  });
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // ScheduleRule may not exist on older DBs — never block delete
  try {
    const { ensureScheduleRuleTable } = await import("@/lib/db/ensure-schedule");
    await ensureScheduleRuleTable();
    await prisma.scheduleRule.deleteMany({ where: { campaignId: params.campaignId } });
  } catch (error) {
    console.warn("Schedule cleanup skipped:", error);
  }

  await prisma.$transaction(async (tx) => {
    const assignments = await tx.deviceAssignment.findMany({
      where: { campaignId: params.campaignId },
      select: { id: true, deviceSlotId: true, status: true },
    });

    const activeDeviceIds = assignments
      .filter((a) => a.status === "ACTIVE")
      .map((a) => a.deviceSlotId);

    if (activeDeviceIds.length > 0) {
      await tx.deviceSlot.updateMany({
        where: {
          id: { in: activeDeviceIds },
          businessId: params.businessId,
        },
        data: { status: "UNASSIGNED" },
      });
    }

    await tx.deviceAssignment.deleteMany({ where: { campaignId: params.campaignId } });
    await tx.mediaAsset.updateMany({
      where: { campaignId: params.campaignId },
      data: { campaignId: null },
    });
    await tx.lead.updateMany({
      where: { campaignId: params.campaignId },
      data: { campaignId: null },
    });
    await tx.tapEvent.updateMany({
      where: { campaignId: params.campaignId },
      data: { campaignId: null },
    });
    await tx.clickEvent.updateMany({
      where: { campaignId: params.campaignId },
      data: { campaignId: null },
    });

    await tx.campaign.delete({ where: { id: params.campaignId } });
  });

  return { ok: true };
}

/** Wipe all campaigns (and optionally devices) for a business — test reset. */
export async function wipeBusinessContent(params: {
  businessId: string;
  includeDevices?: boolean;
}) {
  const { businessId, includeDevices = true } = params;

  try {
    const { ensureScheduleRuleTable } = await import("@/lib/db/ensure-schedule");
    await ensureScheduleRuleTable();
    await prisma.scheduleRule.deleteMany({ where: { businessId } });
  } catch {
    /* ok */
  }

  await prisma.deviceAssignment.deleteMany({ where: { businessId } });
  await prisma.mediaAsset.updateMany({
    where: { businessId },
    data: { campaignId: null },
  });
  await prisma.lead.updateMany({
    where: { businessId },
    data: { campaignId: null, deviceSlotId: null },
  });
  await prisma.tapEvent.updateMany({
    where: { businessId },
    data: { campaignId: null },
  });
  await prisma.clickEvent.updateMany({
    where: { businessId },
    data: { campaignId: null, deviceSlotId: null },
  });
  await prisma.campaign.deleteMany({ where: { businessId } });

  if (includeDevices) {
    const devices = await prisma.deviceSlot.findMany({
      where: { businessId },
      select: { id: true },
    });
    const ids = devices.map((d) => d.id);
    if (ids.length) {
      await prisma.tapEvent.deleteMany({ where: { deviceSlotId: { in: ids } } });
      await prisma.deviceSlot.deleteMany({ where: { businessId } });
    }
  }

  return { ok: true };
}

/** Archive/close a campaign and clear any active device assignments. */
export async function archiveCampaign(params: {
  businessId: string;
  campaignId: string;
  status?: "ARCHIVED" | "CLOSED";
}) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.campaignId, businessId: params.businessId },
  });
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const nextStatus = params.status ?? "ARCHIVED";

  return prisma.$transaction(async (tx) => {
    const activeAssignments = await tx.deviceAssignment.findMany({
      where: { campaignId: params.campaignId, status: "ACTIVE" },
      select: { id: true, deviceSlotId: true },
    });

    if (activeAssignments.length > 0) {
      await tx.deviceAssignment.updateMany({
        where: { id: { in: activeAssignments.map((a) => a.id) } },
        data: { status: "ENDED", endsAt: new Date() },
      });
      await tx.deviceSlot.updateMany({
        where: {
          id: { in: activeAssignments.map((a) => a.deviceSlotId) },
          businessId: params.businessId,
        },
        data: { status: "UNASSIGNED" },
      });
    }

    return tx.campaign.update({
      where: { id: params.campaignId },
      data: { status: nextStatus },
    });
  });
}

export async function createDeviceForBusiness(
  businessId: string,
  nickname?: string,
  options?: { bypassLimit?: boolean }
) {
  const { generateDeviceCode } = await import("@/lib/utils/app");
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const activeCount = await prisma.deviceSlot.count({
    where: { businessId, status: { in: ["ACTIVE", "UNASSIGNED"] } },
  });

  if (!options?.bypassLimit && activeCount >= business.activeDeviceLimit) {
    throw new Error(
      `Device limit reached (${business.activeDeviceLimit}). Upgrade your plan to add more devices.`
    );
  }

  let deviceCode = generateDeviceCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.deviceSlot.findUnique({ where: { deviceCode } });
    if (!existing) break;
    deviceCode = generateDeviceCode();
    attempts++;
  }

  return prisma.deviceSlot.create({
    data: {
      businessId,
      deviceCode,
      nickname: nickname ?? `Device ${activeCount + 1}`,
      status: "UNASSIGNED",
    },
  });
}

export async function createBusinessWithDefaults(params: {
  name: string;
  slug: string;
  userId: string;
  website?: string;
  phone?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: params.name,
        slug: params.slug,
        website: params.website,
        phone: params.phone,
        users: {
          create: {
            userId: params.userId,
            role: "OWNER",
          },
        },
        brandKit: {
          create: {},
        },
        locations: {
          create: {
            name: "Main Location",
            isDefault: true,
          },
        },
      },
      include: { brandKit: true, locations: true },
    });

    return business;
  });
}
