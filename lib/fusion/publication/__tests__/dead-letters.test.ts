import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGovernedEvent,
  enqueueOutboxSync,
  listDeadLetters,
  markOutboxFailed,
  resetMemoryOutbox,
  retryDeadLetter,
  listPendingOutbox,
} from "../events";

describe("Outbox dead letters", () => {
  it("marks failed and lists dead letters", async () => {
    resetMemoryOutbox();
    const record = enqueueOutboxSync(
      "test.fail",
      createGovernedEvent({
        name: "test.fail",
        businessId: "b1",
        aggregateType: "test",
        aggregateId: "a1",
        correlationId: "c1",
        payload: { x: 1 },
      })
    );
    assert.equal(listPendingOutbox().length, 1);

    const failed = await markOutboxFailed(record.id, "boom");
    assert.ok(failed);
    assert.equal(failed.status, "FAILED");

    const dead = await listDeadLetters({ businessId: "b1" });
    assert.ok(dead.some((d) => d.id === record.id));

    const retried = await retryDeadLetter(record.id);
    assert.ok(retried);
    assert.equal(retried.status, "PENDING");
    assert.equal(listPendingOutbox().some((r) => r.id === record.id), true);
  });
});
