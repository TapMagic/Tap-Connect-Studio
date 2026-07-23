/**
 * Bridge V1 DeviceSlot → TapPoint + TapPointAddress.
 * Permanent code equals deviceCode. Never rewrite address for content changes.
 * Only persists when isolated fusion DATABASE_URL is configured.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";

export async function ensureTapPointForDeviceSlot(input: {
  deviceSlotId: string;
  deviceCode: string;
  businessId?: string | null;
  name?: string | null;
}): Promise<{ ok: true; tapPointId: string; created: boolean } | { ok: false; skipped: true; reason: string }> {
  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "Isolated fusion database not configured — bridge deferred",
    };
  }

  try {
    const existing = await prisma.tapPoint.findUnique({
      where: { deviceSlotId: input.deviceSlotId },
      include: { address: true },
    });

    if (existing) {
      if (!existing.address) {
        await prisma.tapPointAddress.create({
          data: { tapPointId: existing.id, code: input.deviceCode },
        });
      }
      return { ok: true, tapPointId: existing.id, created: false };
    }

    const byCode = await prisma.tapPointAddress.findUnique({
      where: { code: input.deviceCode },
      include: { tapPoint: true },
    });
    if (byCode) {
      if (!byCode.tapPoint.deviceSlotId) {
        await prisma.tapPoint.update({
          where: { id: byCode.tapPointId },
          data: {
            deviceSlotId: input.deviceSlotId,
            businessId: input.businessId ?? byCode.tapPoint.businessId,
            name: input.name ?? byCode.tapPoint.name,
            status: "ACTIVE",
          },
        });
      }
      return { ok: true, tapPointId: byCode.tapPointId, created: false };
    }

    const created = await prisma.tapPoint.create({
      data: {
        businessId: input.businessId ?? undefined,
        name: input.name ?? input.deviceCode,
        status: "ACTIVE",
        deviceSlotId: input.deviceSlotId,
        address: { create: { code: input.deviceCode } },
      },
    });

    enqueueOutboxSync(
      "tappoint.bridged",
      createGovernedEvent({
        name: "tap_point.bridged",
        businessId: input.businessId ?? undefined,
        aggregateType: "tap_point",
        aggregateId: created.id,
        correlationId: crypto.randomUUID(),
        payload: { deviceSlotId: input.deviceSlotId, code: input.deviceCode },
      })
    );

    return { ok: true, tapPointId: created.id, created: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "bridge failed";
    return { ok: false, skipped: true, reason: message };
  }
}

/** Convenience wrapper used by scan/device services */
export async function ensureTapPointBridgeForDevice(device: {
  id: string;
  deviceCode: string;
  businessId?: string | null;
  nickname?: string | null;
}) {
  return ensureTapPointForDeviceSlot({
    deviceSlotId: device.id,
    deviceCode: device.deviceCode,
    businessId: device.businessId,
    name: device.nickname,
  });
}

/** Resolve public code via TapPointAddress bridge, then DeviceSlot */
export async function resolveDeviceSlotByPublicCode(code: string) {
  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const address = await prisma.tapPointAddress.findUnique({
        where: { code },
        include: { tapPoint: true },
      });
      if (address?.tapPoint.deviceSlotId) {
        return prisma.deviceSlot.findUnique({ where: { id: address.tapPoint.deviceSlotId } });
      }
    } catch {
      // fall through
    }
  }
  return prisma.deviceSlot.findUnique({ where: { deviceCode: code } });
}

export async function listTapPointsForBusiness(businessId: string) {
  if (!isIsolatedFusionDatabaseConfigured()) return [];
  try {
    return await prisma.tapPoint.findMany({
      where: { businessId },
      include: { address: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  } catch {
    return [];
  }
}

export async function syncTapPointStatusForDevice(device: {
  id: string;
  deviceCode: string;
  businessId?: string | null;
  nickname?: string | null;
  status?: string | null;
}) {
  const bridged = await ensureTapPointBridgeForDevice(device);
  if (!bridged.ok || !("tapPointId" in bridged)) return bridged;

  if (!isIsolatedFusionDatabaseConfigured()) return bridged;

  const status = device.status;
  const mapped =
    status === "ACTIVE"
      ? "ACTIVE"
      : status === "LOST"
        ? "LOST"
        : status === "REPLACED"
          ? "REPLACED"
          : status === "RETIRED" || status === "CLOSED" || status === "ARCHIVED"
            ? "RETIRED"
            : status === "INACTIVE" || status === "SUSPENDED"
              ? "PAUSED"
              : "UNASSIGNED";

  try {
    await prisma.tapPoint.update({
      where: { id: bridged.tapPointId },
      data: { status: mapped as "ACTIVE" | "PAUSED" | "LOST" | "REPLACED" | "RETIRED" | "UNASSIGNED" },
    });
  } catch {
    // ignore if table missing
  }
  return bridged;
}
