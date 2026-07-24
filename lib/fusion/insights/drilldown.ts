/**
 * Drill-down rows + drill-through hrefs for Insights KPIs.
 */

import { prisma } from "@/lib/db";
import type { EvidenceClass } from "./tapproof";
import { listCommerceEvidence } from "./commerce-evidence";

export type InsightDrillRow = {
  id: string;
  kpiKey: string;
  label: string;
  value: number;
  evidenceClass: EvidenceClass;
  source: string;
  /** Navigate to underlying entity / list. */
  drillThroughHref: string;
  secondary?: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

async function campaignTitles(
  businessId: string,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: ids }, businessId },
    select: { id: true, title: true },
  });
  return new Map(campaigns.map((c) => [c.id, c.title]));
}

export async function fetchInsightDrillRows(input: {
  businessId: string;
  kpiKey: string;
  rangeDays: number;
  campaignId?: string;
  limit?: number;
}): Promise<InsightDrillRow[]> {
  const limit = input.limit ?? 12;
  const from = daysAgo(input.rangeDays);
  const campaignFilter = input.campaignId
    ? { campaignId: input.campaignId }
    : {};

  switch (input.kpiKey) {
    case "taps_range":
    case "taps_all": {
      const grouped = await prisma.tapEvent.groupBy({
        by: ["campaignId"],
        where: {
          businessId: input.businessId,
          ...(input.kpiKey === "taps_range" ? { createdAt: { gte: from } } : {}),
          ...campaignFilter,
        },
        _count: { _all: true },
        orderBy: { _count: { campaignId: "desc" } },
        take: limit,
      });
      const ids = grouped.map((g) => g.campaignId).filter(Boolean) as string[];
      const titleById = await campaignTitles(input.businessId, ids);
      return grouped.map((g, i) => {
        const id = g.campaignId ?? `unassigned_${i}`;
        return {
          id: `tap_${id}`,
          kpiKey: input.kpiKey,
          label: g.campaignId
            ? titleById.get(g.campaignId) ?? g.campaignId.slice(0, 8)
            : "Unassigned campaign",
          value: g._count._all,
          evidenceClass: "confirmed" as const,
          source: "TapEvent.groupBy(campaignId)",
          drillThroughHref: g.campaignId
            ? `/dashboard/campaigns/${g.campaignId}`
            : "/dashboard/campaigns",
          secondary: "taps",
        };
      });
    }

    case "leads_range":
    case "leads_all": {
      const grouped = await prisma.lead.groupBy({
        by: ["campaignId"],
        where: {
          businessId: input.businessId,
          ...(input.kpiKey === "leads_range" ? { createdAt: { gte: from } } : {}),
          ...campaignFilter,
        },
        _count: { _all: true },
        orderBy: { _count: { campaignId: "desc" } },
        take: limit,
      });
      const ids = grouped.map((g) => g.campaignId).filter(Boolean) as string[];
      const titleById = await campaignTitles(input.businessId, ids);
      return grouped.map((g, i) => {
        const id = g.campaignId ?? `unassigned_${i}`;
        return {
          id: `lead_${id}`,
          kpiKey: input.kpiKey,
          label: g.campaignId
            ? titleById.get(g.campaignId) ?? g.campaignId.slice(0, 8)
            : "Unassigned campaign",
          value: g._count._all,
          evidenceClass: "confirmed" as const,
          source: "Lead.groupBy(campaignId)",
          drillThroughHref: "/dashboard/leads",
          secondary: "leads",
        };
      });
    }

    case "clicks": {
      const grouped = await prisma.clickEvent.groupBy({
        by: ["eventType"],
        where: {
          businessId: input.businessId,
          createdAt: { gte: from },
          ...campaignFilter,
        },
        _count: { _all: true },
        orderBy: { _count: { eventType: "desc" } },
        take: limit,
      });
      return grouped.map((g) => ({
        id: `click_${g.eventType}`,
        kpiKey: input.kpiKey,
        label: g.eventType,
        value: g._count._all,
        evidenceClass: "confirmed" as const,
        source: "ClickEvent.groupBy(eventType)",
        drillThroughHref: "/dashboard/analytics",
        secondary: "clicks",
      }));
    }

    case "open_threads": {
      const threads = await prisma.messageThread.findMany({
        where: {
          businessId: input.businessId,
          status: { in: ["OPEN", "PENDING"] },
        },
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        select: {
          id: true,
          subject: true,
          channel: true,
          status: true,
          participant: true,
        },
      });
      return threads.map((t) => ({
        id: t.id,
        kpiKey: input.kpiKey,
        label: t.subject || t.participant || t.id.slice(0, 8),
        value: 1,
        evidenceClass: "confirmed" as const,
        source: "MessageThread",
        drillThroughHref: "/dashboard/inbox",
        secondary: `${t.channel} · ${t.status}`,
      }));
    }

    case "commerce_orders_paid":
    case "commerce_revenue_mock":
    case "commerce_loyalty_stubs":
    case "commerce_relationship_links": {
      const rows = listCommerceEvidence({
        businessId: input.businessId,
        from,
        limit,
      });
      return rows.map((r) => ({
        id: r.id,
        kpiKey: input.kpiKey,
        label: `Order ${r.orderId.slice(0, 10)}`,
        value:
          input.kpiKey === "commerce_revenue_mock"
            ? Math.round(r.totalCents / 100)
            : 1,
        evidenceClass: r.mock ? ("modeled" as const) : ("confirmed" as const),
        source: "commerce-evidence store",
        drillThroughHref: "/dashboard/experiences/orders",
        secondary: r.mock ? "mock checkout" : "live path",
      }));
    }

    case "loyalty_enrollments": {
      const enrollments = await prisma.loyaltyEnrollment.findMany({
        where: { businessId: input.businessId },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });
      return enrollments.map((e) => ({
        id: e.id,
        kpiKey: input.kpiKey,
        label: `Enrollment ${e.id.slice(0, 8)}`,
        value: 1,
        evidenceClass: "confirmed" as const,
        source: "LoyaltyEnrollment",
        drillThroughHref: "/dashboard/audience",
        secondary: e.status,
      }));
    }

    case "loyalty_awards_range":
    case "loyalty_redeems_range": {
      const type = input.kpiKey === "loyalty_awards_range" ? "AWARD" : "REDEEM";
      const entries = await prisma.loyaltyLedgerEntry.findMany({
        where: {
          businessId: input.businessId,
          type,
          createdAt: { gte: from },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, points: true, reason: true, type: true },
      });
      return entries.map((e) => ({
        id: e.id,
        kpiKey: input.kpiKey,
        label: e.reason || e.type,
        value: e.points,
        evidenceClass: "confirmed" as const,
        source: "LoyaltyLedgerEntry",
        drillThroughHref: "/dashboard/audience",
        secondary: e.type,
      }));
    }

    case "conversion": {
      const [tapGroups, leadGroups] = await Promise.all([
        prisma.tapEvent.groupBy({
          by: ["campaignId"],
          where: {
            businessId: input.businessId,
            createdAt: { gte: from },
            ...campaignFilter,
          },
          _count: { _all: true },
        }),
        prisma.lead.groupBy({
          by: ["campaignId"],
          where: {
            businessId: input.businessId,
            createdAt: { gte: from },
            ...campaignFilter,
          },
          _count: { _all: true },
        }),
      ]);
      const leadMap = new Map(
        leadGroups.map((g) => [g.campaignId ?? "", g._count._all])
      );
      const ids = [
        ...new Set(
          [...tapGroups, ...leadGroups]
            .map((g) => g.campaignId)
            .filter(Boolean) as string[]
        ),
      ];
      const titleById = await campaignTitles(input.businessId, ids);
      return tapGroups
        .map((g) => {
          const taps = g._count._all;
          const leads = leadMap.get(g.campaignId ?? "") ?? 0;
          const rate = taps > 0 ? Math.round((leads / taps) * 1000) / 10 : 0;
          const id = g.campaignId ?? "unassigned";
          return {
            id: `conv_${id}`,
            kpiKey: input.kpiKey,
            label: g.campaignId
              ? titleById.get(g.campaignId) ?? id.slice(0, 8)
              : "Unassigned",
            value: rate,
            evidenceClass: "derived" as const,
            source: "Lead/TapEvent per campaign",
            drillThroughHref: g.campaignId
              ? `/dashboard/campaigns/${g.campaignId}`
              : "/dashboard/campaigns",
            secondary: `${leads}/${taps} leads/taps`,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    }

    case "devices_active":
    case "devices_unassigned":
    case "tap_points_total": {
      const devices = await prisma.deviceSlot.findMany({
        where: {
          businessId: input.businessId,
          ...(input.kpiKey === "devices_active" ? { status: "ACTIVE" } : {}),
          ...(input.kpiKey === "devices_unassigned"
            ? { status: "UNASSIGNED" }
            : {}),
        },
        orderBy: { totalTapCount: "desc" },
        take: limit,
        select: {
          id: true,
          deviceCode: true,
          nickname: true,
          status: true,
          totalTapCount: true,
        },
      });
      return devices.map((d) => ({
        id: d.id,
        kpiKey: input.kpiKey,
        label: d.nickname || d.deviceCode,
        value: d.totalTapCount,
        evidenceClass: "confirmed" as const,
        source: "DeviceSlot",
        drillThroughHref: `/dashboard/devices/${d.id}`,
        secondary: d.status,
      }));
    }

    case "campaigns_live":
    case "campaigns_total": {
      const campaigns = await prisma.campaign.findMany({
        where: {
          businessId: input.businessId,
          ...(input.kpiKey === "campaigns_live" ? { status: "LIVE" } : {}),
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          _count: { select: { tapEvents: true } },
        },
      });
      return campaigns.map((c) => ({
        id: c.id,
        kpiKey: input.kpiKey,
        label: c.title,
        value: c._count.tapEvents,
        evidenceClass: "confirmed" as const,
        source: "Campaign",
        drillThroughHref: `/dashboard/campaigns/${c.id}`,
        secondary: c.status,
      }));
    }

    case "card_publications":
    case "card_versions": {
      const pubs = await prisma.publicationSnapshot.findMany({
        where: {
          businessId: input.businessId,
          subjectType: "card",
        },
        take: limit,
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          subjectId: true,
          version: true,
          publishedAt: true,
        },
      });
      return pubs.map((p) => ({
        id: p.id,
        kpiKey: input.kpiKey,
        label: `Card ${p.subjectId.slice(0, 8)} v${p.version}`,
        value: p.version,
        evidenceClass: "confirmed" as const,
        source: "PublicationSnapshot(subjectType=card)",
        drillThroughHref: "/dashboard/card",
        secondary: p.publishedAt.toISOString().slice(0, 10),
      }));
    }

    default:
      return [];
  }
}

export function drillRowsToCsv(rows: InsightDrillRow[]): string {
  const header =
    "kpi_key,id,label,value,evidence_class,source,drill_through_href,secondary";
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) =>
    [
      esc(r.kpiKey),
      esc(r.id),
      esc(r.label),
      esc(r.value),
      esc(r.evidenceClass),
      esc(r.source),
      esc(r.drillThroughHref),
      esc(r.secondary ?? ""),
    ].join(",")
  );
  return [header, ...body].join("\n");
}
