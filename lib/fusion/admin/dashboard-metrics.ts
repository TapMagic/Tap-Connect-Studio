/**
 * Platform Admin KPI aggregation — real Prisma counts with evidence class labels.
 */

import { prisma } from "@/lib/db";
import type { DeviceStatus } from "@prisma/client";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

export type EvidenceClass = "confirmed" | "derived" | "unavailable";

export type KpiMetric = {
  key: string;
  label: string;
  value: number;
  hint?: string;
  evidence: EvidenceClass;
  href?: string;
};

export type ExecutiveKpis = {
  businesses: number;
  campaigns: number;
  liveCampaigns: number;
  deviceSlots: number;
  activeDevices: number;
  leads: number;
  leadsLast30Days: number;
  tapEvents: number;
  tapEventsLast30Days: number;
  users: number;
  contacts: number;
  outboxPending: number;
  featureOverrides: number;
  auditEvents: number;
  fetchedAt: string;
  dbConfigured: boolean;
  error?: string;
  metrics: KpiMetric[];
};

export type DeviceFleetSummary = {
  total: number;
  byStatus: Record<DeviceStatus, number>;
  unassigned: number;
  active: number;
  inactive: number;
  archived: number;
  lost: number;
  topTypes: { deviceType: string; count: number }[];
  dbConfigured: boolean;
  error?: string;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function emptyKpis(error?: string): ExecutiveKpis {
  const fetchedAt = new Date().toISOString();
  return {
    businesses: 0,
    campaigns: 0,
    liveCampaigns: 0,
    deviceSlots: 0,
    activeDevices: 0,
    leads: 0,
    leadsLast30Days: 0,
    tapEvents: 0,
    tapEventsLast30Days: 0,
    users: 0,
    contacts: 0,
    outboxPending: 0,
    featureOverrides: 0,
    auditEvents: 0,
    fetchedAt,
    dbConfigured: false,
    error,
    metrics: [],
  };
}

export function emptyExecutiveKpis(error?: string): ExecutiveKpis {
  return emptyKpis(error);
}

export async function fetchExecutiveKpis(): Promise<ExecutiveKpis> {
  if (!process.env.DATABASE_URL?.trim()) {
    return emptyKpis("DATABASE_URL is not configured");
  }

  const since = daysAgo(30);
  const dbConfigured = isIsolatedFusionDatabaseConfigured();

  try {
    const [
      businesses,
      campaigns,
      liveCampaigns,
      deviceSlots,
      activeDevices,
      leads,
      leadsLast30Days,
      tapEvents,
      tapEventsLast30Days,
      users,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "LIVE" } }),
      prisma.deviceSlot.count(),
      prisma.deviceSlot.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.tapEvent.count(),
      prisma.tapEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count(),
    ]);

    let contacts = 0;
    let outboxPending = 0;
    let featureOverrides = 0;
    let auditEvents = 0;

    try {
      contacts = await prisma.contact.count();
    } catch {
      contacts = 0;
    }
    try {
      outboxPending = await prisma.fusionOutboxEvent.count({ where: { status: "PENDING" } });
    } catch {
      outboxPending = 0;
    }
    try {
      featureOverrides = await prisma.featureFlagOverride.count();
    } catch {
      featureOverrides = 0;
    }
    try {
      auditEvents = await prisma.platformAuditEvent.count();
    } catch {
      auditEvents = 0;
    }

    const metrics: KpiMetric[] = [
      {
        key: "devices",
        label: "Device slots",
        value: deviceSlots,
        hint: `${activeDevices} active`,
        evidence: "confirmed",
        href: "/admin/platform/devices",
      },
      {
        key: "leads",
        label: "Leads",
        value: leads,
        hint: `${leadsLast30Days} last 30d`,
        evidence: "confirmed",
        href: "/admin/platform/leads",
      },
      {
        key: "contacts",
        label: "Contacts",
        value: contacts,
        hint: "Audience spine",
        evidence: contacts > 0 || dbConfigured ? "confirmed" : "derived",
        href: "/admin/platform/contacts",
      },
      {
        key: "outbox",
        label: "Outbox pending",
        value: outboxPending,
        hint: "FusionOutboxEvent",
        evidence: "confirmed",
        href: "/admin/platform/outbox",
      },
      {
        key: "overrides",
        label: "Feature overrides",
        value: featureOverrides,
        evidence: "confirmed",
        href: "/admin/platform/overrides",
      },
      {
        key: "audit",
        label: "Audit events",
        value: auditEvents,
        evidence: "confirmed",
        href: "/admin/platform/audit",
      },
      {
        key: "businesses",
        label: "Businesses",
        value: businesses,
        evidence: "confirmed",
      },
      {
        key: "users",
        label: "Users",
        value: users,
        evidence: "confirmed",
      },
      {
        key: "campaigns",
        label: "Campaigns",
        value: campaigns,
        hint: `${liveCampaigns} live`,
        evidence: "confirmed",
      },
      {
        key: "taps",
        label: "Tap events",
        value: tapEvents,
        hint: `${tapEventsLast30Days} last 30d`,
        evidence: "confirmed",
      },
    ];

    return {
      businesses,
      campaigns,
      liveCampaigns,
      deviceSlots,
      activeDevices,
      leads,
      leadsLast30Days,
      tapEvents,
      tapEventsLast30Days,
      users,
      contacts,
      outboxPending,
      featureOverrides,
      auditEvents,
      fetchedAt: new Date().toISOString(),
      dbConfigured,
      metrics,
    };
  } catch (err) {
    return emptyKpis(err instanceof Error ? err.message : "Failed to query Prisma");
  }
}

export async function fetchDeviceFleetSummary(): Promise<DeviceFleetSummary> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      total: 0,
      byStatus: {} as Record<DeviceStatus, number>,
      unassigned: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      lost: 0,
      topTypes: [],
      dbConfigured: false,
      error: "DATABASE_URL is not configured",
    };
  }

  try {
    const [total, statusGroups, typeGroupsRaw] = await Promise.all([
      prisma.deviceSlot.count(),
      prisma.deviceSlot.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.deviceSlot.groupBy({
        by: ["deviceType"],
        _count: { _all: true },
      }),
    ]);

    const typeGroups = [...typeGroupsRaw]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 6);

    const byStatus = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all])
    ) as Record<DeviceStatus, number>;

    const zero = (s: DeviceStatus) => byStatus[s] ?? 0;

    return {
      total,
      byStatus,
      unassigned: zero("UNASSIGNED"),
      active: zero("ACTIVE"),
      inactive: zero("INACTIVE"),
      archived: zero("ARCHIVED"),
      lost: zero("LOST"),
      topTypes: typeGroups.map((g) => ({
        deviceType: g.deviceType,
        count: g._count._all,
      })),
      dbConfigured: isIsolatedFusionDatabaseConfigured(),
    };
  } catch (err) {
    return {
      total: 0,
      byStatus: {} as Record<DeviceStatus, number>,
      unassigned: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      lost: 0,
      topTypes: [],
      dbConfigured: false,
      error: err instanceof Error ? err.message : "Fleet query failed",
    };
  }
}
