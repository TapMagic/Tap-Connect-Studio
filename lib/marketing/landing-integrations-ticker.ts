/**
 * Integration ticker content — typographic categories / known connectors.
 * No fabricated partner logos. Maturity honesty required.
 */

export type IntegrationTickerItem = {
  id: string;
  label: string;
  category: string;
  maturity: "works_now" | "after_setup" | "local_or_test" | "planned";
  whatTapSends: string;
  whatReturns: string;
  direction: "outbound" | "bidirectional" | "inbound";
  whatTapKnows: string;
  /** Honest setup expectation — what a business must do before this is live. */
  setup: string;
};

export const INTEGRATION_TICKER_ITEMS: IntegrationTickerItem[] = [
  {
    id: "monday",
    label: "monday.com",
    category: "Work OS",
    maturity: "after_setup",
    whatTapSends: "Enriched lead / relationship context from the Card",
    whatReturns: "Board item status and assignee when connected",
    direction: "bidirectional",
    whatTapKnows: "Handoff evidence with provenance labels",
    setup: "Connect a monday.com account via OAuth in Studio Integrations.",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    category: "Automation",
    maturity: "works_now",
    whatTapSends: "Signed event payloads for tap, save, and contact actions",
    whatReturns: "Acknowledge / optional callback URL",
    direction: "outbound",
    whatTapKnows: "Delivery attempt status",
    setup: "Add an endpoint URL and verify the signing secret.",
  },
  {
    id: "zapier",
    label: "Zapier",
    category: "Automation",
    maturity: "planned",
    whatTapSends: "Card events into Zap triggers when enabled",
    whatReturns: "Downstream action results via Zap",
    direction: "bidirectional",
    whatTapKnows: "Trigger firing evidence — not live until configured",
    setup: "Planned — no setup path is offered yet.",
  },
  {
    id: "manychat",
    label: "ManyChat",
    category: "Messaging",
    maturity: "planned",
    whatTapSends: "Opt-in contact context where policy allows",
    whatReturns: "Conversation state when connected",
    direction: "bidirectional",
    whatTapKnows: "Messaging handoff status — planned connector",
    setup: "Planned — no setup path is offered yet.",
  },
  {
    id: "crm",
    label: "CRM",
    category: "Customer record",
    maturity: "after_setup",
    whatTapSends: "Consent-aware relationship fields",
    whatReturns: "CRM record IDs / sync acknowledgements",
    direction: "bidirectional",
    whatTapKnows: "Which CRM record received the handoff",
    setup: "Map fields and authorize your CRM in Studio Integrations.",
  },
  {
    id: "support",
    label: "Support desk",
    category: "Service",
    maturity: "local_or_test",
    whatTapSends: "Case / Ask context from the Card",
    whatReturns: "Ticket ID when a desk is wired",
    direction: "outbound",
    whatTapKnows: "Local TapInbox path works; external desks need setup",
    setup: "Local TapInbox works now; wiring an external desk needs its credentials.",
  },
  {
    id: "booking",
    label: "Booking",
    category: "Scheduling",
    maturity: "planned",
    whatTapSends: "Intent to schedule from Card actions",
    whatReturns: "Confirmation when a booking provider is live",
    direction: "bidirectional",
    whatTapKnows: "Booking is not claimed live without credentials",
    setup: "Planned — booking providers connect here once available.",
  },
  {
    id: "qr-media",
    label: "Native QR & media",
    category: "Entry",
    maturity: "works_now",
    whatTapSends: "Public Card URL / QR payload",
    whatReturns: "Scan opens the Card",
    direction: "inbound",
    whatTapKnows: "Tap / scan evidence on the Card",
    setup: "None — works in Studio without an external account.",
  },
];

export const MATURITY_TICKER_LABEL: Record<IntegrationTickerItem["maturity"], string> = {
  works_now: "Works now",
  after_setup: "Works after setup",
  local_or_test: "Local / test",
  planned: "Planned",
};

export const LANDING_STORY_STAGES = [
  { id: "card", label: "Card", href: "#interactive-map", zone: "card" as const },
  { id: "create", label: "Create", href: "#operating", zone: "brand" as const },
  { id: "connect", label: "Connect", href: "#tappoints-campaigns", zone: "campaign" as const },
  { id: "keep", label: "Keep", href: "#tapsave-relationships", zone: "audience" as const },
  { id: "operate", label: "Operate", href: "#autopilot-deep", zone: "autopilot" as const },
  { id: "prove", label: "Prove", href: "#tapproof-deep", zone: "insights" as const },
] as const;
