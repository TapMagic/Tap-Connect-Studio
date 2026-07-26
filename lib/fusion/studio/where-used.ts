/**
 * Assignment where-used — what breaks if this campaign is archived/changed.
 */

import { prisma } from "@/lib/db";

export type CampaignWhereUsedHit = {
  kind: "device" | "group_slot" | "group_default" | "group_end";
  id: string;
  label: string;
  href: string;
  detail?: string;
};

export type CampaignWhereUsed = {
  campaignId: string;
  campaignTitle: string;
  status: string;
  hits: CampaignWhereUsedHit[];
  deviceCount: number;
  groupCount: number;
};

export async function findCampaignWhereUsed(
  businessId: string,
  campaignId: string
): Promise<CampaignWhereUsed | null> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, businessId },
    select: { id: true, title: true, status: true },
  });
  if (!campaign) return null;

  const [assignments, slots, asDefault, asEnd] = await Promise.all([
    prisma.deviceAssignment.findMany({
      where: { campaignId, status: "ACTIVE", deviceSlot: { businessId } },
      include: {
        deviceSlot: { select: { id: true, deviceCode: true, nickname: true } },
      },
      take: 50,
    }),
    prisma.campaignGroupSlot.findMany({
      where: {
        campaignId,
        group: { businessId },
      },
      include: {
        group: { select: { id: true, title: true } },
      },
      take: 50,
    }),
    prisma.campaignGroup.findMany({
      where: { businessId, defaultCampaignId: campaignId },
      select: { id: true, title: true },
      take: 50,
    }),
    prisma.campaignGroup.findMany({
      where: { businessId, endCampaignId: campaignId },
      select: { id: true, title: true },
      take: 50,
    }),
  ]);

  const hits: CampaignWhereUsedHit[] = [];

  for (const a of assignments) {
    const label = a.deviceSlot.nickname?.trim() || a.deviceSlot.deviceCode;
    hits.push({
      kind: "device",
      id: a.deviceSlot.id,
      label,
      href: `/dashboard/devices`,
      detail: `Active on ${a.deviceSlot.deviceCode}`,
    });
  }

  for (const s of slots) {
    hits.push({
      kind: "group_slot",
      id: s.id,
      label: s.group.title,
      href: `/dashboard/groups/${s.group.id}`,
      detail: `Timed slot “${s.label}”`,
    });
  }

  for (const g of asDefault) {
    hits.push({
      kind: "group_default",
      id: g.id,
      label: g.title,
      href: `/dashboard/groups/${g.id}`,
      detail: "Group default campaign",
    });
  }

  for (const g of asEnd) {
    hits.push({
      kind: "group_end",
      id: g.id,
      label: g.title,
      href: `/dashboard/groups/${g.id}`,
      detail: "Group end / fallback campaign",
    });
  }

  const groupIds = new Set(
    hits.filter((h) => h.kind !== "device").map((h) => (h.kind === "group_slot" ? h.href : h.id))
  );

  return {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    status: campaign.status,
    hits,
    deviceCount: assignments.length,
    groupCount: groupIds.size,
  };
}

/** Card (Brand Kit tapCard) where-used — devices/campaigns that surface the digital card. */
export type CardWhereUsed = {
  hits: CampaignWhereUsedHit[];
  retired: boolean;
};

export async function findCardWhereUsed(
  businessId: string,
  opts?: { cardRetired?: boolean }
): Promise<CardWhereUsed> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      businessId,
      status: { notIn: ["ARCHIVED", "CLOSED"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      campaignType: true,
      contentBlocks: true,
      assignments: {
        where: { status: "ACTIVE" },
        take: 20,
        include: {
          deviceSlot: { select: { id: true, deviceCode: true, nickname: true } },
        },
      },
    },
    take: 80,
  });

  function usesDigitalCard(raw: unknown, campaignType: string): boolean {
    if (campaignType === "CONTACT_VCARD") return true;
    if (!Array.isArray(raw)) return false;
    return raw.some(
      (b) =>
        b &&
        typeof b === "object" &&
        "type" in b &&
        (b as { type?: string }).type === "digital_card"
    );
  }

  const hits: CampaignWhereUsedHit[] = [];
  for (const c of campaigns) {
    if (!usesDigitalCard(c.contentBlocks, c.campaignType)) continue;
    hits.push({
      kind: "device",
      id: c.id,
      label: c.title,
      href: `/dashboard/campaigns/${c.id}`,
      detail: `${c.campaignType} · ${c.assignments.length} active device(s)`,
    });
    for (const a of c.assignments) {
      hits.push({
        kind: "device",
        id: a.deviceSlot.id,
        label: a.deviceSlot.nickname?.trim() || a.deviceSlot.deviceCode,
        href: `/t/${a.deviceSlot.deviceCode}?public=1`,
        detail: `Public Tap Point · campaign “${c.title}”`,
      });
    }
  }

  return { hits, retired: Boolean(opts?.cardRetired) };
}
