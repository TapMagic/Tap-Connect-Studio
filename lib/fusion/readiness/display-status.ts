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
 * PO headed suite attestation (isolated tapconnect_fusion_dev, Railway untouched):
 * 2026-07-24 — 13/13 Playwright Chromium headed proofs passed (http://localhost:3000).
 * These rows validate only suite-covered workflows — never the whole platform as OWNER-READY.
 */
export const VERIFICATION_LEDGER: VerificationRecord[] = [
  {
    sectionId: "distribution",
    lastVerifiedAt: "2026-07-24T00:43:01.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: false,
    notes:
      "PO 13/13 · P-public-seed-tap: /t/seeddemo01 headed Chromium — schedule content + Keep Card visible",
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
    lastVerifiedAt: "2026-07-24T00:43:02.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: false,
    notes: "PO 13/13 · P-campaign-group-schedule: evening slot + upcoming strip on public tap",
    blockers: [
      "studio_time_travel_ui_matrix",
      "fallback_path_browser_proof",
      "a11y_headed_pass",
    ],
    nextAction: "Prove Studio time-travel preview UI + explicit fallback path",
  },
  {
    sectionId: "resolver",
    lastVerifiedAt: "2026-07-24T00:43:01.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "PO 13/13 · Public resolver via seed device + ?at= supported",
    blockers: ["studio_resolver_preview_surface", "full_owner_gate_matrix"],
    nextAction: "Prove in-Studio resolver preview workspace end-to-end",
  },
  {
    sectionId: "upcoming",
    lastVerifiedAt: "2026-07-24T00:43:03.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "PO 13/13 · P-studio-home: Home hub loads; readiness badges derived (not static OWNER-READY)",
    blockers: ["decision_queue_full_matrix", "a11y_headed_pass", "full_owner_gate_matrix"],
    nextAction: "Complete Home decision-queue + a11y headed matrix",
  },
  {
    sectionId: "campaigns",
    lastVerifiedAt: "2026-07-24T00:55:22.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "PO 13/13 editor shell; P-builder-save: PATCH save → reload shows marker (Save control present)",
    blockers: [
      "publish_assign_public_matrix",
      "ui_headline_edit_selector",
      "format_media_stock_proof",
    ],
    nextAction: "Headed UI format edit + publish → assign → public reload",
  },
  {
    sectionId: "cards",
    lastVerifiedAt: "2026-07-24T00:43:04.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes: "PO 13/13 · P-16-card-builder shell loads",
    blockers: ["full_card_builder_matrix", "save_publish_assign_public_reload"],
    nextAction: "Headed Card Builder full matrix with persistence reload",
  },
  {
    sectionId: "leads",
    lastVerifiedAt: "2026-07-24T00:43:08.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "PO 13/13 · P-03-lead-capture: POST /api/leads → Leads list",
    blockers: ["consent_relationship_matrix", "ui_form_headed_matrix"],
    nextAction: "Headed public form → consent → Contact → Relationship",
  },
  {
    sectionId: "tapsave",
    lastVerifiedAt: "2026-07-24T00:43:13.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "PO 13/13 · P-03-tapsave-keep; P-wallet-mock-tapsave: Keep → /api/mytap/wallet 200 → MyTap wallet UI",
    blockers: ["prefs_moments_headed_matrix", "audience_wallet_list_headed", "live_apple_google_credentials"],
    nextAction: "Headed Audience wallet list; live wallet remains credentials-gated",
  },
  {
    sectionId: "mytap",
    lastVerifiedAt: "2026-07-24T00:53:31.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "PO 13/13 Keep→MyTap; P-wallet-mock MyTap shows wallet UI after mock issue",
    blockers: ["prefs_moments_headed_matrix"],
    nextAction: "Headed prefs/moments on MyTap",
  },
  {
    sectionId: "wallet",
    lastVerifiedAt: "2026-07-24T00:53:31.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "P-wallet-mock-tapsave: mock Apple issue via /api/mytap/wallet — live certs still required",
    blockers: [
      "audience_wallet_list_headed",
      "provider:apple_wallet_certs",
      "provider:google_wallet",
    ],
    missingProviders: ["apple_wallet", "google_wallet"],
    nextAction: "Audience wallet list headed; live = VERIFIED — CREDENTIALS REQUIRED",
  },
  {
    sectionId: "taploop",
    lastVerifiedAt: "2026-07-24T00:43:12.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes: "PO 13/13 · P-10-taploop: award idempotency + redeem on seed enrollment",
    blockers: ["program_create_ui_matrix", "reversal_headed_matrix", "ui_enroll_form_matrix"],
    nextAction: "Headed UI: create program → enroll → reverse + ledger",
  },
  {
    sectionId: "tapflow",
    lastVerifiedAt: "2026-07-24T00:43:09.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes: "PO 13/13 · P-06-tapflow-shell; extend with P-tapflow-lifecycle matrix",
    blockers: ["full_tapflow_lifecycle_matrix"],
    nextAction: "Headed: create → publish → activate → execute → pause/resume → failure/retry",
  },
  {
    sectionId: "inbox",
    lastVerifiedAt: "2026-07-24T00:43:10.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes: "PO 13/13 · P-09-inbox-shell",
    blockers: ["full_inbox_reply_matrix"],
    nextAction: "Headed: thread → mock reply → Guardian → TapCase → timeline",
  },
  {
    sectionId: "insights",
    lastVerifiedAt: "2026-07-24T00:43:11.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes: "PO 13/13 · P-11-insights-shell; extend with P-insights-export",
    blockers: ["full_insights_export_matrix", "drilldown_provenance_matrix"],
    nextAction: "Headed: filters → drill-down → provenance → export",
  },
  {
    sectionId: "admin",
    lastVerifiedAt: "2026-07-24T00:43:12.000Z",
    browserE2ePassed: true,
    persistencePassed: false,
    notes:
      "PO 13/13 · P-12-admin-shell; kill-switch API OK — panel interactivity follow-up",
    blockers: ["full_admin_killswitch_matrix", "feature_registry_panel_not_interactive"],
    nextAction: "Headed: disable → surface 503 → re-enable → audit row",
  },
  {
    sectionId: "productivity_work",
    lastVerifiedAt: "2026-07-24T01:42:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    missingEnvVars: [
      "MONDAY_CLIENT_ID",
      "MONDAY_CLIENT_SECRET",
      "ASANA_CLIENT_ID",
      "SLACK_CLIENT_ID",
    ],
    notes:
      "P-productivity-ui + P-productivity-closeout-18 headed Chromium: Settings badge + API run_closeout 18/18 mock steps. Live = VERIFIED — CREDENTIALS REQUIRED. Not OWNER-READY.",
    blockers: [
      "live_oauth_apps_not_supplied",
      "live_webhook_signature_certification",
      "live_provider_push_certification",
      "full_owner_gate_matrix",
    ],
    nextAction: "Supply OAuth apps one provider at a time; certify live push + webhooks",
  },
  {
    sectionId: "tapcanvas",
    lastVerifiedAt: "2026-07-24T03:00:00.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    a11yPassed: false,
    notes:
      "TapCanvas Prisma-persisted on tapconnect_fusion_dev. Proofs: P-tapcanvas-persist/campaigns/reverse-repair/keyword-bind/version-restore/mode-matrix/comments-approvals/tapflow-bind/a11y-responsive + P-tapcanvas-weekly-matrix/conversational-funnel/tapflow-lifecycle/reverse-repair-deep/killswitch. Classification: IMPLEMENTED BUT NOT OWNER-READY (live credentials + full SR/axe + live visitor executor open).",
    blockers: [
      "a11y_headed_pass",
      "responsive_matrix",
      "live_visitor_executor",
      "live_tapcast_credentials",
      "provider_effects",
      "not_owner_ready",
    ],
    nextAction:
      "Clear live executor + a11y/SR sign-off; do not claim OWNER-READY without zero blockers",
  },
  {
    sectionId: "tapcast",
    lastVerifiedAt: "2026-07-24T04:00:00.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    notes:
      "P-tapcast-registry/multi-variant/admin + P-tapcast-ladder-*: Omnichannel hub + 18-channel capability registry + publish-path ladder (unit + headed samples) + failure isolation + Snapchat honesty. IMPLEMENTED BUT NOT OWNER-READY (a11y/full ladder headed matrix incomplete). Live = VERIFIED — CREDENTIALS REQUIRED. Prisma when isolated DB.",
    blockers: [
      "live_provider_credentials",
      "a11y_full_ladder_headed_matrix",
      "owner_certification_matrix",
      "not_owner_ready",
    ],
    nextAction:
      "Complete a11y + full 18×ladder headed matrix; supply live credentials per channel; never OWNER-READY without them",
  },
  {
    sectionId: "tapcast_tiktok",
    lastVerifiedAt: "2026-07-24T02:15:00.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    missingEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    notes:
      "P-tiktok-mock-persist + P-tapcast-tiktok-coexist: mock draft/direct-post/retry/funnel + coexistence with omnichannel registry. Live Direct Post = VERIFIED — CREDENTIALS REQUIRED. Not OWNER-READY.",
    blockers: [
      "tiktok_oauth_credentials",
      "direct_post_token",
      "not_owner_ready",
    ],
    nextAction: "Supply TIKTOK_* credentials; certify live Direct Post after mock path",
  },
  {
    sectionId: "tapcast_omnichannel",
    lastVerifiedAt: "2026-07-24T04:00:00.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    notes:
      "P-tapcast-* + P-tapcast-ladder-*: Channel registry (18), mock publish ladder, campaign variants, failure isolation, Snapchat package-only (no live claim), Brand Vocabulary hashtags on create_variants/adapt, TapCanvas distribution hooks, Admin panel. Local mock IMPLEMENTED BUT NOT OWNER-READY until a11y/full ladder headed matrix complete. Live = VERIFIED — CREDENTIALS REQUIRED.",
    blockers: [
      "live_oauth_per_channel",
      "a11y_full_ladder_headed_matrix",
      "owner_ready_gate",
    ],
    nextAction:
      "Finish full headed ladder matrix + a11y; live OAuth apps one channel at a time; never OWNER-READY without credentials",
  },
  {
    sectionId: "keywords_brand_pack",
    lastVerifiedAt: "2026-07-24T03:30:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "P-keywords-brand-pack + P-keywords-surfaces-* + P-keywords-owner-gate-pipeline + P-keywords-owner-gate-killswitch: suggest/accept/reject/edit/lock/archive/restore, locale, named Brand Pack create+reuse, exclusion/competitor, duplicate warnings, trigger collision + campaign/location scope, conversational synonyms/misspellings, channel-specific TT/IG/FB/YT suggest+apply, TapCast variants when API available, persist after refresh, Admin ai.keywords disable→UI banner+API 503→audit→re-enable→retry, analytics audit view, readiness badge. Surfaces: Brand Kit, Campaign, Card, TapCast, TikTok, Email, TapCanvas, TapFlow, Inbox, Assets, Templates, Autopilot via shared KeywordsSuggestPanel + /api/ai/keywords only. Live AI/trend = VERIFIED — CREDENTIALS REQUIRED. Classification: FUNCTIONAL — FINAL VERIFICATION REQUIRED (not OWNER-READY).",
    blockers: [
      "live_trend_provider",
      "openai_ai_enhancement",
      "a11y_headed_pass",
      "tapcanvas_tapflow_killswitch_wiring_owned_by_ab_agent",
      "dedicated_analytics_ui_panel",
      "not_owner_ready",
    ],
    missingProviders: ["approved_trend_provider", "openai"],
    nextAction:
      "Keep trends/AI enhancement VERIFIED — CREDENTIALS REQUIRED; A+B agent wires TapCanvas/TapFlow to shared ai.keywords gate; a11y headed pass before OWNER-READY",
  },
];

const CREDENTIAL_FEATURES = new Set<string>([
  "wallet.apple_google",
  "billing.stripe",
  "comms.email",
  "comms.messaging",
  "ai.autopilot",
  "tapcast.tiktok",
  "tapcast.omnichannel",
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
    "tapcast.tiktok": ["tiktok"],
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
