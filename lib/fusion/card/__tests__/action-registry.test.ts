import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TAP_CARD_ACTION_CATALOG,
  type TapCardActionKind,
} from "@/lib/brand/tap-card";
import {
  assertV1ActionParity,
  CARD_ACTION_DEFINITIONS,
  evaluateActionEligibility,
  listV1PreservedActions,
} from "@/lib/fusion/card/action-registry";
import { buildDeterministicSupportReply } from "@/lib/fusion/card/suggested-reply";
import { buildCardFuseBoxConnections } from "@/lib/fusion/card/fuse-box";

const V1_KINDS: TapCardActionKind[] = [
  "vcard",
  "call",
  "email",
  "sms",
  "website",
  "map",
  "review",
  "calendar",
  "shop",
  "book",
  "homescreen",
  "bookmark",
  "instagram",
  "facebook",
  "tiktok",
  "snapchat",
  "x",
  "youtube",
  "linkedin",
  "whatsapp",
  "yelp",
  "custom",
];

describe("card action registry", () => {
  it("preserves all 22 V1 action kinds", () => {
    const parity = assertV1ActionParity(V1_KINDS);
    assert.equal(parity.ok, true);
    assert.equal(listV1PreservedActions().length, 22);
    assert.ok(CARD_ACTION_DEFINITIONS.some((d) => d.kind === "support"));
    assert.ok(TAP_CARD_ACTION_CATALOG.some((c) => c.kind === "support"));
  });

  it("gates support on fuse + inbox features", () => {
    const off = evaluateActionEligibility({
      kind: "support",
      featureEnabled: () => false,
    });
    assert.equal(off.ok, false);
    if (!off.ok) assert.equal(off.code, "feature_off");

    const on = evaluateActionEligibility({
      kind: "support",
      featureEnabled: () => true,
    });
    assert.equal(on.ok, true);
  });
});

describe("deterministic support reply", () => {
  it("requires human approval and marks AI unavailable", () => {
    const reply = buildDeterministicSupportReply({
      businessName: "Tap Demo",
      customerName: "Alex",
      question: "What are your hours?",
      requestType: "question",
      brandTone: "friendly",
    });
    assert.equal(reply.mode, "deterministic");
    assert.equal(reply.requiresHumanApproval, true);
    assert.equal(reply.aiUnavailable, true);
    assert.match(reply.body, /Alex/);
    assert.match(reply.body, /hours/i);
  });
});

describe("card fuse-box honesty", () => {
  it("does not mark journey as connected", () => {
    const rows = buildCardFuseBoxConnections({
      hasPublicCard: true,
      activeCampaignCount: 2,
      tapPointAssignmentCount: 1,
      openSupportThreads: 0,
      supportFeatureOn: true,
      inboxFeatureOn: true,
      walletMock: true,
      walletLiveReady: false,
      journeyCount: 3,
    });
    const journey = rows.find((r) => r.id === "journey");
    assert.ok(journey);
    assert.equal(journey?.status, "not_yet_available");
    const support = rows.find((r) => r.id === "support");
    assert.equal(support?.status, "partially_connected");
  });

  it("marks support connected when open threads exist", () => {
    const rows = buildCardFuseBoxConnections({
      hasPublicCard: true,
      activeCampaignCount: 1,
      tapPointAssignmentCount: 1,
      openSupportThreads: 2,
      supportFeatureOn: true,
      inboxFeatureOn: true,
      walletMock: true,
      walletLiveReady: false,
      journeyCount: 0,
    });
    assert.equal(rows.find((r) => r.id === "support")?.status, "connected");
  });
});
