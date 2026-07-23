/**
 * Final Studio IA — seven permanent destinations + secondary sections + Create.
 * V1 capability is preserved via aliases; Fusion pillars are discoverable here.
 */

export type StudioMaturity =
  | "owner_ready"
  | "functional"
  | "beta"
  | "alpha"
  | "internal"
  | "verified_needs_credentials"
  | "scaffolded"
  | "disabled";

export type StudioNavItem = {
  id: string;
  label: string;
  href: string;
  /** Legacy V1 hrefs that fold into this destination */
  aliases: string[];
  description: string;
};

export type StudioSection = {
  id: string;
  label: string;
  href: string;
  description: string;
  maturity: StudioMaturity;
  /** Feature registry id when gated */
  featureId?: string;
  group?: string;
};

export type CreateAction = {
  id: string;
  label: string;
  href: string;
  description: string;
  maturity: StudioMaturity;
  group: string;
};

export const STUDIO_NAV: StudioNavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    aliases: ["/dashboard"],
    description: "Decision queue, readiness, and outcomes",
  },
  {
    id: "experiences",
    label: "Experiences",
    href: "/dashboard/experiences",
    aliases: [
      "/dashboard/workbench",
      "/dashboard/campaigns",
      "/dashboard/card",
      "/dashboard/builder",
      "/dashboard/groups",
      "/dashboard/experiences/journeys",
      "/dashboard/experiences/orders",
    ],
    description: "Cards, Campaigns, Groups, TapFlow, commerce",
  },
  {
    id: "tap_points",
    label: "Tap Points",
    href: "/dashboard/tap-points",
    aliases: ["/dashboard/devices", "/dashboard/scan", "/dashboard/pulse"],
    description: "Devices, fleet health, Scan Mode, Pulse",
  },
  {
    id: "audience",
    label: "Audience",
    href: "/dashboard/audience",
    aliases: [
      "/dashboard/leads",
      "/dashboard/audience/inbox",
      "/dashboard/audience/wallet",
    ],
    description: "Leads, relationships, Inbox, Wallet, TapLoop",
  },
  {
    id: "insights",
    label: "Insights",
    href: "/dashboard/insights",
    aliases: ["/dashboard/analytics"],
    description: "Analytics, TapProof, operational alerts",
  },
  {
    id: "assets",
    label: "Assets",
    href: "/dashboard/assets",
    aliases: ["/dashboard/brand"],
    description: "Brand Kit, media, templates",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    aliases: ["/dashboard/integrations", "/dashboard/billing"],
    description: "Workspace, billing, integrations, Automation Team",
  },
];

export const PULSE_HREF = "/dashboard/pulse" as const;

