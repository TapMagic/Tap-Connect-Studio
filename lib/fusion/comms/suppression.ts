/**
 * Communication suppression / preference checks.
 */

import { prisma } from "@/lib/db";
import type { MessageChannel } from "./channel-guardian";
import {
  formatSuppressionRow,
  normalizeSuppressionAddress,
  validateSuppressionInput,
  type SuppressionRow,
} from "./suppression-utils";

export async function isAddressSuppressed(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): Promise<boolean> {
  const normalized = normalizeSuppressionAddress(input.address);
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
}):
  Promise<
    { ok: true; id: string; row: SuppressionRow } | { ok: false; error: string }
  > {
  const validated = validateSuppressionInput(input.channel, input.address);
  if (!validated.ok) return validated;

  const row = await prisma.communicationSuppression.upsert({
    where: {
      businessId_channel_address: {
        businessId: input.businessId,
        channel: validated.channel,
        address: validated.address,
      },
    },
    create: {
      businessId: input.businessId,
      channel: validated.channel,
      address: validated.address,
      reason: input.reason,
      sourceType: input.sourceType,
    },
    update: {
      reason: input.reason,
      sourceType: input.sourceType,
    },
  });
  return { ok: true, id: row.id, row: formatSuppressionRow(row) };
}

export async function removeSuppression(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): Promise<boolean> {
  const validated = validateSuppressionInput(input.channel, input.address);
  if (!validated.ok) return false;

  try {
    await prisma.communicationSuppression.delete({
      where: {
        businessId_channel_address: {
          businessId: input.businessId,
          channel: validated.channel,
          address: validated.address,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listSuppressions(
  businessId: string,
  limit = 100
): Promise<SuppressionRow[]> {
  const rows = await prisma.communicationSuppression.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(formatSuppressionRow);
}
