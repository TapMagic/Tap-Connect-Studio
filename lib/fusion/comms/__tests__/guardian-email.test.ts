import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateChannelGuardian } from "../channel-guardian";
import { listEmailProviderReadiness, summarizeCommsReadiness } from "../email-readiness";
import { listMessagingReadiness } from "../providers";

describe("Channel Guardian expanded", () => {
  it("blocks suppressed addresses", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "promo",
      consentGiven: true,
      suppressed: true,
      featureEnabled: true,
      providerReady: true,
    });
    assert.equal(d.allowed, false);
    assert.equal(d.code, "suppressed");
  });

  it("blocks when feature off", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      featureEnabled: false,
      providerReady: true,
    });
    assert.equal(d.code, "feature_off");
  });

  it("blocks quiet hours for promo", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "promo",
      consentGiven: true,
      featureEnabled: true,
      providerReady: true,
      quietHours: { start: "00:00", end: "23:59", timezone: "UTC" },
      now: new Date("2026-07-23T12:00:00Z"),
    });
    assert.equal(d.allowed, false);
    assert.equal(d.code, "quiet_hours");
  });

  it("blocks whatsapp outside window without template", () => {
    const d = evaluateChannelGuardian({
      channel: "whatsapp",
      purpose: "promo",
      consentGiven: true,
      recipientId: "wa:1",
      featureEnabled: true,
      providerReady: true,
      userInitiated: false,
      withinProviderWindow: false,
      templateApproved: false,
    });
    assert.equal(d.code, "window_closed");
  });

  it("allows support email with consent", () => {
    const d = evaluateChannelGuardian({
      channel: "email",
      purpose: "support",
      consentGiven: true,
      featureEnabled: true,
      providerReady: true,
    });
    assert.equal(d.allowed, true);
  });
});

describe("Email + messaging readiness", () => {
  it("reports mock-available email readiness", () => {
    const r = listEmailProviderReadiness();
    assert.equal(r.provider, "resend");
    assert.equal(r.mockAvailable, true);
    assert.ok(Array.isArray(r.missingEnvVars));
  });

  it("summarizes comms readiness", () => {
    const s = summarizeCommsReadiness(true, true);
    assert.equal(s.email.featureEnabled, true);
    assert.ok(s.email.mode === "live" || s.email.mode === "mock");
  });

  it("lists messaging providers with missing env", () => {
    const rows = listMessagingReadiness();
    assert.ok(rows.length >= 4);
    assert.ok(rows.every((r) => typeof r.ready === "boolean"));
  });
});
