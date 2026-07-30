/**
 * Final Studio IA — seven permanent destinations + secondary sections + Create.
 * V1 capability is preserved via aliases; Fusion pillars are discoverable here.
 *
 * TapCast IA rule: TikTok (and every mainstream social channel) lives inside the
 * TapCast workspace channel subnav — never as a permanent Experiences sibling row.
 */

import { CREATE_RECIPES } from "@/lib/fusion/studio/create-recipes";

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
  /**
   * Shared surface this entry opens when it is not a dedicated route.
   * Required by honesty checks when multiple labels would otherwise fan into one href.
   */
  opensSurface?: string;
};

/**
 * Create menu intent — visible honesty for ID-005.
 * - create: starts (or lands on) a real authoring/create surface
 * - open: navigates to an existing hub/list — label must not say “Create X” alone
 * - unavailable: scaffolded / not shipped — must be disabled with reason
 */
export type CreateIntent = "create" | "open" | "unavailable";

export type CreateAction = {
  id: string;
  label: string;
  href: string;
  description: string;
  maturity: StudioMaturity;
  group: string;
  /** How the menu presents this destination (defaults to create for back-compat). */
  intent?: CreateIntent;
  /** When intent is unavailable — exact missing dependency. */
  unavailableReason?: string;
};

export const STUDIO_NAV: StudioNavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    aliases: ["/dashboard"],
    description: "What needs attention and what to do next",
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
      "/dashboard/experiences/canvas",
    ],
    description: "Card, Campaigns, Email, TapCanvas, and journeys",
  },
  {
    id: "tap_points",
    label: "Tap Points",
    href: "/dashboard/tap-points",
    aliases: ["/dashboard/devices", "/dashboard/scan", "/dashboard/pulse"],
    description: "Connect and manage physical and digital entry points",
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
    description: "People, Inbox, Wallet, and loyalty",
  },
  {
    id: "insights",
    label: "Insights",
    href: "/dashboard/insights",
    aliases: ["/dashboard/analytics"],
    description: "Results, proof, and performance",
  },
  {
    id: "assets",
    label: "Assets",
    href: "/dashboard/assets",
    aliases: ["/dashboard/brand", "/dashboard/brand/edit"],
    description: "Media, logos, Brand Kit, and Collections",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    aliases: ["/dashboard/integrations", "/dashboard/billing"],
    description: "Workspace, connections, billing, and team",
  },
];

export const PULSE_HREF = "/dashboard/pulse" as const;

