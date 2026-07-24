/**
 * In-memory ExternalWorkItem store for mock / local development.
 * Live providers remain authoritative for their native state when connected.
 */

import type { ExternalWorkItem } from "./types";

const items: ExternalWorkItem[] = [];
const connections = new Map<
  string,
  { provider: string; businessId: string; connectedAt: string; mode: "mock" | "live" }
>();
const defaultProviderByBusiness = new Map<string, string>();
const knowledgeChunks: Array<{
  id: string;
  provider: string;
  businessId: string;
  title: string;
  excerpt: string;
  url?: string;
  ingestedAt: string;
}> = [];
const auditLog: Array<{
  id: string;
  businessId: string;
  provider?: string;
  action: string;
  detail: Record<string, unknown>;
  at: string;
}> = [];
const webhookReceipts: Array<{
  id: string;
  businessId: string;
  provider: string;
  eventType: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  verified: boolean;
  at: string;
}> = [];
const collabInteractions: Array<{
  id: string;
  businessId: string;
  provider: string;
  kind: "alert" | "approval" | "interactive_action" | "incident" | "handoff";
  text: string;
  deepLink?: string;
  status: "pending" | "approved" | "rejected" | "acknowledged" | "delivered";
  at: string;
}> = [];
const analyticsEvents: Array<{
  name: string;
  businessId: string;
  provider?: string;
  at: string;
  props: Record<string, unknown>;
}> = [];

export function resetProductivityMemory() {
  items.length = 0;
  connections.clear();
  defaultProviderByBusiness.clear();
  knowledgeChunks.length = 0;
  auditLog.length = 0;
  webhookReceipts.length = 0;
  collabInteractions.length = 0;
  analyticsEvents.length = 0;
}

export function listWorkItems(opts: {
  businessId?: string;
  provider?: string;
  sourceType?: string;
  limit?: number;
} = {}): ExternalWorkItem[] {
  const limit = opts.limit ?? 100;
  return items
    .filter((i) => {
      if (opts.businessId && i.businessId !== opts.businessId) return false;
      if (opts.provider && i.provider !== opts.provider) return false;
      if (opts.sourceType && i.sourceType !== opts.sourceType) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export function getWorkItem(id: string): ExternalWorkItem | undefined {
  return items.find((i) => i.id === id);
}

export function findByIdempotencyKey(
  businessId: string,
  key: string
): ExternalWorkItem | undefined {
  return items.find((i) => i.businessId === businessId && i.idempotencyKey === key);
}

export function findByExternalId(
  businessId: string,
  provider: string,
  externalId: string
): ExternalWorkItem | undefined {
  return items.find(
    (i) =>
      i.businessId === businessId &&
      i.provider === provider &&
      i.externalId === externalId
  );
}

export function upsertWorkItem(item: ExternalWorkItem): ExternalWorkItem {
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
    return item;
  }
  items.push(item);
  return item;
}

export function connectProvider(opts: {
  provider: string;
  businessId: string;
  mode: "mock" | "live";
}) {
  const key = `${opts.businessId}:${opts.provider}`;
  connections.set(key, {
    provider: opts.provider,
    businessId: opts.businessId,
    connectedAt: new Date().toISOString(),
    mode: opts.mode,
  });
  appendAudit({
    businessId: opts.businessId,
    provider: opts.provider,
    action: "connect",
    detail: { mode: opts.mode },
  });
}

export function disconnectProvider(businessId: string, provider: string) {
  connections.delete(`${businessId}:${provider}`);
  appendAudit({
    businessId,
    provider,
    action: "disconnect",
    detail: {},
  });
}

export function listConnections(businessId: string) {
  return [...connections.values()].filter((c) => c.businessId === businessId);
}

export function isConnected(businessId: string, provider: string): boolean {
  return connections.has(`${businessId}:${provider}`);
}

export function setDefaultWorkProvider(businessId: string, provider: string) {
  defaultProviderByBusiness.set(businessId, provider);
  appendAudit({
    businessId,
    provider,
    action: "set_default",
    detail: {},
  });
}

export function getDefaultWorkProvider(businessId: string): string | undefined {
  return defaultProviderByBusiness.get(businessId);
}

export function addKnowledgeChunk(chunk: {
  id: string;
  provider: string;
  businessId: string;
  title: string;
  excerpt: string;
  url?: string;
}) {
  knowledgeChunks.push({ ...chunk, ingestedAt: new Date().toISOString() });
  appendAudit({
    businessId: chunk.businessId,
    provider: chunk.provider,
    action: "knowledge_ingest",
    detail: { id: chunk.id, title: chunk.title },
  });
}

export function listKnowledgeChunks(businessId: string, provider?: string) {
  return knowledgeChunks.filter(
    (c) => c.businessId === businessId && (!provider || c.provider === provider)
  );
}

export function appendAudit(opts: {
  businessId: string;
  provider?: string;
  action: string;
  detail: Record<string, unknown>;
}) {
  auditLog.push({
    id: `aud_${auditLog.length + 1}`,
    businessId: opts.businessId,
    provider: opts.provider,
    action: opts.action,
    detail: opts.detail,
    at: new Date().toISOString(),
  });
}

export function listAudit(businessId: string, limit = 50) {
  return auditLog
    .filter((a) => a.businessId === businessId)
    .slice(-limit)
    .reverse();
}

export function recordWebhook(opts: {
  id: string;
  businessId: string;
  provider: string;
  eventType: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  verified: boolean;
}) {
  if (opts.idempotencyKey) {
    const dup = webhookReceipts.find(
      (w) =>
        w.businessId === opts.businessId &&
        w.provider === opts.provider &&
        w.idempotencyKey === opts.idempotencyKey
    );
    if (dup) return { duplicate: true as const, receipt: dup };
  }
  const receipt = { ...opts, at: new Date().toISOString() };
  webhookReceipts.push(receipt);
  appendAudit({
    businessId: opts.businessId,
    provider: opts.provider,
    action: "webhook_received",
    detail: { eventType: opts.eventType, verified: opts.verified },
  });
  return { duplicate: false as const, receipt };
}

export function listWebhookReceipts(businessId: string) {
  return webhookReceipts.filter((w) => w.businessId === businessId);
}

export function recordCollabInteraction(opts: {
  id: string;
  businessId: string;
  provider: string;
  kind: "alert" | "approval" | "interactive_action" | "incident" | "handoff";
  text: string;
  deepLink?: string;
  status: "pending" | "approved" | "rejected" | "acknowledged" | "delivered";
}) {
  const row = { ...opts, at: new Date().toISOString() };
  collabInteractions.push(row);
  appendAudit({
    businessId: opts.businessId,
    provider: opts.provider,
    action: `collab_${opts.kind}`,
    detail: { status: opts.status, text: opts.text },
  });
  return row;
}

export function listCollabInteractions(businessId: string) {
  return collabInteractions.filter((c) => c.businessId === businessId);
}

export function recordAnalytics(
  name: string,
  businessId: string,
  props: Record<string, unknown> = {},
  provider?: string
) {
  analyticsEvents.push({
    name,
    businessId,
    provider,
    at: new Date().toISOString(),
    props,
  });
}

export function listAnalytics(businessId: string, limit = 50) {
  return analyticsEvents
    .filter((e) => e.businessId === businessId)
    .slice(-limit)
    .reverse();
}

export function summarizeAnalytics(businessId: string) {
  const events = analyticsEvents.filter((e) => e.businessId === businessId);
  const byName: Record<string, number> = {};
  for (const e of events) byName[e.name] = (byName[e.name] ?? 0) + 1;
  return { total: events.length, byName };
}
