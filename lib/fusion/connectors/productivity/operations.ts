/**
 * Mock adapter operations beyond create/update:
 * discovery, comments, attachments, webhooks, polling, conflict, retries,
 * Slack/Teams approvals, automation signed webhooks.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import {
  getProductivityProvider,
  type DiscoveredWorkspace,
  type ExternalWorkAttachment,
  type ExternalWorkComment,
  type ExternalWorkItem,
} from "./types";
import {
  appendAudit,
  connectProvider,
  findByExternalId,
  getWorkItem,
  isConnected,
  listAudit,
  listCollabInteractions,
  listWebhookReceipts,
  listWorkItems,
  recordCollabInteraction,
  recordWebhook,
  upsertWorkItem,
} from "./store";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { WorkAdapterResult } from "./types";

const DISCOVERY_TEMPLATES: Record<string, DiscoveredWorkspace[]> = {
  monday: [
    { externalId: "ws_monday_1", name: "Marketing HQ", kind: "workspace" },
    { externalId: "board_monday_1", name: "Campaigns", kind: "board" },
  ],
  asana: [
    { externalId: "ws_asana_1", name: "Ops", kind: "workspace" },
    { externalId: "proj_asana_1", name: "Approvals", kind: "project" },
  ],
  clickup: [
    { externalId: "ws_cu_1", name: "Studio", kind: "workspace" },
    { externalId: "list_cu_1", name: "Inbox follow-ups", kind: "list" },
  ],
  microsoft_planner: [
    { externalId: "plan_1", name: "Tap Connect Ops", kind: "project" },
  ],
  jira: [
    { externalId: "proj_TC", name: "TapConnect", kind: "project" },
  ],
  trello: [
    { externalId: "board_tr_1", name: "Launch board", kind: "board" },
  ],
  github: [
    { externalId: "repo_tapconnect", name: "tap-connect-studio", kind: "repo" },
  ],
  airtable: [
    { externalId: "base_1", name: "Work items", kind: "base" },
  ],
  notion: [
    { externalId: "ws_notion_1", name: "Knowledge", kind: "workspace" },
  ],
  google_drive: [
    { externalId: "drive_root", name: "Shared Drive", kind: "drive" },
  ],
  onedrive: [
    { externalId: "od_root", name: "OneDrive Business", kind: "drive" },
  ],
  google_calendar: [
    { externalId: "cal_primary", name: "Primary", kind: "calendar" },
  ],
  microsoft_outlook: [
    { externalId: "cal_outlook", name: "Calendar", kind: "calendar" },
  ],
};

function requireCapability(
  provider: string,
  capability: string
): { ok: false; error: string; code: string } | null {
  const def = getProductivityProvider(provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };
  if (!def.capabilities.includes(capability as never)) {
    return { ok: false, error: `Capability not supported: ${capability}`, code: "unsupported" };
  }
  return null;
}

export function discoverWorkspaces(opts: {
  businessId: string;
  provider: string;
}): WorkAdapterResult<{ workspaces: DiscoveredWorkspace[] }> {
  const def = getProductivityProvider(opts.provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };
  if (!isConnected(opts.businessId, opts.provider)) {
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
  }
  const workspaces =
    DISCOVERY_TEMPLATES[opts.provider] ??
    ([
      {
        externalId: `ws_${opts.provider}_default`,
        name: `${def.name} default`,
        kind:
          def.kind === "collab_chat"
            ? ("workspace" as const)
            : def.kind === "calendar"
              ? ("calendar" as const)
              : def.kind === "docs_knowledge"
                ? ("drive" as const)
                : ("workspace" as const),
      },
    ] satisfies DiscoveredWorkspace[]);
  appendAudit({
    businessId: opts.businessId,
    provider: opts.provider,
    action: "discover_workspaces",
    detail: { count: workspaces.length },
  });
  return { ok: true, data: { workspaces }, mode: "mock" };
}

export function addWorkItemComment(opts: {
  businessId: string;
  workItemId: string;
  body: string;
  authorExternalId?: string;
}): WorkAdapterResult<{ item: ExternalWorkItem; comment: ExternalWorkComment }> {
  const item = getWorkItem(opts.workItemId);
  if (!item || item.businessId !== opts.businessId) {
    return { ok: false, error: "Work item not found", code: "not_found" };
  }
  const blocked = requireCapability(item.provider, "comments");
  if (blocked) return blocked;

  const comment: ExternalWorkComment = {
    id: `cmt_${nanoid(8)}`,
    body: opts.body,
    authorExternalId: opts.authorExternalId,
    createdAt: new Date().toISOString(),
  };
  const updated: ExternalWorkItem = {
    ...item,
    comments: [...(item.comments ?? []), comment],
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "synced",
  };
  upsertWorkItem(updated);
  appendAudit({
    businessId: opts.businessId,
    provider: item.provider,
    action: "comment",
    detail: { workItemId: item.id, commentId: comment.id },
  });
  return { ok: true, data: { item: updated, comment }, mode: "mock" };
}

export function addWorkItemAttachment(opts: {
  businessId: string;
  workItemId: string;
  name: string;
  url: string;
  mimeType?: string;
}): WorkAdapterResult<{ item: ExternalWorkItem; attachment: ExternalWorkAttachment }> {
  const item = getWorkItem(opts.workItemId);
  if (!item || item.businessId !== opts.businessId) {
    return { ok: false, error: "Work item not found", code: "not_found" };
  }
  const blocked = requireCapability(item.provider, "attachments");
  if (blocked) return blocked;

  const attachment: ExternalWorkAttachment = {
    id: `att_${nanoid(8)}`,
    name: opts.name,
    url: opts.url,
    mimeType: opts.mimeType,
    createdAt: new Date().toISOString(),
  };
  const updated: ExternalWorkItem = {
    ...item,
    attachments: [...(item.attachments ?? []), attachment],
    updatedAt: new Date().toISOString(),
  };
  upsertWorkItem(updated);
  return { ok: true, data: { item: updated, attachment }, mode: "mock" };
}

export function pollProviderSync(opts: {
  businessId: string;
  provider: string;
}): WorkAdapterResult<{ synced: number; conflicts: number }> {
  const def = getProductivityProvider(opts.provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };
  // Prefer providers with polling capability; still allow mock poll for connected adapters
  if (!def.capabilities.includes("polling") && def.kind === "automation") {
    return { ok: false, error: "Polling not supported", code: "unsupported" };
  }
  if (!isConnected(opts.businessId, opts.provider)) {
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
  }
  const items = listWorkItems({ businessId: opts.businessId, provider: opts.provider });
  let synced = 0;
  let conflicts = 0;
  const now = new Date().toISOString();
  for (const item of items) {
    if (item.syncStatus === "conflict") {
      conflicts += 1;
      continue;
    }
    upsertWorkItem({
      ...item,
      lastSyncedAt: now,
      syncStatus: "synced",
      updatedAt: now,
    });
    synced += 1;
  }
  appendAudit({
    businessId: opts.businessId,
    provider: opts.provider,
    action: "poll_sync",
    detail: { synced, conflicts },
  });
  return { ok: true, data: { synced, conflicts }, mode: "mock" };
}

export function applyInboundWebhook(opts: {
  businessId: string;
  provider: string;
  eventType: string;
  externalId?: string;
  patch?: Partial<Pick<ExternalWorkItem, "status" | "priority" | "dueAt" | "assigneeExternalIds">>;
  comment?: string;
  idempotencyKey?: string;
  signature?: string;
  rawBody?: string;
}): WorkAdapterResult<{
  receiptId: string;
  duplicate: boolean;
  item?: ExternalWorkItem;
  activity?: { kind: string; message: string; authorized: true };
}> {
  const def = getProductivityProvider(opts.provider);
  if (!def) return { ok: false, error: "Unknown provider", code: "unknown_provider" };
  if (
    !def.capabilities.includes("webhooks") &&
    !def.capabilities.includes("signed_webhooks")
  ) {
    return { ok: false, error: "Webhooks not supported", code: "unsupported" };
  }

  let verified = true;
  if (def.capabilities.includes("signed_webhooks") && def.kind === "automation") {
    const secretEnv =
      opts.provider === "zapier"
        ? "ZAPIER_WEBHOOK_SIGNING_SECRET"
        : opts.provider === "make"
          ? "MAKE_WEBHOOK_SIGNING_SECRET"
          : "N8N_WEBHOOK_SIGNING_SECRET";
    const secret = process.env[secretEnv]?.trim();
    if (secret) {
      const expected = createHash("sha256")
        .update(`${secret}:${opts.rawBody ?? JSON.stringify(opts.patch ?? {})}`)
        .digest("hex");
      const provided = opts.signature ?? "";
      try {
        verified =
          provided.length === expected.length &&
          timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
      } catch {
        verified = false;
      }
      if (!verified) {
        return { ok: false, error: "Invalid webhook signature", code: "invalid_signature" };
      }
    } else {
      // Mock path: accept without secret, mark unverified-live but mock-ok
      verified = false;
    }
  }

  const recorded = recordWebhook({
    id: `wh_${nanoid(10)}`,
    businessId: opts.businessId,
    provider: opts.provider,
    eventType: opts.eventType,
    idempotencyKey: opts.idempotencyKey,
    payload: {
      externalId: opts.externalId,
      patch: opts.patch,
      comment: opts.comment,
    },
    verified: verified || def.kind !== "automation",
  });

  if (recorded.duplicate) {
    return {
      ok: true,
      data: {
        receiptId: recorded.receipt.id,
        duplicate: true,
      },
      mode: "mock",
    };
  }

  let item: ExternalWorkItem | undefined;
  if (opts.externalId) {
    item = findByExternalId(opts.businessId, opts.provider, opts.externalId);
    if (item && opts.patch) {
      const nextStatus = opts.patch.status;
      const conflict =
        item.syncStatus === "conflict" ||
        (item.status && nextStatus && item.status !== nextStatus && item.raw?.localEdit === true);
      item = {
        ...item,
        ...opts.patch,
        updatedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: conflict ? "conflict" : "synced",
      };
      upsertWorkItem(item);
    }
    if (item && opts.comment) {
      const comment: ExternalWorkComment = {
        id: `cmt_${nanoid(8)}`,
        body: opts.comment,
        createdAt: new Date().toISOString(),
      };
      item = {
        ...item,
        comments: [...(item.comments ?? []), comment],
        updatedAt: new Date().toISOString(),
      };
      upsertWorkItem(item);
    }
  }

  const activity =
    item && (opts.patch?.status || opts.comment)
      ? {
          kind: opts.comment ? "comment" : "status_change",
          message: opts.comment ?? `Status → ${opts.patch?.status}`,
          authorized: true as const,
        }
      : undefined;

  return {
    ok: true,
    data: {
      receiptId: recorded.receipt.id,
      duplicate: false,
      item,
      activity,
    },
    mode: "mock",
  };
}

export function resolveWorkItemConflict(opts: {
  businessId: string;
  workItemId: string;
  strategy: "prefer_provider" | "prefer_local" | "merge";
  providerStatus?: string;
  localStatus?: string;
}): WorkAdapterResult<ExternalWorkItem> {
  const item = getWorkItem(opts.workItemId);
  if (!item || item.businessId !== opts.businessId) {
    return { ok: false, error: "Work item not found", code: "not_found" };
  }
  const blocked = requireCapability(item.provider, "conflict_handling");
  if (blocked) return blocked;

  let status = item.status;
  if (opts.strategy === "prefer_provider") status = opts.providerStatus ?? item.status;
  else if (opts.strategy === "prefer_local") status = opts.localStatus ?? item.status;
  else status = opts.providerStatus ?? opts.localStatus ?? item.status;

  const updated: ExternalWorkItem = {
    ...item,
    status,
    syncStatus: "synced",
    lastError: undefined,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    raw: { ...item.raw, conflictResolved: opts.strategy },
  };
  upsertWorkItem(updated);
  appendAudit({
    businessId: opts.businessId,
    provider: item.provider,
    action: "conflict_resolved",
    detail: { strategy: opts.strategy, workItemId: item.id },
  });
  return { ok: true, data: updated, mode: "mock" };
}

export function retryWorkItemSync(opts: {
  businessId: string;
  workItemId: string;
}): WorkAdapterResult<ExternalWorkItem> {
  const item = getWorkItem(opts.workItemId);
  if (!item || item.businessId !== opts.businessId) {
    return { ok: false, error: "Work item not found", code: "not_found" };
  }
  const blocked = requireCapability(item.provider, "retries");
  if (blocked) return blocked;

  const updated: ExternalWorkItem = {
    ...item,
    retryCount: (item.retryCount ?? 0) + 1,
    syncStatus: "pushed",
    lastError: undefined,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertWorkItem(updated);
  enqueueOutboxSync(
    "connector.work_item.retry",
    createGovernedEvent({
      name: "connector.work_item.retry",
      businessId: opts.businessId,
      aggregateType: "external_work_item",
      aggregateId: updated.id,
      correlationId: updated.correlationId ?? updated.id,
      payload: { retryCount: updated.retryCount, provider: updated.provider },
    })
  );
  return { ok: true, data: updated, mode: "mock" };
}

export function postCollabApproval(opts: {
  businessId: string;
  provider: "slack" | "microsoft_teams";
  text: string;
  deepLink?: string;
}): WorkAdapterResult<{ id: string; status: "pending" }> {
  const def = getProductivityProvider(opts.provider);
  if (!def?.capabilities.includes("approvals")) {
    return { ok: false, error: "Approvals not supported", code: "unsupported" };
  }
  if (!isConnected(opts.businessId, opts.provider)) {
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
  }
  const row = recordCollabInteraction({
    id: `apr_${nanoid(8)}`,
    businessId: opts.businessId,
    provider: opts.provider,
    kind: "approval",
    text: opts.text,
    deepLink: opts.deepLink,
    status: "pending",
  });
  return { ok: true, data: { id: row.id, status: "pending" }, mode: "mock" };
}

export function postCollabInteractiveAction(opts: {
  businessId: string;
  provider: "slack" | "microsoft_teams";
  actionId: string;
  text: string;
  deepLink?: string;
}): WorkAdapterResult<{ id: string; actionId: string }> {
  const def = getProductivityProvider(opts.provider);
  if (!def?.capabilities.includes("interactive_actions")) {
    return { ok: false, error: "Interactive actions not supported", code: "unsupported" };
  }
  const row = recordCollabInteraction({
    id: `act_${nanoid(8)}`,
    businessId: opts.businessId,
    provider: opts.provider,
    kind: "interactive_action",
    text: `${opts.actionId}: ${opts.text}`,
    deepLink: opts.deepLink,
    status: "acknowledged",
  });
  return { ok: true, data: { id: row.id, actionId: opts.actionId }, mode: "mock" };
}

export function postCollabHandoff(opts: {
  businessId: string;
  provider: "slack" | "microsoft_teams";
  text: string;
  deepLink?: string;
}): WorkAdapterResult<{ id: string }> {
  const def = getProductivityProvider(opts.provider);
  if (!def?.capabilities.includes("human_handoff")) {
    return { ok: false, error: "Human handoff not supported", code: "unsupported" };
  }
  const row = recordCollabInteraction({
    id: `hof_${nanoid(8)}`,
    businessId: opts.businessId,
    provider: opts.provider,
    kind: "handoff",
    text: opts.text,
    deepLink: opts.deepLink,
    status: "delivered",
  });
  return { ok: true, data: { id: row.id }, mode: "mock" };
}

export function runAutomationAction(opts: {
  businessId: string;
  provider: "zapier" | "make" | "n8n";
  action: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}): WorkAdapterResult<{ runId: string; action: string }> {
  const def = getProductivityProvider(opts.provider);
  if (!def || def.kind !== "automation") {
    return { ok: false, error: "Not an automation provider", code: "unsupported" };
  }
  if (!def.capabilities.includes("actions")) {
    return { ok: false, error: "Actions not supported", code: "unsupported" };
  }
  if (opts.idempotencyKey) {
    const existing = listWebhookReceipts(opts.businessId).find(
      (w) => w.idempotencyKey === opts.idempotencyKey && w.provider === opts.provider
    );
    if (existing) {
      return {
        ok: true,
        data: { runId: existing.id, action: opts.action },
        mode: "mock",
      };
    }
  }
  if (!isConnected(opts.businessId, opts.provider)) {
    connectProvider({ provider: opts.provider, businessId: opts.businessId, mode: "mock" });
  }
  const runId = `run_${nanoid(10)}`;
  recordWebhook({
    id: runId,
    businessId: opts.businessId,
    provider: opts.provider,
    eventType: `action:${opts.action}`,
    idempotencyKey: opts.idempotencyKey,
    payload: opts.payload ?? {},
    verified: true,
  });
  return { ok: true, data: { runId, action: opts.action }, mode: "mock" };
}

export function getOpsSnapshotExtras(businessId: string) {
  return {
    audit: listAudit(businessId, 30),
    webhooks: listWebhookReceipts(businessId).slice(-20).reverse(),
    collab: listCollabInteractions(businessId).slice(-20).reverse(),
  };
}
