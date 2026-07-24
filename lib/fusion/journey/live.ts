/**
 * TapFlow live visitor executor — ONE engine with dry-run/simulate.
 * Persists JourneyExecution instances against immutable JourneyPublishedVersion
 * snapshots. Side effects go through Channel Guardian → outbox → mock/live providers.
 */

import type { JourneyExecutionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { isAddressSuppressed } from "@/lib/fusion/comms/suppression";
import type { MessageChannel } from "@/lib/fusion/comms/channel-guardian";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import { labelEvidence, type EvidenceClass } from "@/lib/fusion/insights/tapproof";
import type { JourneyDefinition, JourneyNode } from "./types";
import {
  executeJourneyDryRun,
  type DryRunEvent,
  type VisitorContext,
} from "./runtime";
import { type JourneyRunRecord, type JourneyRunStatus, listJourneyRuns } from "./runs";
import { precheckTapFlowEffect } from "./effect-guardian";
import { drainTapFlowEffect } from "./effect-providers";
import {
  cloneImmutableDefinition,
  getLatestPublishedVersion,
  snapshotJourneyPublishedVersion,
  type PublishedVersionRecord,
} from "./published-version";

export type LiveExecutionStatus =
  | "RUNNING"
  | "WAITING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED"
  | "HANDOFF";

export type LiveExecutionRecord = {
  id: string;
  businessId: string;
  journeyId: string;
  journeyName: string;
  publishedVersionId: string;
  publishedVersion: number;
  idempotencyKey: string;
  status: LiveExecutionStatus;
  currentNodeId: string | null;
  visitorHash: string;
  sessionId: string | null;
  contactId: string | null;
  relationshipId: string | null;
  campaignId: string | null;
  deviceSlotId: string | null;
  path: string[];
  visitor: VisitorContext;
  waitUntil: string | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  steps: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    action: string;
    status: string;
    detail?: string;
    attempt: number;
    effectRef?: string;
    occurredAt: string;
  }>;
  startedAt: string;
  completedAt: string | null;
  pausedAt: string | null;
  cancelledAt: string | null;
  dryRun: false;
  duplicated?: boolean;
};

export type LiveExecutionControlResult =
  | { ok: true; execution: LiveExecutionRecord }
  | { ok: false; code: string; message: string };

const liveRuns: JourneyRunRecord[] = [];
const memoryExecutions = new Map<string, LiveExecutionRecord>();
const memoryProviderEvents = new Map<string, { id: string; duplicated: boolean }>();
const memoryVersions = new Map<string, PublishedVersionRecord & { immutable: true }>();

/** Unit tests set TAPFLOW_LIVE_MEMORY=1 to avoid Prisma FK against fake business ids. */
function isMemoryLiveStore(): boolean {
  if (process.env.TAPFLOW_LIVE_MEMORY === "1") return true;
  return !isIsolatedFusionDatabaseConfigured();
}

export function resetLiveJourneyRunsMemory() {
  liveRuns.length = 0;
  memoryExecutions.clear();
  memoryProviderEvents.clear();
  memoryVersions.clear();
}

export function listLiveJourneyRuns(businessId: string, limit = 30): JourneyRunRecord[] {
  return liveRuns.filter((r) => r.businessId === businessId).slice(0, limit);
}

export function listAllLiveJourneyRunRecords(limit = 200): JourneyRunRecord[] {
  return liveRuns.slice(0, limit);
}

function newId(prefix = "lex"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseDefinition(raw: unknown): JourneyDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as JourneyDefinition;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null;
  return d;
}

function toRunStatus(status: LiveExecutionStatus): JourneyRunStatus {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "BLOCKED":
      return "blocked";
    case "FAILED":
    case "CANCELLED":
      return "failed";
    default:
      return "partial";
  }
}

function mirrorRun(exec: LiveExecutionRecord): JourneyRunRecord {
  const run: JourneyRunRecord = {
    id: exec.id,
    businessId: exec.businessId,
    journeyId: exec.journeyId,
    journeyName: exec.journeyName,
    status: toRunStatus(exec.status),
    path: exec.path,
    issues: exec.lastError ? [exec.lastError] : [],
    visitor: exec.visitor,
    createdAt: exec.startedAt,
    dryRun: false,
  };
  const idx = liveRuns.findIndex((r) => r.id === run.id);
  if (idx >= 0) liveRuns[idx] = run;
  else liveRuns.unshift(run);
  return run;
}

function outgoing(def: JourneyDefinition, nodeId: string) {
  return def.edges.filter((e) => e.from === nodeId);
}

function pickNext(
  def: JourneyDefinition,
  node: JourneyNode,
  visitor: VisitorContext
): string | undefined {
  const edges = outgoing(def, node.id);
  if (visitor.preferBranch) {
    const preferred = edges.find(
      (e) => e.label === visitor.preferBranch || e.condition === visitor.preferBranch
    );
    if (preferred) return preferred.to;
  }
  if (node.type !== "condition" && node.type !== "branch") return edges[0]?.to;

  const attr = String(node.config.expression ?? node.config.attribute ?? "consent.marketing");
  const expect = node.config.equals ?? true;
  let actual: unknown = false;
  if (attr === "consent.email" || attr === "consentEmail") actual = Boolean(visitor.consent?.email);
  else if (attr === "consent.marketing" || attr === "consentMarketing")
    actual = Boolean(visitor.consent?.marketing);
  else if (attr === "consent.sms") actual = Boolean(visitor.consent?.sms);
  else if (attr === "loyalty.enrolled") actual = Boolean(visitor.loyalty?.enrolled);
  else if (attr === "loyalty.points_gte") {
    const threshold = Number(node.config.threshold ?? 0);
    actual = (visitor.loyalty?.points ?? 0) >= threshold;
  } else if (attr.startsWith("loyalty.")) {
    actual = (visitor.loyalty as Record<string, unknown> | undefined)?.[attr.slice(8)];
  } else actual = visitor.attributes?.[attr];

  const match = edges.find((e) => {
    const cond = (e.condition ?? e.label ?? "").toLowerCase();
    if (!cond) return false;
    return (cond === "true" || cond === "yes") === (actual === expect);
  });
  return (
    match?.to ??
    edges.find((e) => {
      const cond = (e.condition ?? e.label ?? "").toLowerCase();
      return cond === "false" || cond === "no";
    })?.to ??
    edges[0]?.to
  );
}

