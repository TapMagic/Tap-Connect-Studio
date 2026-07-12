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

  return prisma.campaign.create({
    data: {
      businessId: params.businessId,
      title: params.title,
      campaignType: template.campaignType as CampaignType,
      templateId: template.id,
      contentBlocks: blocks as unknown as Prisma.InputJsonValue,
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
