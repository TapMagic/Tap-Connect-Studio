import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { precheckTapFlowEffect } from "../effect-guardian";

describe("TapFlow effect Guardian precheck", () => {
  it("blocks email without consent", () => {
    const r = precheckTapFlowEffect({
      action: "email",
      visitor: { consent: { email: false, marketing: false } },
    });
    assert.equal(r.queue, false);
    assert.equal(r.blocked, true);
    assert.equal(r.guardian?.code, "no_consent");
  });

  it("allows email with marketing consent", () => {
    const r = precheckTapFlowEffect({
      action: "email",
      visitor: { consent: { email: true, marketing: true } },
    });
    assert.equal(r.queue, true);
    assert.equal(r.topic, "tapflow.effect.email");
  });

  it("allows non-comms effects", () => {
    const r = precheckTapFlowEffect({
      action: "award_loyalty",
      visitor: {},
    });
    assert.equal(r.queue, true);
  });

  it("blocks suppressed promo message", () => {
    const r = precheckTapFlowEffect({
      action: "message",
      visitor: { consent: { marketing: true }, visitorId: "v1" },
      channel: "whatsapp",
      suppressed: true,
    });
    assert.equal(r.queue, false);
    assert.equal(r.guardian?.code, "suppressed");
  });

  it("skips unknown actions", () => {
    const r = precheckTapFlowEffect({ action: "wait", visitor: {} });
    assert.equal(r.queue, false);
    assert.equal(r.topic, null);
  });
});
