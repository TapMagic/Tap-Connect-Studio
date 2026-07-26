/**
 * Versioned KnowledgeFact provenance contract (F0).
 * Unapproved / rejected / retired / contradicted facts are never authoritative.
 * No Prisma persistence in F0 — pure governance only.
 */

import {
  createHumanIntervention,
  type HumanIntervention,
} from "./intervention";

export const KNOWLEDGE_FACT_SCHEMA_VERSION = "1.0.0" as const;

/** Confidence at or below this threshold creates missing-information state */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** Facts older than this (ms since lastVerifiedAt) are stale */
export const STALE_FACT_MS = 90 * 24 * 60 * 60 * 1000;

export type KnowledgeFactApprovalState =
  | "unapproved"
  | "approved"
  | "rejected"
  | "retired";

export type KnowledgeFactContradictionState = "none" | "suspected" | "confirmed";

export type KnowledgeFactEvidenceClass =
  | "host_declared"
  | "system_observed"
  | "derived"
  | "inferred";

export type KnowledgeFactScope = {
  businessId?: string;
  campaignId?: string;
  cardId?: string;
  locationId?: string;
  contactType?: string;
  /** Free-form scope key for recipe-specific domains */
  domain?: string;
};

export type KnowledgeFactSource = {
  kind: "host" | "system" | "campaign" | "brand_kit" | "import" | "derived";
  ref?: string;
  label?: string;
};

export type KnowledgeFact = {
  id: string;
  schemaVersion: string;
  kind: string;
  scope: KnowledgeFactScope;
  value: unknown;
  source: KnowledgeFactSource;
  /** 0..1 */
  confidence: number;
  approvalState: KnowledgeFactApprovalState;
  lastVerifiedAt: string;
  contradictionState: KnowledgeFactContradictionState;
  /** Plan ids (or other consumers) that reference this fact */
  whereUsed: string[];
  evidenceClass: KnowledgeFactEvidenceClass;
  /** Monotonic fact version; corrections create a new version */
  version: number;
  supersedesFactId?: string | null;
};

export type FactUsability =
  | { usable: true; authoritative: true }
  | {
      usable: false;
      authoritative: false;
      reason:
        | "unapproved"
        | "rejected"
        | "retired"
        | "confirmed_contradiction"
        | "low_confidence"
        | "stale";
      intervention: HumanIntervention;
    };

export type FactValidationResult =
  | { ok: true; fact: KnowledgeFact }
  | { ok: false; message: string };

export function validateKnowledgeFact(fact: KnowledgeFact): FactValidationResult {
  if (!fact.id?.trim()) return { ok: false, message: "KnowledgeFact.id is required" };
  if (!fact.schemaVersion?.trim()) {
    return { ok: false, message: "KnowledgeFact.schemaVersion is required" };
  }
  if (!fact.kind?.trim()) return { ok: false, message: "KnowledgeFact.kind is required" };
  if (!fact.source?.kind) return { ok: false, message: "KnowledgeFact.source.kind is required" };
  if (typeof fact.confidence !== "number" || fact.confidence < 0 || fact.confidence > 1) {
    return { ok: false, message: "KnowledgeFact.confidence must be between 0 and 1" };
  }
  if (!fact.lastVerifiedAt?.trim()) {
    return { ok: false, message: "KnowledgeFact.lastVerifiedAt is required" };
  }
  if (Number.isNaN(Date.parse(fact.lastVerifiedAt))) {
    return { ok: false, message: "KnowledgeFact.lastVerifiedAt must be a valid ISO date" };
  }
  if (!Array.isArray(fact.whereUsed)) {
    return { ok: false, message: "KnowledgeFact.whereUsed must be an array" };
  }
  if (!Number.isInteger(fact.version) || fact.version < 1) {
    return { ok: false, message: "KnowledgeFact.version must be an integer >= 1" };
  }
  return { ok: true, fact };
}

export function isFactStale(fact: KnowledgeFact, now = new Date(), maxAgeMs = STALE_FACT_MS): boolean {
  const verified = Date.parse(fact.lastVerifiedAt);
  if (Number.isNaN(verified)) return true;
  return now.getTime() - verified > maxAgeMs;
}

/**
 * Unapproved facts are never authoritative.
 * Rejected / retired are not usable.
 * Confirmed contradiction blocks use.
 * Low confidence → missing-information (not usable as authority).
 * Stale facts are marked for verification (usable as hint only when approved — F0 treats stale as non-authoritative gate for live plans).
 */
