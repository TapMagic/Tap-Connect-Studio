/**
 * Final Studio IA — seven permanent destinations + secondary sections + Create.
 * V1 capability is preserved via aliases; Fusion pillars are discoverable here.
 *
 * TapCast IA rule: TikTok (and every mainstream social channel) lives inside the
 * TapCast workspace channel subnav — never as a permanent Experiences sibling row.
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
  /**
   * Shared surface this entry opens when it is not a dedicated route.
   * Required by honesty checks when multiple labels would otherwise fan into one href.
   */
  opensSurface?: string;
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
      label: "Automation Team · Campaign workbench",
      href: "/dashboard/workbench",
      description: "Contextual Autopilot lives in the campaign workbench (not a separate surface)",
      maturity: "functional",
      featureId: "ai.autopilot",
      group: "Intelligence",
      opensSurface: "Campaign workbench",
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
      description: "Sketch · Build · Operate · Analyze — linked object graph",
      maturity: "alpha",
      featureId: "canvas.tapcanvas",
      group: "Build",
    },
    {
      id: "whiteboard",
      label: "Whiteboard (legacy) · Campaign workbench",
      href: "/dashboard/workbench",
      description: "Same campaign workbench — prefer TapCanvas for freeform graphs",
      maturity: "alpha",
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
      label: "TapTrail — not shipped · Insights",
      href: "/dashboard/insights",
      description: "No dedicated TapTrail surface yet — opens Insights hub",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "Insights",
    },
    {
      id: "orders",
      label: "Orders (TapCommerce mock)",
      href: "/dashboard/experiences/orders",
      description: "Mock checkout, refunds, and order list",
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
      description: "V1 device inventory, provisioning, and replacement",
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
      description: "Field shell — fleet health; claim/offline not shipped",
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
      description: "Pass lifecycle (mock adapter)",
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
      label: "TapGuide — not shipped · Audience hub",
      href: "/dashboard/audience",
      description: "No dedicated TapGuide surface yet — opens Audience hub",
      maturity: "scaffolded",
      group: "Labs",
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
      label: "Referrals — not shipped · TapLoop",
      href: "/dashboard/audience#taploop",
      description: "Referral product not shipped — opens TapLoop on Audience",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "TapLoop",
    },
    {
      id: "orders",
      label: "Orders (TapCommerce mock)",
      href: "/dashboard/experiences/orders",
      description: "Mock purchase history, bookings stubs, and invoices live here",
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
      label: "V1 Analytics",
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
      href: "/dashboard/brand",
      description: "Logo, colors, fonts, voice, keyword Brand Pack",
      maturity: "owner_ready",
      group: "Brand",
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
      label: "Content fragments — not shipped · Workbench",
      href: "/dashboard/workbench",
      description: "No fragment library yet — opens campaign workbench",
      maturity: "scaffolded",
      group: "Labs",
      opensSurface: "Campaign workbench",
    },
    {
      id: "translations",
      label: "Translations & rights — not shipped · Assets hub",
      href: "/dashboard/assets",
      description: "Locale packs and rights metadata are not shipped — opens Assets hub",
      maturity: "scaffolded",
      group: "Labs",
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
      label: "Locations — multi-facility not shipped",
      href: "/dashboard/settings",
      description: "No location switcher yet — Settings is single-workspace only",
      maturity: "scaffolded",
      group: "Labs",
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
    id: "tapcanvas",
    label: "TapCanvas",
    href: "/dashboard/experiences/canvas",
    description: "Linked object graph — Sketch/Build/Operate/Analyze",
    maturity: "alpha",
    group: "Experiences",
  },
  {
    id: "whiteboard",
    label: "Whiteboard (legacy)",
    href: "/dashboard/workbench",
    description: "Opens campaign workbench — prefer TapCanvas",
    maturity: "alpha",
    group: "Experiences",
  },
  {
    id: "tiktok_cast",
    label: "TikTok content",
    href: "/dashboard/experiences/tapcast/tiktok",
    description: "Create TikTok cast via TapCast (first-class channel)",
    maturity: "verified_needs_credentials",
    group: "Experiences",
  },
  {
    id: "tapcast_distribution",
    label: "TapCast distribution",
    href: "/dashboard/experiences/tapcast",
    description: "Omnichannel campaign variants + channel registry",
    maturity: "verified_needs_credentials",
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
    href: "/dashboard/experiences/tapcast",
    description: "TapCast omnichannel hub — TikTok and other channels inside",
    maturity: "verified_needs_credentials",
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
          /not shipped/i.test(s.label);
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
