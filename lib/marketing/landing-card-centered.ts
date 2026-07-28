/**
 * Card-centered landing copy — claims-disciplined.
 * Demonstrates differentiation; does not announce unverifiable superiority.
 */

export const LANDING_HERO = {
  eyebrow: "TapConnect",
  poweredBy: "Powered by Tap The Magic",
  headline: "TapConnect is the Card.",
  subhead:
    "TapConnect Studio is the operating system that creates, connects, keeps, operates, and proves the relationship around that Card.",
  note: "Studio capabilities vary by plan. You do not rebuild the Card when you add Studio.",
  primaryCta: "Start with the Card",
  primaryHref: "/offer/tapconnect",
  secondaryCta: "Explore the product",
  secondaryHref: "#explorer",
} as const;

export const OPERATING_IDEAS = [
  {
    id: "create",
    title: "Create the Card",
    body: "Brand, content, and structure that make a living relationship hub — useful before Studio expands.",
  },
  {
    id: "connect",
    title: "Connect people to it",
    body: "Tap Points and campaigns bring customers to the same Card without forcing an app download.",
  },
  {
    id: "keep",
    title: "Keep the relationship",
    body: "TapSave and return paths retain context so the next visit continues the same relationship.",
  },
  {
    id: "operate",
    title: "Operate it intelligently",
    body: "Audience, communications, Autopilot, and service tools help you run the relationship day to day.",
  },
  {
    id: "prove",
    title: "Prove what it accomplished",
    body: "Insights and TapProof connect taps, actions, handoffs, and outcomes with honest evidence labels.",
  },
] as const;

export const PRODUCT_PATHS = {
  tapconnect: {
    title: "TapConnect",
    body: "The living Card — complete and useful on its own, with core supporting capabilities.",
    bullets: [
      "One relationship hub customers recognize",
      "Brand, Tap Points, Campaigns, and TapSave as core support",
      "Useful before you adopt broader Studio operations",
    ],
  },
  studio: {
    title: "TapConnect Studio",
    body: "The broader operating system around the same Card. Feature availability varies by tier.",
    bullets: [
      "Audience, Email, Autopilot, Insights, Integrations, and Trust boundaries",
      "Same Card — no rebuild when you expand",
      "Not every Studio capability is included in every plan",
    ],
  },
} as const;

export const INTEGRATIONS_SECTION = {
  title: "Works with what you already use",
  body: "TapConnect may handle the workflow — or route enriched context to Monday, CRM, booking, support, automation, and other systems. Customers are not forced to abandon working tools. TapConnect retains only the evidence it truly owns.",
  honesty:
    "Integration maturity is labeled honestly: Works now, Available after setup, Local or provider test, or Planned. Unconfigured providers are not presented as live.",
} as const;

export const AUTOPILOT_SECTION = {
  title: "Autopilot prepares useful outcomes",
  body: "Autopilot reduces setup work across the platform — not only communications or complaints. It can prepare, recommend, organize, route, monitor, surface decisions, and stop or undo — with human approval where required.",
} as const;

export const TAPPROOF_SECTION = {
  title: "TapProof connects the whole path",
  body: "TapConnect connects tap → customer action → relationship → handoff → conversion → evidence. Illustrative metrics on this page are labeled illustrative — not customer evidence.",
  illustrativeNote: "Illustrative demo metrics — not live customer statistics.",
} as const;

export const USE_CASES = [
  {
    id: "small-business",
    title: "Small business with no support infrastructure",
    body: "TapConnect can provide the Card, TapInbox, routing, retention, and prepared assistance — so a lean team still runs a coherent customer relationship.",
  },
  {
    id: "established-monday",
    title: "Established business with monday.com",
    body: "TapConnect creates and attributes the customer moment, then routes context into the existing workflow. Both paths are successful outcomes.",
  },
] as const;

export const FINAL_CTA = {
  title: "Start with the Card. Add the Studio your business needs.",
  body: "The Card remains the relationship hub. Studio adds operating capabilities as you grow — availability varies by plan.",
  primaryCta: "Get started",
  primaryHref: "/offer/tapconnect",
  secondaryCta: "Sign in",
  secondaryHref: "/sign-in",
} as const;

export const FULL_VALUE_FRAME_COPY =
  "One Card. A complete operating system working around it." as const;

/** Forbidden marketing phrases for claims discipline tests. */
export const FORBIDDEN_CLAIM_PATTERNS = [
  /\bthe first platform\b/i,
  /\bthe only platform\b/i,
  /\bunlike every other\b/i,
  /\bunique in the world\b/i,
  /\bimpossible to copy\b/i,
  /\bpatent-protected\b/i,
  /\bcategory leader\b/i,
  /\bthe best platform\b/i,
  /\bworld'?s (best|only|first)\b/i,
  /\bno other platform\b/i,
] as const;
