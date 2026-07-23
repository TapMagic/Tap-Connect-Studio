/**
 * Authoritative Feature Registry — typed, versioned, dependency-aware.
 * Do not scatter unrelated boolean flags across the app.
 */

export type FeatureMaturity =
  | "defined"
  | "in_development"
  | "internal_only"
  | "design_lab"
  | "qa"
  | "alpha"
  | "private_beta"
  | "public_beta"
  | "ga"
  | "paused"
  | "degraded"
  | "deprecated"
  | "retired";

export type FeatureImplementationStatus =
  | "specified"
  | "scaffolded"
  | "wired"
  | "validated"
  | "production_ready";

export type FeatureReadiness =
  | "ready"
  | "ready_with_warning"
  | "missing_dependency"
  | "provider_disconnected"
  | "credentials_missing"
  | "permission_blocked"
  | "plan_blocked"
  | "region_blocked"
  | "certification_pending"
  | "security_blocked"
  | "temporarily_degraded";

export type FeatureScope =
  | "environment"
  | "global"
  | "region"
  | "plan"
  | "workspace"
  | "business"
  | "location"
  | "role"
  | "user"
  | "cohort"
  | "provider"
  | "device"
  | "security"
  | "time";

export type StudioDestination =
  | "home"
  | "experiences"
  | "tap_points"
  | "audience"
  | "insights"
  | "assets"
  | "settings"
  | "platform_admin";

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  pillar: string;
  domainOwner: string;
  ux: StudioDestination | StudioDestination[];
  implementation: FeatureImplementationStatus;
  maturity: FeatureMaturity;
  /** Default when no override exists */
  defaultEnabled: boolean;
  requiredPlan?: string[];
  entitlement?: string;
  dependencies: string[];
  requiredProviders: string[];
  requiredEnvVars: string[];
  requiredPermissions: string[];
  surfaces: string[];
  devices: string[];
  analyticsEvents: string[];
  owner: string;
  docs: string;
  rollback: string;
}

export const FEATURE_REGISTRY_VERSION = 1 as const;

