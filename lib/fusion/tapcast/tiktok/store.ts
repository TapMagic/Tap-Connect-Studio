/**
 * In-memory TikTok TapCast store (mock / local).
 */

import type { TikTokCast } from "./types";

const casts: TikTokCast[] = [];
const audit: Array<{
  id: string;
  businessId: string;
  castId?: string;
  action: string;
  detail: Record<string, unknown>;
  at: string;
}> = [];
const connections = new Map<
  string,
  { businessId: string; mode: "mock" | "live"; connectedAt: string }
>();

export function resetTikTokMemory() {
  casts.length = 0;
  audit.length = 0;
  connections.clear();
}

export function upsertCast(cast: TikTokCast): TikTokCast {
  const idx = casts.findIndex((c) => c.id === cast.id);
  if (idx >= 0) casts[idx] = cast;
  else casts.push(cast);
  return cast;
}

export function getCast(id: string): TikTokCast | undefined {
  return casts.find((c) => c.id === id);
}

export function listCasts(businessId: string): TikTokCast[] {
  return casts
    .filter((c) => c.businessId === businessId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function setTikTokConnection(
  businessId: string,
  mode: "mock" | "live"
) {
  connections.set(businessId, {
    businessId,
    mode,
    connectedAt: new Date().toISOString(),
  });
}

export function getTikTokConnection(businessId: string) {
  return connections.get(businessId) ?? null;
}

export function appendTikTokAudit(entry: {
  businessId: string;
  castId?: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  const row = {
    id: `tka_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    businessId: entry.businessId,
    castId: entry.castId,
    action: entry.action,
    detail: entry.detail ?? {},
    at: new Date().toISOString(),
  };
  audit.push(row);
  return row;
}

export function listTikTokAudit(businessId: string, limit = 40) {
  return audit
    .filter((a) => a.businessId === businessId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
