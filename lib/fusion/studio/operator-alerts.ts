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
  lastError?: string;
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

  return {
    id: row.id,
    topic: row.topic,
    kind,
    title,
    detail,
    href,
    occurredAt: row.envelope.occurredAt,
    lastError: row.lastError,
  };
}

export async function listDecisionQueueItems(opts: {
  businessId: string;
  limit?: number;
}): Promise<DecisionQueueItem[]> {
  const dead = await listDeadLetters({
    businessId: opts.businessId,
    limit: opts.limit ?? 20,
  });
  return dead.map(decisionItemFromOutbox);
}

export function countOperatorFailures(items: DecisionQueueItem[]): number {
  return items.filter((i) => i.kind !== "outbox_dead_letter").length;
}

export function countOutboxOnlyFailures(items: DecisionQueueItem[]): number {
  return items.filter((i) => i.kind === "outbox_dead_letter").length;
}
