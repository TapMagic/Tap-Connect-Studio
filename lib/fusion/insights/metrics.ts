/**
 * Insights hub metrics — Prisma-derived with evidence class labels,
 * comparisons, view filters, drill-down, and TapProof provenance.
 */

import { prisma } from "@/lib/db";
import { buildCommerceInsightKpis } from "./commerce-evidence";
import { computeKpiDeltas, type InsightKpiDelta } from "./comparisons";
import { fetchInsightDrillRows, type InsightDrillRow } from "./drilldown";
import { formatEvidenceCaption } from "./evidence-display";
import { buildProvenanceFromKpis, freshnessLabel } from "./provenance";
import { buildProviderInsightKpis } from "./provider-health";
import { csvEscapeField, parseInsightsRangeDays } from "./range";
import { parseEvidenceFilter } from "./saved-views";
import type { TapProofRecord } from "./tapproof";
import type { InsightKpi } from "./types";
import {
  kpiBelongsToView,
  parseInsightsView,
  type InsightsView,
} from "./views";
import { listOutbox } from "@/lib/fusion/publication/events";

export type { InsightKpi } from "./types";

export type InsightsQuery = {
  rangeDays?: number | string | null;
  view?: string | null;
  compare?: string | boolean | null;
  evidence?: string | null;
  drill?: string | null;
  campaignId?: string | null;
};

