/**
 * Runtime-backed Studio display readiness — never static OWNER-READY tokens.
 * Visible badges derive from declared stage + feature gate + provider probes + verification record.
 */

import { integrations } from "@/lib/config/integrations";
import { FEATURE_DEFINITIONS } from "@/lib/fusion/features/registry";
import type { StudioMaturity, StudioSection } from "@/lib/fusion/studio/ia";

/** User-visible readiness vocabulary (charter §10) */
export type DisplayReadiness =
  | "owner_ready"
  | "verified_credentials_required"
  | "functional_final_verification_required"
  | "integrated_incomplete_workflow"
  | "development"
  | "blocked"
  | "disabled";

export const DISPLAY_READINESS_LABEL: Record<DisplayReadiness, string> = {
  owner_ready: "OWNER-READY",
  verified_credentials_required: "VERIFIED — CREDENTIALS REQUIRED",
  functional_final_verification_required: "FUNCTIONAL — FINAL VERIFICATION REQUIRED",
  integrated_incomplete_workflow: "INTEGRATED — INCOMPLETE WORKFLOW",
  development: "DEVELOPMENT",
  blocked: "BLOCKED",
  disabled: "DISABLED",
};

export type VerificationRecord = {
  sectionId: string;
  /** ISO date of last browser/runtime proof */
  lastVerifiedAt?: string;
  browserE2ePassed?: boolean;
  persistencePassed?: boolean;
  a11yPassed?: boolean;
  notes?: string;
  blockers?: string[];
  missingEnvVars?: string[];
  missingProviders?: string[];
  nextAction?: string;
};

/**
 * Authoritative verification ledger — only entries with browserE2ePassed + persistence
 * may ever surface as OWNER-READY. Empty by design until P-* proofs land.
 */
export const VERIFICATION_LEDGER: VerificationRecord[] = [
  // Intentionally empty: no Studio section has completed isolated-DB + browser OWNER-READY proof.
];

const CREDENTIAL_FEATURES = new Set<string>([
  "wallet.passes",
  "wallet.apple_google",
  "billing.stripe",
  "comms.email",
  "comms.messaging",
  "ai.autopilot",
]);

function featureDef(id?: string) {
  if (!id) return undefined;
  return FEATURE_DEFINITIONS.find((f) => f.id === id);
}

function providerGapsForFeature(featureId?: string): string[] {
  if (!featureId) return [];
  const map: Record<string, string[]> = {
    "ai.autopilot": ["openai"],
    "comms.email": ["resend"],
    "billing.stripe": ["stripe"],
    "wallet.passes": [],
    "wallet.apple_google": [],
  };
  const ids = map[featureId] ?? [];
  return ids.filter((id) => !integrations.find((i) => i.id === id)?.configured);
}

function ledgerFor(sectionId: string): VerificationRecord | undefined {
  return VERIFICATION_LEDGER.find((v) => v.sectionId === sectionId);
}

/**
 * Map legacy static StudioMaturity → provisional display (before verification gate).
 * OWNER-READY is never returned from static maturity alone.
 */
export function maturityToProvisional(m: StudioMaturity): DisplayReadiness {
  switch (m) {
    case "owner_ready":
      // Static "owner_ready" in IA is treated as functional pending verification
      return "functional_final_verification_required";
    case "verified_needs_credentials":
      return "verified_credentials_required";
    case "functional":
    case "beta":
      return "functional_final_verification_required";
    case "alpha":
    case "internal":
      return "integrated_incomplete_workflow";
    case "scaffolded":
      return "development";
    case "disabled":
      return "disabled";
    default:
      return "development";
  }
}

export type ResolvedSectionReadiness = {
  display: DisplayReadiness;
  label: string;
  whatWorks: string;
  whatDoesNot: string;
  missingDependencies: string[];
  lastVerifiedAt: string | null;
  testsOrProbes: string;
  nextAction: string;
  featureId?: string;
};

export function resolveSectionReadiness(section: StudioSection): ResolvedSectionReadiness {
  const ledger = ledgerFor(section.id);
  const feat = featureDef(section.featureId);
  const providerGaps = providerGapsForFeature(section.featureId);
  const missingEnv: string[] = [];
  for (const gap of providerGaps) {
    const integ = integrations.find((i) => i.id === gap);
    if (integ) missingEnv.push(...integ.envVars);
  }

  let display = maturityToProvisional(section.maturity);

  if (feat && !feat.defaultEnabled && section.maturity === "disabled") {
    display = "disabled";
  }

  if (
    CREDENTIAL_FEATURES.has(section.featureId ?? "") ||
    section.maturity === "verified_needs_credentials"
  ) {
    if (providerGaps.length > 0 || section.featureId === "wallet.apple_google") {
      display = "verified_credentials_required";
    }
  }

  if (section.maturity === "scaffolded" || section.maturity === "alpha") {
    if (display !== "disabled") {
      display =
        section.maturity === "scaffolded" ? "development" : "integrated_incomplete_workflow";
    }
  }

  // Hard gate: OWNER-READY only with ledger proof
  const fullyVerified =
    Boolean(ledger?.browserE2ePassed) &&
    Boolean(ledger?.persistencePassed) &&
    (!ledger?.blockers || ledger.blockers.length === 0) &&
    providerGaps.length === 0;

  if (fullyVerified) {
    display = "owner_ready";
  } else if (display === "owner_ready") {
    display = "functional_final_verification_required";
  }

  const missingDependencies = [
    ...providerGaps.map((p) => `provider:${p}`),
    ...(ledger?.missingEnvVars ?? missingEnv).map((e) => `env:${e}`),
    ...(ledger?.blockers ?? []),
  ];

  if (!ledger?.browserE2ePassed) {
    missingDependencies.push("proof:browser_e2e");
  }
  if (!ledger?.persistencePassed) {
    missingDependencies.push("proof:persistence_reload");
  }

  const uniqueMissing = [...new Set(missingDependencies)];

  return {
    display,
    label: DISPLAY_READINESS_LABEL[display],
    whatWorks: section.description,
    whatDoesNot:
      uniqueMissing.length > 0
        ? `Pending: ${uniqueMissing.slice(0, 6).join(", ")}`
        : "No known blockers recorded — still requires owner browser proof.",
    missingDependencies: uniqueMissing,
    lastVerifiedAt: ledger?.lastVerifiedAt ?? null,
    testsOrProbes: ledger?.notes ?? "Unit/integration tests only — no OWNER-READY browser ledger entry",
    nextAction:
      ledger?.nextAction ??
      (display === "verified_credentials_required"
        ? "Add development credentials via Integrations / .env.local (never Railway prod)"
        : display === "development"
          ? "Implement workflow before promoting readiness"
          : "Execute isolated-DB + browser proof (ISOLATED_DB_PROOF_QUEUE) then record VERIFICATION_LEDGER"),
    featureId: section.featureId,
  };
}

/** Downgrade helper for Create actions / IA static fields */
export function safeDisplayLabel(m: StudioMaturity): string {
  return DISPLAY_READINESS_LABEL[maturityToProvisional(m)];
}
