/**
 * TapLoop → Insights hooks — Prisma-derived loyalty KPIs with evidence labels.
 * Insights hub may import these; TapLoop operator UI exposes the same snapshot.
 */

import { prisma } from "@/lib/db";
import type { EvidenceClass } from "@/lib/fusion/insights/tapproof";

export type LoyaltyInsightKpi = {
  key: string;
  label: string;
  value: number;
  evidenceClass: EvidenceClass;
  source: string;
  seeded: boolean;
};

export type LoyaltyInsightsSnapshot = {
  rangeDays: number;
  from: string;
  to: string;
  kpis: LoyaltyInsightKpi[];
  empty: boolean;
  fetchedAt: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

export async function fetchLoyaltyInsightKpis(
  businessId: string,
  rangeDays = 14
): Promise<LoyaltyInsightsSnapshot> {
  const days = Math.min(90, Math.max(1, Math.floor(Number(rangeDays) || 14)));
  const from = daysAgo(days);
  const to = new Date();

  const [
    programsActive,
    enrollmentsActive,
    awardsInRange,
    redeemsInRange,
    reversesInRange,
    adjustsInRange,
    pointsAwardedAgg,
    pointsRedeemedAgg,
  ] = await Promise.all([
    prisma.loyaltyProgram.count({ where: { businessId, active: true } }),
    prisma.loyaltyEnrollment.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.loyaltyLedgerEntry.count({
      where: { businessId, type: "AWARD", createdAt: { gte: from } },
    }),
    prisma.loyaltyLedgerEntry.count({
      where: { businessId, type: "REDEEM", createdAt: { gte: from } },
    }),
    prisma.loyaltyLedgerEntry.count({
      where: { businessId, type: "REVERSE", createdAt: { gte: from } },
    }),
    prisma.loyaltyLedgerEntry.count({
      where: {
        businessId,
        type: { in: ["ADJUST", "EXPIRE"] },
        createdAt: { gte: from },
      },
    }),
    prisma.loyaltyLedgerEntry.aggregate({
      where: { businessId, type: "AWARD", createdAt: { gte: from } },
      _sum: { points: true },
    }),
    prisma.loyaltyLedgerEntry.aggregate({
      where: { businessId, type: "REDEEM", createdAt: { gte: from } },
      _sum: { points: true },
    }),
  ]);

  const kpis: LoyaltyInsightKpi[] = [
    {
      key: "loyalty_programs_active",
      label: "Active programs",
      value: programsActive,
      evidenceClass: "confirmed",
      source: "LoyaltyProgram",
      seeded: false,
    },
    {
      key: "loyalty_enrollments_active",
      label: "Active members",
      value: enrollmentsActive,
      evidenceClass: "confirmed",
      source: "LoyaltyEnrollment",
      seeded: false,
    },
    {
      key: "loyalty_awards_range",
      label: `Awards (${days}d)`,
      value: awardsInRange,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.AWARD",
      seeded: false,
    },
    {
      key: "loyalty_redeems_range",
      label: `Redeems (${days}d)`,
      value: redeemsInRange,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.REDEEM",
      seeded: false,
    },
    {
      key: "loyalty_points_awarded_range",
      label: `Points awarded (${days}d)`,
      value: pointsAwardedAgg._sum.points ?? 0,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.AWARD.sum",
      seeded: false,
    },
    {
      key: "loyalty_points_redeemed_range",
      label: `Points redeemed (${days}d)`,
      value: pointsRedeemedAgg._sum.points ?? 0,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.REDEEM.sum",
      seeded: false,
    },
    {
      key: "loyalty_reversals_range",
      label: `Reversals (${days}d)`,
      value: reversesInRange,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.REVERSE",
      seeded: false,
    },
    {
      key: "loyalty_adjustments_range",
      label: `Adjustments (${days}d)`,
      value: adjustsInRange,
      evidenceClass: "confirmed",
      source: "LoyaltyLedgerEntry.ADJUST|EXPIRE",
      seeded: false,
    },
  ];

  return {
    rangeDays: days,
    from: from.toISOString(),
    to: to.toISOString(),
    kpis,
    empty: kpis.every((k) => k.value === 0),
    fetchedAt: new Date().toISOString(),
  };
}
