import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";
import { createCampaignFromTemplate, cloneCampaign } from "@/lib/services/campaigns";
import {
  getZonedParts,
  listUpcomingWindows,
  matchSlotAt,
} from "@/lib/utils/schedule-time";

import type { GroupSeedPack } from "@/lib/campaign/group-seeds";
import { GROUP_SEED_OPTIONS } from "@/lib/campaign/group-seeds";

export type { GroupSeedPack };
export { GROUP_SEED_OPTIONS };
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
      business: { select: { timezone: true } },
      defaultCampaign: { select: { id: true, title: true, status: true } },
      endCampaign: { select: { id: true, title: true, status: true } },
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
          locationId: true,
          location: { select: { id: true, name: true } },
        },
        orderBy: { nickname: "asc" },
      },
    },
  });
}

export function groupEffectiveTimezone(group: {
  timezone?: string | null;
  business?: { timezone?: string | null } | null;
}) {
  return group.timezone?.trim() || group.business?.timezone?.trim() || "America/New_York";
}

export function buildGroupLivePreview(group: {
  timezone?: string | null;
  business?: { timezone?: string | null } | null;
  status: string;
  defaultCampaign?: { id: string; title: string; status: string } | null;
  endCampaign?: { id: string; title: string; status: string } | null;
  slots: {
    id: string;
    label: string;
    daysOfWeek: unknown;
    startTime: string | null;
    endTime: string | null;
    priority: number;
    enabled: boolean;
    campaign: { id: string; title: string; status: string };
  }[];
}) {
  const tz = groupEffectiveTimezone(group);
  const zoned = getZonedParts(new Date(), tz);
  const paused = ["PAUSED", "ARCHIVED", "CLOSED"].includes(group.status);

  const match = !paused
    ? matchSlotAt(
        group.slots.map((s) => ({
          ...s,
          campaignTitle: s.campaign.title,
        })),
        tz
      )
    : null;

  const liveSlot = match
    ? group.slots.find((s) => s.id === match.id)
    : null;

  const upcoming = listUpcomingWindows(
    group.slots.map((s) => ({
      ...s,
      campaignTitle: s.campaign.title,
    })),
    tz,
    { daysAhead: 7, limit: 6 }
  );

  return {
    timezone: tz,
    localClock: `${zoned.weekdayLabel} ${zoned.hhmm}`,
    paused,
    live: liveSlot
      ? {
          via: "slot" as const,
          slotId: liveSlot.id,
          label: liveSlot.label,
          campaignId: liveSlot.campaign.id,
          campaignTitle: liveSlot.campaign.title,
        }
      : group.defaultCampaign && !paused
        ? {
            via: "default" as const,
            slotId: null as string | null,
            label: "Default page",
            campaignId: group.defaultCampaign.id,
            campaignTitle: group.defaultCampaign.title,
          }
        : group.endCampaign && !paused
          ? {
              via: "end" as const,
              slotId: null as string | null,
              label: "End page",
              campaignId: group.endCampaign.id,
              campaignTitle: group.endCampaign.title,
            }
          : null,
    upcoming,
  };
}

export async function createCampaignGroup(params: {
  businessId: string;
  title: string;
  description?: string;
  timezone?: string;
  seedPack?: GroupSeedPack;
  userId?: string;
}) {
  await ensureCampaignGroupTables();

  const business = await prisma.business.findUnique({
    where: { id: params.businessId },
    select: { timezone: true },
  });

  const group = await prisma.campaignGroup.create({
    data: {
      businessId: params.businessId,
      title: params.title,
      description: params.description ?? null,
      status: CampaignStatus.LIVE,
      timezone: params.timezone ?? business?.timezone ?? "America/New_York",
      industryHint: params.seedPack && params.seedPack !== "none" ? params.seedPack : null,
      showUpcomingOnPages: true,
    },
  });

  if (params.seedPack && params.seedPack !== "none" && params.userId) {
    await seedIndustryPack({
      businessId: params.businessId,
      groupId: group.id,
      userId: params.userId,
      pack: params.seedPack,
    });
  }

  return getCampaignGroup(params.businessId, group.id);
}

