import { CampaignStatus, DeviceStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ContentBlock } from "@/lib/types/campaign";

export async function getDeviceWithActiveCampaign(deviceCode: string) {
  const device = await prisma.deviceSlot.findUnique({
    where: { deviceCode },
    include: {
      business: { include: { brandKit: true } },
      location: true,
      assignments: {
        where: { status: "ACTIVE" },
        orderBy: { startsAt: "desc" },
        take: 1,
        include: { campaign: true },
      },
    },
  });

  if (!device) return null;

  const assignment = device.assignments[0];
  const campaign = assignment?.campaign;

  return { device, assignment, campaign };
}

export async function logTapEvent(params: {
  deviceSlotId: string;
  businessId?: string | null;
  campaignId?: string | null;
  visitorHash?: string;
  userAgent?: string | null;
  referrer?: string | null;
}) {
  await prisma.$transaction([
    prisma.tapEvent.create({
      data: {
        deviceSlotId: params.deviceSlotId,
        businessId: params.businessId ?? undefined,
        campaignId: params.campaignId ?? undefined,
        visitorHash: params.visitorHash,
        userAgent: params.userAgent ?? undefined,
        referrer: params.referrer ?? undefined,
      },
    }),
    prisma.deviceSlot.update({
      where: { id: params.deviceSlotId },
      data: {
        totalTapCount: { increment: 1 },
        lastTappedAt: new Date(),
      },
    }),
  ]);
}

export function parseContentBlocks(raw: Prisma.JsonValue): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw as unknown as ContentBlock[];
}

export function isCampaignLive(campaign: {
  status: CampaignStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
}): boolean {
  const now = new Date();
  if (campaign.status === "LIVE") {
    if (campaign.scheduledStart && campaign.scheduledStart > now) return false;
    if (campaign.scheduledEnd && campaign.scheduledEnd < now) return false;
    return true;
  }
  if (campaign.status === "SCHEDULED" && campaign.scheduledStart) {
    return campaign.scheduledStart <= now && (!campaign.scheduledEnd || campaign.scheduledEnd >= now);
  }
  return false;
}

export function shouldShowInactiveDevice(status: DeviceStatus): boolean {
  return ["INACTIVE", "LOST", "CLOSED", "RETIRED", "SUSPENDED", "ARCHIVED", "REPLACED"].includes(status);
}

export async function getDashboardStats(businessId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalTaps,
    tapsThisMonth,
    totalLeads,
    leadsThisMonth,
    activeDevices,
    liveCampaigns,
    topDevice,
  ] = await Promise.all([
    prisma.tapEvent.count({ where: { businessId } }),
    prisma.tapEvent.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.lead.count({ where: { businessId } }),
    prisma.lead.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.deviceSlot.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.campaign.count({ where: { businessId, status: { in: ["LIVE", "SCHEDULED"] } } }),
    prisma.deviceSlot.findFirst({
      where: { businessId },
      orderBy: { totalTapCount: "desc" },
      select: { nickname: true, deviceCode: true, totalTapCount: true },
    }),
  ]);

  return {
    totalTaps,
    tapsThisMonth,
    totalLeads,
    leadsThisMonth,
    activeDevices,
    liveCampaigns,
    topDevice,
  };
}
