import { prisma } from "@/lib/db";
import { ensureScheduleRuleTable, isMissingRelationError } from "@/lib/db/ensure-schedule";
import { ensureCampaignGroupTables } from "@/lib/db/ensure-group";
import { getZonedParts, timeInRange } from "@/lib/utils/schedule-time";

export {
  dayOfWeekMon1,
  currentTimeHHMM,
  formatDaysLabel,
  formatScheduleWindow,
  timeInRange,
  getZonedParts,
  listUpcomingWindows,
  matchSlotAt,
  COMMON_TIMEZONES,
} from "@/lib/utils/schedule-time";

const LIVE_STATUSES = ["LIVE", "SCHEDULED"];

export function campaignIsPlayable(status: string) {
  return LIVE_STATUSES.includes(status);
}

async function resolveGroupTimezone(group: {
  timezone: string | null;
  businessId: string;
}) {
  if (group.timezone?.trim()) return group.timezone.trim();
  try {
    const business = await prisma.business.findUnique({
      where: { id: group.businessId },
      select: { timezone: true },
    });
    return business?.timezone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

/** Resolve from a Campaign Group (shared across devices). */
export async function resolveGroupCampaign(groupId: string, at = new Date()) {
  await ensureCampaignGroupTables();

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

  const tz = await resolveGroupTimezone(group);
  const { dayMon1, hhmm } = getZonedParts(at, tz);

  for (const slot of group.slots) {
    const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
    if (days.length && !days.includes(dayMon1)) continue;
    if (!timeInRange(hhmm, slot.startTime, slot.endTime)) continue;
    if (!slot.campaign || !campaignIsPlayable(slot.campaign.status)) continue;
    return { slot, campaign: slot.campaign, group, via: "slot" as const, timezone: tz };
  }

  if (group.defaultCampaign && campaignIsPlayable(group.defaultCampaign.status)) {
    return {
      slot: null,
      campaign: group.defaultCampaign,
      group,
      via: "default" as const,
      timezone: tz,
    };
  }

  // End page when nothing matches
  try {
    const withEnd = await prisma.campaignGroup.findUnique({
      where: { id: groupId },
      include: { endCampaign: true },
    });
    if (withEnd?.endCampaign && campaignIsPlayable(withEnd.endCampaign.status)) {
      return {
        slot: null,
        campaign: withEnd.endCampaign,
        group: withEnd,
        via: "end" as const,
        timezone: tz,
      };
    }
  } catch {
    /* endCampaignId may not exist yet */
  }

  return null;
}

/** Per-device ScheduleRule (legacy / single-device overrides). */
export async function resolveScheduledCampaign(
  deviceSlotId: string,
  at = new Date(),
  timezone?: string | null,
) {
  await ensureScheduleRuleTable();

  const zoned = getZonedParts(at, timezone);
  const day = zoned.dayMon1;
  const time = zoned.hhmm;

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
    if (rule.endDate && rule.endDate <= at) continue;
    if (!timeInRange(time, rule.startTime, rule.endTime)) continue;
    if (!rule.campaign) continue;
    if (!campaignIsPlayable(rule.campaign.status)) continue;
    return { rule, campaign: rule.campaign, timezone: zoned.timeZone };
  }

  return null;
}

export type ScheduleDecision = {
  selectedCampaignId: string | null;
  selectionReason: string;
  source: "GROUP_SLOT" | "GROUP_DEFAULT" | "GROUP_END" | "DEVICE_RULE" | "ASSIGNMENT" | "FALLBACK";
  activeWindow: { start: string | null; end: string | null; timezone: string } | null;
  fallback: string;
  rejectedCandidates: Array<{ source: string; reason: string }>;
  normalizedStatus: string;
};

/** Canonical public schedule projection over retained Group, rule and assignment mechanisms. */
export async function resolveCampaignSchedule<TCampaign extends {
  id: string;
  status: string;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
}>(input: {
  deviceSlotId: string;
  groupId?: string | null;
  assignmentCampaign?: TCampaign | null;
  timezone?: string | null;
  at?: Date;
}) {
  const at = input.at ?? new Date();
  const rejectedCandidates: ScheduleDecision["rejectedCandidates"] = [];

  if (input.groupId) {
    const group = await resolveGroupCampaign(input.groupId, at);
    if (group?.campaign) {
      const source = group.via === "slot" ? "GROUP_SLOT" : group.via === "default" ? "GROUP_DEFAULT" : "GROUP_END";
      return {
        campaign: group.campaign,
        scheduleRule: null,
        groupSlot: group.slot,
        campaignGroup: group.group,
        decision: {
          selectedCampaignId: group.campaign.id,
          selectionReason:
            group.via === "slot"
              ? `${group.slot?.label ?? "Scheduled Campaign"} is the highest-priority eligible Group slot.`
              : group.via === "default"
                ? "No eligible Group slot matched, so the Group default is active."
                : "No eligible Group slot or default matched, so the Group fallback is active.",
          source,
          activeWindow: group.slot
            ? { start: group.slot.startTime, end: group.slot.endTime, timezone: group.timezone }
            : null,
          fallback: "The assigned Campaign or published Card appears when no eligible schedule matches.",
          rejectedCandidates,
          normalizedStatus: group.campaign.status === "LIVE" ? "ACTIVE" : group.campaign.status,
        } satisfies ScheduleDecision,
      };
    }
    rejectedCandidates.push({ source: "Campaign Group", reason: "No enabled eligible slot, default, or fallback matched." });
  }

  const scheduled = await resolveScheduledCampaign(input.deviceSlotId, at, input.timezone);
  if (scheduled?.campaign) {
    return {
      campaign: scheduled.campaign,
      scheduleRule: scheduled.rule,
      groupSlot: null,
      campaignGroup: null,
      decision: {
        selectedCampaignId: scheduled.campaign.id,
        selectionReason: `${scheduled.rule.label} is the highest-priority eligible Tap Point schedule.`,
        source: "DEVICE_RULE",
        activeWindow: {
          start: scheduled.rule.startTime,
          end: scheduled.rule.endTime,
          timezone: scheduled.timezone,
        },
        fallback: "The assigned Campaign or published Card appears outside this window.",
        rejectedCandidates,
        normalizedStatus: scheduled.campaign.status === "LIVE" ? "ACTIVE" : scheduled.campaign.status,
      } satisfies ScheduleDecision,
    };
  }
  rejectedCandidates.push({ source: "Tap Point schedule", reason: "No enabled eligible rule matched this timestamp." });

  const assignment = input.assignmentCampaign;
  const inAvailability = Boolean(
    assignment &&
      (!assignment.scheduledStart || assignment.scheduledStart <= at) &&
      (!assignment.scheduledEnd || assignment.scheduledEnd > at),
  );
  if (assignment && campaignIsPlayable(assignment.status) && inAvailability) {
    return {
      campaign: assignment,
      scheduleRule: null,
      groupSlot: null,
      campaignGroup: null,
      decision: {
        selectedCampaignId: assignment.id,
        selectionReason: "No higher-priority schedule matched, so the active assignment is selected.",
        source: "ASSIGNMENT",
        activeWindow: {
          start: assignment.scheduledStart?.toISOString() ?? null,
          end: assignment.scheduledEnd?.toISOString() ?? null,
          timezone: input.timezone || "UTC",
        },
        fallback: "The published Card appears if this Campaign becomes ineligible.",
        rejectedCandidates,
        normalizedStatus: assignment.status === "LIVE" ? "ACTIVE" : assignment.status,
      } satisfies ScheduleDecision,
    };
  }
  if (assignment) {
    rejectedCandidates.push({
      source: "Assignment",
      reason: campaignIsPlayable(assignment.status)
        ? "The Campaign is outside its availability window."
        : `${assignment.status} Campaigns are not publicly eligible.`,
    });
  }
  return {
    campaign: null,
    scheduleRule: null,
    groupSlot: null,
    campaignGroup: null,
    decision: {
      selectedCampaignId: null,
      selectionReason: "No eligible Campaign matched; the published Card is the safe fallback.",
      source: "FALLBACK",
      activeWindow: null,
      fallback: "Published Card",
      rejectedCandidates,
      normalizedStatus: "FALLBACK",
    } satisfies ScheduleDecision,
  };
}
