/**
 * Server-side loader for Card relationship context.
 */

import { prisma } from "@/lib/db";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import { listDecisionQueueItems } from "@/lib/fusion/studio/operator-alerts";
import {
  buildCardRelationshipFromParts,
  type CardRelationshipContext,
} from "@/lib/fusion/studio/card-relationship";
import { countContactsForBusiness } from "@/lib/fusion/audience";

export async function loadCardRelationshipContext(
  businessId: string,
  businessName: string,
  opts?: { logoUrl?: string | null }
): Promise<CardRelationshipContext> {
  const [brandKit, devices, tapPoints, decisionItems, taps, contacts, saves, claims] =
    await Promise.all([
      prisma.brandKit.findUnique({ where: { businessId } }).catch(() => null),
      prisma.deviceSlot
        .findMany({
          where: { businessId },
          take: 40,
          select: {
            id: true,
            status: true,
            totalTapCount: true,
            deviceCode: true,
            assignments: {
              where: { status: "ACTIVE" },
              take: 1,
              select: { id: true },
            },
          },
        })
        .catch(() => []),
      listTapPointsForBusiness(businessId).catch(() => []),
      listDecisionQueueItems({ businessId, limit: 3 }).catch(() => []),
      prisma.tapEvent.count({ where: { businessId } }).catch(() => 0),
      countContactsForBusiness(businessId).catch(() => 0),
      prisma.clickEvent
        .count({
          where: {
            businessId,
            OR: [
              { eventType: { contains: "save", mode: "insensitive" } },
              { eventType: { contains: "tapsave", mode: "insensitive" } },
              { eventType: { contains: "keep", mode: "insensitive" } },
            ],
          },
        })
        .catch(() => 0),
      prisma.lead
        .count({ where: { businessId, couponClaimed: true } })
        .catch(() => 0),
    ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const unbridged = devices.filter((d) => !tapPoints.some((tp) => tp.deviceSlotId === d.id));
  const fleet = summarizeFleetHealth([
    ...tapPoints.map((tp) => {
      const device = tp.deviceSlotId ? deviceById.get(tp.deviceSlotId) : undefined;
      return computeTapPointHealth({
        status: tp.status,
        hasAddress: Boolean(tp.address?.code),
        totalTapCount: device?.totalTapCount,
        deviceStatus: device?.status,
        bridged: true,
      });
    }),
    ...unbridged.map((d) =>
      computeTapPointHealth({
        status: d.status,
        hasAddress: Boolean(d.deviceCode),
        totalTapCount: d.totalTapCount,
        deviceStatus: d.status,
        bridged: false,
      })
    ),
  ]);

  const publicCode =
    tapPoints.find((tp) => tp.address?.code)?.address?.code ||
    devices.find((d) => d.deviceCode)?.deviceCode ||
    null;

  const hasLiveAssignment = devices.some((d) => (d.assignments?.length ?? 0) > 0);
  const attention = decisionItems[0]
    ? {
        title: decisionItems[0].title,
        href: decisionItems[0].href,
        detail: decisionItems[0].detail || "Needs recovery",
      }
    : fleet.critical > 0
      ? {
          title: "Tap Point health needs attention",
          href: "/dashboard/tap-points",
          detail: `${fleet.critical} critical Tap Point(s)`,
        }
      : null;

  const autopilotSuggestion =
    !attention
      ? {
          title: "Prepare a measurable Card offer",
          href: "/dashboard/card?wire=offer",
          detail: "Autopilot can prepare a Spotlight plan locally for review.",
        }
      : null;

  return buildCardRelationshipFromParts({
    businessId,
    businessName,
    brandKitTapCard: brandKit?.tapCard,
    brandKitPresent: Boolean(brandKit),
    logoUrl: opts?.logoUrl,
    accentColor: brandKit?.accentColor,
    publicCode,
    tapPointCount: Math.max(tapPoints.length, devices.length),
    tapPointHealthy: fleet.healthy,
    tapPointWarning: fleet.warning,
    tapPointCritical: fleet.critical,
    hasLiveAssignment,
    proof: {
      taps,
      saves,
      contacts,
      claims,
    },
    needsAttention: attention,
    autopilotSuggestion,
  });
}
