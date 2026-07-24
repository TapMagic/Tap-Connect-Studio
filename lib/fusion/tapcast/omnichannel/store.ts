/**
 * In-memory store for omnichannel TapCast (hydrated from Prisma when isolated DB).
 */

import type { CampaignChannelVariant, ChannelConnection } from "./types";

const variants = new Map<string, CampaignChannelVariant>();
const connections = new Map<string, ChannelConnection>(); // key: businessId:channelId
const audit: Array<{
  id: string;
  businessId: string;
  channelId?: string;
  variantId?: string;
  action: string;
  detail: Record<string, unknown>;
  at: string;
}> = [];

function connKey(businessId: string, channelId: string) {
  return `${businessId}:${channelId}`;
}

export function resetOmnichannelMemory() {
  variants.clear();
  connections.clear();
  audit.length = 0;
}

export function upsertVariant(v: CampaignChannelVariant) {
  variants.set(v.id, v);
}

export function getVariant(id: string): CampaignChannelVariant | undefined {
  return variants.get(id);
}

export function listVariants(
  businessId: string,
  opts?: { campaignId?: string; channelId?: string }
): CampaignChannelVariant[] {
  return [...variants.values()]
    .filter((v) => v.businessId === businessId)
    .filter((v) => (opts?.campaignId ? v.campaignId === opts.campaignId : true))
    .filter((v) => (opts?.channelId ? v.channelId === opts.channelId : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function setChannelConnection(conn: ChannelConnection) {
  connections.set(connKey(conn.businessId, conn.channelId), conn);
}

export function getChannelConnection(
  businessId: string,
  channelId: string
): ChannelConnection | undefined {
  return connections.get(connKey(businessId, channelId));
}

export function listChannelConnections(businessId: string): ChannelConnection[] {
  return [...connections.values()].filter((c) => c.businessId === businessId);
}

export function connectionsMap(businessId: string): Map<string, { mode: "mock" | "live" }> {
  const m = new Map<string, { mode: "mock" | "live" }>();
  for (const c of listChannelConnections(businessId)) {
    m.set(c.channelId, { mode: c.mode });
  }
  return m;
}

export function appendOmnichannelAudit(entry: {
  businessId: string;
  channelId?: string;
  variantId?: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  const row = {
    id: `tcaudit_${Math.random().toString(36).slice(2, 12)}`,
    businessId: entry.businessId,
    channelId: entry.channelId,
    variantId: entry.variantId,
    action: entry.action,
    detail: entry.detail ?? {},
    at: new Date().toISOString(),
  };
  audit.unshift(row);
  if (audit.length > 500) audit.length = 500;
  return row;
}

export function listOmnichannelAudit(businessId: string, limit = 40) {
  return audit.filter((a) => a.businessId === businessId).slice(0, limit);
}
