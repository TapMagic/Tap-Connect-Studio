/**
 * Shared evidence caption formatting — Insights hub, Wallet, Admin surfaces.
 */

import { labelEvidence, type EvidenceClass } from "./tapproof";

export type EvidenceCaptionInput = {
  evidenceClass: EvidenceClass;
  source: string;
  seeded?: boolean;
  hint?: string;
  /** When true, append mock-path note (wallet passes without live certs). */
  mockPath?: boolean;
};

export function formatEvidenceCaption(input: EvidenceCaptionInput): string {
  const parts: string[] = [labelEvidence(input.evidenceClass)];

  if (input.seeded !== undefined) {
    parts.push(input.seeded ? "Seeded" : "Live source");
  }

  if (input.source) {
    parts.push(input.source);
  }

  if (input.mockPath) {
    parts.push("Mock adapter path");
  }

  if (input.hint) {
    parts.push(input.hint);
  }

  return parts.join(" · ");
}

export function evidenceClassTone(
  evidenceClass: EvidenceClass
): "primary" | "muted" | "default" {
  switch (evidenceClass) {
    case "derived":
    case "confirmed":
      return "primary";
    case "modeled":
      return "primary";
    case "incomplete":
      return "muted";
    default:
      return "default";
  }
}