/** Complete product envelope registrations — activation is separate from presence. */
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    id: "card.builder.v1",
    name: "Tap Card Builder",
    description: "Full V1 Tap Card authoring with live preview and section stack.",
    pillar: "card",
    domainOwner: "experiences",
    ux: "experiences",
    implementation: "production_ready",
    maturity: "ga",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["campaign:edit"],
    surfaces: ["studio", "preview", "public"],
    devices: ["all"],
    analyticsEvents: ["card.save", "card.section.edit"],
    owner: "product",
    docs: "docs/fusion/V1_CAPABILITY_INVENTORY.md",
    rollback: "Disable UX route; retain published cards",
  },
  {
    id: "card.format.pages",
    name: "Pages-style Format Inspector",
    description: "Contextual Format/Attributes inspector that never covers the subject.",
    pillar: "card",
    domainOwner: "experiences",
    ux: "experiences",
    implementation: "wired",
    maturity: "public_beta",
    defaultEnabled: true,
    dependencies: ["card.builder.v1"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["campaign:edit"],
    surfaces: ["studio"],
    devices: ["desktop", "tablet"],
    analyticsEvents: ["format.open", "format.apply"],
    owner: "product",
    docs: "docs/fusion/TAPCONNECT_FUSION_MASTER_CHARTER.md",
    rollback: "Fall back to inline V1 controls",
  },
  {
    id: "card.builder.freeform",
    name: "Advanced Freeform Canvas",
    description: "Expert/AI freeform layout compiled to bounded render manifests.",
    pillar: "card",
    domainOwner: "experiences",
    ux: "experiences",
    implementation: "scaffolded",
    maturity: "internal_only",
    defaultEnabled: false,
    dependencies: ["card.builder.v1", "card.format.pages"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["campaign:edit", "design:freeform"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["freeform.enter", "freeform.convert"],
    owner: "product",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Force structured mode",
  },
  {
    id: "card.visual_reference",
    name: "Visual Reference to Layout",
    description: "Reconstruct editable layout from screenshot/PDF/URL/design export.",
    pillar: "autopilot",
    domainOwner: "ai",
    ux: "experiences",
    implementation: "scaffolded",
    maturity: "defined",
    defaultEnabled: false,
    dependencies: ["card.builder.v1"],
    requiredProviders: ["openai"],
    requiredEnvVars: ["OPENAI_API_KEY"],
    requiredPermissions: ["ai:generate"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["visual_ref.ingest", "visual_ref.apply"],
    owner: "ai",
    docs: "docs/fusion/FILE_FORMAT_CAPABILITY_MATRIX.md",
    rollback: "Hide ingest entry; no auto-apply",
  },
  {
    id: "campaign.groups.schedule",
    name: "Campaign Groups & Schedules",
    description: "Timed slots, fallbacks, and multi-campaign permanent devices.",
    pillar: "campaign",
    domainOwner: "experiences",
    ux: "experiences",
    implementation: "production_ready",
    maturity: "ga",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["campaign:edit"],
    surfaces: ["studio", "public"],
    devices: ["all"],
    analyticsEvents: ["schedule.resolve", "group.preview"],
    owner: "product",
    docs: "docs/fusion/V1_CAPABILITY_INVENTORY.md",
    rollback: "Default card / end campaign only",
  },
  {
    id: "campaign.time_travel",
    name: "Time-travel Resolver Preview",
    description: "Preview exact resolved content for date/time/Tap Point/state.",
    pillar: "campaign",
    domainOwner: "experiences",
    ux: ["experiences", "tap_points"],
    implementation: "scaffolded",
    maturity: "alpha",
    defaultEnabled: true,
    dependencies: ["campaign.groups.schedule"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["campaign:view"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["timetravel.preview"],
    owner: "product",
    docs: "docs/fusion/IMPLEMENTATION_MODULES.md",
    rollback: "Hide preview panel",
  },
  {
    id: "devices.scan_mode",
    name: "Scan Mode",
    description: "Desktop/phone/remote staff activation and claim sessions.",
    pillar: "devices",
    domainOwner: "tap_points",
    ux: "tap_points",
    implementation: "production_ready",
    maturity: "ga",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["device:scan"],
    surfaces: ["studio", "pulse"],
    devices: ["phone", "desktop"],
    analyticsEvents: ["scan.session", "scan.claim"],
    owner: "ops",
    docs: "docs/fusion/V1_CAPABILITY_INVENTORY.md",
    rollback: "Manual device code entry only",
  },
  {
    id: "devices.tap_point_spine",
    name: "Tap Point / DeviceUnit Spine",
    description: "Permanent opaque Tap Point addresses separated from inventory units.",
    pillar: "devices",
    domainOwner: "tap_points",
    ux: "tap_points",
    implementation: "scaffolded",
    maturity: "in_development",
    defaultEnabled: false,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["device:admin"],
    surfaces: ["studio", "platform_admin"],
    devices: ["all"],
    analyticsEvents: ["tappoint.bind", "device.replace"],
    owner: "platform",
    docs: "docs/fusion/ADMIN_CONTROL_PLANE_SPEC.md",
    rollback: "Continue DeviceSlot bridge",
  },
  {
    id: "audience.leads",
    name: "Lead Capture",
    description: "V1 contact capture forms, CRM list, CSV export.",
    pillar: "audience",
    domainOwner: "audience",
    ux: "audience",
    implementation: "production_ready",
    maturity: "ga",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["leads:view"],
    surfaces: ["studio", "public"],
    devices: ["all"],
    analyticsEvents: ["lead.create", "lead.export"],
    owner: "product",
    docs: "docs/fusion/V1_CAPABILITY_INVENTORY.md",
    rollback: "Disable public forms",
  },
  {
    id: "tapsave.core",
    name: "TapSave Relationship",
    description: "Saved relationship and retention preferences.",
    pillar: "tapsave",
    domainOwner: "audience",
    ux: "audience",
    implementation: "wired",
    maturity: "public_beta",
    defaultEnabled: true,
    dependencies: ["audience.leads"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["audience:edit"],
    surfaces: ["studio", "public", "mytap"],
    devices: ["all"],
    analyticsEvents: ["tapsave.create", "tapsave.update"],
    owner: "product",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Hide Keep Card CTAs",
  },
  {
    id: "wallet.apple_google",
    name: "Apple / Google Wallet Passes",
    description: "Wallet projection of canonical Card with signing refs. Mock lifecycle functional without certs.",
    pillar: "wallet",
    domainOwner: "audience",
    ux: "audience",
    implementation: "wired",
    maturity: "private_beta",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: ["apple_wallet", "google_wallet"],
    requiredEnvVars: [
      "APPLE_PASS_TYPE_ID",
      "APPLE_TEAM_ID",
      "APPLE_PASS_CERT",
      "GOOGLE_WALLET_ISSUER_ID",
      "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON",
    ],
    requiredPermissions: ["wallet:publish"],
    surfaces: ["public", "mytap", "studio"],
    devices: ["phone", "desktop"],
    analyticsEvents: ["wallet.install", "wallet.update", "wallet.revoke"],
    owner: "product",
    docs: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
    rollback: "Disable Wallet CTAs; revoke via provider if needed",
  },
  {
    id: "comms.email",
    name: "Email Marketing",
    description: "Audience-owned email builder with Campaign attribution.",
    pillar: "email",
    domainOwner: "communications",
    ux: ["audience", "experiences"],
    implementation: "wired",
    maturity: "public_beta",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: ["resend"],
    requiredEnvVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    requiredPermissions: ["email:send"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["email.send", "email.bounce"],
    owner: "comms",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Draft-only mode",
  },
  {
    id: "comms.messaging",
    name: "Messaging + Channel Guardian",
    description: "Messenger, IG Direct, WhatsApp, Telegram with deterministic Guardian.",
    pillar: "messaging",
    domainOwner: "communications",
    ux: "audience",
    implementation: "wired",
    maturity: "private_beta",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: ["meta", "telegram"],
    requiredEnvVars: ["META_APP_ID", "META_APP_SECRET", "TELEGRAM_BOT_TOKEN"],
    requiredPermissions: ["messaging:send"],
    surfaces: ["studio", "inbox"],
    devices: ["all"],
    analyticsEvents: ["msg.send", "guardian.block"],
    owner: "comms",
    docs: "docs/fusion/ADMIN_CONTROL_PLANE_SPEC.md",
    rollback: "Kill-switch messaging feature",
  },
  {
    id: "comms.inbox",
    name: "TapInbox + TapCase",
    description: "Unified inbox threads, mock replies, and support cases with Guardian.",
    pillar: "messaging",
    domainOwner: "communications",
    ux: "audience",
    implementation: "wired",
    maturity: "private_beta",
    defaultEnabled: true,
    dependencies: ["comms.email"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["messaging:send"],
    surfaces: ["studio", "inbox"],
    devices: ["desktop"],
    analyticsEvents: ["inbox.reply", "case.open"],
    owner: "comms",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Hide Inbox hub; retain stored threads",
  },
  {
    id: "loyalty.taploop",
    name: "TapLoop Loyalty",
    description:
      "TapLoop core — membership, tiers, append-only ledger (award/redeem/reverse), rewards. Feature id loyalty.taploop gates APIs and Audience UI.",
    pillar: "taploop",
    domainOwner: "loyalty",
    ux: "audience",
    implementation: "wired",
    maturity: "public_beta",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["loyalty:manage"],
    surfaces: ["studio", "public", "mytap"],
    devices: ["all"],
    analyticsEvents: ["loyalty.enroll", "loyalty.redeem", "loyalty.award", "loyalty.reverse"],
    owner: "product",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Disable loyalty.taploop override; pause ledger writes",
  },
  {
    id: "commerce.tapcommerce",
    name: "TapCommerce",
    description:
      "Catalog, order drafts, line totals, mock Stripe checkout — never raw card data. Live payments credential-gated.",
    pillar: "tapcommerce",
    domainOwner: "commerce",
    ux: ["experiences", "audience"],
    implementation: "wired",
    maturity: "in_development",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: ["stripe"],
    requiredEnvVars: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    requiredPermissions: ["commerce:manage"],
    surfaces: ["studio", "public"],
    devices: ["all"],
    analyticsEvents: ["commerce.checkout", "commerce.refund"],
    owner: "product",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Disable commerce.tapcommerce; hide Experiences → Orders",
  },
  {
    id: "ops.pulse",
    name: "Pulse field shell",
    description:
      "PWA-ish field ops shell (in development). Scan Mode entry + powered-by Tap The Magic. Not a full ops console yet.",
    pillar: "operations",
    domainOwner: "ops",
    ux: "tap_points",
    implementation: "scaffolded",
    maturity: "in_development",
    defaultEnabled: false,
    dependencies: ["devices.scan_mode"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["device:scan"],
    surfaces: ["pulse", "studio"],
    devices: ["phone", "tablet"],
    analyticsEvents: ["pulse.open"],
    owner: "ops",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Hide /pulse and /dashboard/pulse",
  },
  {
    id: "journey.tapflow",
    name: "TapFlow Journeys",
    description:
      "Unified journey engine (beginner stage list + expert graph); draft/publish/activate/pause via JourneyDraft.",
    pillar: "tapflow",
    domainOwner: "journey",
    ux: "experiences",
    implementation: "wired",
    maturity: "in_development",
    defaultEnabled: false,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["journey:edit"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["flow.publish", "flow.run"],
    owner: "product",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Disable journey runs",
  },
  {
    id: "ai.autopilot",
    name: "Autopilot / Automation Team",
    description: "Replaces V1 AI with complete validated artifact generation.",
    pillar: "autopilot",
    domainOwner: "ai",
    ux: ["home", "experiences"],
    implementation: "wired",
    maturity: "public_beta",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: ["openai"],
    requiredEnvVars: ["OPENAI_API_KEY"],
    requiredPermissions: ["ai:generate"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["autopilot.run", "autopilot.accept"],
    owner: "ai",
    docs: "docs/fusion/PRODUCT_OWNER_DECISIONS.md",
    rollback: "Emergency pause agents; keep V1 AI entry hidden",
  },
  {
    id: "insights.core",
    name: "Insights Dashboards",
    description: "Multi-view intelligence with evidence classes.",
    pillar: "insights",
    domainOwner: "insights",
    ux: "insights",
    implementation: "wired",
    maturity: "ga",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["analytics:view"],
    surfaces: ["studio"],
    devices: ["desktop", "tablet"],
    analyticsEvents: ["insights.view"],
    owner: "product",
    docs: "docs/fusion/V1_CAPABILITY_INVENTORY.md",
    rollback: "Basic totals only",
  },
  {
    id: "admin.feature_flags",
    name: "Admin Feature Activation",
    description: "Dependency-aware scoped feature activation with audit.",
    pillar: "admin",
    domainOwner: "platform",
    ux: ["settings", "platform_admin"],
    implementation: "wired",
    maturity: "alpha",
    defaultEnabled: true,
    dependencies: [],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["admin:features"],
    surfaces: ["studio", "platform_admin"],
    devices: ["desktop"],
    analyticsEvents: ["feature.enable", "feature.disable"],
    owner: "platform",
    docs: "docs/fusion/ADMIN_CONTROL_PLANE_SPEC.md",
    rollback: "Freeze overrides; use defaults",
  },
  {
    id: "billing.stripe",
    name: "Stripe Billing Connector",
    description: "Provider-neutral billing domain with Stripe adapter boundary.",
    pillar: "billing",
    domainOwner: "billing",
    ux: ["settings", "platform_admin"],
    implementation: "scaffolded",
    maturity: "defined",
    defaultEnabled: false,
    dependencies: [],
    requiredProviders: ["stripe"],
    requiredEnvVars: [
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ],
    requiredPermissions: ["billing:manage"],
    surfaces: ["studio", "platform_admin"],
    devices: ["desktop"],
    analyticsEvents: ["billing.sync", "billing.reconcile"],
    owner: "platform",
    docs: "docs/fusion/ADMIN_CONTROL_PLANE_SPEC.md",
    rollback: "Manual plan assignment",
  },
  {
    id: "connectors.monday",
    name: "monday.com Connector",
    description: "Full OAuth board/item sync via ExternalWorkItem projection.",
    pillar: "integrations",
    domainOwner: "integrations",
    ux: "settings",
    implementation: "scaffolded",
    maturity: "defined",
    defaultEnabled: false,
    dependencies: [],
    requiredProviders: ["monday"],
    requiredEnvVars: ["MONDAY_CLIENT_ID", "MONDAY_CLIENT_SECRET"],
    requiredPermissions: ["integrations:manage"],
    surfaces: ["studio"],
    devices: ["desktop"],
    analyticsEvents: ["monday.sync", "monday.webhook"],
    owner: "integrations",
    docs: "docs/fusion/INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md",
    rollback: "Disconnect provider",
  },
  {
    id: "reach.marketplace",
    name: "TapReach",
    description: "Future marketplace/ad network — hidden until authorized.",
    pillar: "tapreach",
    domainOwner: "marketplace",
    ux: "platform_admin",
    implementation: "specified",
    maturity: "defined",
    defaultEnabled: false,
    dependencies: ["tapsave.core", "campaign.groups.schedule"],
    requiredProviders: [],
    requiredEnvVars: [],
    requiredPermissions: ["platform:reach"],
    surfaces: ["platform_admin"],
    devices: ["all"],
    analyticsEvents: [],
    owner: "platform",
    docs: "docs/fusion/PILLAR_CATALOG.md",
    rollback: "Keep hidden",
  },
];

export function getFeature(id: string): FeatureDefinition | undefined {
  return FEATURE_DEFINITIONS.find((f) => f.id === id);
}

export function listFeaturesByPillar(pillar: string): FeatureDefinition[] {
  return FEATURE_DEFINITIONS.filter((f) => f.pillar === pillar);
}

export function listFeaturesByUx(ux: StudioDestination): FeatureDefinition[] {
  return FEATURE_DEFINITIONS.filter((f) =>
    Array.isArray(f.ux) ? f.ux.includes(ux) : f.ux === ux
  );
}
