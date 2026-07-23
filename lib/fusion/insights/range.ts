/**
 * Insights date-range parsing + CSV field escaping (pure).
 */

export const INSIGHTS_RANGE_MIN = 1;
export const INSIGHTS_RANGE_MAX = 90;
export const INSIGHTS_RANGE_DEFAULT = 14;

export function parseInsightsRangeDays(
  input: string | number | null | undefined
): number {
  const n = typeof input === "number" ? input : Number(input ?? INSIGHTS_RANGE_DEFAULT);
  if (!Number.isFinite(n) || n < INSIGHTS_RANGE_MIN) return INSIGHTS_RANGE_DEFAULT;
  return Math.min(INSIGHTS_RANGE_MAX, Math.max(INSIGHTS_RANGE_MIN, Math.floor(n)));
}

export function csvEscapeField(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