function describeLiveAction(node: JourneyNode, visitor: VisitorContext): DryRunEvent {
  switch (node.type) {
    case "trigger":
    case "entry_tap":
      return { nodeId: node.id, type: node.type, label: node.label, action: "enter" };
    case "wait":
    case "delay":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "wait",
        detail: `delayMs=${String(node.config.delayMs ?? node.config.ms ?? 0)}`,
      };
    case "message":
      if (node.config.requireMarketingConsent && !visitor.consent?.marketing) {
        return {
          nodeId: node.id,
          type: node.type,
          label: node.label,
          action: "message",
          blocked: true,
          detail: "Channel Guardian: marketing consent required",
        };
      }
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "message",
        detail: String(node.config.channel ?? "email"),
      };
    case "email": {
      const guardianOk = Boolean(visitor.consent?.email || visitor.consent?.marketing);
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "email",
        blocked: !guardianOk,
        detail: guardianOk
          ? String(node.config.subject ?? "Journey email")
          : "Channel Guardian: email/marketing consent required",
      };
    }
    case "award_loyalty":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "award_loyalty",
        detail: `points=${String(node.config.points ?? 0)}`,
      };
    case "create_case":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "create_case",
        detail: String(node.config.subject ?? "TapCase"),
      };
    case "human_handoff":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: "human_handoff",
        detail: "queued for human",
      };
    case "page_view":
    case "form_submit":
    case "offer_redeem":
      return {
        nodeId: node.id,
        type: node.type,
        label: node.label,
        action: node.type,
        detail: String(node.config.campaignId ?? node.config.cardId ?? node.label),
      };
    case "exit":
      return { nodeId: node.id, type: node.type, label: node.label, action: "exit" };
    default:
      return { nodeId: node.id, type: node.type, label: node.label, action: "step" };
  }
}

async function enqueueNodeEffects(input: {
  businessId: string;
  journeyId: string;
  journeyName: string;
  runId: string;
  visitorId: string;
  visitor: VisitorContext;
  events: DryRunEvent[];
  actorId?: string;
  contactId?: string | null;
  relationshipId?: string | null;
}): Promise<Array<{ nodeId: string; effectRef?: string; topic?: string }>> {
  const refs: Array<{ nodeId: string; effectRef?: string; topic?: string }> = [];
  for (const ev of input.events) {
    if (ev.blocked) continue;
    if (
      ev.action !== "award_loyalty" &&
      ev.action !== "email" &&
      ev.action !== "message" &&
      ev.action !== "create_case" &&
      ev.action !== "human_handoff"
    ) {
      continue;
    }
    const channel = ev.action === "message" ? ev.detail : undefined;
    let suppressed = false;
    if (ev.action === "email" || ev.action === "message") {
      const address =
        typeof input.visitor.attributes?.email === "string"
          ? input.visitor.attributes.email
          : input.visitorId;
      const msgChannel: MessageChannel =
        ev.action === "email"
          ? "email"
          : channel === "whatsapp"
            ? "whatsapp"
            : channel === "messenger"
              ? "messenger"
              : "sms";
      suppressed = await isAddressSuppressed({
        businessId: input.businessId,
        channel: msgChannel,
        address,
      }).catch(() => false);
    }
    const precheck = precheckTapFlowEffect({
      action: ev.action,
      visitor: input.visitor,
      channel,
      requireMarketingConsent: ev.detail?.includes("marketing consent"),
      recipientId: input.visitorId,
      suppressed,
    });
    if (!precheck.queue) {
      refs.push({ nodeId: ev.nodeId, topic: "guardian_blocked" });
      continue;
    }
    const topic = precheck.topic ?? `tapflow.effect.${ev.action}`;
    const envelope = createGovernedEvent({
      name: topic,
      businessId: input.businessId,
      aggregateType: "JourneyExecution",
      aggregateId: input.runId,
      correlationId: input.runId,
      payload: {
        journeyName: input.journeyName,
        runId: input.runId,
        visitorId: input.visitorId,
        nodeId: ev.nodeId,
        type: ev.type,
        detail: ev.detail,
        actorId: input.actorId ?? "system:tapflow",
        guardian: precheck.guardian?.code ?? "ok",
        contactId: input.contactId ?? undefined,
        relationshipId: input.relationshipId ?? undefined,
      },
    });
    const outbox = enqueueOutboxSync(topic, envelope);

    // Drain mock effects immediately for local owner-ready proof (sandbox providers).
    const drain = await drainTapFlowEffect(outbox).catch(() => null);

    let effectRef = drain?.providerRef;

    if (ev.action === "create_case" || ev.action === "human_handoff") {
      if (!isMemoryLiveStore() && isIsolatedFusionDatabaseConfigured()) {
        try {
          const tapCase = await prisma.tapCase.create({
            data: {
              businessId: input.businessId,
              contactId: input.contactId ?? undefined,
              relationshipId: input.relationshipId ?? undefined,
              subject:
                ev.action === "human_handoff"
                  ? `TapFlow handoff · ${input.journeyName}`
                  : String(ev.detail ?? "TapCase"),
              status: "OPEN",
              priority: ev.action === "human_handoff" ? 1 : 3,
              metadata: {
                source: "tapflow",
                executionId: input.runId,
                nodeId: ev.nodeId,
                action: ev.action,
              } as Prisma.InputJsonValue,
            },
          });
          effectRef = tapCase.id;
        } catch {
          /* optional */
        }
      }
      const ewi = createExternalWorkItem({
        businessId: input.businessId,
        provider: "asana",
        title:
          ev.action === "human_handoff"
            ? `Human handoff: ${input.journeyName}`
            : `TapCase: ${String(ev.detail ?? "Follow-up")}`,
        description: `TapFlow execution ${input.runId} · node ${ev.nodeId}`,
        sourceType: ev.action === "human_handoff" ? "inbox_followup" : "tapcase",
        sourceId: input.runId,
        correlationId: input.runId,
        idempotencyKey: `tapflow:${input.runId}:${ev.nodeId}:${ev.action}`,
        deepLinkBack: `/dashboard/experiences/journeys?execution=${input.runId}`,
      });
      if (ewi.ok) effectRef = effectRef ?? ewi.data.id;
    }

    refs.push({ nodeId: ev.nodeId, effectRef, topic });
  }
  return refs;
}

