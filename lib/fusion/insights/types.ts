/**
 * Shared Insights types — avoid circular imports between metrics / compare / provenance.
 */

import type { EvidenceClass } from "./tapproof";

export type InsightKpi = {
  key: string;
  label: string;
  value: number;
  evidenceClass: EvidenceClass;
  source: string;
  seeded: boolean;
  /** Optional drill-through destination for this KPI aggregate. */
  drillThroughHref?: string;
};
