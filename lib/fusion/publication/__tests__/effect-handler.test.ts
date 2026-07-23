import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultOutboxEffectHandler } from "../effect-handler";
import type { OutboxRecord } from "../events";

function sample(topic: string): OutboxRecord {
  return {
    id: "o1",
    topic,
    envelope: {
      name: topic,
      schemaVersion: 1,
      aggregateType: "JourneyDraft",
      aggregateId: "j1",
      correlationId: "c1",
      occurredAt: new Date().toISOString(),
      payload: {},
    },
    status: "PENDING",
    attempts: 0,
    availableAt: new Date().toISOString(),
    source: "memory",
  };
}

describe("defaultOutboxEffectHandler", () => {
  it("acks tapflow effect topics without throwing", async () => {
    const r = await defaultOutboxEffectHandler(sample("tapflow.effect.email"));
    assert.equal(r.handled, true);
    assert.match(r.note, /queue-only/);
  });

  it("acks generic topics", async () => {
    const r = await defaultOutboxEffectHandler(sample("custom.topic"));
    assert.equal(r.handled, true);
  });
});
