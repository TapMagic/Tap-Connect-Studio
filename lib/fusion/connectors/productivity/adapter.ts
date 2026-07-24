/**
 * Provider adapter contract + mock implementation for Productivity & Work Management.
 */

import { nanoid } from "nanoid";
import {
  getProductivityProvider,
  productivityProviderLiveReady,
  PRODUCTIVITY_PROVIDERS,
  type ExternalWorkItem,
  type WorkItemCreateInput,
  type WorkProviderDefinition,
  type WorkAdapterResult,
} from "./types";
import {
  connectProvider,
  disconnectProvider,
  findByIdempotencyKey,
  getDefaultWorkProvider,
  getWorkItem,
  isConnected,
  listConnections,
  listWorkItems,
  setDefaultWorkProvider,
  upsertWorkItem,
  addKnowledgeChunk,
  listKnowledgeChunks,
  recordCollabInteraction,
  recordAnalytics,
  summarizeAnalytics,
  listAnalytics,
} from "./store";
import { getOpsSnapshotExtras } from "./operations";
import {
  createGovernedEvent,
  enqueueOutboxSync,
} from "@/lib/fusion/publication/events";

export type { WorkAdapterResult } from "./types";

export type WorkProviderHealth = {
  provider: string;
  name: string;
  liveConfigured: boolean;
  connected: boolean;
  mode: "disconnected" | "mock" | "live_ready" | "credentials_required";
  missingEnvVars: string[];
  capabilities: string[];
  kind: string;
};

export function evaluateWorkProviderHealth(
  providerId: string,
  businessId?: string
): WorkProviderHealth {
  const def = getProductivityProvider(providerId);
  if (!def) {
    return {
      provider: providerId,
      name: providerId,
      liveConfigured: false,
      connected: false,
      mode: "disconnected",
      missingEnvVars: [],
      capabilities: [],
      kind: "unknown",
    };
  }
  const missing = def.requiredEnvVars.filter((k) => !process.env[k]?.trim());
  const liveConfigured = missing.length === 0;
  const connected = businessId ? isConnected(businessId, providerId) : false;
  let mode: WorkProviderHealth["mode"] = "disconnected";
  if (connected && liveConfigured) mode = "live_ready";
  else if (connected) mode = "mock";
  else if (!liveConfigured) mode = "credentials_required";
  else mode = "credentials_required"; // live keys present but not connected yet

  return {
    provider: def.id,
    name: def.name,
    liveConfigured,
    connected,
    mode,
    missingEnvVars: missing,
    capabilities: def.capabilities,
    kind: def.kind,
  };
}

export function listWorkProviderHealth(businessId?: string): WorkProviderHealth[] {
  return PRODUCTIVITY_PROVIDERS.map((p) => evaluateWorkProviderHealth(p.id, businessId));
}

export function connectWorkProvider(opts: {
  businessId: string;
  provider: string;
  preferLive?: boolean;
}): WorkAdapterResult<{ provider: string; mode: "mock" | "live" }> {
  const def = getProductivityProvider(opts.provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };
  const live = productivityProviderLiveReady(opts.provider);
  const mode: "mock" | "live" = opts.preferLive && live ? "live" : "mock";
  if (opts.preferLive && !live) {
    // Still allow mock connect — credentials required for live
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
    recordAnalytics("connector.connect", opts.businessId, { mode: "mock" }, opts.provider);
    return {
      ok: true,
      data: { provider: opts.provider, mode: "mock" },
      mode: "mock",
    };
  }
  connectProvider({ provider: opts.provider, businessId: opts.businessId, mode });
  if (!getDefaultWorkProvider(opts.businessId)) {
    setDefaultWorkProvider(opts.businessId, opts.provider);
  }
  recordAnalytics("connector.connect", opts.businessId, { mode }, opts.provider);
  return { ok: true, data: { provider: opts.provider, mode }, mode };
}

export function disconnectWorkProvider(businessId: string, provider: string) {
  disconnectProvider(businessId, provider);
  return { ok: true as const };
}

export function createExternalWorkItem(
  input: WorkItemCreateInput
): WorkAdapterResult<ExternalWorkItem> {
  const def = getProductivityProvider(input.provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };

  if (input.idempotencyKey) {
    const existing = findByIdempotencyKey(input.businessId, input.idempotencyKey);
    if (existing) return { ok: true, data: existing, mode: existing.syncStatus === "pushed" ? "mock" : "mock" };
  }

  const connected = isConnected(input.businessId, input.provider);
  if (!connected) {
    // Auto-connect mock so Create task works without ceremony in local demo
    connectProvider({
      provider: input.provider,
      businessId: input.businessId,
      mode: "mock",
    });
  }

  const live = productivityProviderLiveReady(input.provider);
  const mode: "mock" | "live" = live && isConnected(input.businessId, input.provider) ? "mock" : "mock";
  // Live push path reserved — until OAuth apps supplied, always mock-authoritative locally
  const now = new Date().toISOString();
  const externalId = `ext_${nanoid(10)}`;
  const item: ExternalWorkItem = {
    id: `ewi_${nanoid(12)}`,
    provider: input.provider,
    externalId,
    title: input.title,
    description: input.description,
    status: input.status ?? "open",
    priority: input.priority ?? "normal",
    assigneeExternalIds: input.assigneeExternalIds ?? [],
    dueAt: input.dueAt ?? null,
    url: `https://mock.tapconnect.local/${input.provider}/item/${externalId}`,
    projectExternalId: input.projectExternalId,
    workspaceExternalId: input.workspaceExternalId,
    customFields: input.customFields ?? {},
    comments: [],
    attachments: [],
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    businessId: input.businessId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    syncStatus: "pushed",
    lastSyncedAt: now,
    raw: {
      mock: true,
      deepLinkBack: input.deepLinkBack,
      liveConfigured: live,
      displayMode: live ? "verified_credentials_required_for_live" : "mock",
    },
    createdAt: now,
    updatedAt: now,
  };

  upsertWorkItem(item);
  recordAnalytics(
    "connector.work_item.created",
    input.businessId,
    { sourceType: item.sourceType, externalId: item.externalId },
    item.provider
  );

  enqueueOutboxSync(
    "connector.work_item.created",
    createGovernedEvent({
      name: "connector.work_item.created",
      businessId: input.businessId,
      aggregateType: "external_work_item",
      aggregateId: item.id,
      correlationId: input.correlationId ?? item.id,
      payload: {
        provider: item.provider,
        externalId: item.externalId,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        title: item.title,
        mode,
      },
    })
  );

  return { ok: true, data: item, mode };
}