export const STUDIO_SECTIONS: Record<string, StudioSection[]> = {
  home: [
    {
      id: "decision",
      label: "Decision queue",
      href: "/dashboard#decision-queue",
      description: "Approvals, failures, and items needing attention",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "readiness",
      label: "Readiness",
      href: "/dashboard#readiness",
      description: "Onboarding and provider readiness",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "upcoming",
      label: "Upcoming campaigns",
      href: "/dashboard#upcoming",
      description: "Recently updated campaigns",
      maturity: "owner_ready",
      group: "Activity",
    },
    {
      id: "fleet",
      label: "Tap Point health",
      href: "/dashboard/tap-points",
      description: "Fleet health rollup",
      maturity: "functional",
      group: "Activity",
    },
    {
      id: "autopilot",
      label: "Automation Team",
      href: "/dashboard/workbench",
      description: "Contextual Autopilot in the builder",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
    },
  ],
  experiences: [
    {
      id: "cards",
      label: "Cards",
      href: "/dashboard/card",
      description: "Tap Card — Pages-style Format builder",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "workbench",
      label: "Experiences",
      href: "/dashboard/workbench",
      description: "Block-by-block campaign workbench",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "campaigns",
      label: "Campaigns",
      href: "/dashboard/campaigns",
      description: "Draft, schedule, publish",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "groups",
      label: "Campaign Groups",
      href: "/dashboard/groups",
      description: "Schedules and rotations",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "calendar",
      label: "Calendar",
      href: "/dashboard/groups",
      description: "Schedule slots via Campaign Groups",
      maturity: "functional",
      group: "Distribution",
    },
    {
      id: "distribution",
      label: "Distribution",
      href: "/dashboard/devices",
      description: "Assign campaigns to Tap Points",
      maturity: "owner_ready",
      group: "Distribution",
    },
    {
      id: "tapflow",
      label: "TapFlow",
      href: "/dashboard/experiences/journeys",
      description: "Journey drafts, publish, dry-run",
      maturity: "functional",
      featureId: "journey.tapflow",
      group: "Automation",
    },
    {
      id: "taptrail",
      label: "TapTrail",
      href: "/dashboard/insights",
      description: "Visitor path overlays in Insights",
      maturity: "scaffolded",
      group: "Automation",
    },
    {
      id: "whiteboard",
      label: "Whiteboard",
      href: "/dashboard/workbench",
      description: "Freeform canvas in workbench",
      maturity: "alpha",
      group: "Build",
    },
    {
      id: "tapcast",
      label: "TapCast",
      href: "/dashboard/experiences#tapcast",
      description: "Social distribution packs",
      maturity: "scaffolded",
      group: "Distribution",
    },
    {
      id: "versions",
      label: "Versions",
      href: "/dashboard/campaigns",
      description: "Campaign revisions at edit time",
      maturity: "functional",
      group: "Publish",
    },
    {
      id: "resolver",
      label: "Resolver preview",
      href: "/dashboard/groups",
      description: "Time-travel schedule preview",
      maturity: "functional",
      group: "Publish",
    },
    {
      id: "orders",
      label: "Orders",
      href: "/dashboard/experiences/orders",
      description: "TapCommerce mock checkout",
      maturity: "beta",
      featureId: "commerce.tapcommerce",
      group: "Commerce",
    },
  ],
  tap_points: [
    {
      id: "registry",
      label: "Tap Points",
      href: "/dashboard/tap-points",
      description: "Registry, health, capacity",
      maturity: "functional",
      group: "Fleet",
    },
    {
      id: "devices",
      label: "Devices",
      href: "/dashboard/devices",
      description: "V1 device inventory",
      maturity: "owner_ready",
      group: "Fleet",
    },
    {
      id: "sets",
      label: "Sets",
      href: "/dashboard/groups",
      description: "Device sets via Campaign Groups",
      maturity: "functional",
      group: "Fleet",
    },
    {
      id: "rotations",
      label: "Rotations",
      href: "/dashboard/groups",
      description: "Scheduled rotations",
      maturity: "functional",
      group: "Fleet",
    },
    {
      id: "scan",
      label: "Scan Mode",
      href: "/dashboard/scan",
      description: "Activate and claim on-site",
      maturity: "owner_ready",
      group: "Field",
    },
    {
      id: "activation",
      label: "Activation",
      href: "/dashboard/scan",
      description: "Claim waiting sessions",
      maturity: "owner_ready",
      group: "Field",
    },
    {
      id: "provisioning",
      label: "Provisioning",
      href: "/dashboard/devices",
      description: "Create and assign device slots",
      maturity: "owner_ready",
      group: "Field",
    },
    {
      id: "placement",
      label: "Placement",
      href: "/dashboard/tap-points",
      description: "Labels and addresses",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "replacement",
      label: "Replacement",
      href: "/dashboard/devices",
      description: "Replace lost or retired devices",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "fleet",
      label: "Fleet health",
      href: "/dashboard/tap-points",
      description: "Health, capacity, errors",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "pulse",
      label: "Pulse",
      href: "/dashboard/pulse",
      description: "Field shell — claim and rotation",
      maturity: "alpha",
      featureId: "ops.pulse",
      group: "Field",
    },
  ],
  audience: [
    {
      id: "leads",
      label: "Leads",
      href: "/dashboard/leads",
      description: "V1 lead list + CSV",
      maturity: "owner_ready",
      group: "Core",
    },
    {
      id: "contacts",
      label: "Contacts",
      href: "/dashboard/audience",
      description: "Contact search workspace",
      maturity: "functional",
      group: "Core",
    },
    {
      id: "relationships",
      label: "Relationships",
      href: "/dashboard/audience",
      description: "Customer relationships",
      maturity: "functional",
      group: "Core",
    },
    {
      id: "consent",
      label: "Consent",
      href: "/dashboard/audience",
      description: "Channel consent records",
      maturity: "functional",
      group: "Core",
    },
    {
      id: "tapsave",
      label: "TapSave",
      href: "/dashboard/audience",
      description: "Keep Card capture",
      maturity: "functional",
      featureId: "tapsave.core",
      group: "Retention",
    },
    {
      id: "mytap",
      label: "MyTap",
      href: "/dashboard/audience",
      description: "Visitor preference surface",
      maturity: "functional",
      featureId: "tapsave.core",
      group: "Retention",
    },
    {
      id: "wallet",
      label: "Wallet",
      href: "/dashboard/audience/wallet",
      description: "Pass lifecycle (mock adapter)",
      maturity: "verified_needs_credentials",
      featureId: "wallet.apple_google",
      group: "Retention",
    },
    {
      id: "moments",
      label: "TapSave Moments",
      href: "/dashboard/audience",
      description: "Saved relationship moments",
      maturity: "functional",
      featureId: "tapsave.core",
      group: "Retention",
    },
    {
      id: "email",
      label: "Email",
      href: "/dashboard/settings",
      description: "Mock adapter + suppression; live Resend optional",
      maturity: "verified_needs_credentials",
      featureId: "comms.email",
      group: "Comms",
    },
    {
      id: "inbox",
      label: "TapInbox",
      href: "/dashboard/audience/inbox",
      description: "Threads and replies",
      maturity: "functional",
      featureId: "comms.inbox",
      group: "Comms",
    },
    {
      id: "case",
      label: "TapCase",
      href: "/dashboard/audience/inbox",
      description: "Support case lifecycle",
      maturity: "functional",
      featureId: "comms.inbox",
      group: "Comms",
    },
    {
      id: "tapguide",
      label: "TapGuide",
      href: "/dashboard/audience",
      description: "Grounded help in context",
      maturity: "scaffolded",
      group: "Comms",
    },
    {
      id: "taploop",
      label: "TapLoop",
      href: "/dashboard/audience#taploop",
      description: "Loyalty enroll, award, redeem",
      maturity: "functional",
      featureId: "loyalty.taploop",
      group: "Loyalty",
    },
    {
      id: "loyalty",
      label: "Loyalty",
      href: "/dashboard/audience#taploop",
      description: "Programs and balances",
      maturity: "functional",
      featureId: "loyalty.taploop",
      group: "Loyalty",
    },
    {
      id: "rewards",
      label: "Rewards",
      href: "/dashboard/audience#taploop",
      description: "Redeem catalogs",
      maturity: "functional",
      featureId: "loyalty.taploop",
      group: "Loyalty",
    },
    {
      id: "referrals",
      label: "Referrals",
      href: "/dashboard/audience#taploop",
      description: "Referral rewards via TapLoop",
      maturity: "scaffolded",
      group: "Loyalty",
    },
    {
      id: "purchases",
      label: "Purchases",
      href: "/dashboard/experiences/orders",
      description: "Commerce purchase history",
      maturity: "beta",
      featureId: "commerce.tapcommerce",
      group: "Commerce",
    },
    {
      id: "commerce",
      label: "TapCommerce",
      href: "/dashboard/experiences/orders",
      description: "Mock checkout and refunds",
      maturity: "beta",
      featureId: "commerce.tapcommerce",
      group: "Commerce",
    },
    {
      id: "bookings",
      label: "Bookings",
      href: "/dashboard/experiences/orders",
      description: "Booking-style orders",
      maturity: "scaffolded",
      group: "Commerce",
    },
    {
      id: "orders",
      label: "Orders",
      href: "/dashboard/experiences/orders",
      description: "Order list and actions",
      maturity: "beta",
      featureId: "commerce.tapcommerce",
      group: "Commerce",
    },
    {
      id: "invoices",
      label: "Invoices",
      href: "/dashboard/experiences/orders",
      description: "Invoice stubs on orders",
      maturity: "scaffolded",
      group: "Commerce",
    },
  ],
  insights: [
    {
      id: "hub",
      label: "Insights hub",
      href: "/dashboard/insights",
      description: "KPIs, failure recovery, evidence",
      maturity: "functional",
      group: "Intelligence",
    },
    {
      id: "analytics",
      label: "V1 Analytics",
      href: "/dashboard/analytics",
      description: "Classic analytics views",
      maturity: "owner_ready",
      group: "Intelligence",
    },
    {
      id: "campaign",
      label: "Campaign analytics",
      href: "/dashboard/analytics",
      description: "Campaign performance",
      maturity: "owner_ready",
      group: "Performance",
    },
    {
      id: "card",
      label: "Card analytics",
      href: "/dashboard/insights",
      description: "Card engagement KPIs",
      maturity: "functional",
      group: "Performance",
    },
    {
      id: "tappoint",
      label: "Tap Point analytics",
      href: "/dashboard/insights",
      description: "Tap counts and fleet signals",
      maturity: "functional",
      group: "Performance",
    },
    {
      id: "comms",
      label: "Communication analytics",
      href: "/dashboard/insights",
      description: "Inbox and email signals",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "email",
      label: "Email",
      href: "/dashboard/insights",
      description: "Email readiness and volume",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "messaging",
      label: "Messaging",
      href: "/dashboard/insights",
      description: "Channel Guardian messaging",
      maturity: "scaffolded",
      group: "Channels",
    },
    {
      id: "social",
      label: "Social",
      href: "/dashboard/insights",
      description: "Social distribution metrics",
      maturity: "scaffolded",
      group: "Channels",
    },
    {
      id: "loyalty",
      label: "Loyalty",
      href: "/dashboard/insights",
      description: "TapLoop ledger activity",
      maturity: "functional",
      group: "Growth",
    },
    {
      id: "commerce",
      label: "Commerce",
      href: "/dashboard/experiences/orders",
      description: "Order outcomes",
      maturity: "beta",
      group: "Growth",
    },
    {
      id: "providers",
      label: "Provider health",
      href: "/dashboard/integrations",
      description: "Integration readiness",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "tapproof",
      label: "TapProof",
      href: "/dashboard/insights",
      description: "Evidence class on every metric",
      maturity: "functional",
      group: "Intelligence",
    },
    {
      id: "ai",
      label: "AI findings",
      href: "/dashboard/settings",
      description: "Automation Team findings",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
    },
  ],
  assets: [
    {
      id: "brand",
      label: "Brand Kit",
      href: "/dashboard/brand",
      description: "Logo, colors, voice",
      maturity: "owner_ready",
      group: "Brand",
    },
    {
      id: "media",
      label: "Media",
      href: "/dashboard/assets",
      description: "Uploaded media library",
      maturity: "owner_ready",
      group: "Libraries",
    },
    {
      id: "images",
      label: "Images",
      href: "/dashboard/assets",
      description: "Campaign images",
      maturity: "owner_ready",
      group: "Libraries",
    },
    {
      id: "logos",
      label: "Logos",
      href: "/dashboard/brand",
      description: "Business and campaign logos",
      maturity: "owner_ready",
      group: "Libraries",
    },
    {
      id: "icons",
      label: "Icons",
      href: "/dashboard/assets",
      description: "Icon assets in media",
      maturity: "functional",
      group: "Libraries",
    },
    {
      id: "fonts",
      label: "Fonts",
      href: "/dashboard/brand",
      description: "Brand typography",
      maturity: "functional",
      group: "Brand",
    },
    {
      id: "backgrounds",
      label: "Backgrounds",
      href: "/dashboard/assets",
      description: "Background media",
      maturity: "functional",
      group: "Libraries",
    },
    {
      id: "templates",
      label: "Templates",
      href: "/dashboard/campaigns",
      description: "Campaign templates",
      maturity: "functional",
      group: "Libraries",
    },
    {
      id: "sections",
      label: "Reusable sections",
      href: "/dashboard/workbench",
      description: "Block packs in builder",
      maturity: "alpha",
      group: "Libraries",
    },
    {
      id: "packs",
      label: "Block packs",
      href: "/dashboard/workbench",
      description: "Reusable block collections",
      maturity: "alpha",
      group: "Libraries",
    },
    {
      id: "fragments",
      label: "Content fragments",
      href: "/dashboard/workbench",
      description: "Copy fragments",
      maturity: "scaffolded",
      group: "Libraries",
    },
    {
      id: "translations",
      label: "Translations",
      href: "/dashboard/assets",
      description: "Locale packs",
      maturity: "scaffolded",
      group: "Rights",
    },
    {
      id: "rights",
      label: "Rights",
      href: "/dashboard/assets",
      description: "Usage rights metadata",
      maturity: "scaffolded",
      group: "Rights",
    },
  ],
  settings: [
    {
      id: "workspace",
      label: "Workspace",
      href: "/dashboard/settings",
      description: "Hub for workspace admin",
      maturity: "functional",
      group: "Workspace",
    },
    {
      id: "businesses",
      label: "Businesses",
      href: "/dashboard/settings",
      description: "Active business context",
      maturity: "functional",
      group: "Workspace",
    },
    {
      id: "locations",
      label: "Locations",
      href: "/dashboard/settings",
      description: "Multi-location ready",
      maturity: "scaffolded",
      group: "Workspace",
    },
    {
      id: "team",
      label: "Team",
      href: "/dashboard/settings",
      description: "Members via Clerk when configured",
      maturity: "verified_needs_credentials",
      group: "Access",
    },
    {
      id: "roles",
      label: "Roles",
      href: "/admin/platform/audit",
      description: "Permission matrix",
      maturity: "functional",
      group: "Access",
    },
    {
      id: "permissions",
      label: "Permissions",
      href: "/admin/platform/audit",
      description: "Studio RBAC map",
      maturity: "functional",
      group: "Access",
    },
    {
      id: "billing",
      label: "Billing",
      href: "/dashboard/billing",
      description: "Plans and Stripe readiness",
      maturity: "verified_needs_credentials",
      group: "Commercial",
    },
    {
      id: "entitlements",
      label: "Entitlements",
      href: "/dashboard/billing",
      description: "Plan entitlements",
      maturity: "functional",
      group: "Commercial",
    },
    {
      id: "integrations",
      label: "Integrations",
      href: "/dashboard/integrations",
      description: "Provider credentials",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "channels",
      label: "Channels",
      href: "/dashboard/integrations",
      description: "Email and messaging channels",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "api",
      label: "API",
      href: "/dashboard/integrations",
      description: "API keys checklist",
      maturity: "scaffolded",
      group: "Developers",
    },
    {
      id: "webhooks",
      label: "Webhooks",
      href: "/dashboard/settings",
      description: "Outbox-backed events",
      maturity: "functional",
      group: "Developers",
    },
    {
      id: "import_export",
      label: "Imports / exports",
      href: "/dashboard/leads",
      description: "Lead CSV export",
      maturity: "owner_ready",
      group: "Developers",
    },
    {
      id: "privacy",
      label: "Privacy",
      href: "/dashboard/settings",
      description: "Suppression and consent",
      maturity: "functional",
      group: "Trust",
    },
    {
      id: "security",
      label: "Security",
      href: "/dashboard/settings",
      description: "Session and auth mode",
      maturity: "functional",
      group: "Trust",
    },
    {
      id: "audit",
      label: "Audit",
      href: "/admin/platform/audit",
      description: "Platform audit trail",
      maturity: "functional",
      group: "Trust",
    },
    {
      id: "autopilot",
      label: "Automation Team",
      href: "/dashboard/settings",
      description: "Budget, ledger, Knowledge",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
    },
    {
      id: "registry",
      label: "Feature Registry",
      href: "/admin/platform",
      description: "Kill switches and overrides",
      maturity: "functional",
      group: "Control plane",
    },
    {
      id: "admin",
      label: "Platform Admin",
      href: "/admin/platform",
      description: "KPIs, outbox, fleet (authorized)",
      maturity: "functional",
      group: "Control plane",
    },
  ],
};

