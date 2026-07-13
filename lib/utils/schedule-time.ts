/** Day/time helpers safe for client + server (no DB). */

/** JS Sunday=0 → schema Mon=1 … Sun=7 */
export function dayOfWeekMon1(date = new Date()): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function currentTimeHHMM(date = new Date()): string {
  return date.toTimeString().slice(0, 5);
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
