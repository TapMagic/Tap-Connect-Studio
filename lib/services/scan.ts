import { randomBytes } from "crypto";
import type { ScanSessionType } from "@prisma/client";
import { prisma } from "@/lib/db";

const SESSION_TTL_MS = 5 * 60 * 1000;

export function generateScanAccessCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export async function createScanSession(params: {
  businessId: string;
  userId: string;
  sessionType: ScanSessionType;
}) {
  // One active wait session per user
  await prisma.scanSession.updateMany({
    where: {
      businessId: params.businessId,
      createdByUserId: params.userId,
      status: "WAITING",
    },
    data: { status: "CANCELED" },
  });

  const needsCode =
    params.sessionType === "REMOTE_STAFF" || params.sessionType === "SUPPORT_ASSISTED";

  return prisma.scanSession.create({
    data: {
      businessId: params.businessId,
      createdByUserId: params.userId,
      sessionType: params.sessionType,
      status: "WAITING",
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      accessCode: needsCode ? generateScanAccessCode() : generateScanAccessCode(),
    },
  });
}

export async function getScanSessionForBusiness(params: {
  businessId: string;
  sessionId: string;
}) {
  const session = await prisma.scanSession.findFirst({
    where: { id: params.sessionId, businessId: params.businessId },
  });
  if (!session) return null;

  if (session.status === "WAITING" && session.expiresAt < new Date()) {
    return prisma.scanSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
  }

  return session;
}

export async function cancelScanSession(params: {
  businessId: string;
  sessionId: string;
}) {
  const existing = await prisma.scanSession.findFirst({
    where: {
      id: params.sessionId,
      businessId: params.businessId,
      status: "WAITING",
    },
  });
  if (!existing) return null;

  return prisma.scanSession.update({
    where: { id: existing.id },
    data: { status: "CANCELED" },
  });
}

/**
 * Claim a waiting scan session when a physical tag is tapped.
 * Prefer accessCode match; else newest WAITING session for that business.
 */
export async function claimScanSession(params: {
  deviceCode: string;
  accessCode?: string | null;
  scannedByUserId?: string | null;
}) {
  const device = await prisma.deviceSlot.findUnique({
    where: { deviceCode: params.deviceCode },
    select: {
      id: true,
      businessId: true,
      nickname: true,
      deviceCode: true,
      status: true,
    },
  });

  if (!device?.businessId) {
    return { claimed: false as const, reason: "device_not_found" as const };
  }

  const now = new Date();
  let session = null;

  if (params.accessCode?.trim()) {
    session = await prisma.scanSession.findFirst({
      where: {
        businessId: device.businessId,
        accessCode: params.accessCode.trim().toUpperCase(),
        status: "WAITING",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!session) {
    session = await prisma.scanSession.findFirst({
      where: {
        businessId: device.businessId,
        status: "WAITING",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!session) {
    return { claimed: false as const, reason: "no_waiting_session" as const, device };
  }

  const updated = await prisma.scanSession.update({
    where: { id: session.id },
    data: {
      status: "SCANNED",
      scannedDeviceSlotId: device.id,
      scannedAt: now,
      scannedByUserId: params.scannedByUserId ?? undefined,
    },
  });

  return {
    claimed: true as const,
    session: updated,
    device,
  };
}

export async function getSessionWithDevice(sessionId: string, businessId: string) {
  const session = await getScanSessionForBusiness({ businessId, sessionId });
  if (!session) return null;

  let device = null;
  if (session.scannedDeviceSlotId) {
    device = await prisma.deviceSlot.findFirst({
      where: { id: session.scannedDeviceSlotId, businessId },
      select: {
        id: true,
        nickname: true,
        deviceCode: true,
        status: true,
      },
    });
  }

  return { session, device };
}
