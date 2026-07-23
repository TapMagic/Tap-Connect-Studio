import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  createGovernedEvent,
  enqueueOutboxSync,
  resetMemoryOutbox,
  listPendingOutbox,
} from "../../publication/events";
import { sendEmailViaMock } from "../email-mock";
import {
  addMemorySuppression,
  resetMemorySuppressions,
} from "../suppression";

describe("Email mock send", () => {
  beforeEach(() => {
    resetMemoryOutbox();
    resetMemorySuppressions();
  });

  afterEach(() => {
    resetMemoryOutbox();
    resetMemorySuppressions();
  });

  it("queues outbox event on mock send", async () => {
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "ok@example.com",
      subject: "Hello",
      body: "Body text",
      purpose: "transactional",
      consentGiven: false,
      featureEnabled: true,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.mock, true);
      assert.match(result.providerRef, /^mock_email_/);
    }
    const pending = listPendingOutbox();
    assert.ok(pending.some((p) => p.topic === "email.send"));
  });

  it("blocks when feature disabled", async () => {
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "ok@example.com",
      subject: "Hello",
      body: "Body",
      featureEnabled: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "feature_off");
  });

  it("blocks promo without consent", async () => {
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "ok@example.com",
      subject: "Promo",
      body: "Buy now",
      purpose: "promo",
      consentGiven: false,
      featureEnabled: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "no_consent");
  });

  it("blocks suppressed addresses via memory overlay", async () => {
    addMemorySuppression({
      businessId: "b1",
      channel: "email",
      address: "blocked@example.com",
      reason: "unsubscribed",
    });
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "blocked@example.com",
      subject: "Hello",
      body: "Body",
      purpose: "transactional",
      featureEnabled: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "suppressed");
    assert.equal(listPendingOutbox().length, 0);
  });

  it("blocks skipGuardian when suppressed", async () => {
    addMemorySuppression({
      businessId: "b1",
      channel: "email",
      address: "nope@example.com",
    });
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "nope@example.com",
      subject: "X",
      body: "Y",
      skipGuardian: true,
      featureEnabled: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "suppressed");
  });

  it("blocks promo during quiet hours", async () => {
    const result = await sendEmailViaMock({
      businessId: "b1",
      to: "ok@example.com",
      subject: "Promo",
      body: "Sale",
      purpose: "promo",
      consentGiven: true,
      featureEnabled: true,
      quietHours: { start: "00:00", end: "23:59", timezone: "UTC" },
      now: new Date("2026-07-23T12:00:00Z"),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "quiet_hours");
  });

  it("rejects empty recipient or subject", async () => {
    const noTo = await sendEmailViaMock({
      businessId: "b1",
      to: "   ",
      subject: "Hi",
      body: "Body",
      featureEnabled: true,
    });
    assert.equal(noTo.ok, false);
    if (!noTo.ok) assert.equal(noTo.code, "missing_recipient");

    const noSubject = await sendEmailViaMock({
      businessId: "b1",
      to: "ok@example.com",
      subject: "  ",
      body: "Body",
      featureEnabled: true,
    });
    assert.equal(noSubject.ok, false);
  });

  it("creates governed event shape for email topic", () => {
    resetMemoryOutbox();
    enqueueOutboxSync(
      "email.send",
      createGovernedEvent({
        name: "email.outbound.queued",
        businessId: "b1",
        aggregateType: "email",
        aggregateId: "ref1",
        correlationId: "c1",
        payload: { to: "a@b.c", mock: true },
      })
    );
    assert.equal(listPendingOutbox()[0]?.envelope.name, "email.outbound.queued");
  });
});
