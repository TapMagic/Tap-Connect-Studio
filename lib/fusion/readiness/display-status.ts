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
 * 2026-07-24 closeout — unit 365/365; headed Playwright 63/63 (all e2e/*.spec.ts);
 * lint 0 errors; tsc + production build + Prisma validate/migrate status PASS.
 * Allowed labels: OWNER-READY | VERIFIED — CREDENTIALS REQUIRED |
 * IMPLEMENTED BUT NOT OWNER-READY | BLOCKED.
 * Locally OWNER-READY subsystems: none (blockers retained on every section).
 * Platform overall: NOT OWNER-READY. Live providers: VERIFIED — CREDENTIALS REQUIRED.
 * No invented live credential success. Railway untouched.
 */
export const VERIFICATION_LEDGER: VerificationRecord[] = [
  {
    sectionId: "distribution",
    lastVerifiedAt: "2026-07-24T04:56:12.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: true,
    notes:
      "P-public-seed-tap + P-a11y-owner-gate + P-responsive-owner-gate: public tap <main>; axe clear; SR-oriented public CTA role/name; 200% CSS zoom proxy. Not OWNER-READY (analytics + full gate + true VO/NVDA).",
    blockers: [
      "analytics_event_assert",
      "full_owner_gate_matrix",
      "true_voiceover_nvda_manual_spot_check_ci_unavailable",
    ],
    nextAction: "Analytics assert + true VoiceOver/NVDA spot-check before OWNER-READY",
  },
  {
    sectionId: "calendar",
    lastVerifiedAt: "2026-07-24T00:43:02.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: true,
    notes: "PO 13/13 · P-campaign-group-schedule; a11y/responsive owner gates cover public strip",
    blockers: [
      "studio_time_travel_ui_matrix",
      "fallback_path_browser_proof",
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
    blockers: ["decision_queue_full_matrix", "full_owner_gate_matrix"],
    nextAction: "Complete Home decision-queue matrix",
  },
  {
    sectionId: "campaigns",
    lastVerifiedAt: "2026-07-24T20:02:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Builder V1 parity @ 5bd84c7: owner-gate + P-builder-icon-placement / wysiwyg-public / exits-bg-remove / remove-background / exploratory-* headed PASS (D-015–D-024 FIXED). Interaction parity + remove-bg local-mock + exploratory proven locally. Classification: IMPLEMENTED BUT NOT OWNER-READY — residuals remain.",
    blockers: [
      "true_voiceover_nvda_manual",
      "os_native_zoom_residual",
      "pexels_unsplash_credentials_required",
      "session_undo_lost_on_full_refresh",
      "bg_remove_live_vendor_credentials",
    ],
    nextAction:
      "Do not claim OWNER-READY; clear VO/NVDA + live stock credentials + session undo persistence + live bg-remove vendor",
  },
  {
    sectionId: "cards",
    lastVerifiedAt: "2026-07-24T20:02:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Builder V1 parity @ 5bd84c7: P-builder-card-matrix + shared layout/renderer/WYSIWYG proofs PASS. Freeform remains HONEST_DISABLED scaffold behind card.builder.freeform. Classification: IMPLEMENTED BUT NOT OWNER-READY.",
    blockers: [
      "card_landing_demo_admin_only",
      "freeform_scaffold_not_full_canvas",
      "true_voiceover_nvda_manual",
    ],
    nextAction:
      "Deepen freeform canvas beyond scaffold; VoiceOver spot-check — never OWNER-READY with residuals",
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
    lastVerifiedAt: "2026-07-24T06:01:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Owner walkthrough re-gate: P-10-taploop full program manager UI — create/rules/tiers/rewards/enroll/award/idempotency/redeem/adjust/reverse/member/audit/Insights KPI hooks/Admin link. Classification: IMPLEMENTED BUT NOT OWNER-READY.",
    blockers: [
      "true_voiceover_nvda_manual_residual",
      "not_owner_ready_platform",
    ],
    nextAction: "PO VoiceOver spot on TapLoop; keep ledger honest — never claim OWNER-READY",
  },
  {
    sectionId: "tapflow",
    lastVerifiedAt: "2026-07-24T06:01:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "P-06 + P-tapflow-lifecycle + P-tapflow-live-visitor + P-a11y journey-editor-status live region. Public /t entry → persisted JourneyExecution; refresh/provider idempotency; Contact/Campaign attribution; mock provider effects. Classification: IMPLEMENTED BUT NOT OWNER-READY. Live OAuth = VERIFIED — CREDENTIALS REQUIRED.",
    blockers: [
      "live_oauth_providers_credentials_required",
      "full_journeys_studio_ui_matrix",
      "not_owner_ready",
    ],
    nextAction: "Certify live email/SMS/provider credentials; deepen Journeys studio UI matrix",
  },
  {
    sectionId: "inbox",
    lastVerifiedAt: "2026-07-24T06:01:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Owner walkthrough re-gate: P-09-inbox-operator + P-27-inbox-guardian-matrix · local mock operator closeout (thread/reply/Guardian/fallback/timeline/campaign/TapCase/ExternalWorkItem/assign/status/attachments/audit/events/analytics/persistence/recovery). Scroll regions + select a11y cleared. Classification: IMPLEMENTED BUT NOT OWNER-READY. Live messaging = VERIFIED — CREDENTIALS REQUIRED.",
    blockers: [
      "live_messaging_transports_credentials_required",
      "live_oauth_provider_certification",
      "true_voiceover_nvda_manual_residual",
      "not_owner_ready",
    ],
    nextAction: "Certify live Meta/Telegram/ManyChat credentials; deepen VoiceOver on Inbox",
  },
  {
    sectionId: "insights",
    lastVerifiedAt: "2026-07-24T06:01:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Owner walkthrough re-gate: P-11-insights-shell + P-insights-export + P-insights-drilldown-provenance · filters/compare/drill/TapProof/saved views/CSV; provenance scroll region a11y cleared. Classification: IMPLEMENTED BUT NOT OWNER-READY (VoiceOver residual).",
    blockers: ["not_owner_ready", "true_voiceover_residual"],
    nextAction: "Certify VoiceOver spot on Insights tables; keep ledger honest",
  },
  {
    sectionId: "admin",
    lastVerifiedAt: "2026-07-24T06:01:00.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "P-12-admin-shell + P-admin-killswitch-matrix (expanded Email/Inbox/Wallet/TapLoop/TapCommerce/TapCast/TikTok/Productivity/Autopilot/live_execution). Not OWNER-READY.",
    blockers: [
      "feature_registry_panel_a11y_tables_residual",
      "true_voiceover_nvda_manual_residual",
      "not_owner_ready",
    ],
    nextAction: "PO VoiceOver on Feature Registry; keep kill-switch matrix green on tip",
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
    lastVerifiedAt: "2026-07-24T04:56:12.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    a11yPassed: true,
    notes:
      "P-tapcanvas-* + P-a11y-owner-gate SR-oriented: sticky node aria-label, selection live region (role=status aria-live=polite), message live region. Classification: IMPLEMENTED BUT NOT OWNER-READY (live credentials + true VO/NVDA residual).",
    blockers: [
      "true_voiceover_nvda_manual_spot_check_ci_unavailable",
      "live_tapcast_credentials",
      "live_oauth_providers_credentials_required",
      "not_owner_ready",
    ],
    nextAction:
      "Clear live credentials + true VoiceOver/NVDA spot-check; do not claim OWNER-READY without zero blockers",
  },
  {
    sectionId: "tapcast",
    lastVerifiedAt: "2026-07-24T04:16:28.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    notes:
      "Closeout re-proof: P-tapcast-registry/multi-variant/admin + P-tapcast-ladder-* headed PASS. Classification: IMPLEMENTED BUT NOT OWNER-READY. Live = VERIFIED — CREDENTIALS REQUIRED.",
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
    lastVerifiedAt: "2026-07-24T04:16:28.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    missingEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    notes:
      "Closeout re-proof: P-tiktok-mock-persist + P-tapcast-tiktok-coexist headed PASS. Nested under TapCast. Live Direct Post = VERIFIED — CREDENTIALS REQUIRED. Not OWNER-READY.",
    blockers: [
      "tiktok_oauth_credentials",
      "direct_post_token",
      "not_owner_ready",
    ],
    nextAction: "Supply TIKTOK_* credentials; certify live Direct Post after mock path",
  },
  {
    sectionId: "tapcast_omnichannel",
    lastVerifiedAt: "2026-07-24T04:16:28.000Z",
    persistencePassed: true,
    browserE2ePassed: true,
    notes:
      "Closeout re-proof: P-tapcast-* + P-tapcast-ladder-* headed PASS. Local mock IMPLEMENTED BUT NOT OWNER-READY. Live = VERIFIED — CREDENTIALS REQUIRED.",
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
    lastVerifiedAt: "2026-07-24T04:16:28.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    notes:
      "Closeout re-proof: P-keywords-* headed PASS (brand pack, surfaces, owner-gate pipeline + killswitch). Live AI/trend = VERIFIED — CREDENTIALS REQUIRED. Classification: IMPLEMENTED BUT NOT OWNER-READY.",
    blockers: [
      "live_trend_provider",
      "openai_ai_enhancement",
      "dedicated_analytics_ui_panel",
      "true_voiceover_nvda_manual_spot_check_ci_unavailable",
      "not_owner_ready",
    ],
    missingProviders: ["approved_trend_provider", "openai"],
    nextAction:
      "Keep trends/AI enhancement VERIFIED — CREDENTIALS REQUIRED; true VoiceOver/NVDA spot-check before OWNER-READY",
  },
  {
    sectionId: "controls_a11y_responsive",
    lastVerifiedAt: "2026-07-24T04:56:12.000Z",
    browserE2ePassed: true,
    persistencePassed: true,
    a11yPassed: true,
    notes:
      "P-a11y-owner-gate + P-responsive-owner-gate deepened: axe serious/critical clear; keyboard; SR-oriented (landmarks, documented focus order, aria-live status on TapCanvas/campaign/TapFlow, role/name); viewports large desktop→mobile; 200% CSS zoom proxy PASS. Classification: IMPLEMENTED BUT NOT OWNER-READY — residual true VoiceOver/NVDA (CI unavailable) + OS-native Cmd+/Ctrl+ zoom.",
    blockers: [
      "true_voiceover_nvda_manual_spot_check_ci_unavailable",
      "os_native_browser_zoom_cmd_plus_manual_residual",
      "not_owner_ready",
    ],
    nextAction:
      "True VoiceOver/NVDA + OS-native zoom spot-check; never OWNER-READY on axe/Playwright SR proxies alone",
  },
];

const CREDENTIAL_FEATURES = new Set<string>([
  "wallet.apple_google",
  "billing.stripe",
  "comms.email",
  "comms.messaging",
  "ai.autopilot",
  "ai.keywords",
  "tapcast.tiktok",
  "tapcast.omnichannel",
]);

/** Features whose live path is always credential-gated even when integrations[] lacks a probe id. */
const ALWAYS_CREDENTIAL_GATED = new Set<string>([
  "wallet.apple_google",
  "tapcast.tiktok",
  "tapcast.omnichannel",
  "ai.keywords",
]);

function featureDef(id?: string) {
  if (!id) return undefined;
  return FEATURE_DEFINITIONS.find((f) => f.id === id);
}

function providerGapsForFeature(featureId?: string): string[] {
  if (!featureId) return [];
  const map: Record<string, string[]> = {
    "ai.autopilot": ["openai"],
    "ai.keywords": ["openai"],
    "comms.email": ["resend"],
    "billing.stripe": ["stripe"],
    "wallet.apple_google": [],
    "tapcast.tiktok": ["tiktok"],
    "tapcast.omnichannel": ["tiktok"],
  };
  const ids = map[featureId] ?? [];
  return ids.filter((id) => {
    const integ = integrations.find((i) => i.id === id);
    // Unknown probe ids (e.g. tiktok not in integrations[]) count as missing.
    if (!integ) return true;
    return !integ.configured;
  });
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
    if (
      providerGaps.length > 0 ||
      ALWAYS_CREDENTIAL_GATED.has(section.featureId ?? "")
    ) {
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
        ? "Supply sandbox credentials via Integrations / .env.local — live remains VERIFIED — CREDENTIALS REQUIRED (see docs/fusion/PROVIDER_READINESS.md); never Railway prod"
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

/** Explicit credential-gated badge — never promote mock success to OWNER-READY. */
export function credentialsRequiredLabel(): string {
  return DISPLAY_READINESS_LABEL.verified_credentials_required;
}