async function writeTapProofAttribution(input: {
  businessId: string;
  executionId: string;
  journeyId: string;
  campaignId?: string | null;
  status: LiveExecutionStatus;
  path: string[];
}) {
  const evidenceClass: EvidenceClass =
    input.status === "COMPLETED" ? "confirmed" : input.status === "FAILED" ? "incomplete" : "derived";
  const envelope = createGovernedEvent({
    name: "insights.attribution.tapflow",
    businessId: input.businessId,
    aggregateType: "JourneyExecution",
    aggregateId: input.executionId,
    correlationId: input.executionId,
    payload: {
      claim: `TapFlow execution ${input.status}`,
      evidenceClass,
      evidenceLabel: labelEvidence(evidenceClass),
      journeyId: input.journeyId,
      campaignId: input.campaignId ?? undefined,
      pathLength: input.path.length,
      confidence: evidenceClass === "confirmed" ? 0.9 : 0.5,
    },
  });
  await enqueueOutboxSync("insights.attribution.tapflow", envelope);

  if (!isMemoryLiveStore() && isIsolatedFusionDatabaseConfigured()) {
    try {
      await prisma.platformAuditEvent.create({
        data: {
          businessId: input.businessId,
          actorType: "SYSTEM",
          actorId: "system:tapflow",
          action: "tapflow.attribution",
          resourceType: "JourneyExecution",
          resourceId: input.executionId,
          correlationId: input.executionId,
          metadata: {
            evidenceClass,
            journeyId: input.journeyId,
            campaignId: input.campaignId ?? null,
            status: input.status,
            path: input.path,
          } as Prisma.InputJsonValue,
        },
      });
    } catch {
      /* optional */
    }
  }
}

async function persistAudit(input: {
  businessId: string;
  action: string;
  resourceId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  actorId?: string;
}) {
  if (isMemoryLiveStore() || !isIsolatedFusionDatabaseConfigured()) return;
  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId: input.businessId,
        actorType: "SYSTEM",
        actorId: input.actorId ?? "system:tapflow",
        action: input.action,
        resourceType: "JourneyExecution",
        resourceId: input.resourceId,
        correlationId: input.correlationId,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* optional */
  }
}

function mapPrismaExecution(
  row: {
    id: string;
    businessId: string;
    journeyId: string;
    publishedVersionId: string;
    idempotencyKey: string;
    status: JourneyExecutionStatus;
    currentNodeId: string | null;
    visitorHash: string;
    sessionId: string | null;
    contactId: string | null;
    relationshipId: string | null;
    campaignId: string | null;
    deviceSlotId: string | null;
    path: unknown;
    visitorContext: unknown;
    waitUntil: Date | null;
    retryCount: number;
    maxRetries: number;
    lastError: string | null;
    startedAt: Date;
    completedAt: Date | null;
    pausedAt: Date | null;
    cancelledAt: Date | null;
    publishedVersion?: { version: number; name: string };
    steps?: Array<{
      id: string;
      nodeId: string;
      nodeType: string;
      action: string;
      status: string;
      detail: string | null;
      attempt: number;
      effectRef: string | null;
      occurredAt: Date;
    }>;
  },
  duplicated = false
): LiveExecutionRecord {
  const path = Array.isArray(row.path) ? (row.path as string[]) : [];
  const visitor = (row.visitorContext ?? {}) as VisitorContext;
  return {
    id: row.id,
    businessId: row.businessId,
    journeyId: row.journeyId,
    journeyName: row.publishedVersion?.name ?? "Journey",
    publishedVersionId: row.publishedVersionId,
    publishedVersion: row.publishedVersion?.version ?? 0,
    idempotencyKey: row.idempotencyKey,
    status: row.status as LiveExecutionStatus,
    currentNodeId: row.currentNodeId,
    visitorHash: row.visitorHash,
    sessionId: row.sessionId,
    contactId: row.contactId,
    relationshipId: row.relationshipId,
    campaignId: row.campaignId,
    deviceSlotId: row.deviceSlotId,
    path,
    visitor,
    waitUntil: row.waitUntil?.toISOString() ?? null,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    lastError: row.lastError,
    steps: (row.steps ?? []).map((s) => ({
      id: s.id,
      nodeId: s.nodeId,
      nodeType: s.nodeType,
      action: s.action,
      status: s.status,
      detail: s.detail ?? undefined,
      attempt: s.attempt,
      effectRef: s.effectRef ?? undefined,
      occurredAt: s.occurredAt.toISOString(),
    })),
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    pausedAt: row.pausedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    dryRun: false,
    duplicated,
  };
}

async function loadActiveJourneyBundles(
  businessId: string
): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    published: PublishedVersionRecord;
  }>
