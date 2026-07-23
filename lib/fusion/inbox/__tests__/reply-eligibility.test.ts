import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateReplyEligibility } from "../reply-eligibility";

describe("Inbox reply eligibility", () => {
  it("allows open thread with body", () => {
    const r = evaluateReplyEligibility({
      threadStatus: "OPEN",
      featureEnabled: true,
      body: "Thanks for reaching out",
    });
    assert.equal(r.ok, true);
  });

  it("blocks closed thread", () => {
    const r = evaluateReplyEligibility({
      threadStatus: "CLOSED",
      featureEnabled: true,
      body: "Hello",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "thread_closed");
  });

  it("blocks when feature off", () => {
    const r = evaluateReplyEligibility({
      threadStatus: "PENDING",
      featureEnabled: false,
      body: "Hello",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "feature_off");
  });

  it("blocks empty body", () => {
    const r = evaluateReplyEligibility({
      threadStatus: "OPEN",
      featureEnabled: true,
      body: "   ",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "empty_body");
  });
});
