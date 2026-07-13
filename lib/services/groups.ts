import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";
import { createCampaignFromTemplate } from "@/lib/services/campaigns";

export async function listCampaignGroups(businessId: string) {
  await ensureCampaignGroupTables();
  return prisma.campaignGroup.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { slots: true, devices: true, campaigns: true } },
      defaultCampaign: { select: { id: true, title: true, status: true } },
      slots: {
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          campaign: { select: { id: true, title: true, status: true } },
        },
      },
    },
  });
}

export async function getCampaignGroup(businessId: string, groupId: string) {
  await ensureCampaignGroupTables();
  return prisma.campaignGroup.findFirst({
    where: { id: groupId, businessId },
    include: {
      defaultCampaign: { select: { id: true, title: true, status: true } },
      campaigns: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          campaignType: true,
          updatedAt: true,
        },
      },
      slots: {
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          campaign: {
            select: { id: true, title: true, status: true, campaignType: true },
          },
        },
      },
      devices: {
        select: {
          id: true,
          nickname: true,
          deviceCode: true,
          status: true,
          locationNote: true,
        },
        orderBy: { nickname: "asc" },
      },
    },
  });
}

export async function createCampaignGroup(params: {
  businessId: string;
  title: string;
  description?: string;
  seedBarExample?: boolean;
  userId?: string;
}) {
  await ensureCampaignGroupTables();

  const group = await prisma.campaignGroup.create({
    data: {
      businessId: params.businessId,
      title: params.title,
      description: params.description ?? null,
      status: CampaignStatus.LIVE,
    },
  });

  if (params.seedBarExample && params.userId) {
    await seedBarGroupExample({
      businessId: params.businessId,
      groupId: group.id,
      userId: params.userId,
    });
  }

  return getCampaignGroup(params.businessId, group.id);
}

/** Example: Tue 4pm+ wing night + Mon–Thu lunch BOGO drafts + house default */
async function seedBarGroupExample(params: {
  businessId: string;
  groupId: string;
  userId: string;
}) {
  const wing = await createCampaignFromTemplate({
    businessId: params.businessId,
    templateId: "coupon-offer",
    title: "$1 Wing Night",
    userId: params.userId,
  });

  const bogo = await createCampaignFromTemplate({
    businessId: params.businessId,
    templateId: "video-demo",
    title: "BOGO Draft Beers",
    userId: params.userId,
  });

  const house = await createCampaignFromTemplate({
    businessId: params.businessId,
    templateId: "link-hub",
    title: "House Welcome",
    userId: params.userId,
  });

  await prisma.campaign.update({
    where: { id: wing.id },
    data: {
      groupId: params.groupId,
      status: CampaignStatus.READY,
      contentBlocks: [
        {
          id: "h1",
          type: "headline",
          order: 0,
          enabled: true,
          label: "Headline",
          data: {
            headline: "Tonight: $1 Wings",
            subheadline: "Unlock the special with your contact info",
            alignment: "center",
          },
        },
        {
          id: "e1",
          type: "email_capture",
          order: 1,
          enabled: true,
          label: "Contact",
          data: {
            headline: "Get tonight’s special",
            buttonLabel: "Unlock special",
            fields: ["name", "email"],
            successMessage: "You’re in — scroll for the deal.",
          },
        },
        {
          id: "o1",
          type: "offer_coupon",
          order: 2,
          enabled: true,
          label: "Offer",
          data: {
            title: "$1 Wing Night",
            description: "Show this to your server. While supplies last.",
            code: "WINGS1",
            ctaLabel: "Got it",
            lockedUntilContact: true,
          },
        },
      ],
    },
  });

  await prisma.campaign.update({
    where: { id: bogo.id },
    data: {
      groupId: params.groupId,
      status: CampaignStatus.READY,
      contentBlocks: [
        {
          id: "h2",
          type: "headline",
          order: 0,
          enabled: true,
          label: "Headline",
          data: {
            headline: "BOGO Draft Beers",
            subheadline: "Mon–Thu · 12:00–4:00",
            alignment: "center",
          },
        },
        {
          id: "v1",
          type: "hero_video",
          order: 1,
          enabled: true,
          label: "Video",
          data: { videoUrl: "", title: "Cold draft", autoplay: true },
        },
        {
          id: "t1",
          type: "rich_text",
          order: 2,
          enabled: true,
          label: "Text",
          data: { body: "Buy one draft, get one free. Ask your bartender." },
        },
      ],
    },
  });

  await prisma.campaign.update({
    where: { id: house.id },
    data: {
      groupId: params.groupId,
      status: CampaignStatus.READY,
      title: "House Welcome",
    },
  });

  await prisma.campaignGroupSlot.createMany({
    data: [
      {
        businessId: params.businessId,
        groupId: params.groupId,
        campaignId: wing.id,
        label: "Tue Wing Night",
        daysOfWeek: [2],
        startTime: "16:00",
        endTime: "23:59",
        priority: 10,
        enabled: true,
      },
      {
        businessId: params.businessId,
        groupId: params.groupId,
        campaignId: bogo.id,
        label: "Lunch BOGO Drafts",
        daysOfWeek: [1, 2, 3, 4],
        startTime: "12:00",
        endTime: "16:00",
        priority: 5,
        enabled: true,
      },
    ],
  });

  await prisma.campaignGroup.update({
    where: { id: params.groupId },
    data: { defaultCampaignId: house.id },
  });
}

