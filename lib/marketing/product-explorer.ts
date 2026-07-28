/**
 * Public product explorer — single source of truth for landing capability content.
 * Terminology follows Fusion IA. Maturity honesty — no live-send / entitlement claims.
 */

import type { StudioZoneId } from "@/lib/fusion/studio/zone-tokens";
import type { AssemblyCapabilityId } from "@/lib/fusion/studio-assembly/types";

export type ExplorerMaturity =
  | "works_now"
  | "after_setup"
  | "local_or_test"
  | "planned"
  | "varies_by_plan";

export type ExplorerFeature = {
  id: string;
  name: string;
  description: string;
  maturity: ExplorerMaturity;
};

export type ProductExplorerCapability = {
  id: AssemblyCapabilityId;
  name: string;
  zone: StudioZoneId;
  shortDescription: string;
  cardRelationship: string;
  customerValue: string;
  features: ExplorerFeature[];
  icon: string;
  destinationHref: string | null;
  maturity: ExplorerMaturity;
  /** Placeholder category — not entitlement enforcement */
  planAvailability: "tapconnect_core" | "studio" | "varies_by_plan";
  screenshotHint?: string;
  ctaLabel: string;
  ctaHref: string;
  crossCutting?: boolean;
};

export const EXPLORER_MATURITY_LABEL: Record<ExplorerMaturity, string> = {
  works_now: "Works now",
  after_setup: "Available after setup",
  local_or_test: "Local or provider test",
  planned: "Planned",
  varies_by_plan: "Availability varies by plan",
};

