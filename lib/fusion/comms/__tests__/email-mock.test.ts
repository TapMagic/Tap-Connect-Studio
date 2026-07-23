import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGovernedEvent,
  enqueueOutboxSync,
  resetMemoryOutbox,
  listPendingOutbox,
} from "../../publication/events";
import { sendEmailViaMock } from "../email-mock";

describe("Email mock send", () => {
  it("queues outbox event on mock send", async () => {
    resetMemoryOutbox();
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