> {
  if (isMemoryLiveStore()) {
    return [...memoryVersions.values()]
      .filter((v) => v.businessId === businessId)
      .map((v) => ({
        id: v.journeyId,
        name: v.name,
        status: "ACTIVE",
        published: v,
      }));
  }

  if (!isIsolatedFusionDatabaseConfigured()) {
    return [];
  }

  const rows = await prisma.journeyDraft.findMany({
    where: { businessId, status: "ACTIVE" },
    take: 10,
    orderBy: { activatedAt: "desc" },
  });

  const bundles: Array<{
    id: string;
    name: string;
    status: string;
    published: PublishedVersionRecord;
  }> = [];

  for (const row of rows) {
    let published = await getLatestPublishedVersion(businessId, row.id);
    if (!published) {
      const definition = parseDefinition(row.definition);
      if (!definition) continue;
      published = await snapshotJourneyPublishedVersion({
        businessId,
        journeyId: row.id,
        name: row.name,
        definition,
        activate: true,
      });
      if (!published) continue;
    }
    bundles.push({
      id: row.id,
      name: row.name,
      status: row.status,
      published,
    });
  }
  return bundles;
}

/**
 * Walk from current node (or start) until wait / block / exit / handoff / fail.
 * Uses the execution's immutable definition snapshot — never the live draft.
 */
async function advanceExecutionGraph(
  exec: LiveExecutionRecord,
  definition: JourneyDefinition,
  opts: { fromNodeId?: string | null; maxSteps?: number } = {}
): Promise<LiveExecutionRecord> {
  if (exec.status === "PAUSED" || exec.status === "CANCELLED" || exec.status === "COMPLETED") {
    return exec;
  }

  const maxSteps = opts.maxSteps ?? 40;
  let current: string | undefined =
    opts.fromNodeId ??
    exec.currentNodeId ??
    definition.nodes.find((n) => n.type === "trigger" || n.type === "entry_tap")?.id ??
    definition.nodes[0]?.id;

  const path = [...exec.path];
  const newEvents: DryRunEvent[] = [];
  let status: LiveExecutionStatus = "RUNNING";
  let waitUntil: string | null = null;
  let lastError: string | null = exec.lastError;
  let retryCount = exec.retryCount;
  const steps = [...exec.steps];

  let stepsTaken = 0;
  while (current && stepsTaken < maxSteps) {
    stepsTaken += 1;
    if (path.includes(current) && path[path.length - 1] !== current) {
      // allow re-entry only when advancing from wait on same node once
    }
    if (path.filter((p) => p === current).length > 2) {
      status = "FAILED";
      lastError = `Cycle detected at ${current}`;
      break;
    }

    const node = definition.nodes.find((n) => n.id === current);
    if (!node) {
      status = "FAILED";
      lastError = `Missing node ${current}`;
      break;
    }

    if (!path.includes(current) || path[path.length - 1] !== current) {
      path.push(current);
    }

    const step = describeLiveAction(node, exec.visitor);
    newEvents.push(step);

    if (step.blocked) {
      status = "BLOCKED";
      lastError = step.detail ?? "blocked";
      steps.push({
        id: newId("step"),
        nodeId: node.id,
        nodeType: node.type,
        action: step.action,
        status: "BLOCKED",
        detail: step.detail,
        attempt: retryCount + 1,
        occurredAt: new Date().toISOString(),
      });
      break;
    }

    if (step.action === "wait") {
      const delayMs = Number(node.config.delayMs ?? node.config.ms ?? 0);
      const until = new Date(Date.now() + Math.max(0, delayMs));
      waitUntil = until.toISOString();
      status = delayMs <= 0 ? "RUNNING" : "WAITING";
      steps.push({
        id: newId("step"),
        nodeId: node.id,
        nodeType: node.type,
        action: "wait",
        status: delayMs <= 0 ? "SUCCEEDED" : "WAITING",
        detail: step.detail,
        attempt: 1,
        occurredAt: new Date().toISOString(),
      });
      if (delayMs > 0) {
        exec.currentNodeId = current;
        break;
      }
      // zero delay — continue immediately past wait
      current = pickNext(definition, node, exec.visitor);
      continue;
    }

    if (step.action === "human_handoff") {
      status = "HANDOFF";
      steps.push({
        id: newId("step"),
        nodeId: node.id,
        nodeType: node.type,
        action: step.action,
        status: "SUCCEEDED",
        detail: step.detail,
        attempt: 1,
        occurredAt: new Date().toISOString(),
      });
      break;
    }

    if (step.action === "exit") {
      status = "COMPLETED";
      steps.push({
        id: newId("step"),
        nodeId: node.id,
        nodeType: node.type,
        action: "exit",
        status: "SUCCEEDED",
        attempt: 1,
        occurredAt: new Date().toISOString(),
      });
      break;
    }

    // Simulate flaky node failure + safe retry when config.forceFailOnce
    if (node.config.forceFail && retryCount < exec.maxRetries) {
      retryCount += 1;
      status = "FAILED";
      lastError = `Node ${node.id} failed (attempt ${retryCount})`;
      steps.push({
        id: newId("step"),
        nodeId: node.id,
        nodeType: node.type,
        action: step.action,
        status: "RETRYING",
        detail: lastError,
        attempt: retryCount,
        occurredAt: new Date().toISOString(),
      });
      // stay on current node for resume/retry
      break;
    }

    steps.push({
      id: newId("step"),
      nodeId: node.id,
      nodeType: node.type,
      action: step.action,
      status: "SUCCEEDED",
      detail: step.detail,
      attempt: 1,
      occurredAt: new Date().toISOString(),
    });

    current = pickNext(definition, node, exec.visitor);
    if (!current && status === "RUNNING") {
      status = "FAILED";
      lastError = "No outgoing edge";
    }
  }

  const effectEvents = newEvents.filter((e) => !e.blocked && e.action !== "wait" && e.action !== "enter");
  const effectRefs = await enqueueNodeEffects({
    businessId: exec.businessId,
    journeyId: exec.journeyId,
    journeyName: exec.journeyName,
    runId: exec.id,
    visitorId: exec.visitorHash,
    visitor: exec.visitor,
    events: effectEvents,
    contactId: exec.contactId,
    relationshipId: exec.relationshipId,
  });

  for (const ref of effectRefs) {
    const step = steps.find((s) => s.nodeId === ref.nodeId && !s.effectRef);
    if (step && ref.effectRef) step.effectRef = ref.effectRef;
  }

  const updated: LiveExecutionRecord = {
    ...exec,
    status,
    currentNodeId: current ?? exec.currentNodeId,
    path,
    waitUntil,
    retryCount,
    lastError,
    steps,
    completedAt:
      status === "COMPLETED" || status === "HANDOFF"
        ? new Date().toISOString()
        : exec.completedAt,
  };

  await writeTapProofAttribution({
    businessId: updated.businessId,
    executionId: updated.id,
    journeyId: updated.journeyId,
    campaignId: updated.campaignId,
    status: updated.status,
    path: updated.path,
  });

  return updated;
}

