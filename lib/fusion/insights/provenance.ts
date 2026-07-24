/**
 * TapProof provenance builders — attach evidence sources to Insights claims.
 */

import type { EvidenceClass, TapProofRecord } from "./tapproof";
import type { InsightKpi } from "./types";

export function confidenceForEvidence(evidenceClass: EvidenceClass): number {
  switch (evidenceClass) {
    case "confirmed":
      return 0.95;
    case "derived":
      return 0.8;
    case "modeled":
      return 0.45;
    case "incomplete":
      return 0.15;
  }
}

export function buildProvenanceFromKpis(input: {
  businessId: string;
  kpis: InsightKpi[];
  fetchedAt: string;
  rangeFrom: string;
  rangeTo: string;
}): TapProofRecord[] {
  return input.kpis.map((k) => ({
    id: `tp_${k.key}`,
    businessId: input.businessId,
    subjectType: "insight_kpi",
    subjectId: k.key,
    claim: `${k.label} = ${k.value}`,
    evidenceClass: k.evidenceClass,
    confidence: confidenceForEvidence(k.evidenceClass),
    sources: [
      {
        ref: k.source,
        at: input.fetchedAt,
      },
      {
        ref: `range:${input.rangeFrom.slice(0, 10)}..${input.rangeTo.slice(0, 10)}`,
        at: input.fetchedAt,
      },
    ],
    humanVerified: false,
    createdAt: input.fetchedAt,
  }));
}

export function freshnessLabel(fetchedAtIso: string, now = new Date()): {
  ageSeconds: number;
  label: string;
} {
  const ageSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(fetchedAtIso).getTime()) / 1000)
  );
  if (ageSeconds < 5) return { ageSeconds, label: "Just now" };
  if (ageSeconds < 60) return { ageSeconds, label: `${ageSeconds}s ago` };
  if (ageSeconds < 3600) return { ageSeconds, label: `${Math.floor(ageSeconds / 60)}m ago` };
  return { ageSeconds, label: `${Math.floor(ageSeconds / 3600)}h ago` };
}
