/**
 * Studio operator alerts — publish/assign failures enter the decision queue honestly.
 * Reuses FusionOutboxEvent FAILED status (shared outbox contract — no competing SoT).
 */

import {
  createGovernedEvent,
  enqueueOutbox,
  listDeadLetters,
  markOutboxFailed,
  type OutboxRecord,
} from "@/lib/fusion/publication/events";

export const OPERATOR_ALERT_TOPICS = [
  "studio.operator.assign_failed",
  "studio.operator.publish_failed",
  "studio.operator.save_failed",
] as const;

export type OperatorAlertKind =
  | "assign_failed"
  | "publish_failed"
  | "save_failed";

const TOPIC_BY_KIND: Record<OperatorAlertKind, (typeof OPERATOR_ALERT_TOPICS)[number]> = {
  assign_failed: "studio.operator.assign_failed",
  publish_failed: "studio.operator.publish_failed",
  save_failed: "studio.operator.save_failed",
};

export type RecordOperatorAlertInput = {
  businessId: string;
  kind: OperatorAlertKind;
  title: string;
  detail: string;
  href: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
};

export type DecisionQueueItem = {
  id: string;
  topic: string;
  kind: OperatorAlertKind | "outbox_dead_letter";
  title: string;
  detail: string;
  href: string;
  occurredAt: string;
  aggregateType: string;
  aggregateId: string;
  lastError?: string;
  /** Grouping */
  occurrenceCount?: number;
  groupKey?: string;
  /** Lifecycle for operator hygiene */
  bucket?: "active" | "resolved" | "stale" | "dismissed" | "test";
  nextActionLabel?: string;
};

function newCorrelation() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op_${Date.now().toString(36)}`;
}

export function isOperatorAlertTopic(topic: string): boolean {
  return (OPERATOR_ALERT_TOPICS as readonly string[]).includes(topic);
}

export function kindFromTopic(topic: string): OperatorAlertKind | "outbox_dead_letter" {
  if (topic === "studio.operator.assign_failed") return "assign_failed";
  if (topic === "studio.operator.publish_failed") return "publish_failed";
  if (topic === "studio.operator.save_failed") return "save_failed";
  return "outbox_dead_letter";
}

/**
 * Persist a FAILED outbox row so Home decision queue + notifications see it.
 */
export async function recordOperatorAlert(
  input: RecordOperatorAlertInput
): Promise<OutboxRecord> {
  const topic = TOPIC_BY_KIND[input.kind];
  const envelope = createGovernedEvent({
    name: topic,
    businessId: input.businessId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId ?? newCorrelation(),
    payload: {
      kind: input.kind,
      title: input.title,
      detail: input.detail,
      href: input.href,
    },
  });
  const record = await enqueueOutbox(topic, envelope);
  const failed = await markOutboxFailed(record.id, input.detail);
  return failed ?? { ...record, status: "FAILED", lastError: input.detail };
}

export function decisionItemFromOutbox(row: OutboxRecord): DecisionQueueItem {
  const payload = row.envelope.payload ?? {};
  const kind = kindFromTopic(row.topic);
  const title =
    typeof payload.title === "string"
      ? payload.title
      : kind === "outbox_dead_letter"
        ? `Delivery failed · ${row.topic}`
        : `Operator alert · ${kind}`;
  const detail =
    typeof payload.detail === "string"
      ? payload.detail
      : row.lastError ?? "No detail recorded";
  const href =
    typeof payload.href === "string"
      ? payload.href
      : kind === "outbox_dead_letter"
        ? "/dashboard/settings#outbox"
        : "/dashboard#decision-queue";

  const testGenerated =
    /seed|proof|e2e|test.?generated/i.test(title) ||
    /seed|proof|e2e|test.?generated/i.test(detail) ||
    row.envelope.aggregateId.startsWith("seed_");

  const nextActionLabel =
    kind === "assign_failed"
      ? "Open Tap Points"
      : kind === "publish_failed"
        ? "Open Experiences"
        : kind === "save_failed"
          ? "Retry save"
          : href.includes("settings")
            ? "Open recovery"
            : "Open related work";

  return {
    id: row.id,
    topic: row.topic,
    kind,
    title,
    detail,
    href,
    occurredAt: row.envelope.occurredAt,
    aggregateType: row.envelope.aggregateType,
    aggregateId: row.envelope.aggregateId,
    lastError: row.lastError,
    groupKey: `${row.envelope.aggregateType}:${row.envelope.aggregateId}:${kind}`,
    occurrenceCount: 1,
    bucket: testGenerated ? "test" : "active",
    nextActionLabel,
  };
}

export async function listDecisionQueueItems(opts: {
  businessId: string;
  limit?: number;
  /** Include test-generated artifacts (default false for PO walkthroughs) */
  includeTest?: boolean;
}): Promise<DecisionQueueItem[]> {
  const dead = await listDeadLetters({
    businessId: opts.businessId,
    limit: (opts.limit ?? 20) * 3,
  });
  const items = dead.map(decisionItemFromOutbox);
  return groupDecisionQueueItems(items, {
    includeTest: opts.includeTest === true,
    limit: opts.limit ?? 20,
  });
}

export function groupDecisionQueueItems(
  items: DecisionQueueItem[],
  opts?: { includeTest?: boolean; limit?: number }
): DecisionQueueItem[] {
  const includeTest = opts?.includeTest === true;
  const limit = opts?.limit ?? 20;
  const filtered = items.filter((i) => includeTest || i.bucket !== "test");
  const byKey = new Map<string, DecisionQueueItem>();
  for (const item of filtered) {
    const key = item.groupKey ?? item.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...item, occurrenceCount: item.occurrenceCount ?? 1 });
      continue;
    }
    const newer =
      new Date(item.occurredAt).getTime() > new Date(existing.occurredAt).getTime()
        ? item
        : existing;
    byKey.set(key, {
      ...newer,
      occurrenceCount: (existing.occurrenceCount ?? 1) + (item.occurrenceCount ?? 1),
      id: newer.id,
    });
  }
  return Array.from(byKey.values())
    .sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, limit);
}

export function countOperatorFailures(items: DecisionQueueItem[]): number {
  return items.filter((i) => i.kind !== "outbox_dead_letter").length;
}

export function countOutboxOnlyFailures(items: DecisionQueueItem[]): number {
  return items.filter((i) => i.kind === "outbox_dead_letter").length;
}
