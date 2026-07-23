/**
 * Runtime-backed Studio display readiness — never static OWNER-READY tokens.
 * Visible badges derive from declared stage + feature gate + provider probes + verification record.
 */

import { integrations } from "@/lib/config/integrations";
import { FEATURE_DEFINITIONS } from "@/lib/fusion/features/registry";
import { isFeatureEnabled, type ResolveContext } from "@/lib/fusion/features/resolve";
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
 * AND zero blockers may surface as OWNER-READY.
 *
 * Populated from headed Playwright runs (tmp/fusion-proofs/*.json) on isolated DB.
 * Do not clear blockers until the full owner-ready gate matrix for that section passes.
 */
export const VERIFICATION_LEDGER: VerificationRecord[] = [
  {
    sectionId: "distribution",
    lastVerifiedAt: "2026-07-23T22:38:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: false,
    notes:
      "P-public-seed-tap: /t/seeddemo01 headed Chromium — evening/day schedule content + Keep Card visible; HMR console noise ignored",
    blockers: [
      "a11y_headed_pass",
      "responsive_matrix",
      "analytics_event_assert",
      "full_owner_gate_matrix",
    ],
    nextAction: "Complete a11y + responsive + analytics asserts for public render",
  },
  {
    sectionId: "calendar",
    lastVerifiedAt: "2026-07-23T22:38:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: false,
    notes:
      "P-campaign-group-schedule: group schedule resolved evening slot on public tap with upcoming strip",
    blockers: [
      "studio_time_travel_ui_matrix",
      "fallback_path_browser_proof",
      "a11y_headed_pass",
    ],
    nextAction: "Prove Studio time-travel preview UI + explicit fallback path in browser",
  },
  {
    sectionId: "resolver",
    lastVerifiedAt: "2026-07-23T22:38:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "Public resolver path via getDeviceWithActiveCampaign + ?at= supported",
    blockers: ["studio_resolver_preview_surface", "full_owner_gate_matrix"],
    nextAction: "Prove in-Studio resolver preview workspace end-to-end",
  },
  {
    sectionId: "campaigns",
    lastVerifiedAt: "2026-07-23T22:38:20.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes:
      "P-16-campaign-editor: editor loads Welcome Offer with preview after useUndoRedo fix; save/publish/assign matrix not yet headed",
    blockers: [
      "full_campaign_builder_matrix",
      "save_publish_assign_public_reload",
      "format_media_stock_proof",
    ],
    nextAction: "Headed: format → media → save → publish → assign → public → reload",
  },
  {
    sectionId: "cards",
    lastVerifiedAt: "2026-07-23T22:38:20.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes: "P-16-card-builder: Card Builder shell loads; full Pages-quality matrix pending",
    blockers: ["full_card_builder_matrix", "save_publish_assign_public_reload"],
    nextAction: "Headed Card Builder full matrix with persistence reload",
  },
  {
    sectionId: "leads",
    lastVerifiedAt: "2026-07-23T22:42:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "P-03-lead-capture: POST /api/leads + Leads list headed proof on isolated DB; UI form matrix + Keep/MyTap still open",
    blockers: [
      "consent_relationship_matrix",
      "keep_card_mytap_matrix",
      "ui_form_headed_matrix",
    ],
    nextAction: "Headed: public form → consent → Contact → Relationship → Keep Card → MyTap",
  },
];

const CREDENTIAL_FEATURES = new Set<string>([
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

export function resolveSectionReadiness(
  section: StudioSection,
  ctx: ResolveContext = {}
): ResolvedSectionReadiness {
  const ledger = ledgerFor(section.id);
  const feat = featureDef(section.featureId);
  const providerGaps = providerGapsForFeature(section.featureId);
  const missingEnv: string[] = [];
  for (const gap of providerGaps) {
    const integ = integrations.find((i) => i.id === gap);
    if (integ) missingEnv.push(...integ.envVars);
  }

  let display = maturityToProvisional(section.maturity);

  if (section.featureId && !isFeatureEnabled(section.featureId, ctx)) {
    display = "disabled";
  } else if (feat && !feat.defaultEnabled && section.maturity === "disabled") {
    display = "disabled";
  }

  if (
    display !== "disabled" &&
    (CREDENTIAL_FEATURES.has(section.featureId ?? "") ||
      section.maturity === "verified_needs_credentials")
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