async function saveExecution(
  exec: LiveExecutionRecord,
  definition: JourneyDefinition
): Promise<LiveExecutionRecord> {
  memoryExecutions.set(exec.id, exec);
  mirrorRun(exec);

  if (isMemoryLiveStore() || !isIsolatedFusionDatabaseConfigured()) return exec;

  try {
    await prisma.journeyExecution.upsert({
      where: { id: exec.id },
      create: {
        id: exec.id,
        businessId: exec.businessId,
        journeyId: exec.journeyId,
        publishedVersionId: exec.publishedVersionId,
        idempotencyKey: exec.idempotencyKey,
        status: exec.status,
        currentNodeId: exec.currentNodeId,
        visitorHash: exec.visitorHash,
        sessionId: exec.sessionId,
        contactId: exec.contactId,
        relationshipId: exec.relationshipId,
        campaignId: exec.campaignId,
        deviceSlotId: exec.deviceSlotId,
        definitionSnapshot: cloneImmutableDefinition(definition) as unknown as Prisma.InputJsonValue,
        path: exec.path as unknown as Prisma.InputJsonValue,
        visitorContext: exec.visitor as unknown as Prisma.InputJsonValue,
        waitUntil: exec.waitUntil ? new Date(exec.waitUntil) : null,
        retryCount: exec.retryCount,
        maxRetries: exec.maxRetries,
        lastError: exec.lastError,
        startedAt: new Date(exec.startedAt),
        completedAt: exec.completedAt ? new Date(exec.completedAt) : null,
        pausedAt: exec.pausedAt ? new Date(exec.pausedAt) : null,
        cancelledAt: exec.cancelledAt ? new Date(exec.cancelledAt) : null,
        metadata: {} as Prisma.InputJsonValue,
      },
      update: {
        status: exec.status,
        currentNodeId: exec.currentNodeId,
        path: exec.path as unknown as Prisma.InputJsonValue,
        visitorContext: exec.visitor as unknown as Prisma.InputJsonValue,
        waitUntil: exec.waitUntil ? new Date(exec.waitUntil) : null,
        retryCount: exec.retryCount,
        lastError: exec.lastError,
        completedAt: exec.completedAt ? new Date(exec.completedAt) : null,
        pausedAt: exec.pausedAt ? new Date(exec.pausedAt) : null,
        cancelledAt: exec.cancelledAt ? new Date(exec.cancelledAt) : null,
        contactId: exec.contactId,
        relationshipId: exec.relationshipId,
      },
    });

    // Append only new steps (by id)
    const existing = await prisma.journeyExecutionStep.findMany({
      where: { executionId: exec.id },
      select: { id: true },
    });
    const have = new Set(existing.map((s) => s.id));
    for (const step of exec.steps) {
      if (have.has(step.id)) continue;
      await prisma.journeyExecutionStep.create({
        data: {
          id: step.id,
          executionId: exec.id,
          businessId: exec.businessId,
          nodeId: step.nodeId,
          nodeType: step.nodeType,
          action: step.action,
          status: step.status as never,
          detail: step.detail,
          attempt: step.attempt,
          effectRef: step.effectRef,
          occurredAt: new Date(step.occurredAt),
        },
      });
    }
  } catch (err) {
    console.error("saveExecution failed", err);
  }

  return exec;
}

export async function getLiveExecution(
  businessId: string,
  executionId: string
): Promise<LiveExecutionRecord | null> {
  const mem = memoryExecutions.get(executionId);
  if (mem && mem.businessId === businessId) return mem;

  if (isMemoryLiveStore() || !isIsolatedFusionDatabaseConfigured()) return null;
  const row = await prisma.journeyExecution.findFirst({
    where: { id: executionId, businessId },
    include: {
      publishedVersion: { select: { version: true, name: true } },
      steps: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!row) return null;
  const mapped = mapPrismaExecution(row);
  memoryExecutions.set(mapped.id, mapped);
  return mapped;
}

export async function listLiveExecutions(
  businessId: string,
  limit = 40
): Promise<LiveExecutionRecord[]> {
  if (isMemoryLiveStore() || !isIsolatedFusionDatabaseConfigured()) {
    return [...memoryExecutions.values()]
      .filter((e) => e.businessId === businessId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }
  const rows = await prisma.journeyExecution.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      publishedVersion: { select: { version: true, name: true } },
      steps: { orderBy: { occurredAt: "asc" } },
    },
  });
  return rows.map((r) => mapPrismaExecution(r));
}

