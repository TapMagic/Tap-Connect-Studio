/**
 * Communication suppression / preference checks.
 */

import { prisma } from "@/lib/db";
import type { MessageChannel } from "./channel-guardian";

export async function isAddressSuppressed(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): Promise<boolean> {
  const normalized = input.address.trim().toLowerCase();
  if (!normalized) return false;

  try {
    const hit = await prisma.communicationSuppression.findUnique({
      where: {
        businessId_channel_address: {
          businessId: input.businessId,
          channel: input.channel,
          address: normalized,
        },
      },
    });
    return Boolean(hit);
  } catch {
    return false;
  }
}

export async function addSuppression(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
  reason?: string;
  sourceType?: string;
}): Promise<{ id: string }> {
  const normalized = input.address.trim().toLowerCase();
  const row = await prisma.communicationSuppression.upsert({
    where: {
      businessId_channel_address: {
        businessId: input.businessId,
        channel: input.channel,
        address: normalized,
      },
    },
    create: {
      businessId: input.businessId,
      channel: input.channel,
      address: normalized,
      reason: input.reason,
      sourceType: input.sourceType,
    },
    update: {
      reason: input.reason,
      sourceType: input.sourceType,
    },
  });
  return { id: row.id };
}

export async function removeSuppression(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): Promise<boolean> {
  const normalized = input.address.trim().toLowerCase();
  try {
    await prisma.communicationSuppression.delete({
      where: {
        businessId_channel_address: {
          businessId: input.businessId,
          channel: input.channel,
          address: normalized,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listSuppressions(businessId: string, limit = 100) {
  return prisma.communicationSuppression.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