export const CREATE_ACTIONS: CreateAction[] = [
  {
    id: "card",
    label: "Card",
    href: "/dashboard/card",
    description: "Open Tap Card builder",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "experience",
    label: "Experience",
    href: "/dashboard/workbench",
    description: "New workbench experience",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "campaign",
    label: "Campaign",
    href: "/dashboard/campaigns",
    description: "Create from template",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "group",
    label: "Campaign Group",
    href: "/dashboard/groups",
    description: "Schedule and rotate",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "tapflow",
    label: "TapFlow",
    href: "/dashboard/experiences/journeys",
    description: "Journey editor",
    maturity: "functional",
    group: "Experiences",
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    href: "/dashboard/workbench",
    description: "Freeform canvas mode",
    maturity: "alpha",
    group: "Experiences",
  },
  {
    id: "email",
    label: "Email",
    href: "/dashboard/campaigns",
    description: "Campaign email follow-up",
    maturity: "functional",
    group: "Audience",
  },
  {
    id: "case",
    label: "TapCase",
    href: "/dashboard/audience/inbox",
    description: "Support case from Inbox",
    maturity: "functional",
    group: "Audience",
  },
  {
    id: "loyalty",
    label: "Loyalty program",
    href: "/dashboard/audience#taploop",
    description: "TapLoop program forms",
    maturity: "functional",
    group: "Audience",
  },
  {
    id: "reward",
    label: "Reward",
    href: "/dashboard/audience#taploop",
    description: "Award or redeem points",
    maturity: "functional",
    group: "Audience",
  },
  {
    id: "offer",
    label: "Offer",
    href: "/dashboard/workbench",
    description: "Offer block in builder",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "order",
    label: "Order",
    href: "/dashboard/experiences/orders",
    description: "Mock TapCommerce order",
    maturity: "beta",
    group: "Audience",
  },
  {
    id: "device",
    label: "Device / Tap Point",
    href: "/dashboard/devices",
    description: "Create device slot",
    maturity: "owner_ready",
    group: "Tap Points",
  },
  {
    id: "scan",
    label: "Scan session",
    href: "/dashboard/scan",
    description: "Start Scan Mode",
    maturity: "owner_ready",
    group: "Tap Points",
  },
  {
    id: "form",
    label: "Form",
    href: "/dashboard/workbench",
    description: "Lead capture block",
    maturity: "owner_ready",
    group: "Experiences",
  },
  {
    id: "template",
    label: "Template",
    href: "/dashboard/campaigns",
    description: "Start from campaign template",
    maturity: "functional",
    group: "Assets",
  },
  {
    id: "section",
    label: "Reusable section",
    href: "/dashboard/workbench",
    description: "Block pack in builder",
    maturity: "alpha",
    group: "Assets",
  },
  {
    id: "moment",
    label: "TapSave Moment",
    href: "/dashboard/audience",
    description: "Relationship moments",
    maturity: "functional",
    group: "Audience",
  },
  {
    id: "message",
    label: "Message flow",
    href: "/dashboard/experiences/journeys",
    description: "TapFlow message node",
    maturity: "functional",
    group: "Experiences",
  },
  {
    id: "social",
    label: "Social distribution",
    href: "/dashboard/experiences#tapcast",
    description: "TapCast packs",
    maturity: "scaffolded",
    group: "Experiences",
  },
  {
    id: "booking",
    label: "Booking",
    href: "/dashboard/experiences/orders",
    description: "Booking-style order",
    maturity: "scaffolded",
    group: "Audience",
  },
];