/**
 * Studio secondary sections — labels must name the real surface when sharing a route.
 * Prefer unique destinations; when aliasing, set opensSurface and name it in the label.
 */
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
      description: "Fleet health rollup on Tap Points",
      maturity: "functional",
      group: "Activity",
      opensSurface: "Tap Points",
    },
    {
      id: "autopilot",
      label: "Autopilot · measurable Card offer",
      href: "/dashboard/card?wire=offer",
      description:
        "Outcome Autopilot for Card offers — local plan review (campaign workbench keeps draft generation)",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
      opensSurface: "Card assembly",
    },
  ],
  experiences: [
    {
      id: "cards",
      label: "Cards",
      href: "/dashboard/card",
      description: "Tap Card assembly · fuse-box hub",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "card-edit",
      label: "Edit Card",
      href: "/dashboard/card/edit",
      description: "Full-screen Card authoring workspace",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "workbench",
      label: "Campaign workbench",
      href: "/dashboard/workbench",
      description: "Block-by-block campaign workbench",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "campaigns",
      label: "Campaigns",
      href: "/dashboard/campaigns",
      description: "Draft, schedule, publish, and revisions",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "groups",
      label: "Campaign Groups",
      href: "/dashboard/groups",
      description: "Schedules, rotations, and resolver preview",
      maturity: "owner_ready",
      group: "Build",
    },
    {
      id: "tapcanvas",
      label: "TapCanvas",
      href: "/dashboard/experiences/canvas",
      description: "Freeform workspace for planning, mood boards, and visual layouts",
      maturity: "functional",
      featureId: "canvas.tapcanvas",
      group: "Build",
    },
    {
      id: "whiteboard",
      label: "Campaign planning board · Campaign workbench",
      href: "/dashboard/workbench",
      description: "Campaign authoring workspace — use TapCanvas for freeform layouts",
      maturity: "functional",
      group: "Build",
      opensSurface: "Campaign workbench",
    },
    {
      id: "distribution",
      label: "Assign to devices",
      href: "/dashboard/devices",
      description: "Assign campaigns on the Devices inventory",
      maturity: "owner_ready",
      group: "Distribution",
      opensSurface: "Devices",
    },
    {
      id: "tapcast",
      label: "TapCast",
      href: "/dashboard/experiences/tapcast",
      description:
        "Omnichannel social distribution — channel registry with TikTok first-class inside TapCast (not a sibling Experiences product)",
      maturity: "verified_needs_credentials",
      featureId: "tapcast.omnichannel",
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
      label: "TapTrail · Insights",
      href: "/dashboard/insights",
      description: "Coming later — opens Insights for now",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "Insights",
    },
    {
      id: "orders",
      label: "Orders",
      href: "/dashboard/experiences/orders",
      description: "Checkout simulation for testing — not live commerce",
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
      description: "Registry, health, capacity, placement",
      maturity: "functional",
      group: "Fleet",
    },
    {
      id: "devices",
      label: "Devices",
      href: "/dashboard/devices",
      description: "Device inventory, provisioning, and replacement",
      maturity: "owner_ready",
      group: "Fleet",
    },
    {
      id: "sets",
      label: "Sets & rotations · Campaign Groups",
      href: "/dashboard/groups",
      description: "Device sets and scheduled rotations live in Campaign Groups",
      maturity: "functional",
      group: "Fleet",
      opensSurface: "Campaign Groups",
    },
    {
      id: "scan",
      label: "Scan Mode",
      href: "/dashboard/scan",
      description: "Activate and claim Tap Points on-site",
      maturity: "owner_ready",
      group: "Field",
    },
    {
      id: "pulse",
      label: "Pulse",
      href: "/dashboard/pulse",
      description: "Field shell for fleet health — claim and offline coming later",
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
      description: "Lead list and CSV export",
      maturity: "owner_ready",
      group: "Core",
    },
    {
      id: "contacts",
      label: "Audience workspace",
      href: "/dashboard/audience#workspace",
      description: "Contacts, relationships, consent, TapSave/MyTap in one workspace",
      maturity: "functional",
      group: "Core",
    },
    {
      id: "wallet",
      label: "Wallet",
      href: "/dashboard/audience/wallet",
      description: "Pass lifecycle — connection required for live issuance",
      maturity: "verified_needs_credentials",
      featureId: "wallet.apple_google",
      group: "Retention",
    },
    {
      id: "email",
      label: "Email readiness · Settings",
      href: "/dashboard/settings",
      description: "Mock adapter + suppression; live Resend optional — on Settings",
      maturity: "verified_needs_credentials",
      featureId: "comms.email",
      group: "Comms",
      opensSurface: "Settings",
    },
    {
      id: "inbox",
      label: "TapInbox",
      href: "/dashboard/audience/inbox",
      description: "Threads, replies, and TapCase support lifecycle",
      maturity: "functional",
      featureId: "comms.inbox",
      group: "Comms",
    },
    {
      id: "tapguide",
      label: "TapGuide · Audience",
      href: "/dashboard/audience",
      description: "Coming later — opens Audience for now",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "Audience",
    },
    {
      id: "taploop",
      label: "TapLoop",
      href: "/dashboard/audience#taploop",
      description: "Loyalty enroll, award, redeem, programs, and rewards",
      maturity: "functional",
      featureId: "loyalty.taploop",
      group: "Loyalty",
    },
    {
      id: "referrals",
      label: "Referrals · TapLoop",
      href: "/dashboard/audience#taploop",
      description: "Coming later — opens TapLoop for now",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "TapLoop",
    },
    {
      id: "orders",
      label: "Orders",
      href: "/dashboard/experiences/orders",
      description: "Checkout simulation and order history for testing",
      maturity: "beta",
      featureId: "commerce.tapcommerce",
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
      label: "Analytics",
      href: "/dashboard/analytics",
      description: "Classic analytics views",
      maturity: "owner_ready",
      group: "Intelligence",
    },
    {
      id: "campaign",
      label: "Campaign analytics",
      href: "/dashboard/insights?view=campaign&compare=1",
      description: "Campaign performance + compare",
      maturity: "functional",
      group: "Performance",
    },
    {
      id: "card",
      label: "Card analytics",
      href: "/dashboard/insights?view=card",
      description: "Card engagement KPIs",
      maturity: "functional",
      group: "Performance",
    },
    {
      id: "tappoint",
      label: "Tap Point analytics",
      href: "/dashboard/insights?view=tappoint",
      description: "Tap counts and fleet signals",
      maturity: "functional",
      group: "Performance",
    },
    {
      id: "comms",
      label: "Communication analytics",
      href: "/dashboard/insights?view=comms",
      description: "Inbox and email signals",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "email",
      label: "Email evidence",
      href: "/dashboard/insights?view=comms&evidence=confirmed",
      description: "Email readiness and volume with confirmed evidence filter",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "messaging",
      label: "Messaging — scaffolded · Comms view",
      href: "/dashboard/insights?view=comms",
      description: "No dedicated messaging analytics — opens Comms Insights view",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "Communication analytics",
    },
    {
      id: "social",
      label: "Social — scaffolded · Provider view",
      href: "/dashboard/insights?view=provider",
      description: "No dedicated social analytics — opens Provider health view",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "Provider health",
    },
    {
      id: "loyalty",
      label: "Loyalty",
      href: "/dashboard/insights?view=loyalty",
      description: "TapLoop ledger activity",
      maturity: "functional",
      group: "Growth",
    },
    {
      id: "commerce",
      label: "Commerce",
      href: "/dashboard/insights?view=commerce",
      description: "Order outcomes + modeled evidence",
      maturity: "beta",
      group: "Growth",
    },
    {
      id: "providers",
      label: "Provider health",
      href: "/dashboard/insights?view=provider",
      description: "Integration readiness",
      maturity: "functional",
      group: "Operations",
    },
    {
      id: "tapproof",
      label: "TapProof",
      href: "/dashboard/insights?view=tapproof",
      description: "Evidence class on every metric",
      maturity: "functional",
      group: "Intelligence",
    },
    {
      id: "ai",
      label: "AI findings · Settings",
      href: "/dashboard/settings",
      description: "Automation Team findings on Settings — not a separate Insights view",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
      opensSurface: "Settings",
    },
  ],
  assets: [
    {
      id: "brand",
      label: "Brand Kit",
      href: "/dashboard/brand/edit",
      description: "Focused Brand workspace · classic form under Advanced",
      maturity: "owner_ready",
      group: "Brand",
    },
    {
      id: "brand-classic",
      label: "Legacy Brand administration",
      href: "/dashboard/brand",
      description: "Classic Brand Kit form — advanced compatibility path",
      maturity: "functional",
      group: "Advanced",
      opensSurface: "Brand Kit classic",
    },
    {
      id: "media",
      label: "Media library",
      href: "/dashboard/assets",
      description: "Uploaded images, icons, and backgrounds",
      maturity: "owner_ready",
      group: "Libraries",
    },
    {
      id: "templates",
      label: "Templates · Campaigns",
      href: "/dashboard/campaigns",
      description: "Campaign templates live on Campaigns — not a separate Assets library",
      maturity: "functional",
      group: "Libraries",
      opensSurface: "Campaigns",
    },
    {
      id: "sections",
      label: "Reusable sections · Campaign workbench",
      href: "/dashboard/workbench",
      description: "Block packs in the campaign workbench",
      maturity: "alpha",
      group: "Libraries",
      opensSurface: "Campaign workbench",
    },
    {
      id: "fragments",
      label: "Content fragments · Campaign workbench",
      href: "/dashboard/workbench",
      description: "Coming later — opens Campaign workbench for now",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "Campaign workbench",
    },
    {
      id: "translations",
      label: "Translations & rights · Assets",
      href: "/dashboard/assets",
      description: "Coming later — opens Assets for now",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "Assets",
    },
  ],
  settings: [
    {
      id: "workspace",
      label: "Workspace",
      href: "/dashboard/settings",
      description: "Active business context, privacy, security, and outbox recovery",
      maturity: "functional",
      group: "Workspace",
    },
    {
      id: "locations",
      label: "Locations · Settings",
      href: "/dashboard/settings",
      description: "Coming later — Settings is single-workspace today",
      maturity: "scaffolded",
      group: "More",
      opensSurface: "Settings",
    },
    {
      id: "team",
      label: "Team · Settings",
      href: "/dashboard/settings",
      description: "Members via Clerk when configured — on Settings",
      maturity: "verified_needs_credentials",
      group: "Access",
      opensSurface: "Settings",
    },
    {
      id: "roles",
      label: "Roles & permissions",
      href: "/admin/platform/audit",
      description: "Permission matrix and Studio RBAC map",
      maturity: "functional",
      group: "Access",
    },
    {
      id: "billing",
      label: "Billing & entitlements",
      href: "/dashboard/billing",
      description: "Plans, Stripe readiness, and plan entitlements",
      maturity: "verified_needs_credentials",
      group: "Commercial",
    },
    {
      id: "integrations",
      label: "Integrations",
      href: "/dashboard/integrations",
      description: "Provider credentials and channel checklist",
      maturity: "functional",
      group: "Channels",
    },
    {
      id: "productivity_work",
      label: "Productivity & Work Management",
      href: "/dashboard/integrations#productivity-work",
      description:
        "monday.com family, Asana, Slack, Teams, Notion, Jira, automation — ExternalWorkItem",
      maturity: "verified_needs_credentials",
      group: "Channels",
    },
    {
      id: "api",
      label: "API keys — checklist · Integrations",
      href: "/dashboard/integrations",
      description: "API key checklist on Integrations — not a separate developer console",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "Integrations",
    },
    {
      id: "import_export",
      label: "Imports / exports · Leads",
      href: "/dashboard/leads",
      description: "Lead CSV export on Leads",
      maturity: "owner_ready",
      group: "Developers",
      opensSurface: "Leads",
    },
    {
      id: "audit",
      label: "Audit · Platform Admin",
      href: "/admin/platform/audit",
      description: "Platform audit trail — same Admin audit surface as roles",
      maturity: "functional",
      group: "Trust",
      opensSurface: "Roles & permissions",
    },
    {
      id: "autopilot",
      label: "Automation Team · Settings",
      href: "/dashboard/settings",
      description: "Budget, ledger, Knowledge on Settings",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
      opensSurface: "Settings",
    },
    {
      id: "registry",
      label: "Feature Registry · Platform Admin",
      href: "/admin/platform",
      description: "Kill switches and overrides on Platform Admin",
      maturity: "functional",
      group: "Control plane",
      opensSurface: "Platform Admin",
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
    label: "Build my customer Card",
    href: "/dashboard/card",
    description: "Create or improve the Card relationship hub",
    maturity: "owner_ready",
    group: "Primary",
    intent: "create",
  },
  {
    id: "campaign",
    label: "Promote something",
    href: "/dashboard/workbench",
    description: "Start a Campaign that supports the Card",
    maturity: "owner_ready",
    group: "Primary",
    intent: "create",
  },
  {
    id: "email",
    label: "Prepare an Email",
    href: "/dashboard/campaigns",
    description: "Open campaigns to prepare Email (no live send)",
    maturity: "functional",
    group: "Primary",
    intent: "open",
  },
  {
    id: "tap_point",
    label: "Connect a Tap Point",
    href: "/dashboard/devices#create",
    description: "Register entry so customers can reach the Card",
    maturity: "owner_ready",
    group: "Primary",
    intent: "create",
  },
  {
    id: "create-card-edit",
    label: "Edit Card",
    href: "/dashboard/card/edit",
    description: "Full-screen Card editor",
    maturity: "owner_ready",
    group: "Primary",
    intent: "create",
  },
  {
    id: "experience",
    label: "Experience",
    href: "/dashboard/workbench",
    description: "Start from workbench templates",
    maturity: "owner_ready",
    group: "Experiences",
    intent: "create",
  },
  {
    id: "group",
    label: "Campaign Group",
    href: "/dashboard/groups#create",
    description: "Create a shared day/time schedule",
    maturity: "owner_ready",
    group: "Experiences",
    intent: "create",
  },
  {
    id: "tapflow",
    label: "Open TapFlow",
    href: "/dashboard/experiences/journeys",
    description: "Journey editor hub — pick or start a draft there",
    maturity: "functional",
    group: "Experiences",
    intent: "open",
  },
  {
    id: "tapcanvas",
    label: "Open TapCanvas",
    href: "/dashboard/experiences/canvas",
    description: "Linked object graph — Sketch/Build/Operate/Analyze",
    maturity: "alpha",
    group: "More tools",
    intent: "open",
  },
  {
    id: "whiteboard",
    label: "Open Campaign planning board",
    href: "/dashboard/workbench",
    description: "Opens Campaign authoring — prefer TapCanvas for freeform layouts",
    maturity: "alpha",
    group: "More tools",
    intent: "open",
  },
  {
    id: "tiktok_cast",
    label: "Open TikTok in TapCast",
    href: "/dashboard/experiences/tapcast/tiktok",
    description: "TapCast channel — live publish needs credentials",
    maturity: "verified_needs_credentials",
    group: "More tools",
    intent: "open",
  },
  {
    id: "tapcast_distribution",
    label: "Open TapCast",
    href: "/dashboard/experiences/tapcast",
    description: "Omnichannel hub — live channels need credentials",
    maturity: "verified_needs_credentials",
    group: "More tools",
    intent: "open",
  },
  {
    id: "case",
    label: "Open Inbox (TapCase)",
    href: "/dashboard/audience/inbox",
    description: "Cases are created from conversations — not a blank wizard",
    maturity: "functional",
    group: "Audience",
    intent: "open",
  },
  {
    id: "loyalty",
    label: "Open TapLoop",
    href: "/dashboard/audience#taploop",
    description: "Loyalty program forms on Audience",
    maturity: "functional",
    group: "Audience",
    intent: "open",
  },
  {
    id: "reward",
    label: "Open TapLoop rewards",
    href: "/dashboard/audience#taploop",
    description: "Award or redeem on the TapLoop panel",
    maturity: "functional",
    group: "Audience",
    intent: "open",
  },
  {
    id: "offer",
    label: "Open workbench (offer block)",
    href: "/dashboard/workbench",
    description: "Add an offer block inside a campaign — not a separate create",
    maturity: "owner_ready",
    group: "Experiences",
    intent: "open",
  },
  {
    id: "order",
    label: "Order (mock)",
    href: "/dashboard/experiences/orders",
    description: "Create a mock TapCommerce draft on the orders panel",
    maturity: "beta",
    group: "Audience",
    intent: "create",
  },
  {
    id: "device",
    label: "Device / Tap Point",
    href: "/dashboard/devices#create",
    description: "Create device slot",
    maturity: "owner_ready",
    group: "Tap Points",
    intent: "create",
  },
  {
    id: "scan",
    label: "Scan session",
    href: "/dashboard/scan",
    description: "Start Scan Mode",
    maturity: "owner_ready",
    group: "Tap Points",
    intent: "create",
  },
  {
    id: "form",
    label: "Open workbench (lead form)",
    href: "/dashboard/workbench",
    description: "Lead capture is a campaign block — not a separate form create",
    maturity: "owner_ready",
    group: "Experiences",
    intent: "open",
  },
  {
    id: "template",
    label: "Open workbench templates",
    href: "/dashboard/workbench",
    description: "Template gallery starts a campaign — not the campaigns list",
    maturity: "functional",
    group: "Assets",
    intent: "open",
  },
  {
    id: "section",
    label: "Open workbench (sections)",
    href: "/dashboard/workbench",
    description: "Reusable section packs are alpha — author inside builder",
    maturity: "alpha",
    group: "Assets",
    intent: "open",
  },
  {
    id: "moment",
    label: "Open Audience (moments)",
    href: "/dashboard/audience#workspace",
    description: "Moments appear on relationships — no standalone moment wizard",
    maturity: "functional",
    group: "Audience",
    intent: "open",
  },
  {
    id: "message",
    label: "Open TapFlow (messages)",
    href: "/dashboard/experiences/journeys",
    description: "Message nodes live inside journeys",
    maturity: "functional",
    group: "Experiences",
    intent: "open",
  },
  {
    id: "social",
    label: "Open TapCast",
    href: "/dashboard/experiences/tapcast",
    description: "Same TapCast hub — channels nested inside",
    maturity: "verified_needs_credentials",
    group: "Experiences",
    intent: "open",
  },
  {
    id: "booking",
    label: "Booking",
    href: "/dashboard/experiences/orders",
    description: "Booking create is coming later",
    maturity: "scaffolded",
    group: "Audience",
    intent: "unavailable",
    unavailableReason: "Booking wizard is coming later — Orders is a checkout simulation only",
  },
];

