import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedCaseActions,
  canCaseTransition,
  isCaseTerminal,
  nextCaseStatus,
  type CaseStatus,
} from "../case-lifecycle";

describe("TapCase lifecycle", () => {
  it("open → assign → in_progress", () => {
    const r = nextCaseStatus("OPEN", "assign");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.status, "IN_PROGRESS");
  });

  it("in_progress → wait → waiting", () => {
    const r = nextCaseStatus("IN_PROGRESS", "wait");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.status, "WAITING");
  });

  it("waiting → resolve → resolved → close → closed", () => {
    let s: CaseStatus = "WAITING";
    for (const [action, want] of [
      ["resolve", "RESOLVED"],
      ["close", "CLOSED"],
    ] as const) {
      const r = nextCaseStatus(s, action);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.status, want);
        s = r.status;
      }
    }
    assert.equal(isCaseTerminal(s), true);
  });

  it("closed → reopen → open", () => {
    const r = nextCaseStatus("CLOSED", "reopen");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.status, "OPEN");
  });

  it("blocks resolve from closed", () => {
    assert.equal(canCaseTransition("CLOSED", "resolve"), false);
    assert.equal(nextCaseStatus("CLOSED", "resolve").ok, false);
  });

  it("enumerates allowed actions per status", () => {
    assert.ok(allowedCaseActions("OPEN").includes("wait"));
    assert.ok(allowedCaseActions("RESOLVED").includes("close"));
    assert.deepEqual(allowedCaseActions("CLOSED"), ["reopen"]);
  });
});
