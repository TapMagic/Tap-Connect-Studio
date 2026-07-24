/**
 * Authoritative Admin kill-switch coverage matrix.
 * Every entry must have: registry id · Admin UI label · API probe · expected off status.
 * Expand beyond Keywords / TapCanvas / TapFlow — do not weaken standards.
 */

export type KillSwitchProbe = {
  featureId: string;
  name: string;
  pillar: string;
  /** Primary API used for disable → 503 → re-enable → retry proof */
  probe: {
    method: "GET" | "POST";
    path: string;
    body?: Record<string, unknown>;
  };
  /** Optional second probe (UI surface or dependent action) */
  secondaryProbe?: {
    method: "GET" | "POST";
    path: string;
    body?: Record<string, unknown>;
  };
  /** Features that must also be off for the primary probe to return feature_off */
  alsoDisable?: string[];
  notes: string;
};

export const KILL_SWITCH_MATRIX: KillSwitchProbe[] = [
  {
    featureId: "comms.email",
    name: "Email Marketing",
    pillar: "email",
    probe: {
      method: "POST",
      path: "/api/email/send",
      body: {
        to: "killswitch-proof@example.com",
        subject: "Kill-switch proof",
        html: "<p>proof</p>",
      },
    },
    notes: "Blocks transactional/promo send path",
  },
  {
    featureId: "comms.inbox",
    name: "TapInbox + TapCase",
    pillar: "messaging",
    alsoDisable: ["comms.email"],
    probe: { method: "GET", path: "/api/inbox" },
    notes: "Inbox API uses inbox|email any-gate; prove with both off",
  },
  {
    featureId: "comms.messaging",
    name: "Messaging + Channel Guardian",
    pillar: "messaging",
    alsoDisable: ["comms.email"],
    probe: { method: "GET", path: "/api/comms/suppression" },
    notes: "Suppression / guardian path gated by email|messaging",
  },
  {
    featureId: "wallet.apple_google",
    name: "Apple / Google Wallet Passes",
    pillar: "wallet",
    probe: { method: "GET", path: "/api/wallet" },
    secondaryProbe: {
      method: "POST",
      path: "/api/wallet",
      body: { action: "create", platform: "apple", cardTitle: "KS Proof" },
    },
    notes: "GET + create blocked when wallet kill-switch off",
  },
  {
    featureId: "loyalty.taploop",
    name: "TapLoop Loyalty",
    pillar: "taploop",
    probe: { method: "GET", path: "/api/loyalty/programs" },
    secondaryProbe: {
      method: "POST",
      path: "/api/loyalty/award",
      body: {
        enrollmentId: "ks-missing",
        points: 1,
        reason: "kill-switch proof",
        idempotencyKey: "ks-proof",
      },
    },
    notes: "Programs list + ledger writes return feature_off",
  },
  {
    featureId: "commerce.tapcommerce",
    name: "TapCommerce",
    pillar: "tapcommerce",
    probe: { method: "GET", path: "/api/commerce?view=orders" },
    notes: "Orders/catalog APIs blocked",
  },
  {
    featureId: "tapcast.omnichannel",
    name: "TapCast · Omnichannel",
    pillar: "tapcast",
    probe: { method: "GET", path: "/api/tapcast?view=registry" },
    notes: "Omnichannel registry / publish ladder blocked",
  },
  {
    featureId: "tapcast.tiktok",
    name: "TapCast · TikTok",
    pillar: "tapcast",
    probe: { method: "GET", path: "/api/tapcast/tiktok" },
    notes: "TikTok first-class route independently kill-switchable",
  },
  {
    featureId: "connectors.productivity",
    name: "Productivity & Work Management",
    pillar: "integrations",
    probe: { method: "GET", path: "/api/connectors/productivity" },
    notes: "Work-item connectors + closeout mock blocked",
  },
  {
    featureId: "ai.autopilot",
    name: "Autopilot / Automation Team",
    pillar: "autopilot",
    probe: { method: "GET", path: "/api/ai/proposals" },
    notes: "Proposals + generate refuse when autopilot off",
  },
  {
    featureId: "integrations.live_execution",
    name: "External provider live execution",
    pillar: "integrations",
    probe: {
      method: "POST",
      path: "/api/connectors/productivity",
      body: { action: "connect", provider: "monday", preferLive: true },
    },
    secondaryProbe: {
      method: "POST",
      path: "/api/tapcast/tiktok",
      body: { action: "connect", preferLive: true },
    },
    notes: "preferLive / live Direct Post paths blocked; mock remains when parent feature on",
  },
  {
    featureId: "ai.keywords",
    name: "Contextual Keywords & Hashtags",
    pillar: "autopilot",
    probe: { method: "GET", path: "/api/ai/keywords" },
    notes: "Covered by P-keywords-* / P-tapcanvas-killswitch triad",
  },
  {
    featureId: "canvas.tapcanvas",
    name: "TapCanvas",
    pillar: "experiences",
    probe: {
      method: "POST",
      path: "/api/canvas",
      body: {
        action: "promote",
        canvasId: "__killswitch_probe__",
        nodeIds: ["__node__"],
        confirm: true,
      },
    },
    notes: "Promotion gated — see P-tapcanvas-killswitch (headed triad)",
  },
  {
    featureId: "journey.tapflow",
    name: "TapFlow Journeys",
    pillar: "tapflow",
    probe: {
      method: "POST",
      path: "/api/journeys/draft",
      body: { id: "__killswitch_probe__", action: "activate" },
    },
    notes: "Activate/publish gated — see P-tapcanvas-killswitch",
  },
  {
    featureId: "brand.vocabulary",
    name: "Brand Vocabulary Store",
    pillar: "autopilot",
    probe: { method: "GET", path: "/api/ai/keywords" },
    notes: "Dependency of ai.keywords; keep rows read-only when off",
  },
];

/** Features proved by the expanded matrix headed suite (beyond Keywords/TapCanvas/TapFlow triad). */
export const EXPANDED_KILL_SWITCH_PROOF_IDS = [
  "comms.email",
  "comms.inbox",
  "comms.messaging",
  "wallet.apple_google",
  "loyalty.taploop",
  "commerce.tapcommerce",
  "tapcast.omnichannel",
  "tapcast.tiktok",
  "connectors.productivity",
  "ai.autopilot",
  "integrations.live_execution",
] as const;

export const KILL_SWITCH_FEATURE_IDS = new Set(
  KILL_SWITCH_MATRIX.map((row) => row.featureId)
);
