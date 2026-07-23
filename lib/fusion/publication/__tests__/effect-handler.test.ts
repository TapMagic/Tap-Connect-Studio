import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetMemoryOutbox } from "../events";
import { defaultOutboxEffectHandler } from "../effect-handler";
import type { OutboxRecord } from "../events";

function sample(topic: string, payload: Record<string, unknown> = {}): OutboxRecord {
  return {
    id: "o1",
    topic,
    envelope: {
      name: topic,
      schemaVersion: 1,
      businessId: "biz_1",
      aggregateType: "JourneyDraft",
      aggregateId: "j1",
      correlationId: "c1",
      occurredAt: new Date().toISOString(),
      payload: { guardian: "ok", visitorId: "v1", recipientEmail: "tap@test.com", ...payload },
    },
    status: "PENDING",
    attempts: 0,
    availableAt: new Date().toISOString(),
    source: "memory",
  };
}

describe("defaultOutboxEffectHandler", () => {
  it("drains tapflow email through mock provider stub", async () => {
    resetMemoryOutbox();
    const r = await defaultOutboxEffectHandler(sample("tapflow.effect.email"));
    assert.equal(r.handled, true);
    assert.equal(r.ok, true);
    assert.match(r.note, /mock|enqueued/i);
    assert.ok(r.providerRef);
  });

  it("drains tapflow loyalty stub", async () => {
    const r = await defaultOutboxEffectHandler(
      sample("tapflow.effect.award_loyalty", { detail: "points=10 (dry-run)" })
    );
    assert.equal(r.ok, true);
    assert.match(r.note, /TapLoop/i);
  });

  it("acks generic topics", async () => {
    const r = await defaultOutboxEffectHandler(sample("custom.topic"));
    assert.equal(r.handled, true);
    assert.match(r.note, /Generic publish ack/);
  });
});
