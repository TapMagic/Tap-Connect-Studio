/**
 * Insights hub metrics — Prisma-derived with evidence class labels.
 */

import { prisma } from "@/lib/db";
import { csvEscapeField, parseInsightsRangeDays } from "./range";
import type { EvidenceClass } from "./tapproof";

export type InsightKpi = {
  key: string;
  label: string;
  value: number;
  evidenceClass: EvidenceClass;
  source: string;
  seeded: boolean;
};

export type InsightsSnapshot = {
  rangeDays: number;
  from: string;
  to: string;
  kpis: InsightKpi[];
  empty: boolean;
  fetchedAt: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

export async function fetchInsightsSnapshot(
  businessId: string,
  rangeDays = 14
): Promise<InsightsSnapshot> {
  const days = parseInsightsRangeDays(rangeDays);
  const from = daysAgo(days);
  const to = new Date();

  const [
    tapsInRange,
    tapsAll,
    leadsInRange,
    leadsAll,
    clicksInRange,
    contacts,
    relationships,
    openThreads,
    issuedPasses,
  ] = await Promise.all([
    prisma.tapEvent.count({ where: { businessId, createdAt: { gte: from } } }),
    prisma.tapEvent.count({ where: { businessId } }),
    prisma.lead.count({ where: { businessId, createdAt: { gte: from } } }),
    prisma.lead.count({ where: { businessId } }),
    prisma.clickEvent.count({ where: { businessId, createdAt: { gte: from } } }),
    prisma.contact.count({ where: { businessId } }).catch(() => 0),
    prisma.customerRelationship.count({ where: { businessId } }).catch(() => 0),
    prisma.messageThread
      .count({ where: { businessId, status: { in: ["OPEN", "PENDING"] } } })
      .catch(() => 0),
    prisma.walletPass
      .count({ where: { businessId, status: { in: ["ISSUED", "UPDATED"] } } })
      .catch(() => 0),
  ]);

  const conversion =
    tapsInRange > 0 ? Math.round((leadsInRange / tapsInRange) * 1000) / 10 : 0;

  const kpis: InsightKpi[] = [
    {
      key: "taps_range",
      label: `Taps (${days}d)`,
      value: tapsInRange,
      evidenceClass: "confirmed",
      source: "TapEvent",
      seeded: false,
    },
    {
      key: "taps_all",
      label: "Taps (all)",
      value: tapsAll,
      evidenceClass: "confirmed",
      source: "TapEvent",
      seeded: false,
    },
    {
      key: "leads_range",
      label: `Leads (${days}d)`,
      value: leadsInRange,
      evidenceClass: "confirmed",
      source: "Lead",
      seeded: false,
    },
    {
      key: "leads_all",
      label: "Leads (all)",
      value: leadsAll,
      evidenceClass: "confirmed",
      source: "Lead",
      seeded: false,
    },
    {
      key: "conversion",
      label: `Conversion (${days}d)`,
      value: conversion,
      evidenceClass: "derived",
      source: "Lead/TapEvent",
      seeded: false,
    },
    {
      key: "clicks",
      label: `Clicks (${days}d)`,
      value: clicksInRange,
      evidenceClass: "confirmed",
      source: "ClickEvent",
      seeded: false,
    },
    {
      key: "contacts",
      label: "Contacts",
      value: contacts,
      evidenceClass: contacts > 0 ? "confirmed" : "incomplete",
      source: "Contact",
      seeded: false,
    },
    {
      key: "relationships",
      label: "Relationships",
      value: relationships,
      evidenceClass: relationships > 0 ? "confirmed" : "incomplete",
      source: "CustomerRelationship",
      seeded: false,
    },
    {
      key: "open_threads",
      label: "Open inbox",
      value: openThreads,
      evidenceClass: "confirmed",
      source: "MessageThread",
      seeded: false,
    },
    {
      key: "wallet_passes",
      label: "Issued passes",
      value: issuedPasses,
      evidenceClass: "confirmed",
      source: "WalletPass",
      seeded: false,
    },
  ];

  const empty = tapsAll === 0 && leadsAll === 0 && contacts === 0;

  return {
    rangeDays: days,
    from: from.toISOString(),
    to: to.toISOString(),
    kpis,
    empty,
    fetchedAt: new Date().toISOString(),
  };
}

export function insightsToCsv(snapshot: InsightsSnapshot): string {
  const header = "key,label,value,evidence_class,source,seeded,range_days,from,to";
  const rows = snapshot.kpis.map((k) =>
    [
      csvEscapeField(k.key),
      csvEscapeField(k.label),
      csvEscapeField(k.value),
      csvEscapeField(k.evidenceClass),
      csvEscapeField(k.source),
      csvEscapeField(k.seeded),
      csvEscapeField(snapshot.rangeDays),
      csvEscapeField(snapshot.from),
      csvEscapeField(snapshot.to),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
