import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateChannelGuardian } from "../../comms/channel-guardian";

/**
 * Inbox reply path mirrors this Guardian check before mock send.
 * Persistence-backed replyToThread is covered via API + isolated DB migrate.
 */
describe("Inbox reply Guardian contract", () => {
  it("allows support reply when consent present", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "support",
      consentGiven: true,
      suppressed: false,
      featureEnabled: true,
      providerReady: true,
      userInitiated: true,
    });
    assert.equal(d.allowed, true);
    assert.equal(d.code, "ok");
  });

  it("blocks closed-window messaging without template", () => {
    const d = evaluateChannelGuardian({
      channel: "messenger",
      purpose: "support",
      consentGiven: true,
      recipientId: "psid:1",
      featureEnabled: true,
      providerReady: true,
      userInitiated: false,
      withinProviderWindow: false,
      templateApproved: false,
    });
    assert.equal(d.allowed, false);
    assert.equal(d.code, "window_closed");
  });

  it("blocks when messaging feature off", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "support",
      featureEnabled: false,
      providerReady: true,
    });
    assert.equal(d.code, "feature_off");
  });
});
