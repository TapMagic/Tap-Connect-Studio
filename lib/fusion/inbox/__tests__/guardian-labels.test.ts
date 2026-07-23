import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guardianReplyBlockedMessage,
  isGuardianBlockedMessage,
  labelGuardianCode,
  replyComposerState,
} from "../guardian-labels";

describe("Inbox guardian labels", () => {
  it("labels guardian codes for operators", () => {
    assert.equal(labelGuardianCode("ok"), "Guardian cleared");
    assert.equal(labelGuardianCode("suppressed"), "Suppressed address");
    assert.equal(labelGuardianCode("unknown_code"), "unknown_code");
  });

  it("formats blocked reply messages", () => {
    assert.equal(
      guardianReplyBlockedMessage({
        code: "suppressed",
        error: "Address is on suppression list",
      }),
      "Suppressed address: Address is on suppression list"
    );
  });

  it("describes reply composer state for closed threads", () => {
    const state = replyComposerState({
      threadStatus: "CLOSED",
      featureEnabled: true,
    });
    assert.equal(state.allowed, false);
    assert.equal(state.code, "thread_closed");
  });

  it("allows open threads when feature on", () => {
    const state = replyComposerState({
      threadStatus: "OPEN",
      featureEnabled: true,
      body: "Thanks",
    });
    assert.equal(state.allowed, true);
    assert.match(state.hint, /Guardian/);
  });

  it("detects guardian-blocked system messages", () => {
    assert.equal(
      isGuardianBlockedMessage({
        direction: "SYSTEM",
        provider: "guardian",
        guardianCode: "suppressed",
      }),
      true
    );
    assert.equal(
      isGuardianBlockedMessage({
        direction: "OUTBOUND",
        provider: "mock",
        guardianCode: "ok",
      }),
      false
    );
  });
});