export type InsightsSnapshot = {
  rangeDays: number;
  from: string;
  to: string;
  view: InsightsView;
  compare: boolean;
  evidenceFilter: ReturnType<typeof parseEvidenceFilter>;
  drillKey: string | null;
  campaignId: string | null;
  kpis: InsightKpi[];
  /** All KPIs before view/evidence filtering (for export completeness). */
  allKpis: InsightKpi[];
  deltas: InsightKpiDelta[];
  previousFrom: string | null;
  previousTo: string | null;
  drillRows: InsightDrillRow[];
  provenance: TapProofRecord[];
  empty: boolean;
  fetchedAt: string;
  freshness: { ageSeconds: number; label: string };
  error?: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

function parseCompare(input: string | boolean | null | undefined): boolean {
  if (typeof input === "boolean") return input;
  const v = (input ?? "").toString().toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes" || v === "compare";
}

async function aggregateKpis(
  businessId: string,
  days: number,
  from: Date,
  campaignId?: string | null
): Promise<InsightKpi[]> {
  const campaignWhere = campaignId ? { campaignId } : {};

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
    campaignsTotal,
    campaignsLive,
    devicesActive,
    devicesUnassigned,
    tapPointsTotal,
    cardPublications,
    cardVersionsAgg,
    inboxMessagesRange,
    loyaltyEnrollments,
    loyaltyAwards,
    loyaltyRedeems,
  ] = await Promise.all([
    prisma.tapEvent.count({
      where: { businessId, createdAt: { gte: from }, ...campaignWhere },
    }),
    prisma.tapEvent.count({
      where: { businessId, ...campaignWhere },
    }),
    prisma.lead.count({
      where: { businessId, createdAt: { gte: from }, ...campaignWhere },
    }),
    prisma.lead.count({ where: { businessId, ...campaignWhere } }),
    prisma.clickEvent.count({
      where: { businessId, createdAt: { gte: from }, ...campaignWhere },
    }),
    prisma.contact.count({ where: { businessId } }).catch(() => 0),
    prisma.customerRelationship.count({ where: { businessId } }).catch(() => 0),
    prisma.messageThread
      .count({ where: { businessId, status: { in: ["OPEN", "PENDING"] } } })
      .catch(() => 0),
    prisma.walletPass
      .count({ where: { businessId, status: { in: ["ISSUED", "UPDATED"] } } })
      .catch(() => 0),
    prisma.campaign.count({ where: { businessId } }),
    prisma.campaign.count({ where: { businessId, status: "LIVE" } }),
    prisma.deviceSlot.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.deviceSlot.count({ where: { businessId, status: "UNASSIGNED" } }),
    prisma.tapPoint.count({ where: { businessId } }).catch(() => 0),
    prisma.publicationSnapshot
      .count({ where: { businessId, subjectType: "card" } })
      .catch(() => 0),
    prisma.publicationSnapshot
      .aggregate({
        where: { businessId, subjectType: "card" },
        _max: { version: true },
      })
      .catch(() => ({ _max: { version: null as number | null } })),
    prisma.inboxMessage
      .count({
        where: { businessId, createdAt: { gte: from } },
      })
      .catch(() => 0),
    prisma.loyaltyEnrollment.count({ where: { businessId } }).catch(() => 0),
    prisma.loyaltyLedgerEntry
      .count({
        where: { businessId, type: "AWARD", createdAt: { gte: from } },
      })
      .catch(() => 0),
    prisma.loyaltyLedgerEntry
      .count({
        where: { businessId, type: "REDEEM", createdAt: { gte: from } },
      })
      .catch(() => 0),
  ]);

  let outboxPending = 0;
  try {
    const pending = await listOutbox({ businessId, status: "PENDING", limit: 200 });
    outboxPending = pending.length;
  } catch {
    outboxPending = 0;
  }

  const conversion =
    tapsInRange > 0 ? Math.round((leadsInRange / tapsInRange) * 1000) / 10 : 0;
  const maxCardVersion = cardVersionsAgg._max.version ?? 0;

  const kpis: InsightKpi[] = [
    {
      key: "taps_range",
      label: `Taps (${days}d)`,
      value: tapsInRange,
      evidenceClass: "confirmed",
      source: "TapEvent",
      seeded: false,
      drillThroughHref: "/dashboard/analytics",
    },
    {
      key: "taps_all",
      label: "Taps (all)",
      value: tapsAll,
      evidenceClass: "confirmed",
      source: "TapEvent",
      seeded: false,
      drillThroughHref: "/dashboard/analytics",
    },
    {
      key: "leads_range",
      label: `Leads (${days}d)`,
      value: leadsInRange,
      evidenceClass: "confirmed",
      source: "Lead",
      seeded: false,
      drillThroughHref: "/dashboard/leads",
    },
    {
      key: "leads_all",
      label: "Leads (all)",
      value: leadsAll,
      evidenceClass: "confirmed",
      source: "Lead",
      seeded: false,
      drillThroughHref: "/dashboard/leads",
    },
    {
      key: "conversion",
      label: `Conversion (${days}d)`,
      value: conversion,
      evidenceClass: "derived",
      source: "Lead/TapEvent",
      seeded: false,
      drillThroughHref: "/dashboard/analytics",
    },
    {
      key: "clicks",
      label: `Clicks (${days}d)`,
      value: clicksInRange,
      evidenceClass: "confirmed",
      source: "ClickEvent",
      seeded: false,
      drillThroughHref: "/dashboard/analytics",
    },
    {
      key: "contacts",
      label: "Contacts",
      value: contacts,
      evidenceClass: contacts > 0 ? "confirmed" : "incomplete",
      source: "Contact",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
    {
      key: "relationships",
      label: "Relationships",
      value: relationships,
      evidenceClass: relationships > 0 ? "confirmed" : "incomplete",
      source: "CustomerRelationship",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
    {
      key: "open_threads",
      label: "Open inbox",
      value: openThreads,
      evidenceClass: "confirmed",
      source: "MessageThread",
      seeded: false,
      drillThroughHref: "/dashboard/inbox",
    },
    {
      key: "inbox_messages_range",
      label: `Inbox messages (${days}d)`,
      value: inboxMessagesRange,
      evidenceClass: inboxMessagesRange > 0 ? "confirmed" : "incomplete",
      source: "InboxMessage",
      seeded: false,
      drillThroughHref: "/dashboard/inbox",
    },
    {
      key: "comms_outbox_pending",
      label: "Comms outbox pending",
      value: outboxPending,
      evidenceClass: outboxPending > 0 ? "confirmed" : "incomplete",
      source: "FusionOutboxEvent",
      seeded: false,
      drillThroughHref: "/admin/platform/outbox",
    },
    {
      key: "wallet_passes",
      label: "Issued passes",
      value: issuedPasses,
      evidenceClass: "confirmed",
      source: "WalletPass",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
    {
      key: "campaigns_total",
      label: "Campaigns",
      value: campaignsTotal,
      evidenceClass: campaignsTotal > 0 ? "confirmed" : "incomplete",
      source: "Campaign",
      seeded: false,
      drillThroughHref: "/dashboard/campaigns",
    },
    {
      key: "campaigns_live",
      label: "Live campaigns",
      value: campaignsLive,
      evidenceClass: campaignsLive > 0 ? "confirmed" : "incomplete",
      source: "Campaign.status=LIVE",
      seeded: false,
      drillThroughHref: "/dashboard/campaigns",
    },
    {
      key: "card_publications",
      label: "Card publications",
      value: cardPublications,
      evidenceClass: cardPublications > 0 ? "confirmed" : "incomplete",
      source: "PublicationSnapshot(card)",
      seeded: false,
      drillThroughHref: "/dashboard/card",
    },
    {
      key: "card_versions",
      label: "Max card version",
      value: maxCardVersion,
      evidenceClass: maxCardVersion > 0 ? "derived" : "incomplete",
      source: "PublicationSnapshot.version",
      seeded: false,
      drillThroughHref: "/dashboard/card",
    },
    {
      key: "tap_points_total",
      label: "Tap Points",
      value: tapPointsTotal,
      evidenceClass: tapPointsTotal > 0 ? "confirmed" : "incomplete",
      source: "TapPoint",
      seeded: false,
      drillThroughHref: "/dashboard/tap-points",
    },
    {
      key: "devices_active",
      label: "Active devices",
      value: devicesActive,
      evidenceClass: "confirmed",
      source: "DeviceSlot",
      seeded: false,
      drillThroughHref: "/dashboard/tap-points",
    },
    {
      key: "devices_unassigned",
      label: "Unassigned devices",
      value: devicesUnassigned,
      evidenceClass: "confirmed",
      source: "DeviceSlot",
      seeded: false,
      drillThroughHref: "/dashboard/tap-points",
    },
    {
      key: "loyalty_enrollments",
      label: "Loyalty enrollments",
      value: loyaltyEnrollments,
      evidenceClass: loyaltyEnrollments > 0 ? "confirmed" : "incomplete",
      source: "LoyaltyEnrollment",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
    {
      key: "loyalty_awards_range",
      label: `Loyalty awards (${days}d)`,
      value: loyaltyAwards,
      evidenceClass: loyaltyAwards > 0 ? "confirmed" : "incomplete",
      source: "LoyaltyLedgerEntry.AWARD",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
    {
      key: "loyalty_redeems_range",
      label: `Loyalty redeems (${days}d)`,
      value: loyaltyRedeems,
      evidenceClass: loyaltyRedeems > 0 ? "confirmed" : "incomplete",
      source: "LoyaltyLedgerEntry.REDEEM",
      seeded: false,
      drillThroughHref: "/dashboard/audience",
    },
  ];

  const commerceKpis = buildCommerceInsightKpis({
    businessId,
    rangeDays: days,
    from,
  }).map((k) => ({
    ...k,
    drillThroughHref: "/dashboard/experiences/orders",
  }));

  const providerKpis = buildProviderInsightKpis();

  return [...kpis, ...commerceKpis, ...providerKpis];
}

function filterKpis(
  kpis: InsightKpi[],
  view: InsightsView,
  evidenceFilter: ReturnType<typeof parseEvidenceFilter>
): InsightKpi[] {
  return kpis.filter((k) => {
    if (!kpiBelongsToView(k.key, view)) return false;
    if (evidenceFilter !== "all" && k.evidenceClass !== evidenceFilter) return false;
    return true;
  });
}

export async function fetchInsightsSnapshot(
  businessId: string,
  rangeDaysOrQuery: number | InsightsQuery = 14
): Promise<InsightsSnapshot> {
  const query: InsightsQuery =
    typeof rangeDaysOrQuery === "number"
      ? { rangeDays: rangeDaysOrQuery }
      : rangeDaysOrQuery;

  const days = parseInsightsRangeDays(query.rangeDays);
  const view = parseInsightsView(query.view);
  const compare = parseCompare(query.compare);
  const evidenceFilter = parseEvidenceFilter(query.evidence);
  const drillKey = query.drill?.trim() || null;
  const campaignId = query.campaignId?.trim() || null;
  const from = daysAgo(days);
  const to = new Date();
  const fetchedAt = new Date().toISOString();

  try {
    const allKpis = await aggregateKpis(businessId, days, from, campaignId);

    let deltas: InsightKpiDelta[] = [];
    let previousFrom: string | null = null;
    let previousTo: string | null = null;

    if (compare) {
      const prevTo = new Date(from);
      prevTo.setMilliseconds(prevTo.getMilliseconds() - 1);
      const prevFrom = daysAgo(days * 2);
      // Align previous window to same length ending just before current from
      const prevFromAligned = new Date(from);
      prevFromAligned.setDate(prevFromAligned.getDate() - days);
      previousFrom = prevFromAligned.toISOString();
      previousTo = prevTo.toISOString();
      const prevKpis = await aggregateKpis(
        businessId,
        days,
        prevFromAligned,
        campaignId
      );
      // Re-label previous taps/leads using same keys for delta join
      void prevFrom;
      deltas = computeKpiDeltas(allKpis, prevKpis);
    }

    const kpis = filterKpis(allKpis, view, evidenceFilter);

    const drillRows =
      drillKey != null && drillKey.length > 0
        ? await fetchInsightDrillRows({
            businessId,
            kpiKey: drillKey,
            rangeDays: days,
            campaignId: campaignId ?? undefined,
          })
        : [];

    const provenance = buildProvenanceFromKpis({
      businessId,
      kpis: view === "tapproof" ? allKpis : kpis,
      fetchedAt,
      rangeFrom: from.toISOString(),
      rangeTo: to.toISOString(),
    });

    const hasCommerceEvidence = allKpis.some(
      (k) => k.key.startsWith("commerce_") && k.value > 0
    );
    const tapsAll = allKpis.find((k) => k.key === "taps_all")?.value ?? 0;
    const leadsAll = allKpis.find((k) => k.key === "leads_all")?.value ?? 0;
    const contacts = allKpis.find((k) => k.key === "contacts")?.value ?? 0;
    const empty =
      tapsAll === 0 && leadsAll === 0 && contacts === 0 && !hasCommerceEvidence;

    return {
      rangeDays: days,
      from: from.toISOString(),
      to: to.toISOString(),
      view,
      compare,
      evidenceFilter,
      drillKey,
      campaignId,
      kpis,
      allKpis,
      deltas: compare
        ? deltas.filter((d) => kpis.some((k) => k.key === d.key))
        : [],
      previousFrom,
      previousTo,
      drillRows,
      provenance,
      empty,
      fetchedAt,
      freshness: freshnessLabel(fetchedAt),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insights fetch failed";
    return {
      rangeDays: days,
      from: from.toISOString(),
      to: to.toISOString(),
      view,
      compare,
      evidenceFilter,
      drillKey,
      campaignId,
      kpis: [],
      allKpis: [],
      deltas: [],
      previousFrom: null,
      previousTo: null,
      drillRows: [],
      provenance: [],
      empty: true,
      fetchedAt,
      freshness: freshnessLabel(fetchedAt),
      error: message,
    };
  }
}

export function insightKpiEvidenceCaption(k: InsightKpi): string {
  return formatEvidenceCaption({
    evidenceClass: k.evidenceClass,
    source: k.source,
    seeded: k.seeded,
  });
}

export function insightsToCsv(snapshot: InsightsSnapshot): string {
  const header = [
    "key",
    "label",
    "value",
    "evidence_class",
    "evidence_caption",
    "source",
    "seeded",
    "range_days",
    "from",
    "to",
    "view",
    "compare",
    "previous_value",
    "delta",
    "delta_pct",
    "drill_through_href",
  ].join(",");

  const deltaMap = new Map(snapshot.deltas.map((d) => [d.key, d]));
  const rows = (snapshot.kpis.length > 0 ? snapshot.kpis : snapshot.allKpis).map(
    (k) => {
      const d = deltaMap.get(k.key);
      return [
        csvEscapeField(k.key),
        csvEscapeField(k.label),
        csvEscapeField(k.value),
        csvEscapeField(k.evidenceClass),
        csvEscapeField(insightKpiEvidenceCaption(k)),
        csvEscapeField(k.source),
        csvEscapeField(k.seeded),
        csvEscapeField(snapshot.rangeDays),
        csvEscapeField(snapshot.from),
        csvEscapeField(snapshot.to),
        csvEscapeField(snapshot.view),
        csvEscapeField(snapshot.compare),
        csvEscapeField(d?.previous ?? ""),
        csvEscapeField(d?.delta ?? ""),
        csvEscapeField(d?.deltaPct ?? ""),
        csvEscapeField(k.drillThroughHref ?? ""),
      ].join(",");
    }
  );

  const parts = [header, ...rows];

  if (snapshot.drillRows.length > 0) {
    parts.push("");
    parts.push(
      "drill_kpi_key,drill_id,drill_label,drill_value,drill_evidence,drill_source,drill_through_href,drill_secondary"
    );
    for (const r of snapshot.drillRows) {
      parts.push(
        [
          csvEscapeField(r.kpiKey),
          csvEscapeField(r.id),
          csvEscapeField(r.label),
          csvEscapeField(r.value),
          csvEscapeField(r.evidenceClass),
          csvEscapeField(r.source),
          csvEscapeField(r.drillThroughHref),
          csvEscapeField(r.secondary ?? ""),
        ].join(",")
      );
    }
  }

  if (snapshot.provenance.length > 0) {
    parts.push("");
    parts.push(
      "proof_id,subject_id,claim,evidence_class,confidence,sources,human_verified"
    );
    for (const p of snapshot.provenance) {
      parts.push(
        [
          csvEscapeField(p.id),
          csvEscapeField(p.subjectId),
          csvEscapeField(p.claim),
          csvEscapeField(p.evidenceClass),
          csvEscapeField(p.confidence),
          csvEscapeField(p.sources.map((s) => s.ref).join("|")),
          csvEscapeField(p.humanVerified),
        ].join(",")
      );
    }
  }

  return parts.join("\n");
}
