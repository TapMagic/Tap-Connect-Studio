/**
 * Provenance authority for Visual Parts intake.
 * TapConnect-original parts are first-class — no fake external provenance required.
 */

export type VisualPartSourceType =
  | "tapconnect_original"
  | "host_upload"
  | "open_source_adapted"
  | "free_asset_adapted";

export type VisualPartProvenanceRecord = Readonly<{
  provenanceId: string;
  partId: string;
  sourceType: VisualPartSourceType;
  sourceName: string;
  sourceReference?: string;
  creator: string;
  license: string;
  commercialUseReviewed: boolean;
  modificationReviewed: boolean;
  saasEditorUseReviewed: boolean;
  redistributionRestrictions: string;
  attributionRequirements: string;
  reviewDate: string;
  notes?: string;
}>;

const PROVENANCE_BY_ID = new Map<string, VisualPartProvenanceRecord>();
const PROVENANCE_BY_PART = new Map<string, VisualPartProvenanceRecord>();

function register(record: VisualPartProvenanceRecord) {
  PROVENANCE_BY_ID.set(record.provenanceId, record);
  PROVENANCE_BY_PART.set(record.partId, record);
}

/** TapConnect-original proof inventory — clean, non-fake provenance. */
const ORIGINAL_PROOF: readonly Omit<VisualPartProvenanceRecord, "partId" | "provenanceId">[] = [];

export function tapconnectOriginalProvenance(
  partId: string,
  label: string
): VisualPartProvenanceRecord {
  const record: VisualPartProvenanceRecord = {
    provenanceId: `prov_${partId}`,
    partId,
    sourceType: "tapconnect_original",
    sourceName: `TapConnect Studio — ${label}`,
    creator: "TapConnect / Tap The Magic",
    license: "TapConnect proprietary (original work)",
    commercialUseReviewed: true,
    modificationReviewed: true,
    saasEditorUseReviewed: true,
    redistributionRestrictions: "Internal product asset; not a third-party redistributable pack.",
    attributionRequirements: "None beyond TapConnect product credit where applicable.",
    reviewDate: "2026-08-10",
    notes: "Architecture-proof inventory. Not a third-party harvest.",
  };
  register(record);
  void ORIGINAL_PROOF;
  return record;
}

export function getProvenanceById(id: string): VisualPartProvenanceRecord | undefined {
  return PROVENANCE_BY_ID.get(id);
}

export function getProvenanceForPart(partId: string): VisualPartProvenanceRecord | undefined {
  return PROVENANCE_BY_PART.get(partId);
}

export function listProvenanceRecords(): readonly VisualPartProvenanceRecord[] {
  return [...PROVENANCE_BY_ID.values()];
}

/**
 * Intake stub for future free/open-source adaptation.
 * Does not download or hotlink — records only after source is brought into-repo.
 */
export function recordAdaptedOpenSourceProvenance(
  input: Omit<VisualPartProvenanceRecord, "sourceType"> & { sourceType?: VisualPartSourceType }
): VisualPartProvenanceRecord {
  const record: VisualPartProvenanceRecord = {
    ...input,
    sourceType: input.sourceType || "open_source_adapted",
  };
  if (!record.commercialUseReviewed || !record.modificationReviewed || !record.saasEditorUseReviewed) {
    throw new Error("Provenance intake requires commercial / modification / SaaS editor reviews.");
  }
  register(record);
  return record;
}
