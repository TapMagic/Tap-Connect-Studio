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
    assert.equal(labelGuardianCode("suppressed"), "Suppressed address");
    assert.match(
      guardianReplyBlockedMessage({ code: "suppressed", error: "Address is on suppression list" }),
      /Suppressed address/
    );
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
