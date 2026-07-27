/**
 * Routing evidence — honest boundaries only.
 */

import type { ReplyEvidenceKind } from "./types";

export type ReplyEvidenceRecord = {
  kind: ReplyEvidenceKind;
  businessId: string;
  campaignId?: string | null;
  contactId?: string | null;
  relationshipId?: string | null;
  destinationType?: string | null;
  destinationReference?: string | null;
  providerReference?: string | null;
  timestamp: string;
  evidenceClass: "confirmed" | "derived" | "modeled" | "incomplete";
  success: boolean;
  detail?: string;
};

export function createReplyEvidence(
  input: Omit<ReplyEvidenceRecord, "timestamp" | "evidenceClass"> & {
    evidenceClass?: ReplyEvidenceRecord["evidenceClass"];
    timestamp?: string;
  }
): ReplyEvidenceRecord {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
    evidenceClass: input.evidenceClass ?? "confirmed",
  };
}

/** Never invent external resolution from a one-way handoff */
export function assertNoExternalResolutionInference(
  evidence: ReplyEvidenceRecord[]
): { ok: true } | { ok: false; offending: string[] } {
  const forbidden = evidence.filter((e) =>
    /resolution|external_response_time|assignment_performance|ticket_closure/i.test(
      e.kind + (e.detail ?? "")
    )
  );
  // Our evidence kinds never include those — guard detail abuse
  const offending = forbidden
    .filter((e) => /inferred|assumed|estimated/i.test(e.detail ?? ""))
    .map((e) => e.kind);
  return offending.length ? { ok: false, offending } : { ok: true };
}