export async function updateCampaignGroup(
  businessId: string,
  groupId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: CampaignStatus;
    defaultCampaignId?: string | null;
  }
) {
  await ensureCampaignGroupTables();
  const existing = await prisma.campaignGroup.findFirst({
    where: { id: groupId, businessId },
  });
  if (!existing) return null;

  return prisma.campaignGroup.update({
    where: { id: groupId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.defaultCampaignId !== undefined
        ? { defaultCampaignId: data.defaultCampaignId }
        : {}),
    },
  });
}

export async function attachDevicesToGroup(params: {
  businessId: string;
  groupId: string;
  deviceIds: string[];
}) {
  await ensureCampaignGroupTables();
  const group = await prisma.campaignGroup.findFirst({
    where: { id: params.groupId, businessId: params.businessId },
  });
  if (!group) return null;

  await prisma.deviceSlot.updateMany({
    where: {
      id: { in: params.deviceIds },
      businessId: params.businessId,
    },
    data: {
      campaignGroupId: params.groupId,
      status: "ACTIVE",
      activatedAt: new Date(),
    },
  });

  return getCampaignGroup(params.businessId, params.groupId);
}

export async function detachDeviceFromGroup(params: {
  businessId: string;
  deviceId: string;
}) {
  await ensureCampaignGroupTables();
  return prisma.deviceSlot.updateMany({
    where: { id: params.deviceId, businessId: params.businessId },
    data: { campaignGroupId: null },
  });
}

export async function createGroupSlot(params: {
  businessId: string;
  groupId: string;
  campaignId: string;
  label: string;
  daysOfWeek: number[];
  startTime?: string | null;
  endTime?: string | null;
  priority?: number;
  enabled?: boolean;
}) {
  await ensureCampaignGroupTables();
  const [group, campaign] = await Promise.all([
    prisma.campaignGroup.findFirst({
      where: { id: params.groupId, businessId: params.businessId },
    }),
    prisma.campaign.findFirst({
      where: { id: params.campaignId, businessId: params.businessId },
    }),
  ]);
  if (!group || !campaign) return null;

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { groupId: params.groupId },
  });

  return prisma.campaignGroupSlot.create({
    data: {
      businessId: params.businessId,
      groupId: params.groupId,
      campaignId: params.campaignId,
      label: params.label,
      daysOfWeek: params.daysOfWeek,
      startTime: params.startTime ?? null,
      endTime: params.endTime ?? null,
      priority: params.priority ?? 0,
      enabled: params.enabled ?? true,
    },
    include: { campaign: { select: { id: true, title: true, status: true } } },
  });
}