export function buildLiveIdempotencyKey(input: {
  businessId: string;
  journeyId: string;
  publishedVersionId: string;
  visitorHash: string;
  sessionId: string;
  deviceSlotId?: string;
}): string {
  return [
    "tapflow",
    input.businessId,
    input.journeyId,
    input.publishedVersionId,
    input.visitorHash,
    input.sessionId,
    input.deviceSlotId ?? "none",
  ].join(":");
}

/**
 * Pure helper for tests — execute one definition as a live (non-dry) run record.
 */
export function executeLiveJourneyDefinition(input: {
  businessId: string;
  journeyId: string;
  journeyName: string;
  definition: JourneyDefinition;
  visitor: VisitorContext;
}): { run: JourneyRunRecord; result: ReturnType<typeof executeJourneyDryRun> } {
  const result = executeJourneyDryRun(input.definition, input.visitor, {
    requireValid: true,
  });
  const status: JourneyRunStatus = result.completed
    ? "completed"
    : result.blockedAt
      ? "blocked"
      : result.ok
        ? "partial"
        : "failed";
  const run: JourneyRunRecord = {
    id: newId("live"),
    businessId: input.businessId,
    journeyId: input.journeyId,
    journeyName: input.journeyName,
    status,
    path: result.path,
    issues: result.issues,
    visitor: result.visitor,
    createdAt: new Date().toISOString(),
    dryRun: false,
  };
  liveRuns.unshift(run);
  return { run, result };
}

/** Memory-only published version for unit tests without DB. */
export function registerMemoryPublishedVersion(input: {
  businessId: string;
  journeyId: string;
  name: string;
  definition: JourneyDefinition;
  version?: number;
}): PublishedVersionRecord {
  const rec: PublishedVersionRecord & { immutable: true } = {
    id: newId("jpv"),
    businessId: input.businessId,
    journeyId: input.journeyId,
    version: input.version ?? 1,
    name: input.name,
    definition: cloneImmutableDefinition(input.definition),
    publishedAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
    immutable: true,
  };
  memoryVersions.set(rec.id, rec);
  return rec;
}

/**
 * Start or resume a live visitor execution (idempotent on session key).
 */
export async function startOrResumeLiveExecution(input: {
  businessId: string;
  journeyId: string;
  journeyName: string;
  published: PublishedVersionRecord;
  visitor: VisitorContext;
  sessionId: string;
  deviceSlotId?: string;
  campaignId?: string;
  contactId?: string;
  relationshipId?: string;
  actorId?: string;
}): Promise<LiveExecutionRecord> {
  const visitorHash = input.visitor.visitorId ?? "anonymous";
  const idempotencyKey = buildLiveIdempotencyKey({
    businessId: input.businessId,
    journeyId: input.journeyId,
    publishedVersionId: input.published.id,
    visitorHash,
    sessionId: input.sessionId,
    deviceSlotId: input.deviceSlotId,
  });

  if (!isMemoryLiveStore() && isIsolatedFusionDatabaseConfigured()) {
    const existing = await prisma.journeyExecution.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId: input.businessId,
          idempotencyKey,
        },
      },
      include: {
        publishedVersion: { select: { version: true, name: true } },
        steps: { orderBy: { occurredAt: "asc" } },
      },
    });
    if (existing) {
      const mapped = mapPrismaExecution(existing, true);
      memoryExecutions.set(mapped.id, mapped);
      mirrorRun(mapped);
      return mapped;
    }
  } else {
    for (const e of memoryExecutions.values()) {
      if (e.businessId === input.businessId && e.idempotencyKey === idempotencyKey) {
        return { ...e, duplicated: true };
      }
    }
  }

  const base: LiveExecutionRecord = {
    id: newId("lex"),
    businessId: input.businessId,
    journeyId: input.journeyId,
    journeyName: input.journeyName,
    publishedVersionId: input.published.id,
    publishedVersion: input.published.version,
    idempotencyKey,
    status: "RUNNING",
    currentNodeId: null,
    visitorHash,
    sessionId: input.sessionId,
    contactId: input.contactId ?? null,
    relationshipId: input.relationshipId ?? null,
    campaignId: input.campaignId ?? null,
    deviceSlotId: input.deviceSlotId ?? null,
    path: [],
    visitor: input.visitor,
    waitUntil: null,
    retryCount: 0,
    maxRetries: 3,
    lastError: null,
    steps: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    pausedAt: null,
    cancelledAt: null,
    dryRun: false,
  };

  const advanced = await advanceExecutionGraph(base, input.published.definition);
  const saved = await saveExecution(advanced, input.published.definition);

  await persistAudit({
    businessId: input.businessId,
    action: "tapflow.live_run",
    resourceId: saved.id,
    correlationId: saved.id,
    actorId: input.actorId,
    metadata: {
      journeyId: input.journeyId,
      publishedVersionId: input.published.id,
      status: saved.status,
      path: saved.path,
      deviceSlotId: input.deviceSlotId,
      campaignId: input.campaignId,
      idempotencyKey,
      dryRun: false,
    },
  });

  await enqueueOutboxSync(
    "tapflow.execution.started",
    createGovernedEvent({
      name: "tapflow.execution.started",
      businessId: input.businessId,
      aggregateType: "JourneyExecution",
      aggregateId: saved.id,
      correlationId: saved.id,
      payload: {
        status: saved.status,
        journeyId: input.journeyId,
        publishedVersionId: input.published.id,
        visitorHash,
      },
    })
  );

  return saved;
}

/**
 * Execute all ACTIVE journeys for a business against a visitor context.
 * Safe to call from public tap path — failures are swallowed by caller.
 */
