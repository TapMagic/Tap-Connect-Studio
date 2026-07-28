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