/**
 * @deprecated Prefer resolveSectionReadiness() — static OWNER-READY must not appear in UI.
 * Labels below are provisional only; hub badges use derived DisplayReadiness.
 */
export const MATURITY_LABEL: Record<StudioMaturity, string> = {
  owner_ready: "FUNCTIONAL — FINAL VERIFICATION REQUIRED",
  functional: "FUNCTIONAL — FINAL VERIFICATION REQUIRED",
  beta: "FUNCTIONAL — FINAL VERIFICATION REQUIRED",
  alpha: "INTEGRATED — INCOMPLETE WORKFLOW",
  internal: "INTERNAL",
  verified_needs_credentials: "VERIFIED — CREDENTIALS REQUIRED",
  scaffolded: "DEVELOPMENT",
  disabled: "DISABLED",
};

export function resolveStudioDestination(pathname: string): StudioNavItem {
  let best: StudioNavItem | null = null;
  let bestLen = -1;
  for (const item of STUDIO_NAV) {
    const candidates = [item.href, ...item.aliases];
    for (const c of candidates) {
      if (pathname === c || pathname.startsWith(c + "/")) {
        if (c.length > bestLen) {
          best = item;
          bestLen = c.length;
        }
      }
    }
  }
  return best ?? STUDIO_NAV[0]!;
}