export async function executeActiveJourneysForVisitor(input: {
  businessId: string;
  visitor: VisitorContext;
  sessionId: string;
  deviceSlotId?: string;
  campaignId?: string;
  contactId?: string;
  relationshipId?: string;
  actorId?: string;
}): Promise<{
  ok: boolean;
  skipped?: string;
  runs: JourneyRunRecord[];
  executions: LiveExecutionRecord[];
}> {
  const overrides = toResolveOverrides(await listFeatureOverrides().catch(() => []));
  if (!isFeatureEnabled("journey.tapflow", { overrides })) {
    return { ok: false, skipped: "journey.tapflow_disabled", runs: [], executions: [] };
  }

  const active = await loadActiveJourneyBundles(input.businessId);
  if (active.length === 0) {
    return { ok: true, skipped: "no_active_journeys", runs: [], executions: [] };
  }

  const executions: LiveExecutionRecord[] = [];
  const runs: JourneyRunRecord[] = [];

  for (const journey of active) {
    // Journey-level PAUSED is filtered by ACTIVE status load; double-check.
    if (journey.status === "PAUSED") continue;

    const exec = await startOrResumeLiveExecution({
      businessId: input.businessId,
      journeyId: journey.id,
      journeyName: journey.name,
      published: journey.published,
      visitor: input.visitor,
      sessionId: input.sessionId,
      deviceSlotId: input.deviceSlotId,
      campaignId: input.campaignId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      actorId: input.actorId,
    });
    executions.push(exec);
    runs.push(mirrorRun(exec));
  }

  return { ok: true, runs, executions };
}

export async function pauseLiveExecution(
  businessId: string,
  executionId: string
): Promise<LiveExecutionControlResult> {
  const exec = await getLiveExecution(businessId, executionId);
  if (!exec) return { ok: false, code: "not_found", message: "Execution not found" };
  if (exec.businessId !== businessId) {
    return { ok: false, code: "tenant_isolation", message: "Cross-tenant access denied" };
  }
  if (exec.status === "COMPLETED" || exec.status === "CANCELLED") {
    return { ok: false, code: "terminal", message: `Cannot pause ${exec.status}` };
  }
  const updated: LiveExecutionRecord = {
    ...exec,
    status: "PAUSED",
    pausedAt: new Date().toISOString(),
  };
  const def =
    (await getPublishedVersionByIdSafe(businessId, exec.publishedVersionId))?.definition ??
    ({ schemaVersion: 1, name: exec.journeyName, nodes: [], edges: [] } as JourneyDefinition);
  await saveExecution(updated, def);
  await persistAudit({
    businessId,
    action: "tapflow.execution.pause",
    resourceId: executionId,
    correlationId: executionId,
    metadata: { previousStatus: exec.status },
  });
  return { ok: true, execution: updated };
}

export async function resumeLiveExecution(
  businessId: string,
  executionId: string,
  opts: { clearForceFail?: boolean; visitorPatch?: Partial<VisitorContext> } = {}
): Promise<LiveExecutionControlResult> {
  const exec = await getLiveExecution(businessId, executionId);
  if (!exec) return { ok: false, code: "not_found", message: "Execution not found" };
  if (exec.businessId !== businessId) {
    return { ok: false, code: "tenant_isolation", message: "Cross-tenant access denied" };
  }
  if (exec.status !== "PAUSED" && exec.status !== "FAILED" && exec.status !== "WAITING" && exec.status !== "BLOCKED") {
    return { ok: false, code: "invalid_state", message: `Cannot resume from ${exec.status}` };
  }

  const published = await getPublishedVersionByIdSafe(businessId, exec.publishedVersionId);
  if (!published) {
    return { ok: false, code: "version_missing", message: "Published version missing" };
  }

  let definition = cloneImmutableDefinition(published.definition);
  if (opts.clearForceFail) {
    definition = {
      ...definition,
      nodes: definition.nodes.map((n) => {
        if (!n.config.forceFail) return n;
        const { forceFail, ...rest } = n.config;
        void forceFail;
        return { ...n, config: rest };
      }),
    };
  }

  const visitor: VisitorContext = {
    ...exec.visitor,
    ...opts.visitorPatch,
    consent: { ...exec.visitor.consent, ...opts.visitorPatch?.consent },
    attributes: { ...exec.visitor.attributes, ...opts.visitorPatch?.attributes },
  };

  const base: LiveExecutionRecord = {
    ...exec,
    status: "RUNNING",
    pausedAt: null,
    visitor,
    lastError: null,
  };

  const advanced = await advanceExecutionGraph(base, definition, {
    fromNodeId: exec.currentNodeId,
  });
  await saveExecution(advanced, definition);
  await persistAudit({
    businessId,
    action: "tapflow.execution.resume",
    resourceId: executionId,
    correlationId: executionId,
    metadata: { fromNodeId: exec.currentNodeId, status: advanced.status },
  });
  return { ok: true, execution: advanced };
}

