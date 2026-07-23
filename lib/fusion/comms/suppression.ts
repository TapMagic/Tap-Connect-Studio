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

type MemorySuppression = {
  businessId: string;
  channel: MessageChannel;
  address: string;
  reason?: string;
  sourceType?: string;
  createdAt: string;
};

const memorySuppressions = new Map<string, MemorySuppression>();

function suppressionKey(businessId: string, channel: MessageChannel, address: string): string {
  return `${businessId}:${channel}:${address}`;
}

/** Test / no-DB helper — clears in-memory suppression overlay */
export function resetMemorySuppressions(): void {
  memorySuppressions.clear();
}

/** Pure path when Prisma is unavailable — used by tests and mock send hardening */
export function addMemorySuppression(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
  reason?: string;
  sourceType?: string;
}): SuppressionRow {
  const validated = validateSuppressionInput(input.channel, input.address);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const createdAt = new Date().toISOString();
  const row: MemorySuppression = {
    businessId: input.businessId,
    channel: validated.channel,
    address: validated.address,
    reason: input.reason,
    sourceType: input.sourceType ?? "memory",
    createdAt,
  };
  memorySuppressions.set(
    suppressionKey(input.businessId, validated.channel, validated.address),
    row
  );
  return {
    id: `mem_${validated.address.slice(0, 8)}`,
    channel: validated.channel,
    address: validated.address,
    reason: row.reason ?? null,
    sourceType: row.sourceType ?? null,
    createdAt,
  };
}

export function removeMemorySuppression(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): boolean {
  const validated = validateSuppressionInput(input.channel, input.address);
  if (!validated.ok) return false;
  return memorySuppressions.delete(
    suppressionKey(input.businessId, validated.channel, validated.address)
  );
}

function isMemorySuppressed(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): boolean {
  const normalized = normalizeSuppressionAddress(input.address);
  if (!normalized) return false;
  return memorySuppressions.has(
    suppressionKey(input.businessId, input.channel, normalized)
  );
}

export async function isAddressSuppressed(input: {
  businessId: string;
  channel: MessageChannel;
  address: string;
}): Promise<boolean> {
  const normalized = normalizeSuppressionAddress(input.address);
  if (!normalized) return false;

  if (
    isMemorySuppressed({
      businessId: input.businessId,
      channel: input.channel,
      address: normalized,
    })
  ) {
    return true;
  }

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

  try {
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
  } catch {
    const row = addMemorySuppression({
      businessId: input.businessId,
      channel: validated.channel,
      address: validated.address,
      reason: input.reason,
      sourceType: input.sourceType ?? "memory_fallback",
    });
    return { ok: true, id: row.id, row };
  }
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
    removeMemorySuppression({
      businessId: input.businessId,
      channel: validated.channel,
      address: validated.address,
    });
    return true;
  } catch {
    return removeMemorySuppression({
      businessId: input.businessId,
      channel: validated.channel,
      address: validated.address,
    });
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
