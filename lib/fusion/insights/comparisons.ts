/**
 * Period-over-period comparisons for Insights KPIs — pure delta math.
 */

import type { InsightKpi } from "./types";

export type InsightKpiDelta = {
  key: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
  /** Percent change; null when previous is 0 (incomplete / undefined). */
  deltaPct: number | null;
  evidenceClass: InsightKpi["evidenceClass"];
};

export function computeKpiDeltas(
  current: InsightKpi[],
  previous: InsightKpi[]
): InsightKpiDelta[] {
  const prevMap = new Map(previous.map((k) => [k.key, k]));
  return current.map((k) => {
    const p = prevMap.get(k.key);
    const previousValue = p?.value ?? 0;
    const delta = k.value - previousValue;
    const deltaPct =
      previousValue === 0
        ? k.value === 0
          ? 0
          : null
        : Math.round((delta / previousValue) * 1000) / 10;
    return {
      key: k.key,
      label: k.label,
      current: k.value,
      previous: previousValue,
      delta,
      deltaPct,
      evidenceClass: "derived",
    };
  });
}

export function formatDeltaCaption(d: InsightKpiDelta): string {
  if (d.deltaPct === null) {
    return d.current > 0
      ? `+${d.delta} vs prior (prior was 0 · incomplete %)`
      : "0 vs prior";
  }
  const sign = d.delta > 0 ? "+" : "";
  return `${sign}${d.delta} (${sign}${d.deltaPct}%) vs prior period`;
}