export async function cancelLiveExecution(
  businessId: string,
  executionId: string
): Promise<LiveExecutionControlResult> {
  const exec = await getLiveExecution(businessId, executionId);
  if (!exec) return { ok: false, code: "not_found", message: "Execution not found" };
  if (exec.businessId !== businessId) {
    return { ok: false, code: "tenant_isolation", message: "Cross-tenant access denied" };
  }
  if (exec.status === "COMPLETED" || exec.status === "CANCELLED") {
    return { ok: true, execution: exec };
  }
  const published = await getPublishedVersionByIdSafe(businessId, exec.publishedVersionId);
  const updated: LiveExecutionRecord = {
    ...exec,
    status: "CANCELLED",
    cancelledAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  await saveExecution(
    updated,
    published?.definition ?? {
      schemaVersion: 1,
      name: exec.journeyName,
      nodes: [],
      edges: [],
    }
  );
  await persistAudit({
    businessId,
    action: "tapflow.execution.cancel",
    resourceId: executionId,
    correlationId: executionId,
    metadata: { previousStatus: exec.status },
  });
  return { ok: true, execution: updated };
}

export async function advanceWaitingExecution(
  businessId: string,
  executionId: string,
  opts: { force?: boolean } = {}
): Promise<LiveExecutionControlResult> {
  const exec = await getLiveExecution(businessId, executionId);
  if (!exec) return { ok: false, code: "not_found", message: "Execution not found" };
  if (exec.status === "PAUSED") {
    return { ok: false, code: "paused", message: "Paused flows do not continue" };
  }
  if (exec.status === "CANCELLED") {
    return { ok: false, code: "cancelled", message: "Cancelled execution" };
  }
  if (exec.status !== "WAITING" && !opts.force) {
    return { ok: false, code: "not_waiting", message: `Status is ${exec.status}` };
  }
  if (exec.waitUntil && !opts.force && new Date(exec.waitUntil).getTime() > Date.now()) {
    return { ok: false, code: "timeout_pending", message: "Wait window not elapsed" };
  }

  const published = await getPublishedVersionByIdSafe(businessId, exec.publishedVersionId);
  if (!published) {
    return { ok: false, code: "version_missing", message: "Published version missing" };
  }

  const node = published.definition.nodes.find((n) => n.id === exec.currentNodeId);
  const next = node ? pickNext(published.definition, node, exec.visitor) : exec.currentNodeId;
  const base: LiveExecutionRecord = {
    ...exec,
    status: "RUNNING",
    waitUntil: null,
    currentNodeId: next ?? exec.currentNodeId,
  };
  const advanced = await advanceExecutionGraph(base, published.definition, {
    fromNodeId: next,
  });
  await saveExecution(advanced, published.definition);
  return { ok: true, execution: advanced };
}

export async function retryFailedNode(
  businessId: string,
  executionId: string
): Promise<LiveExecutionControlResult> {
  return resumeLiveExecution(businessId, executionId, { clearForceFail: true });
}

/**
 * Idempotent provider event intake — repeated keys return the same processed record.
 */
export async function ingestJourneyProviderEvent(input: {
  businessId: string;
  provider: string;
  eventKey: string;
  executionId?: string;
  payload?: Record<string, unknown>;
}): Promise<{ id: string; duplicated: boolean; execution?: LiveExecutionRecord }> {
  const memKey = `${input.businessId}:${input.provider}:${input.eventKey}`;

  if (!isMemoryLiveStore() && isIsolatedFusionDatabaseConfigured()) {
    try {
      const existing = await prisma.journeyProviderEvent.findUnique({
        where: {
          businessId_provider_eventKey: {
            businessId: input.businessId,
            provider: input.provider,
            eventKey: input.eventKey,
          },
        },
      });
      if (existing) {
        const execution = existing.executionId
          ? ((await getLiveExecution(input.businessId, existing.executionId)) ?? undefined)
          : undefined;
        return { id: existing.id, duplicated: true, execution };
      }

      const created = await prisma.journeyProviderEvent.create({
        data: {
          businessId: input.businessId,
          provider: input.provider,
          eventKey: input.eventKey,
          executionId: input.executionId,
          payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        },
      });

      let execution: LiveExecutionRecord | undefined;
      if (input.executionId) {
        const resume = await advanceWaitingExecution(input.businessId, input.executionId, {
          force: true,
        }).catch(() => null);
        if (resume?.ok) execution = resume.execution;
        else execution = (await getLiveExecution(input.businessId, input.executionId)) ?? undefined;
      }

      await persistAudit({
        businessId: input.businessId,
        action: "tapflow.provider_event",
        resourceId: created.id,
        correlationId: input.executionId ?? created.id,
        metadata: {
          provider: input.provider,
          eventKey: input.eventKey,
          duplicated: false,
        },
      });

      return { id: created.id, duplicated: false, execution };
    } catch (err) {
      // Unique race → treat as duplicate
      const again = await prisma.journeyProviderEvent.findUnique({
        where: {
          businessId_provider_eventKey: {
            businessId: input.businessId,
            provider: input.provider,
            eventKey: input.eventKey,
          },
        },
      });
      if (again) return { id: again.id, duplicated: true };
      throw err;
    }
  }

  const hit = memoryProviderEvents.get(memKey);
  if (hit) return { id: hit.id, duplicated: true };
  const id = newId("jpe");
  memoryProviderEvents.set(memKey, { id, duplicated: false });
  return { id, duplicated: false };
}

async function getPublishedVersionByIdSafe(
  businessId: string,
  id: string
): Promise<PublishedVersionRecord | null> {
  const mem = memoryVersions.get(id);
  if (mem && mem.businessId === businessId) {
    return { ...mem, definition: cloneImmutableDefinition(mem.definition) };
  }
  const { getPublishedVersionById } = await import("./published-version");
  return getPublishedVersionById(businessId, id);
}

/** Merge live + dry-run memory for analytics overlays */
export function listAllJourneyRuns(businessId: string, limit = 40): JourneyRunRecord[] {
  return [...listLiveJourneyRuns(businessId, limit), ...listJourneyRuns(businessId, limit)].slice(
    0,
    limit
  );
}

/**
 * Prove draft mutation does not alter an in-flight execution's snapshot.
 */
export function assertExecutionUsesSnapshot(
  exec: LiveExecutionRecord,
  draftDefinition: JourneyDefinition,
  snapshot: JourneyDefinition
): { ok: boolean; reason?: string } {
  if (JSON.stringify(snapshot) === JSON.stringify(draftDefinition)) {
    return { ok: true, reason: "draft_matches_snapshot" };
  }
  // Execution must keep using snapshot path length / nodes from published version
  const snapIds = new Set(snapshot.nodes.map((n) => n.id));
  for (const id of exec.path) {
    if (!snapIds.has(id)) {
      return { ok: false, reason: `path_node_${id}_not_in_snapshot` };
    }
  }
  return { ok: true };
}