type SeedSlot = {
  label: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  priority: number;
  pageTitle: string;
  templateId: string;
  blocks?: object[];
};

async function seedIndustryPack(params: {
  businessId: string;
  groupId: string;
  userId: string;
  pack: Exclude<GroupSeedPack, "none">;
}) {
  const packs: Record<Exclude<GroupSeedPack, "none">, { defaultTitle: string; slots: SeedSlot[] }> = {
    general: {
      defaultTitle: "Welcome",
      slots: [
        {
          label: "Weekday offer",
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "09:00",
          endTime: "17:00",
          priority: 5,
          pageTitle: "Weekday special",
          templateId: "coupon-offer",
        },
        {
          label: "Weekend promo",
          daysOfWeek: [6, 7],
          startTime: "10:00",
          endTime: "18:00",
          priority: 5,
          pageTitle: "Weekend promo",
          templateId: "lead-capture",
        },
      ],
    },
    hospitality: {
      defaultTitle: "House welcome",
      slots: [
        {
          label: "Weeknight special",
          daysOfWeek: [2],
          startTime: "16:00",
          endTime: "23:59",
          priority: 10,
          pageTitle: "Tonight’s special",
          templateId: "coupon-offer",
          blocks: [
            {
              id: "h1",
              type: "headline",
              order: 0,
              enabled: true,
              label: "Headline",
              data: {
                headline: "Tonight’s special",
                subheadline: "Unlock with your contact info",
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
                headline: "Get tonight’s offer",
                buttonLabel: "Unlock offer",
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
                title: "Featured special",
                description: "Show this to your server. While supplies last.",
                code: "TONIGHT",
                ctaLabel: "Got it",
                lockedUntilContact: true,
              },
            },
          ],
        },
        {
          label: "Daytime promo",
          daysOfWeek: [1, 2, 3, 4],
          startTime: "12:00",
          endTime: "16:00",
          priority: 5,
          pageTitle: "Daytime promo",
          templateId: "video-demo",
        },
      ],
    },
    salon: {
      defaultTitle: "Book with us",
      slots: [
        {
          label: "Color weekdays",
          daysOfWeek: [1, 2, 3, 4],
          startTime: "10:00",
          endTime: "18:00",
          priority: 8,
          pageTitle: "Color special",
          templateId: "coupon-offer",
        },
        {
          label: "Weekend package",
          daysOfWeek: [5, 6],
          startTime: "09:00",
          endTime: "17:00",
          priority: 8,
          pageTitle: "Weekend package",
          templateId: "lead-capture",
        },
      ],
    },
    wedding: {
      defaultTitle: "Plan with us",
      slots: [
        {
          label: "Consult hours",
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "10:00",
          endTime: "16:00",
          priority: 7,
          pageTitle: "Book a consult",
          templateId: "lead-capture",
        },
        {
          label: "Weekend showcase",
          daysOfWeek: [6],
          startTime: "11:00",
          endTime: "16:00",
          priority: 9,
          pageTitle: "Open house / showcase",
          templateId: "event-announcement",
        },
      ],
    },
    home_services: {
      defaultTitle: "How can we help?",
      slots: [
        {
          label: "Weekday seasonal offer",
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "17:00",
          priority: 6,
          pageTitle: "Seasonal offer",
          templateId: "coupon-offer",
        },
        {
          label: "Weekend estimates",
          daysOfWeek: [6],
          startTime: "09:00",
          endTime: "14:00",
          priority: 8,
          pageTitle: "Free estimate weekend",
          templateId: "lead-capture",
        },
      ],
    },
  };

  const pack = packs[params.pack];
  const house = await createCampaignFromTemplate({
    businessId: params.businessId,
    templateId: "link-hub",
    title: pack.defaultTitle,
    userId: params.userId,
  });
  await prisma.campaign.update({
    where: { id: house.id },
    data: { groupId: params.groupId, status: CampaignStatus.READY },
  });

  for (const slot of pack.slots) {
    const campaign = await createCampaignFromTemplate({
      businessId: params.businessId,
      templateId: slot.templateId,
      title: slot.pageTitle,
      userId: params.userId,
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        groupId: params.groupId,
        status: CampaignStatus.READY,
        ...(slot.blocks ? { contentBlocks: slot.blocks } : {}),
      },
    });
    await prisma.campaignGroupSlot.create({
      data: {
        businessId: params.businessId,
        groupId: params.groupId,
        campaignId: campaign.id,
        label: slot.label,
        daysOfWeek: slot.daysOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        priority: slot.priority,
        enabled: true,
      },
    });
  }

  await prisma.campaignGroup.update({
    where: { id: params.groupId },
    data: { defaultCampaignId: house.id, industryHint: params.pack },
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
    endCampaignId?: string | null;
    timezone?: string | null;
    showUpcomingOnPages?: boolean;
    industryHint?: string | null;
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
      ...(data.endCampaignId !== undefined ? { endCampaignId: data.endCampaignId } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.showUpcomingOnPages !== undefined
        ? { showUpcomingOnPages: data.showUpcomingOnPages }
        : {}),
      ...(data.industryHint !== undefined ? { industryHint: data.industryHint } : {}),
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

export async function attachDevicesByLocation(params: {
  businessId: string;
  groupId: string;
  locationId: string;
}) {
  const devices = await prisma.deviceSlot.findMany({
    where: {
      businessId: params.businessId,
      locationId: params.locationId,
      status: { notIn: ["CLOSED", "RETIRED", "ARCHIVED", "REPLACED"] },
    },
    select: { id: true },
  });
  if (!devices.length) {
    return { group: await getCampaignGroup(params.businessId, params.groupId), attached: 0 };
  }
  const group = await attachDevicesToGroup({
    businessId: params.businessId,
    groupId: params.groupId,
    deviceIds: devices.map((d) => d.id),
  });
  return { group, attached: devices.length };
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

/** Clone the campaign page + its schedule slot (new timed offer from an existing one). */
export async function cloneGroupSlot(params: {
  businessId: string;
  groupId: string;
  slotId: string;
  userId?: string;
}) {
  await ensureCampaignGroupTables();
  const slot = await prisma.campaignGroupSlot.findFirst({
    where: {
      id: params.slotId,
      groupId: params.groupId,
      businessId: params.businessId,
    },
    include: { campaign: true },
  });
  if (!slot) return null;

  const campaign = await cloneCampaign(slot.campaignId, params.userId);
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      groupId: params.groupId,
      title: `${slot.campaign.title} (copy)`,
      status: CampaignStatus.READY,
    },
  });

  const newSlot = await prisma.campaignGroupSlot.create({
    data: {
      businessId: params.businessId,
      groupId: params.groupId,
      campaignId: campaign.id,
      label: `${slot.label} (copy)`,
      daysOfWeek: slot.daysOfWeek as object,
      startTime: slot.startTime,
      endTime: slot.endTime,
      priority: slot.priority,
      enabled: false,
    },
    include: { campaign: { select: { id: true, title: true, status: true } } },
  });

  return { slot: newSlot, campaign };
}

export async function getUpcomingForGroup(groupId: string) {
  await ensureCampaignGroupTables();
  const group = await prisma.campaignGroup.findUnique({
    where: { id: groupId },
    include: {
      business: { select: { timezone: true } },
      slots: {
        where: { enabled: true },
        include: { campaign: { select: { title: true, status: true } } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!group || !group.showUpcomingOnPages) return [];
  if (["PAUSED", "ARCHIVED", "CLOSED"].includes(group.status)) return [];

  const tz = groupEffectiveTimezone(group);
  return listUpcomingWindows(
    group.slots
      .filter((s) => !["PAUSED", "ARCHIVED", "CLOSED"].includes(s.campaign.status))
      .map((s) => ({
        id: s.id,
        label: s.label,
        daysOfWeek: s.daysOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        priority: s.priority,
        enabled: s.enabled,
        campaignTitle: s.campaign.title,
      })),
    tz,
    { daysAhead: 7, limit: 5 }
  ).filter((u) => !u.isLive);
}
