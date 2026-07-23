/**
 * Time-travel campaign resolver preview helpers.
 * Chooses date/time/timezone and explains which slot/fallback wins.
 */

import {
  dayOfWeekMon1,
  timeInRange,
} from "@/lib/utils/schedule-time";

export type TimeTravelSlot = {
  id: string;
  label: string;
  daysOfWeek: number[];
  startTime?: string | null;
  endTime?: string | null;
  priority: number;
  enabled: boolean;
  campaignId: string;
  campaignTitle: string;
};

export type TimeTravelInput = {
  at: Date;
  timezone: string;
  slots: TimeTravelSlot[];
  defaultCampaignId?: string | null;
  defaultCampaignTitle?: string | null;
  endCampaignId?: string | null;
  endCampaignTitle?: string | null;
};

export type TimeTravelResult = {
  atIso: string;
  timezone: string;
  dayOfWeek: number;
  timeHm: string;
  matchedSlotId?: string;
  campaignId?: string;
  campaignTitle?: string;
  reason: string;
};

function formatHmInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function resolveTimeTravel(input: TimeTravelInput): TimeTravelResult {
  const timeHm = formatHmInTz(input.at, input.timezone);
  // Approximate weekday in timezone via locale string
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timezone,
    weekday: "short",
  }).format(input.at);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const dayOfWeek = map[weekdayName] ?? dayOfWeekMon1(input.at);

  const candidates = input.slots
    .filter((s) => s.enabled)
    .filter((s) => !s.daysOfWeek.length || s.daysOfWeek.includes(dayOfWeek))
    .filter((s) => timeInRange(timeHm, s.startTime, s.endTime))
    .sort((a, b) => b.priority - a.priority);

  if (candidates[0]) {
    const win = candidates[0];
    return {
      atIso: input.at.toISOString(),
      timezone: input.timezone,
      dayOfWeek,
      timeHm,
      matchedSlotId: win.id,
      campaignId: win.campaignId,
      campaignTitle: win.campaignTitle,
      reason: `Matched slot “${win.label}” (priority ${win.priority}) for ${weekdayName} ${timeHm} ${input.timezone}.`,
    };
  }

  if (input.defaultCampaignId) {
    return {
      atIso: input.at.toISOString(),
      timezone: input.timezone,
      dayOfWeek,
      timeHm,
      campaignId: input.defaultCampaignId,
      campaignTitle: input.defaultCampaignTitle ?? undefined,
      reason: `No timed slot matched — using group default campaign.`,
    };
  }

  if (input.endCampaignId) {
    return {
      atIso: input.at.toISOString(),
      timezone: input.timezone,
      dayOfWeek,
      timeHm,
      campaignId: input.endCampaignId,
      campaignTitle: input.endCampaignTitle ?? undefined,
      reason: `No timed slot or default — using end / fallback campaign.`,
    };
  }

  return {
    atIso: input.at.toISOString(),
    timezone: input.timezone,
    dayOfWeek,
    timeHm,
    reason: `No slot, default, or end campaign configured for ${weekdayName} ${timeHm}.`,
  };
}
