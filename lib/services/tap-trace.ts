import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type TapTraceFilters = {
  from?: Date;
  to?: Date;
  tapPointId?: string;
  cardPublicationId?: string;
  campaignId?: string;
  action?: string;
  locationId?: string;
  fixture?: boolean;
  outcome?: "successful" | "fallback" | "unresolved";
};

function tapWhere(businessId: string, filters: TapTraceFilters): Prisma.TapEventWhereInput {
  const resolutionOutcome = filters.outcome === "fallback"
    ? "CARD_FALLBACK"
    : filters.outcome === "unresolved"
      ? "UNRESOLVED"
      : filters.outcome === "successful"
        ? { not: "UNRESOLVED" }
        : undefined;
  return {
    businessId,
    ...(filters.from || filters.to
      ? { createdAt: { gte: filters.from, lte: filters.to } }
      : {}),
    ...(filters.tapPointId ? { deviceSlotId: filters.tapPointId } : {}),
    ...(filters.cardPublicationId ? { cardPublicationId: filters.cardPublicationId } : {}),
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.fixture !== undefined ? { fixture: filters.fixture } : {}),
    ...(resolutionOutcome ? { resolutionOutcome } : {}),
    ...(filters.locationId ? { deviceSlot: { locationId: filters.locationId } } : {}),
    ...(filters.action ? { clickEvents: { some: { eventType: filters.action } } } : {}),
  };
}

export async function listTapTrace(input: {
  businessId: string;
  filters?: TapTraceFilters;
  take?: number;
}) {
  return prisma.tapEvent.findMany({
    where: tapWhere(input.businessId, input.filters ?? {}),
    orderBy: { createdAt: "desc" },
    take: Math.min(input.take ?? 100, 250),
    include: {
      deviceSlot: { include: { location: true } },
      campaign: { select: { id: true, title: true, status: true } },
      clickEvents: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getTapTraceDetail(businessId: string, tapId: string) {
  const tap = await prisma.tapEvent.findFirst({
    where: { id: tapId, businessId },
    include: {
      deviceSlot: { include: { location: true } },
      campaign: { select: { id: true, title: true, status: true } },
      clickEvents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!tap) return null;
  // Compatibility attribution for historical clicks written before tapEventId.
  if (!tap.clickEvents.length) {
    const compatibleClicks = await prisma.clickEvent.findMany({
      where: {
        businessId,
        deviceSlotId: tap.deviceSlotId,
        campaignId: tap.campaignId,
        createdAt: { gte: tap.createdAt, lte: new Date(tap.createdAt.getTime() + 30 * 60_000) },
      },
      orderBy: { createdAt: "asc" },
    });
    return { ...tap, clickEvents: compatibleClicks };
  }
  return tap;
}
