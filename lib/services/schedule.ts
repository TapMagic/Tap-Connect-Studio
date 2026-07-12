import { prisma } from "@/lib/db";
import { ensureScheduleRuleTable, isMissingRelationError } from "@/lib/db/ensure-schedule";

/** JS Sunday=0 → schema Mon=1 … Sun=7 */
export function dayOfWeekMon1(date = new Date()): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function currentTimeHHMM(date = new Date()): string {
  return date.toTimeString().slice(0, 5);
}

function timeInRange(now: string, start?: string | null, end?: string | null): boolean {
  if (!start && !end) return true;
  const s = start || "00:00";
  const e = end || "23:59";
  if (s <= e) return now >= s && now <= e;
  // overnight window e.g. 22:00–02:00
  return now >= s || now <= e;
}

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
    if (!["LIVE", "READY", "SCHEDULED", "DRAFT"].includes(rule.campaign.status)) continue;
    return { rule, campaign: rule.campaign };
  }

  return null;
}
