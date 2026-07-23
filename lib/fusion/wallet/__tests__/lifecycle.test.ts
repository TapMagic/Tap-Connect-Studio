import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  isInstallable,
  isTerminal,
  nextStatus,
} from "../lifecycle";

describe("Wallet lifecycle state machine", () => {
  it("allows draft → preview → issue", () => {
    assert.equal(canTransition("DRAFT", "preview"), true);
    assert.equal(nextStatus("DRAFT", "preview").ok, true);
    assert.equal(canTransition("PREVIEWED", "issue"), true);
    assert.equal(canTransition("DRAFT", "issue"), true);
  });

  it("blocks issue from revoked", () => {
    const r = nextStatus("REVOKED", "issue");
    assert.equal(r.ok, false);
  });

  it("allows update only from issued/updated", () => {
    assert.equal(canTransition("ISSUED", "update"), true);
    assert.equal(canTransition("UPDATED", "update"), true);
    assert.equal(canTransition("DRAFT", "update"), false);
  });

  it("allows revoke from issued/updated/previewed", () => {
    assert.equal(canTransition("ISSUED", "revoke"), true);
    assert.equal(canTransition("UPDATED", "revoke"), true);
    assert.equal(canTransition("PREVIEWED", "revoke"), true);
    assert.equal(canTransition("DRAFT", "revoke"), false);
  });

  it("replace marks issued/updated as replaceable", () => {
    assert.equal(canTransition("ISSUED", "replace"), true);
    assert.equal(canTransition("DRAFT", "replace"), false);
  });

  it("terminal and installable helpers", () => {
    assert.equal(isTerminal("REVOKED"), true);
    assert.equal(isTerminal("REPLACED"), true);
    assert.equal(isTerminal("ISSUED"), false);
    assert.equal(isInstallable("ISSUED"), true);
    assert.equal(isInstallable("UPDATED"), true);
    assert.equal(isInstallable("DRAFT"), false);
  });
});
