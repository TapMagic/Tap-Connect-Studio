/**
 * Landing deep-dive + tier card copy — distinct from explorer blurbs.
 * Product visuals use scrubbed seed/demo captures under /public/marketing/product.
 */

import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import type { StudioZoneId } from "@/lib/fusion/studio/zone-tokens";
import { offerHref, PUBLISHED_OFFERS } from "@/lib/marketing/offer-catalog";

export type DeepDiveVisual =
  | {
      kind: "screenshot";
      src: string;
      alt: string;
      width: number;
      height: number;
    }
  | {
      kind: "illustration";
      reason: string;
    };

export type DeepDiveSection = {
  id: string;
  title: string;
  icon: TapConnectIconId;
  zone: StudioZoneId;
  what: string;
  cardSupport: string;
  benefit: string;
  functions: string[];
  maturity: string;
  visualHint: string;
  /** Scrubbed product capture when stable; otherwise honest illustration. */
  visual: DeepDiveVisual;
  /** Optional secondary scrubbed capture (e..g. Email & Replies). */
  secondaryVisual?: DeepDiveVisual;
  ctaLabel: string;
  ctaHref: string;
};

export const DEEP_DIVES: DeepDiveSection[] = [
  {
    id: "card-brand",
    title: "Card + Brand Kit",
    icon: "brand",
    zone: "brand",
    what: "The Card is the living relationship hub. Brand Kit supplies the identity the Card already carries — logo, color, and language.",
    cardSupport:
      "Brand creates the Card’s first impression so customers recognize you before Studio expands.",
    benefit:
      "Edit identity once and reuse it across Card and Campaign surfaces without rebuilding the hub.",
    functions: [
      "Brand Kit workspace and logo library",
      "Card public state and editor",
      "Shared visual authoring with Studio surfaces",
    ],
    maturity: "Brand Kit and Card builder work locally. Live stock/logo providers may need credentials.",
    visualHint: "Public Card + Home Card Command Center",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/public-card.webp",
      alt: "Scrubbed public TapConnect Card for a seed demo business",
      width: 1200,
      height: 750,
    },
    secondaryVisual: {
      kind: "screenshot",
      src: "/marketing/product/home-card-command-center.webp",
      alt: "Home Card Command Center with Card-centered Studio actions",
      width: 1280,
      height: 900,
    },
    ctaLabel: "Explore Brand on the Card",
    ctaHref: "#explorer-brand",
  },
  {
    id: "tappoints-campaigns",
    title: "Tap Points + Campaign activation",
    icon: "campaigns",
    zone: "campaign",
    what: "Tap Points wake the Card. Campaigns attach timely Spotlights without replacing the lasting relationship hub.",
    cardSupport:
      "People connect to the same Card from physical and digital entry points; Campaigns emphasize what matters now.",
    benefit:
      "Change experiences without replacing hardware, and run seasonal activation on a stable Card.",
    functions: [
      "Tap Point fleet health",
      "Scan Mode",
      "Campaign Workbench and Card Spotlight",
    ],
    maturity: "Core Tap Point and Campaign paths work now. Advanced fleet spine continues to mature.",
    visualHint: "Campaign Workbench with Card anchor",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/campaign-workbench.webp",
      alt: "Campaign Workbench anchored to the Card for a demo business",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Campaigns",
    ctaHref: "#explorer-campaigns",
  },
  {
    id: "tapsave-relationships",
    title: "TapSave + Audience / Relationships",
    icon: "audience",
    zone: "audience",
    what: "TapSave keeps a return path. Audience remembers consent-aware relationship context after the tap.",
    cardSupport:
      "Keeping and remembering turns a single tap into an ongoing relationship around the Card.",
    benefit:
      "Customers come back without starting over; you operate from memory, not disposable leads alone.",
    functions: ["Keep / MyTap", "Lead capture", "TapInbox & cases (local/test honesty)"],
    maturity: "Keep and leads work now. Wallet passes need provider setup. Inbox paths are local/test.",
    visualHint: "Audience relationship hub",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/audience-relationships.webp",
      alt: "Audience relationship workspace with consent-aware context",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Relationships",
    ctaHref: "#explorer-audience",
  },
  {
    id: "email-comms",
    title: "Email + Communications",
    icon: "email",
    zone: "email",
    what: "Prepared messages leave the Card ecosystem and can return with reply-routing context.",
    cardSupport:
      "Communications extend the Card conversation instead of abandoning it for a disconnected mailbox.",
    benefit:
      "Follow up with branded email and prepare reply handling while the Card remains the hub.",
    functions: ["Email authoring", "Reply routing foundation", "Campaign email workspace"],
    maturity:
      "Authoring works. Reply routing is durable locally — production send remains separately configured.",
    visualHint: "Email authoring + Email & Replies setup",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/email-workspace.webp",
      alt: "Email authoring workspace connected to the Card",
      width: 1400,
      height: 900,
    },
    secondaryVisual: {
      kind: "screenshot",
      src: "/marketing/product/email-replies-setup.webp",
      alt: "Email and Replies setup wizard for governed reply routing",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Email",
    ctaHref: "#explorer-email",
  },
  {
    id: "autopilot-deep",
    title: "Autopilot",
    icon: "autopilot",
    zone: "autopilot",
    what: "Autopilot prepares outcomes across Studio — organize, recommend, route, monitor, and stop/undo with approval where required.",
    cardSupport:
      "It resolves into the next useful action for the Card relationship, not a separate robot product.",
    benefit: "Less setup friction and clearer decisions while you stay in control.",
    functions: [
      "Prepare & recommend",
      "Organize unfinished work",
      "Surface decisions / human approval",
      "Stop and undo paths",
    ],
    maturity: "Prepared paths work locally. Live provider assistance needs credentials.",
    visualHint: "Autopilot prepared outcomes",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/autopilot.webp",
      alt: "Autopilot workspace organizing next actions around the Card",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Autopilot",
    ctaHref: "#explorer-autopilot",
  },
  {
    id: "integrations-deep",
    title: "Integrations",
    icon: "integrations",
    zone: "integrations",
    what: "Bridge enriched context to Monday, CRM, support, booking, and other tools — or let TapConnect handle the workflow.",
    cardSupport:
      "Integrations extend outward from the Card. Customers are not forced to abandon working systems.",
    benefit:
      "TapConnect retains the evidence it owns while routing context into tools you already use.",
    functions: ["Native QR & media", "monday.com connector path", "Maturity-grouped honesty labels"],
    maturity:
      "Labeled Works now / after setup / local-or-test / planned. Unconfigured providers are not live.",
    visualHint: "Integrations maturity groups",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/integrations-maturity.webp",
      alt: "Integrations maturity groups labeled Works now, after setup, and planned",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Integrations",
    ctaHref: "#explorer-integrations",
  },
  {
    id: "tapproof-deep",
    title: "Insights + TapProof",
    icon: "insights",
    zone: "insights",
    what: "Insights and TapProof connect tap → action → relationship → handoff → conversion → evidence.",
    cardSupport: "Proof shows what the Card accomplished with honest provenance labels.",
    benefit: "Operate from confirmed evidence instead of vanity metrics.",
    functions: ["Insights dashboards", "TapProof evidence classes", "Operational alerts"],
    maturity: "Insights core works now. Illustrative marketing metrics are labeled illustrative.",
    visualHint: "Insights KPI grid / TapProof captions",
    visual: {
      kind: "screenshot",
      src: "/marketing/product/insights-tapproof.webp",
      alt: "Insights and TapProof evidence view for a demo business",
      width: 1400,
      height: 900,
    },
    ctaLabel: "Explore Insights",
    ctaHref: "#explorer-insights",
  },
];

export const TIER_CARD_VIEWS = PUBLISHED_OFFERS.map((o) => ({
  id: o.id,
  slug: o.slug,
  name: o.displayName,
  whoFor: o.whoFor,
  outcome: o.mainOutcome,
  icons: o.capabilityIcons,
  categories: o.capabilityCategories,
  allowance: o.allowancePlaceholder,
  continuity: o.upgradeContinuity,
  ctaLabel: o.ctaLabel,
  href: offerHref(o),
  priceNote: o.priceDisplayPlaceholder,
}));

/** Surfaces deferred from marketing screenshots (none currently). */
export const DEFERRED_PRODUCT_SCREENSHOTS: Array<{ surface: string; reason: string }> = [];