export function updateExternalWorkItem(opts: {
  id: string;
  businessId: string;
  patch: Partial<
    Pick<
      ExternalWorkItem,
      | "title"
      | "status"
      | "priority"
      | "dueAt"
      | "assigneeExternalIds"
      | "description"
      | "customFields"
    >
  >;
}): WorkAdapterResult<ExternalWorkItem> {
  const existing = getWorkItem(opts.id);
  if (!existing || existing.businessId !== opts.businessId) {
    return { ok: false, error: "Work item not found", code: "not_found" };
  }
  const updated: ExternalWorkItem = {
    ...existing,
    ...opts.patch,
    customFields: opts.patch.customFields
      ? { ...(existing.customFields ?? {}), ...opts.patch.customFields }
      : existing.customFields,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "synced",
  };
  upsertWorkItem(updated);
  recordAnalytics(
    "connector.work_item.updated",
    opts.businessId,
    { patch: Object.keys(opts.patch) },
    updated.provider
  );
  enqueueOutboxSync(
    "connector.work_item.updated",
    createGovernedEvent({
      name: "connector.work_item.updated",
      businessId: opts.businessId,
      aggregateType: "external_work_item",
      aggregateId: updated.id,
      correlationId: updated.correlationId ?? updated.id,
      payload: { provider: updated.provider, patch: opts.patch },
    })
  );
  return { ok: true, data: updated, mode: "mock" };
}

export function ingestKnowledgeMock(opts: {
  businessId: string;
  provider: string;
  title: string;
  excerpt: string;
  url?: string;
}): WorkAdapterResult<{ id: string }> {
  const def = getProductivityProvider(opts.provider);
  if (!def?.capabilities.includes("knowledge_ingest")) {
    return { ok: false, error: "Provider does not support knowledge ingest", code: "unsupported" };
  }
  const id = `know_${nanoid(10)}`;
  addKnowledgeChunk({
    id,
    provider: opts.provider,
    businessId: opts.businessId,
    title: opts.title,
    excerpt: opts.excerpt,
    url: opts.url,
  });
  return { ok: true, data: { id }, mode: "mock" };
}

export function postCollabAlert(opts: {
  businessId: string;
  provider: "slack" | "microsoft_teams";
  text: string;
  severity?: "info" | "warning" | "critical";
  deepLink?: string;
}): WorkAdapterResult<{ delivered: boolean; mock: true }> {
  const def = getProductivityProvider(opts.provider);
  if (!def || def.kind !== "collab_chat") {
    return { ok: false, error: "Not a collab provider", code: "unsupported" };
  }
  if (!isConnected(opts.businessId, opts.provider)) {
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
  }
  const row = recordCollabInteraction({
    id: `al_${nanoid(8)}`,
    businessId: opts.businessId,
    provider: opts.provider,
    kind: opts.severity === "critical" ? "incident" : "alert",
    text: opts.text,
    deepLink: opts.deepLink,
    status: "delivered",
  });
  enqueueOutboxSync(
    "connector.collab.alert",
    createGovernedEvent({
      name: "connector.collab.alert",
      businessId: opts.businessId,
      aggregateType: "collab_alert",
      aggregateId: row.id,
      correlationId: row.id,
      payload: {
        provider: opts.provider,
        text: opts.text,
        severity: opts.severity ?? "info",
        deepLink: opts.deepLink,
        mock: true,
      },
    })
  );
  return { ok: true, data: { delivered: true, mock: true }, mode: "mock" };
}

export function getProductivitySnapshot(businessId: string) {
  const health = listWorkProviderHealth(businessId);
  const connections = listConnections(businessId);
  const items = listWorkItems({ businessId, limit: 50 });
  const knowledge = listKnowledgeChunks(businessId);
  const defaultProvider = getDefaultWorkProvider(businessId) ?? null;
  const liveAny = health.some((h) => h.liveConfigured);
  const extras = getOpsSnapshotExtras(businessId);
  return {
    category: "Productivity & Work Management" as const,
    defaultProvider,
    connections,
    items,
    knowledge,
    health,
    analytics: {
      summary: summarizeAnalytics(businessId),
      recent: listAnalytics(businessId, 20),
    },
    ...extras,
    displayStatus: liveAny
      ? ("verified_credentials_required" as const)
      : ("functional_final_verification_required" as const),
    note: liveAny
      ? "Some OAuth apps configured — live execution still needs connection + certification"
      : "Mock adapters active — connect OAuth apps for live VERIFIED path",
    liveClassification: "VERIFIED — CREDENTIALS REQUIRED" as const,
  };
}

export type { WorkProviderDefinition, ExternalWorkItem };