/** Menu label with honest verb for non-create intents. */
export function createActionMenuLabel(action: CreateAction): string {
  const intent = action.intent ?? "create";
  if (intent === "unavailable") return `${action.label} — not available`;
  if (intent === "open") {
    return action.label.startsWith("Open ") ? action.label : `Open ${action.label}`;
  }
  return action.label;
}

/** Guard: create-intent items must not land on pure list hubs that oversell. */
export function findDishonestCreateActions(
  actions: CreateAction[] = CREATE_ACTIONS
): string[] {
  const listOnlyHubs = new Set([
    "/dashboard/campaigns",
    "/dashboard/audience",
  ]);
  const problems: string[] = [];
  for (const a of actions) {
    const intent = a.intent ?? "create";
    if (intent === "create" && listOnlyHubs.has(a.href.split("#")[0]!)) {
      problems.push(
        `${a.id}: intent=create but href is list hub ${a.href} — use workbench or #create`
      );
    }
    if (intent === "create" && /^(Open |open )/i.test(a.label)) {
      problems.push(`${a.id}: intent=create but label looks like Open`);
    }
    if (intent === "unavailable" && a.maturity !== "scaffolded" && a.maturity !== "disabled") {
      problems.push(`${a.id}: unavailable should be scaffolded/disabled maturity`);
    }
    if (intent === "unavailable" && !a.unavailableReason) {
      problems.push(`${a.id}: unavailable missing reason`);
    }
  }
  return problems;
}

