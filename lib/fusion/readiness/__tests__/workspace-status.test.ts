import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeWorkspaceStatus,
  firstTapSetupProgress,
} from "../workspace-status";

describe("workspace status (ID-001 honesty)", () => {
  it("never returns Studio ready", () => {
    const healthy = computeWorkspaceStatus({
      setupIncomplete: 0,
      setupTotal: 4,
      outboxFailed: 0,
    });
    assert.equal(healthy.label, "Workspace healthy");
    assert.equal(healthy.tone, "healthy");
    assert.doesNotMatch(healthy.label, /studio ready/i);

    const setup = computeWorkspaceStatus({
      setupIncomplete: 2,
      setupTotal: 4,
      outboxFailed: 0,
    });
    assert.equal(setup.label, "Setup incomplete");
    assert.equal(setup.href, "/dashboard#readiness");
  });

  it("prioritizes failures over setup incompleteness", () => {
    const status = computeWorkspaceStatus({
      setupIncomplete: 3,
      setupTotal: 4,
      outboxFailed: 2,
      operatorFailures: 1,
    });
    assert.equal(status.tone, "attention");
    assert.equal(status.label, "Attention needed");
    assert.ok(status.alertCount >= 3);
    assert.ok(status.reasons.some((r) => /failed delivery/i.test(r)));
    assert.ok(status.reasons.some((r) => /publish\/assign/i.test(r)));
  });

  it("does not green-light from empty outbox alone when setup incomplete", () => {
    const status = computeWorkspaceStatus({
      setupIncomplete: 1,
      setupTotal: 4,
      outboxFailed: 0,
    });
    assert.notEqual(status.label, "Workspace healthy");
    assert.equal(status.tone, "setup");
    assert.equal(status.alertCount, 0);
  });

  it("shares first-tap setup progress with Home checklist", () => {
    const { incomplete, total, steps } = firstTapSetupProgress({
      hasBrand: true,
      hasCampaign: false,
      hasDevice: true,
      hasLiveAssignment: false,
    });
    assert.equal(total, 4);
    assert.equal(incomplete, 2);
    assert.equal(steps.find((s) => s.id === "campaign")?.done, false);
    assert.equal(steps.find((s) => s.id === "brand")?.done, true);
  });
});
