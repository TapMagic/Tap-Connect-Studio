import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import {
  guardianReplyBlockedMessage,
  labelGuardianCode,
  replyComposerState,
} from "../guardian-labels";
import { resetInboxOperatorAudit, summarizeInboxAnalytics } from "../operator-audit";

describe("Inbox operator labels + audit", () => {
  before(() => {
    resetInboxOperatorAudit();
  });

  it("labels guardian codes for blocked-send UX", () => {
    assert.equal(labelGuardianCode("suppressed"), "This address asked not to be contacted");
    assert.match(
      guardianReplyBlockedMessage({ code: "suppressed", error: "Address is on suppression list" }),
      /asked not to be contacted/
    );
  });

  it("composer hint uses operator language", () => {
    const state = replyComposerState({
      threadStatus: "OPEN",
      featureEnabled: true,
      body: "",
    });
    assert.equal(state.allowed, true);
    assert.match(state.hint, /communication preferences/i);
    assert.doesNotMatch(state.hint, /Channel Guardian/i);
  });

  it("composer blocks closed threads", () => {
    const state = replyComposerState({
      threadStatus: "CLOSED",
      featureEnabled: true,
      body: "hi",
    });
    assert.equal(state.allowed, false);
    assert.equal(state.code, "thread_closed");
  });

  it("analytics summary starts empty", () => {
    const s = summarizeInboxAnalytics("biz_test");
    assert.equal(s.threads, 0);
    assert.equal(s.replies, 0);
  });
});