export function sectionsForDestination(navId: string): StudioSection[] {
  return STUDIO_SECTIONS[navId] ?? [];
}

export function groupSections(sections: StudioSection[]): Array<{
  group: string;
  items: StudioSection[];
}> {
  const map = new Map<string, StudioSection[]>();
  for (const s of sections) {
    const g = s.group ?? "General";
    const list = map.get(g) ?? [];
    list.push(s);
    map.set(g, list);
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }));
}

/** Flat search index for command palette */
export function studioSearchIndex(): Array<{
  id: string;
  label: string;
  href: string;
  hint: string;
}> {
  const out: Array<{ id: string; label: string; href: string; hint: string }> = [];
  for (const nav of STUDIO_NAV) {
    out.push({
      id: `nav-${nav.id}`,
      label: nav.label,
      href: nav.href,
      hint: "Primary",
    });
    for (const s of sectionsForDestination(nav.id)) {
      out.push({
        id: `sec-${nav.id}-${s.id}`,
        label: s.label,
        href: s.href,
        hint: `${nav.label} · ${MATURITY_LABEL[s.maturity]}`,
      });
    }
  }
  for (const a of CREATE_ACTIONS) {
    out.push({
      id: `create-${a.id}`,
      label: `Create ${a.label}`,
      href: a.href,
      hint: a.group,
    });
  }
  return out;
}
