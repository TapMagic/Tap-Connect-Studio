/**
 * TapFlow analytics overlay helpers — derived from dry-run / run logs (no KPI theater).
 */

import type { JourneyDefinition } from "./types";
import { executeJourneyDryRun, SAMPLE_VISITOR } from "./runtime";

export type JourneyRunOverlayRecord = {
  id?: string;
  businessId?: string;
  journeyName: string;
  status: string;
  path: string[];
  issues?: unknown[];
  visitor?: Record<string, unknown>;
  createdAt?: string;
  dryRun?: boolean;
};

export type JourneyAnalyticsOverlay = {
  nodeVisitEstimates: Array<{ nodeId: string; label: string; estimatedVisits: number }>;
  blockedNodeIds: string[];
  samplePath: string[];
  evidence: "derived" | "confirmed";
  note: string;
};

/**
 * Estimates visit share along sample paths (derived). When run history exists, uses confirmed counts.
 */
export function buildJourneyAnalyticsOverlay(
  definition: JourneyDefinition,
  runs: JourneyRunOverlayRecord[] = []
): JourneyAnalyticsOverlay {
  const confirmed = runs.filter((r) => r.journeyName === definition.name);
  if (confirmed.length > 0) {
    const counts = new Map<string, number>();
    const blocked = new Set<string>();
    for (const run of confirmed) {
      for (const id of run.path) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      if (run.status === "blocked" && run.path.length) {
        blocked.add(run.path[run.path.length - 1]!);
      }
    }
    return {
      nodeVisitEstimates: definition.nodes.map((n) => ({
        nodeId: n.id,
        label: n.label,
        estimatedVisits: counts.get(n.id) ?? 0,
      })),
      blockedNodeIds: [...blocked],
      samplePath: confirmed[0]?.path ?? [],
      evidence: "confirmed",
      note: `Based on ${confirmed.length} recorded dry-run(s) for this journey name.`,
    };
  }

  const sample = executeJourneyDryRun(definition, SAMPLE_VISITOR, { requireValid: false });
  const onPath = new Set(sample.path);
  return {
    nodeVisitEstimates: definition.nodes.map((n) => ({
      nodeId: n.id,
      label: n.label,
      estimatedVisits: onPath.has(n.id) ? 1 : 0,
    })),
    blockedNodeIds: sample.blockedAt ? [sample.blockedAt] : [],
    samplePath: sample.path,
    evidence: "derived",
    note: "Sample-path estimate only — not live traffic. Run dry-runs to upgrade to confirmed.",
  };
}
