/**
 * Suppression list helpers — normalization + validation (pure).
 */

import type { MessageChannel } from "./channel-guardian";

const VALID_CHANNELS: MessageChannel[] = [
  "email",
  "messenger",
  "instagram_dm",
  "whatsapp",
  "telegram",
  "manychat",
  "sms",
];

export function normalizeSuppressionAddress(address: string): string | null {
  const normalized = address.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isValidSuppressionChannel(channel: string): channel is MessageChannel {
  return VALID_CHANNELS.includes(channel as MessageChannel);
}

export function validateSuppressionInput(
  channel: string,
  address: string
):
  | { ok: true; channel: MessageChannel; address: string }
  | { ok: false; error: string } {
  if (!isValidSuppressionChannel(channel)) {
    return { ok: false, error: `Invalid channel: ${channel}` };
  }
  const normalized = normalizeSuppressionAddress(address);
  if (!normalized) {
    return { ok: false, error: "Address is required" };
  }
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Invalid email address" };
  }
  return { ok: true, channel, address: normalized };
}

export type SuppressionRow = {
  id: string;
  channel: string;
  address: string;
  reason: string | null;
  sourceType: string | null;
  createdAt: string;
};

export function formatSuppressionRow(row: {
  id: string;
  channel: string;
  address: string;
  reason: string | null;
  sourceType: string | null;
  createdAt: Date | string;
}): SuppressionRow {
  return {
    id: row.id,
    channel: row.channel,
    address: row.address,
    reason: row.reason,
    sourceType: row.sourceType,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}
