import { prisma } from "@/lib/db";

export type DayBucket = {
  date: string; // YYYY-MM-DD
  label: string;
  taps: number;
  leads: number;
};

export async function getAnalyticsTimeseries(businessId: string, days = 14) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [taps, leads, clickBreakdown] = await Promise.all([
    prisma.tapEvent.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.lead.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.clickEvent.groupBy({
      by: ["eventType"],
      where: { businessId, createdAt: { gte: since } },
      _count: true,
    }),
  ]);

  const buckets = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      taps: 0,
      leads: 0,
    });
  }

  for (const t of taps) {
    const key = t.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) b.taps += 1;
  }
  for (const l of leads) {
    const key = l.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) b.leads += 1;
  }

  const series = [...buckets.values()];
  const maxTaps = Math.max(1, ...series.map((s) => s.taps));
  const maxLeads = Math.max(1, ...series.map((s) => s.leads));

  const conversionRate =
    taps.length > 0 ? Math.round((leads.length / taps.length) * 1000) / 10 : 0;

  return {
    series,
    maxTaps,
    maxLeads,
    tapsInRange: taps.length,
    leadsInRange: leads.length,
    conversionRate,
    clicks: clickBreakdown
      .map((c) => ({ type: c.eventType, count: c._count }))
      .sort((a, b) => b.count - a.count),
  };
}
