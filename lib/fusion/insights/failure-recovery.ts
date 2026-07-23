/**
 * Failure / recovery analytics — evidence-labeled counts from in-memory outbox + journey runs.
 * No KPI theater: empty sources stay at zero with "incomplete" evidence class.
 */

import { listDeadLetters, type OutboxRecord } from "@/lib/fusion/publication/events";
import type { JourneyRunRecord } from "@/lib/fusion/journey/runs";
import { listAllJourneyRuns, listAllLiveJourneyRunRecords } from "@/lib/fusion/journey/live";
import { listAllJourneyRunRecords } from "@/lib/fusion/journey/runs";
import type { EvidenceClass } from "./tapproof";

export type FailureRecoveryMetric = {
  key: string;
  label: string;
  value: number;
  evidenceClass: EvidenceClass;
  source: string;
  hint?: string;
};

export type FailureRecoverySnapshot = {
  metrics: FailureRecoveryMetric[];
  empty: boolean;
  fetchedAt: string;
  scope: "business" | "platform";
  businessId?: string;
};

function mergeJourneyRuns(businessId?: string, limit = 200): JourneyRunRecord[] {
  const dry = listAllJourneyRunRecords(limit);
  const live = listAllLiveJourneyRunRecords(limit);
  const merged = [...live, ...dry];
  const filtered = businessId
    ? merged.filter((r) => r.businessId === businessId)
    : merged;
  const seen = new Set<string>();
  const deduped: JourneyRunRecord[] = [];
  for (const run of filtered) {
    if (seen.has(run.id)) continue;
    seen.add(run.id);
    deduped.push(run);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

function countTapFlowDeadLetters(deadLetters: OutboxRecord[]): number {
  return deadLetters.filter((r) => r.topic.startsWith("tapflow.effect.")).length;
}

function evidenceForCount(value: number, hasSource: boolean): EvidenceClass {
  if (value > 0) return "confirmed";
  return hasSource ? "incomplete" : "incomplete";
}

/**
 * Pure builder — testable without async I/O.
 */
export function buildFailureRecoverySnapshot(input: {
  deadLetters: OutboxRecord[];
  journeyRuns: JourneyRunRecord[];
  scope?: "business" | "platform";
  businessId?: string;
}): FailureRecoverySnapshot {
  const { deadLetters, journeyRuns } = input;
  const scope = input.scope ?? (input.businessId ? "business" : "platform");

  const outboxFailed = deadLetters.length;
  const tapflowFailed = countTapFlowDeadLetters(deadLetters);
  const journeyBlocked = journeyRuns.filter((r) => r.status === "blocked").length;
  const journeyFailed = journeyRuns.filter((r) => r.status === "failed").length;
  const journeyPartial = journeyRuns.filter((r) => r.status === "partial").length;
  const hasOutboxSource = deadLetters.length > 0 || scope === "platform";
  const hasRunSource = journeyRuns.length > 0;

  const metrics: FailureRecoveryMetric[] = [
    {
      key: "outbox_failed",
      label: "Outbox dead letters",
      value: outboxFailed,
      evidenceClass: evidenceForCount(outboxFailed, hasOutboxSource),
      source: "FusionOutboxEvent / memory",
      hint: outboxFailed > 0 ? "Retry from Admin outbox" : "No FAILED records in scope",
    },
    {
      key: "tapflow_effect_failed",
      label: "TapFlow effect failures",
      value: tapflowFailed,
      evidenceClass: evidenceForCount(tapflowFailed, hasOutboxSource),
      source: "tapflow.effect.* topics",
      hint: tapflowFailed > 0 ? "Guardian or drain failures" : undefined,
    },
    {
      key: "journey_blocked",
      label: "Journey runs blocked",
      value: journeyBlocked,
      evidenceClass: evidenceForCount(journeyBlocked, hasRunSource),
      source: "JourneyRunRecord (memory)",
      hint: journeyBlocked > 0 ? "Often consent / Guardian gates" : undefined,
    },
    {
      key: "journey_failed",
      label: "Journey runs failed",
      value: journeyFailed,
      evidenceClass: evidenceForCount(journeyFailed, hasRunSource),
      source: "JourneyRunRecord (memory)",
    },
    {
      key: "journey_partial",
      label: "Journey runs partial",
      value: journeyPartial,
      evidenceClass: journeyPartial > 0 ? "derived" : evidenceForCount(0, hasRunSource),
      source: "JourneyRunRecord (memory)",
      hint: "Did not reach exit without hard block",
    },
  ];

  const empty =
    outboxFailed === 0 &&
    journeyBlocked === 0 &&
    journeyFailed === 0 &&
    journeyPartial === 0;

  return {
    metrics,
    empty,
    fetchedAt: new Date().toISOString(),
    scope,
    businessId: input.businessId,
  };
}

/** Business-scoped snapshot for Insights hub */
export async function fetchBusinessFailureRecovery(
  businessId: string
): Promise<FailureRecoverySnapshot> {
  const [deadLetters, journeyRuns] = await Promise.all([
    listDeadLetters({ businessId, limit: 200 }),
    Promise.resolve(listAllJourneyRuns(businessId, 200)),
  ]);
  return buildFailureRecoverySnapshot({
    deadLetters,
    journeyRuns,
    scope: "business",
    businessId,
  });
}

/** Platform-wide snapshot for Admin control plane */
export async function fetchPlatformFailureRecovery(): Promise<FailureRecoverySnapshot> {
  const deadLetters = await listDeadLetters({ limit: 200 });
  const journeyRuns = mergeJourneyRuns(undefined, 200);
  return buildFailureRecoverySnapshot({
    deadLetters,
    journeyRuns,
    scope: "platform",
  });
}
