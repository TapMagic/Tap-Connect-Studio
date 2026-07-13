/** Day/time helpers safe for client + server (no DB). */

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;

/** JS Sunday=0 → schema Mon=1 … Sun=7 */
export function dayOfWeekMon1(date = new Date()): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function currentTimeHHMM(date = new Date()): string {
  return date.toTimeString().slice(0, 5);
}

/** Day + clock in an IANA timezone (falls back to local if invalid). */
export function getZonedParts(date: Date, timeZone?: string | null) {
  const tz = timeZone?.trim() || undefined;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekday = get("weekday"); // Sun, Mon, …
    const map: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const dayMon1 = map[weekday] ?? dayOfWeekMon1(date);
    const hour = get("hour").padStart(2, "0");
    const minute = get("minute").padStart(2, "0");
    const hhmm = `${hour}:${minute}`;
    const y = get("year");
    const m = get("month");
    const d = get("day");
    return {
      dayMon1,
      hhmm,
      dateKey: `${y}-${m}-${d}`,
      weekdayLabel: weekday,
      timeZone: tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  } catch {
    return {
      dayMon1: dayOfWeekMon1(date),
      hhmm: currentTimeHHMM(date),
      dateKey: date.toISOString().slice(0, 10),
      weekdayLabel: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]!,
      timeZone: "local",
    };
  }
}

export function formatDaysLabel(days: number[]): string {
  const names = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (!days.length) return "Every day";
  if (days.length === 7) return "Every day";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => names[d] ?? "?").join("·");
}

export function formatScheduleWindow(
  days: number[],
  startTime?: string | null,
  endTime?: string | null
): string {
  const dayPart = formatDaysLabel(days);
  if (!startTime && !endTime) return dayPart;
  return `${dayPart} · ${startTime || "00:00"}–${endTime || "23:59"}`;
}

export function timeInRange(now: string, start?: string | null, end?: string | null): boolean {
  if (!start && !end) return true;
  const s = start || "00:00";
  const e = end || "23:59";
  if (s <= e) return now >= s && now <= e;
  return now >= s || now <= e;
}

export type ScheduleSlotLike = {
  id: string;
  label: string;
  daysOfWeek: number[] | unknown;
  startTime?: string | null;
  endTime?: string | null;
  priority?: number;
  enabled?: boolean;
  campaignTitle?: string;
};

export type UpcomingItem = {
  slotId: string;
  label: string;
  campaignTitle?: string;
  scheduleLabel: string;
  whenLabel: string;
  isLive: boolean;
  dayMon1: number;
  startTime: string;
  endTime: string;
};

/** Next N windows in the group's timezone (for dashboards + public “coming up” strips). */
export function listUpcomingWindows(
  slots: ScheduleSlotLike[],
  timeZone: string | null | undefined,
  opts: { daysAhead?: number; limit?: number; at?: Date } = {}
): UpcomingItem[] {
  const daysAhead = opts.daysAhead ?? 7;
  const limit = opts.limit ?? 6;
  const at = opts.at ?? new Date();
  const now = getZonedParts(at, timeZone);
  const out: UpcomingItem[] = [];

  const enabled = slots.filter((s) => s.enabled !== false);

  for (let offset = 0; offset < daysAhead; offset++) {
    const probe = new Date(at.getTime() + offset * 24 * 60 * 60 * 1000);
    const z = getZonedParts(probe, timeZone);

    for (const slot of enabled) {
      const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
      if (days.length && !days.includes(z.dayMon1)) continue;

      const start = slot.startTime || "00:00";
      const end = slot.endTime || "23:59";
      const scheduleLabel = formatScheduleWindow(days.length ? days : [z.dayMon1], start, end);
      const liveToday =
        offset === 0 && timeInRange(now.hhmm, start, end);

      let whenLabel: string;
      if (liveToday) whenLabel = "Live now";
      else if (offset === 0) whenLabel = `Today ${start}`;
      else if (offset === 1) whenLabel = `Tomorrow ${start}`;
      else whenLabel = `${z.weekdayLabel} ${start}`;

      // Skip past windows today that already ended
      if (offset === 0 && !liveToday && now.hhmm > end && start <= end) continue;

      out.push({
        slotId: slot.id,
        label: slot.label,
        campaignTitle: slot.campaignTitle,
        scheduleLabel,
        whenLabel,
        isLive: liveToday,
        dayMon1: z.dayMon1,
        startTime: start,
        endTime: end,
      });
    }
  }

  // Prefer live first, then sooner windows; de-dupe by slotId+whenLabel
  const seen = new Set<string>();
  return out
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.whenLabel.localeCompare(b.whenLabel);
    })
    .filter((item) => {
      const key = `${item.slotId}:${item.whenLabel}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function matchSlotAt(
  slots: ScheduleSlotLike[],
  timeZone: string | null | undefined,
  at = new Date()
): ScheduleSlotLike | null {
  const { dayMon1, hhmm } = getZonedParts(at, timeZone);
  const sorted = [...slots]
    .filter((s) => s.enabled !== false)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const slot of sorted) {
    const days = Array.isArray(slot.daysOfWeek) ? (slot.daysOfWeek as number[]) : [];
    if (days.length && !days.includes(dayMon1)) continue;
    if (!timeInRange(hhmm, slot.startTime, slot.endTime)) continue;
    return slot;
  }
  return null;
}