export const PRODUCT_EXPLORER_CAPABILITIES: ProductExplorerCapability[] = [
  {
    id: "brand",
    name: "Brand Kit",
    zone: "brand",
    shortDescription:
      "Logo, color, typography, and visual identity that make the Card recognizably yours.",
    cardRelationship:
      "Brand Kit creates the visual system the Card already carries — identity arrives before Studio expands.",
    customerValue:
      "Customers see a coherent brand on first tap; you edit once and reuse across Card and Campaign surfaces.",
    features: [
      {
        id: "brand-kit-core",
        name: "Brand Kit workspace",
        description: "Manage logos, colors, and brand vocabulary for Card and experiences.",
        maturity: "works_now",
      },
      {
        id: "brand-vocabulary",
        name: "Brand vocabulary",
        description: "Store approved language and tone for prepared communications.",
        maturity: "local_or_test",
      },
    ],
    icon: "Palette",
    destinationHref: "/dashboard/assets",
    maturity: "works_now",
    planAvailability: "tapconnect_core",
    ctaLabel: "Explore Brand Kit",
    ctaHref: "#explorer-brand",
  },
  {
    id: "tap_points",
    name: "Tap Points",
    zone: "tap_points",
    shortDescription:
      "Physical and digital entry points that wake the Card when someone taps or scans.",
    cardRelationship:
      "Tap Points connect people to the Card — the same relationship hub, wherever the tap happens.",
    customerValue:
      "Replace hardware without rebuilding the experience; monitor health of every entry point.",
    features: [
      {
        id: "tap-point-fleet",
        name: "Fleet health",
        description: "See connected Tap Points and basic health signals from Home and Tap Points.",
        maturity: "works_now",
      },
      {
        id: "scan-mode",
        name: "Scan Mode",
        description: "Staff scan flows for assigning and verifying devices.",
        maturity: "works_now",
      },
    ],
    icon: "Nfc",
    destinationHref: "/dashboard/tap-points",
    maturity: "works_now",
    planAvailability: "tapconnect_core",
    ctaLabel: "Explore Tap Points",
    ctaHref: "#explorer-tap_points",
  },
  {
    id: "campaigns",
    name: "Campaigns",
    zone: "campaign",
    shortDescription:
      "Timely Spotlights and offers that attach to the Card without replacing the relationship hub.",
    cardRelationship:
      "Campaigns emerge from the Card as temporary activation — the Card remains the lasting hub.",
    customerValue:
      "Run seasonal offers, reviews, and promotions while keeping one stable customer relationship.",
    features: [
      {
        id: "campaign-workbench",
        name: "Campaign Workbench",
        description: "Build and schedule campaign experiences before assigning Tap Points.",
        maturity: "works_now",
      },
      {
        id: "campaign-spotlight",
        name: "Card Spotlight",
        description: "Surface an active campaign on the living Card.",
        maturity: "works_now",
      },
    ],
    icon: "Target",
    destinationHref: "/dashboard/experiences",
    maturity: "works_now",
    planAvailability: "tapconnect_core",
    ctaLabel: "Explore Campaigns",
    ctaHref: "#explorer-campaigns",
  },
  {
    id: "tapsave",
    name: "TapSave",
    zone: "card",
    shortDescription:
      "Retention path so customers can keep the Card and return without starting over.",
    cardRelationship:
      "TapSave keeps the relationship — a pocket/return path around the same Card.",
    customerValue:
      "Customers save once and come back; you retain context for the next visit.",
    features: [
      {
        id: "tapsave-keep",
        name: "Keep / MyTap",
        description: "Customer keep flow with relationship continuity on return.",
        maturity: "works_now",
      },
      {
        id: "wallet-passes",
        name: "Wallet passes",
        description: "Apple / Google Wallet presentation — requires provider configuration for production.",
        maturity: "after_setup",
      },
    ],
    icon: "Bookmark",
    destinationHref: "/dashboard/card",
    maturity: "works_now",
    planAvailability: "tapconnect_core",
    ctaLabel: "Explore TapSave",
    ctaHref: "#explorer-tapsave",
  },
  {
    id: "audience",
    name: "Audience & Relationships",
    zone: "audience",
    shortDescription:
      "Remembered customer context, consent, eligibility, and relationship history.",
    cardRelationship:
      "Audience forms from signals joining the Card into lasting relationship memory.",
    customerValue:
      "See who engaged, with consent-aware context — not a disposable lead dump.",
    features: [
      {
        id: "leads",
        name: "Lead capture",
        description: "Collect contacts from Card and Campaign experiences.",
        maturity: "works_now",
      },
      {
        id: "tapinbox",
        name: "TapInbox & cases",
        description: "Relationship inbox and case operations for service moments.",
        maturity: "local_or_test",
      },
    ],
    icon: "Users",
    destinationHref: "/dashboard/audience",
    maturity: "works_now",
    planAvailability: "studio",
    ctaLabel: "Explore Audience",
    ctaHref: "#explorer-audience",
  },
  {
    id: "email",
    name: "Email & Communications",
    zone: "email",
    shortDescription:
      "Prepared messages that leave the Card ecosystem and return with routing context.",
    cardRelationship:
      "Communications extend the Card conversation — replies can route back into Studio.",
    customerValue:
      "Follow up with branded email and prepare reply handling without abandoning the Card.",
    features: [
      {
        id: "email-authoring",
        name: "Email authoring",
        description: "Build campaign emails with shared visual authoring.",
        maturity: "works_now",
      },
      {
        id: "email-replies",
        name: "Reply routing",
        description:
          "Durable reply classification and handoff — provider production send remains separately configured.",
        maturity: "local_or_test",
      },
    ],
    icon: "Mail",
    destinationHref: "/dashboard/experiences",
    maturity: "local_or_test",
    planAvailability: "studio",
    ctaLabel: "Explore Email",
    ctaHref: "#explorer-email",
  },
  {
    id: "autopilot",
    name: "Autopilot",
    zone: "autopilot",
    shortDescription:
      "Prepares outcomes, organizes unfinished work, and surfaces decisions across Studio.",
    cardRelationship:
      "Autopilot resolves into the next useful action for the Card relationship — not a separate product.",
    customerValue:
      "Less setup friction: prepare, recommend, organize, route, monitor, and stop/undo with human approval where required.",
    features: [
      {
        id: "autopilot-prepare",
        name: "Prepare & recommend",
        description: "Assemble prepared outcomes and recommendations for host approval.",
        maturity: "works_now",
      },
      {
        id: "autopilot-live",
        name: "Live assistance",
        description: "Live provider assistance requires credentials — mock and prepared paths work locally.",
        maturity: "after_setup",
      },
    ],
    icon: "Sparkles",
    destinationHref: "/dashboard",
    maturity: "works_now",
    planAvailability: "studio",
    ctaLabel: "Explore Autopilot",
    ctaHref: "#explorer-autopilot",
  },
  {
    id: "insights",
    name: "Insights & TapProof",
    zone: "insights",
    shortDescription:
      "Evidence connecting taps, actions, relationships, handoffs, and outcomes.",
    cardRelationship:
      "TapProof proves what the Card accomplished — confirmed evidence, not vanity dashboards.",
    customerValue:
      "See what happened after a tap with provenance labels: confirmed, derived, modeled, or incomplete.",
    features: [
      {
        id: "insights-kpis",
        name: "Insights dashboards",
        description: "Operational KPIs for taps, contacts, claims, and activity.",
        maturity: "works_now",
      },
      {
        id: "tapproof",
        name: "TapProof evidence",
        description: "Evidence classes and provenance for outcome honesty.",
        maturity: "works_now",
      },
    ],
    icon: "BarChart3",
    destinationHref: "/dashboard/insights",
    maturity: "works_now",
    planAvailability: "studio",
    ctaLabel: "Explore Insights",
    ctaHref: "#explorer-insights",
  },
  {
    id: "integrations",
    name: "Integrations",
    zone: "integrations",
    shortDescription:
      "Bridge enriched context to Monday, CRM, support, booking, and other tools you already use.",
    cardRelationship:
      "Integrations extend outward from the Card — you are not forced to abandon working systems.",
    customerValue:
      "TapConnect may handle the workflow or route context outward; it retains only the evidence it truly owns.",
    features: [
      {
        id: "monday",
        name: "monday.com connector",
        description: "Productivity handoff — production OAuth requires customer setup.",
        maturity: "after_setup",
      },
      {
        id: "native-qr",
        name: "Native QR & media",
        description: "Works in Studio without an external account.",
        maturity: "works_now",
      },
    ],
    icon: "Cable",
    destinationHref: "/dashboard/integrations",
    maturity: "after_setup",
    planAvailability: "varies_by_plan",
    crossCutting: true,
    ctaLabel: "Explore Integrations",
    ctaHref: "#explorer-integrations",
  },
  {
    id: "trust_fabric",
    name: "Trust Fabric",
    zone: "settings",
    shortDescription:
      "Consent, Guardian, permissions, readiness, security, and evidence boundaries under the system.",
    cardRelationship:
      "Trust Fabric sits beneath the Card — not another competing orbital product.",
    customerValue:
      "Operate with clear readiness and permission boundaries; evidence stays honest about what is confirmed.",
    features: [
      {
        id: "readiness",
        name: "Workspace readiness",
        description: "Honest setup and health labels — never a false “Studio ready” claim.",
        maturity: "works_now",
      },
      {
        id: "taptrust",
        name: "TapTrust (future)",
        description: "Broader trust controls remain planned / admin-scoped — not marketed as live.",
        maturity: "planned",
      },
    ],
    icon: "Shield",
    destinationHref: "/dashboard/settings",
    maturity: "works_now",
    planAvailability: "varies_by_plan",
    crossCutting: true,
    ctaLabel: "Explore Trust",
    ctaHref: "#explorer-trust_fabric",
  },
];

export function getExplorerCapability(
  id: string
): ProductExplorerCapability | undefined {
  return PRODUCT_EXPLORER_CAPABILITIES.find((c) => c.id === id);
}

export function explorerForSelector(
  mode: "tapconnect" | "studio"
): ProductExplorerCapability[] {
  if (mode === "tapconnect") {
    return PRODUCT_EXPLORER_CAPABILITIES.filter(
      (c) => c.planAvailability === "tapconnect_core"
    );
  }
  return PRODUCT_EXPLORER_CAPABILITIES;
}