/**
 * @deprecated Prefer resolveSectionReadiness() — static OWNER-READY must not appear in UI.
 * Labels below are provisional only; hub badges use derived DisplayReadiness.
 */
/** Owner-facing maturity chips in Studio search / chrome. */
export const MATURITY_LABEL: Record<StudioMaturity, string> = {
  owner_ready: "Ready",
  functional: "Available",
  beta: "Available",
  alpha: "Setup needed",
  internal: "Coming later",
  verified_needs_credentials: "Credentials required",
  scaffolded: "Coming later",
  disabled: "Not included in your plan",
};

/** Platform Admin / honesty diagnostics — engineering classifications. */
export const ENGINEERING_MATURITY_LABEL: Record<StudioMaturity, string> = {
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

/**
 * Shared-route honesty: when multiple section rows share an exact href,
 * every non-primary row must declare opensSurface and name that surface in the label.
 * Returns empty array when IA is honest.
 */
export function findDishonestAliasFanIn(
  sectionsByNav: Record<string, StudioSection[]> = STUDIO_SECTIONS
): string[] {
  const problems: string[] = [];
  for (const [navId, sections] of Object.entries(sectionsByNav)) {
    const byHref = new Map<string, StudioSection[]>();
    for (const s of sections) {
      const list = byHref.get(s.href) ?? [];
      list.push(s);
      byHref.set(s.href, list);
    }
    for (const [href, group] of byHref) {
      if (group.length < 2) continue;
      const withoutSurface = group.filter((s) => !s.opensSurface);
      if (withoutSurface.length > 1) {
        problems.push(
          `${navId}: href ${href} has ${withoutSurface.length} rows without opensSurface (${withoutSurface
            .map((s) => s.id)
            .join(", ")})`
        );
      }
      for (const s of group) {
        if (!s.opensSurface) continue;
        const surfaceToken = s.opensSurface.toLowerCase();
        const labelOk =
          s.label.toLowerCase().includes(surfaceToken) ||
          s.label.includes("·") ||
          /coming later/i.test(s.label);
        if (!labelOk) {
          problems.push(
            `${navId}/${s.id}: opensSurface="${s.opensSurface}" but label "${s.label}" does not name the surface`
          );
        }
      }
    }
  }
  return problems;
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
  // Outcome recipes first in search scent
  for (const r of CREATE_RECIPES) {
    out.push({
      id: `recipe-${r.id}`,
      label: r.label,
      href: r.href,
      hint: `Outcome · ${r.group}`,
    });
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
