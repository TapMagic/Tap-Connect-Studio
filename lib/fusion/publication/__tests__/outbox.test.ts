import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  createGovernedEvent,
  drainOutbox,
  enqueueOutbox,
  listOutbox,
  listPendingOutbox,
  resetMemoryOutbox,
} from "../events";

const originalUrl = process.env.DATABASE_URL;

describe("durable outbox (memory fallback)", () => {
  beforeEach(() => {
    resetMemoryOutbox();
    // Force memory path — no isolated fusion DB in unit tests
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetMemoryOutbox();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  });

  it("enqueues and lists pending in memory when DB unavailable", async () => {
    const envelope = createGovernedEvent({
      name: "test.event",
      aggregateType: "test",
      aggregateId: "a1",
      correlationId: "c1",
      payload: { ok: true },
    });

    const record = await enqueueOutbox("test.topic", envelope);
    assert.equal(record.status, "PENDING");
    assert.equal(record.source, "memory");
    assert.equal(record.topic, "test.topic");

    const pending = listPendingOutbox();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, record.id);

    const listed = await listOutbox({ status: "PENDING" });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].envelope.name, "test.event");
  });

  it("drains pending records to PUBLISHED", async () => {
    await enqueueOutbox(
      "drain.topic",
      createGovernedEvent({
        name: "drain.event",
        aggregateType: "test",
        aggregateId: "a2",
        correlationId: "c2",
        payload: {},
      })
    );

    const result = await drainOutbox(10);
    assert.equal(result.source, "memory");
    assert.equal(result.drained.length, 1);
    assert.equal(result.drained[0].status, "PUBLISHED");
    assert.equal(listPendingOutbox().length, 0);
  });

  it("filters list by status", async () => {
    await enqueueOutbox(
      "a",
      createGovernedEvent({
        name: "a",
        aggregateType: "t",
        aggregateId: "1",
        correlationId: "x",
        payload: {},
      })
    );
    await drainOutbox(1);
    await enqueueOutbox(
      "b",
      createGovernedEvent({
        name: "b",
        aggregateType: "t",
        aggregateId: "2",
        correlationId: "y",
        payload: {},
      })
    );

    const pending = await listOutbox({ status: "PENDING" });
    assert.equal(pending.length, 1);
    assert.equal(pending[0].topic, "b");

    const published = await listOutbox({ status: "PUBLISHED" });
    assert.equal(published.length, 1);
    assert.equal(published[0].topic, "a");
  });
});
