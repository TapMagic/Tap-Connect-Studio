import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  enqueuePulseAction,
  flushPulseQueue,
  listPulseQueue,
  resetPulseOfflineQueues,
} from "../offline-queue";

describe("Pulse offline queue stub", () => {
  beforeEach(() => resetPulseOfflineQueues());

  it("enqueues and flushes actions", () => {
    enqueuePulseAction("biz", "claim", { code: "ABC" });
    enqueuePulseAction("biz", "note", { text: "door check" });
    assert.equal(listPulseQueue("biz").length, 2);
    const result = flushPulseQueue("biz");
    assert.equal(result.flushed, 2);
    assert.equal(result.remaining, 0);
  });
});
