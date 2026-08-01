import { CampaignStatus, DeviceStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ContentBlock } from "@/lib/types/campaign";
import { normalizeContentBlocks } from "@/lib/services/normalize-content-blocks";
import { resolveCampaignSchedule } from "@/lib/services/schedule";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";
import { ensureTapPointBridgeForDevice, resolveDeviceSlotByPublicCode } from "@/lib/fusion/devices/tap-point-bridge";

export async function getDeviceWithActiveCampaign(
  deviceCode: string,
  options?: { at?: Date }
) {
  await ensureCampaignGroupTables();
  const at = options?.at ?? new Date();

  const deviceInclude = {
    business: { include: { brandKit: true } },
    location: true,
    campaignGroup: true,
    assignments: {
      where: { status: "ACTIVE" as const },
      orderBy: { startsAt: "desc" as const },
      take: 1,
      include: { campaign: true },
    },
  };

  let device = await prisma.deviceSlot.findUnique({
    where: { deviceCode },
    include: deviceInclude,
  });

  if (!device) {
    const bridged = await resolveDeviceSlotByPublicCode(deviceCode);
    if (bridged) {
      device = await prisma.deviceSlot.findUnique({
        where: { id: bridged.id },
        include: deviceInclude,
      });
    }
  }

  if (!device) return null;

  void ensureTapPointBridgeForDevice(device);

  const assignment = device.assignments[0];

  const resolved = await resolveCampaignSchedule({
    deviceSlotId: device.id,
    groupId: device.campaignGroupId,
    assignmentCampaign: assignment?.campaign ?? null,
    timezone: device.business?.timezone,
    at,
  });
  return {
    device,
    assignment,
    ...resolved,
    campaignGroup: resolved.campaignGroup ?? device.campaignGroup,
  };
}

export async function logTapEvent(params: {
  deviceSlotId: string;
  businessId?: string | null;
  campaignId?: string | null;
  visitorHash?: string;
  userAgent?: string | null;
  referrer?: string | null;
  cardPublicationId?: string | null;
  scheduleDecision?: unknown;
  fixture?: boolean;
  resolutionOutcome?: string | null;
}) {
  const [tapEvent] = await prisma.$transaction([
    prisma.tapEvent.create({
      data: {
        deviceSlotId: params.deviceSlotId,
        businessId: params.businessId ?? undefined,
        campaignId: params.campaignId ?? undefined,
        visitorHash: params.visitorHash,
        userAgent: params.userAgent ?? undefined,
        referrer: params.referrer ?? undefined,
        cardPublicationId: params.cardPublicationId ?? undefined,
        scheduleDecision: params.scheduleDecision as Prisma.InputJsonValue | undefined,
        fixture: params.fixture ?? false,
        resolutionOutcome: params.resolutionOutcome ?? undefined,
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
  return tapEvent;
}

export function parseContentBlocks(raw: Prisma.JsonValue): ContentBlock[] {
  return normalizeContentBlocks(raw);
}

export function isCampaignLive(campaign: {
  status: CampaignStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
}): boolean {
  const now = new Date();
  if (["ARCHIVED", "CLOSED", "PAUSED", "FAILED", "COMPLETED", "DRAFT", "READY"].includes(campaign.status)) return false;

  if (campaign.scheduledStart && campaign.scheduledStart > now) return false;
  if (campaign.scheduledEnd && campaign.scheduledEnd < now) return false;

  return ["LIVE", "SCHEDULED"].includes(campaign.status);
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
