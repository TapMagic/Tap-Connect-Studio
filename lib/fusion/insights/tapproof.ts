/**
 * TapProof — provenance / confidence / evidence classes.
 */

export type EvidenceClass = "confirmed" | "derived" | "modeled" | "incomplete";

export type TapProofRecord = {
  id: string;
  businessId: string;
  subjectType: string;
  subjectId: string;
  claim: string;
  evidenceClass: EvidenceClass;
  confidence: number; // 0–1
  sources: Array<{ provider?: string; ref: string; at: string }>;
  humanVerified: boolean;
  createdAt: string;
};

export function labelEvidence(evidenceClass: EvidenceClass): string {
  switch (evidenceClass) {
    case "confirmed":
      return "Confirmed";
    case "derived":
      return "Derived";
    case "modeled":
      return "Modeled (not fact)";
    case "incomplete":
      return "Incomplete data";
  }
}

export function assertNotPresentedAsFact(evidenceClass: EvidenceClass): boolean {
  return evidenceClass === "confirmed" || evidenceClass === "derived";
}
