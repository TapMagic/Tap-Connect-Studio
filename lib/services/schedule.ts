import { prisma } from "@/lib/db";
import { ensureScheduleRuleTable, isMissingRelationError } from "@/lib/db/ensure-schedule";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";
import {
  currentTimeHHMM,
  dayOfWeekMon1,
  timeInRange,
} from "@/lib/utils/schedule-time";

export {
  dayOfWeekMon1,
  currentTimeHHMM,
  formatDaysLabel,
  formatScheduleWindow,
  timeInRange,
} from "@/lib/utils/schedule-time";

const LIVE_STATUSES = ["LIVE", "READY", "SCHEDULED", "DRAFT"];

function campaignIsPlayable(status: string) {
  return LIVE_STATUSES.includes(status);
}

/** Resolve from a Campaign Group (shared across table/bar devices). */
export async function resolveGroupCampaign(groupId: string, at = new Date()) {
  await ensureCampaignGroupTables();

  const day = dayOfWeekMon1(at);
  const time = currentTimeHHMM(at);

  let group;
  try {
    group = await prisma.campaignGroup.findUnique({
      where: { id: groupId },
      include: {
        defaultCampaign: true,
        slots: {
          where: { enabled: true },
          include: { campaign: true },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        },
      },
    });
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  if (!group) return null;
  if (["PAUSED", "ARCHIVED", "CLOSED"].includes(group.status)) return null;

  for (const slot of group.slots) {
    const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
    if (days.length && !days.includes(day)) continue;
    if (!timeInRange(time, slot.startTime, slot.endTime)) continue;
    if (!slot.campaign || !campaignIsPlayable(slot.campaign.status)) continue;
    return { slot, campaign: slot.campaign, group, via: "slot" as const };
  }

  if (group.defaultCampaign && campaignIsPlayable(group.defaultCampaign.status)) {
    return {
      slot: null,
      campaign: group.defaultCampaign,
      group,
      via: "default" as const,
    };
  }

  return null;
}

/** Per-device ScheduleRule (legacy / single-device overrides). */
export async function resolveScheduledCampaign(deviceSlotId: string, at = new Date()) {
  await ensureScheduleRuleTable();

  const day = dayOfWeekMon1(at);
  const time = currentTimeHHMM(at);

  let rules;
  try {
    rules = await prisma.scheduleRule.findMany({
      where: { deviceSlotId, enabled: true },
      include: { campaign: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  for (const rule of rules) {
    const days = Array.isArray(rule.daysOfWeek) ? (rule.daysOfWeek as number[]) : [];
    if (days.length && !days.includes(day)) continue;
    if (rule.startDate && rule.startDate > at) continue;
    if (rule.endDate && rule.endDate < at) continue;
    if (!timeInRange(time, rule.startTime, rule.endTime)) continue;
    if (!rule.campaign) continue;
    if (!campaignIsPlayable(rule.campaign.status)) continue;
    return { rule, campaign: rule.campaign };
  }

  return null;
}