export function evaluateFactUsability(
  fact: KnowledgeFact,
  opts: { now?: Date; treatStaleAsBlocking?: boolean } = {}
): FactUsability {
  if (fact.approvalState === "unapproved") {
    return {
      usable: false,
      authoritative: false,
      reason: "unapproved",
      intervention: createHumanIntervention({
        code: "missing_fact",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” is unapproved and is not authoritative.`,
      }),
    };
  }
  if (fact.approvalState === "rejected") {
    return {
      usable: false,
      authoritative: false,
      reason: "rejected",
      intervention: createHumanIntervention({
        code: "policy_prohibited",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” was rejected and cannot be used.`,
      }),
    };
  }
  if (fact.approvalState === "retired") {
    return {
      usable: false,
      authoritative: false,
      reason: "retired",
      intervention: createHumanIntervention({
        code: "stale_fact",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” is retired and cannot be used.`,
        blocking: true,
      }),
    };
  }
  if (fact.contradictionState === "confirmed") {
    return {
      usable: false,
      authoritative: false,
      reason: "confirmed_contradiction",
      intervention: createHumanIntervention({
        code: "contradiction",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” has a confirmed contradiction.`,
      }),
    };
  }
  if (fact.confidence <= LOW_CONFIDENCE_THRESHOLD) {
    return {
      usable: false,
      authoritative: false,
      reason: "low_confidence",
      intervention: createHumanIntervention({
        code: "low_confidence",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” confidence ${fact.confidence} is at or below ${LOW_CONFIDENCE_THRESHOLD}; treat as missing information.`,
      }),
    };
  }
  const treatStaleAsBlocking = opts.treatStaleAsBlocking ?? true;
  if (treatStaleAsBlocking && isFactStale(fact, opts.now)) {
    return {
      usable: false,
      authoritative: false,
      reason: "stale",
      intervention: createHumanIntervention({
        code: "stale_fact",
        affectedObjectOrStep: fact.id,
        explanation: `Fact “${fact.kind}” is stale and marked for verification.`,
        blocking: true,
      }),
    };
  }
  return { usable: true, authoritative: true };
}

export function isFactAuthoritative(fact: KnowledgeFact, now = new Date()): boolean {
  return evaluateFactUsability(fact, { now }).authoritative === true;
}

/**
 * Facts referenced by live plans cannot be silently deleted.
 */
export function canDeleteFact(
  fact: KnowledgeFact,
  livePlanIds: ReadonlySet<string> | string[]
): { ok: true } | { ok: false; code: "referenced_by_live_plan"; message: string } {
  const live = livePlanIds instanceof Set ? livePlanIds : new Set(livePlanIds);
  const hits = fact.whereUsed.filter((id) => live.has(id));
  if (hits.length > 0) {
    return {
      ok: false,
      code: "referenced_by_live_plan",
      message: `Cannot delete fact ${fact.id}; referenced by live plan(s): ${hits.join(", ")}`,
    };
  }
  return { ok: true };
}

/**
 * Correction creates a new version rather than rewriting applied history.
 */
export function correctKnowledgeFact(
  prior: KnowledgeFact,
  patch: Partial<
    Pick<
      KnowledgeFact,
      | "value"
      | "confidence"
      | "approvalState"
      | "contradictionState"
      | "source"
      | "evidenceClass"
      | "scope"
      | "lastVerifiedAt"
    >
  >,
  opts: { newId?: string; now?: Date } = {}
): KnowledgeFact {
  const now = (opts.now ?? new Date()).toISOString();
  return {
    ...prior,
    id: opts.newId ?? `${prior.id}_v${prior.version + 1}`,
    schemaVersion: prior.schemaVersion || KNOWLEDGE_FACT_SCHEMA_VERSION,
    value: patch.value !== undefined ? patch.value : prior.value,
    confidence: patch.confidence ?? prior.confidence,
    approvalState: patch.approvalState ?? "unapproved",
    contradictionState: patch.contradictionState ?? "none",
    source: patch.source ?? prior.source,
    evidenceClass: patch.evidenceClass ?? prior.evidenceClass,
    scope: patch.scope ?? prior.scope,
    lastVerifiedAt: patch.lastVerifiedAt ?? now,
    whereUsed: [],
    version: prior.version + 1,
    supersedesFactId: prior.id,
  };
}

/**
 * Collect missing-information interventions for facts a plan intends to use.
 */
export function missingInformationFromFacts(
  facts: KnowledgeFact[],
  now = new Date()
): HumanIntervention[] {
  const interventions: HumanIntervention[] = [];
  for (const fact of facts) {
    const usability = evaluateFactUsability(fact, { now });
    if (!usability.usable) {
      interventions.push(usability.intervention);
    }
  }
  return interventions;
}
