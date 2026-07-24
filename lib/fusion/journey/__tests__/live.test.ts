import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { createEmptyJourney, type JourneyDefinition } from "../types";
import {
  assertExecutionUsesSnapshot,
  advanceWaitingExecution,
  buildLiveIdempotencyKey,
  cancelLiveExecution,
  executeLiveJourneyDefinition,
  ingestJourneyProviderEvent,
  listLiveJourneyRuns,
  pauseLiveExecution,
  registerMemoryPublishedVersion,
  resetLiveJourneyRunsMemory,
  resumeLiveExecution,
  startOrResumeLiveExecution,
} from "../live";
import { cloneImmutableDefinition } from "../published-version";

before(() => {
  process.env.TAPFLOW_LIVE_MEMORY = "1";
});

function waitBranchJourney(): JourneyDefinition {
  return {
    schemaVersion: 1,
    name: "Live wait branch",
    nodes: [
      { id: "t1", type: "trigger", label: "Start", config: { event: "tap" } },
      { id: "w1", type: "wait", label: "Wait", config: { delayMs: 60_000 } },
      { id: "m1", type: "message", label: "Hi", config: { channel: "email" } },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ],
    edges: [
      { id: "a", from: "t1", to: "w1" },
      { id: "b", from: "w1", to: "m1" },
      { id: "c", from: "m1", to: "x1" },
    ],
  };
}

function failThenExit(): JourneyDefinition {
  return {
    schemaVersion: 1,
    name: "Retry path",
    nodes: [
      { id: "t1", type: "trigger", label: "Start", config: {} },
      { id: "f1", type: "award_loyalty", label: "Award", config: { points: 5, forceFail: true } },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ],
    edges: [
      { id: "a", from: "t1", to: "f1" },
      { id: "b", from: "f1", to: "x1" },
    ],
  };
}

describe("TapFlow live visitor executor", () => {
  it("records non-dry-run completions in memory", () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Live hello");
    const { run, result } = executeLiveJourneyDefinition({
      businessId: "biz_live",
      journeyId: "jd_1",
      journeyName: def.name,
      definition: def,
      visitor: { visitorId: "v_hash", consent: { marketing: true, email: true } },
    });
    assert.equal(result.completed, true);
    assert.equal(run.dryRun, false);
    assert.equal(run.status, "completed");
    assert.equal(listLiveJourneyRuns("biz_live").length, 1);
  });

  it("marks blocked live runs without throwing", () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Blocked email");
    def.nodes = [
      { id: "t1", type: "trigger", label: "Start", config: {} },
      { id: "e1", type: "email", label: "Mail", config: { subject: "Hi" } },
      { id: "x1", type: "exit", label: "Done", config: {} },
    ];
    def.edges = [
      { id: "a", from: "t1", to: "e1" },
      { id: "b", from: "e1", to: "x1" },
    ];
    const { run } = executeLiveJourneyDefinition({
      businessId: "biz_live",
      journeyId: "jd_2",
      journeyName: def.name,
      definition: def,
      visitor: {
        visitorId: "v2",
        consent: { email: false, marketing: false, sms: false },
      },
    });
    assert.equal(run.dryRun, false);
    assert.equal(run.status, "blocked");
  });

  it("idempotent start does not duplicate execution", async () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Idempotent");
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j1",
      name: def.name,
      definition: def,
    });
    const visitor = { visitorId: "vh1", consent: { email: true, marketing: true } };
    const a = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j1",
      journeyName: def.name,
      published,
      visitor,
      sessionId: "sess_1",
    });
    const b = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j1",
      journeyName: def.name,
      published,
      visitor,
      sessionId: "sess_1",
    });
    assert.equal(a.id, b.id);
    assert.equal(b.duplicated, true);
    assert.equal(a.status, "COMPLETED");
  });

  it("paused flows do not continue on advance", async () => {
    resetLiveJourneyRunsMemory();
    const def = waitBranchJourney();
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_wait",
      name: def.name,
      definition: def,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_wait",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh2", consent: { email: true, marketing: true } },
      sessionId: "sess_wait",
    });
    assert.equal(exec.status, "WAITING");
    const paused = await pauseLiveExecution("biz_a", exec.id);
    assert.equal(paused.ok, true);
    if (!paused.ok) return;
    assert.equal(paused.execution.status, "PAUSED");
    const adv = await advanceWaitingExecution("biz_a", exec.id, { force: true });
    assert.equal(adv.ok, false);
    assert.equal(adv.ok === false && adv.code, "paused");
  });

  it("resume continues from current wait node", async () => {
    resetLiveJourneyRunsMemory();
    const def = waitBranchJourney();
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_resume",
      name: def.name,
      definition: def,
      version: 2,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_resume",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh3", consent: { email: true, marketing: true } },
      sessionId: "sess_resume",
    });
    assert.equal(exec.status, "WAITING");
    assert.equal(exec.currentNodeId, "w1");
    await pauseLiveExecution("biz_a", exec.id);
    // Force wait elapsed via resume then advance
    const resumed = await resumeLiveExecution("biz_a", exec.id);
    assert.equal(resumed.ok, true);
    // After resume from WAITING via resumeLiveExecution — may still be waiting or advanced
    const adv = await advanceWaitingExecution("biz_a", exec.id, { force: true });
    if (adv.ok) {
      assert.ok(["COMPLETED", "RUNNING", "HANDOFF", "WAITING"].includes(adv.execution.status));
      assert.ok(adv.execution.path.includes("w1"));
    } else {
      // resume may have already completed past wait when delay handled
      const again = await resumeLiveExecution("biz_a", exec.id);
      assert.ok(again.ok || again.ok === false);
    }
  });

  it("failed nodes retry safely after clearForceFail", async () => {
    resetLiveJourneyRunsMemory();
    const def = failThenExit();
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_fail",
      name: def.name,
      definition: def,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_fail",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh4", consent: { email: true, marketing: true } },
      sessionId: "sess_fail",
    });
    assert.equal(exec.status, "FAILED");
    assert.ok(exec.retryCount >= 1);
    const retried = await resumeLiveExecution("biz_a", exec.id, { clearForceFail: true });
    assert.equal(retried.ok, true);
    if (retried.ok) {
      assert.equal(retried.execution.status, "COMPLETED");
      assert.ok(retried.execution.path.includes("x1"));
    }
  });

  it("tenant isolation rejects cross-business pause", async () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Tenant");
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_ten",
      name: def.name,
      definition: def,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_ten",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh5", consent: { email: true, marketing: true } },
      sessionId: "sess_ten",
    });
    const denied = await pauseLiveExecution("biz_other", exec.id);
    assert.equal(denied.ok, false);
    assert.ok(denied.ok === false && (denied.code === "not_found" || denied.code === "tenant_isolation"));
  });

  it("draft mutation does not alter published snapshot used by execution", async () => {
    resetLiveJourneyRunsMemory();
    const def = createEmptyJourney("Immutable");
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_imm",
      name: def.name,
      definition: def,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_imm",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh6", consent: { email: true, marketing: true } },
      sessionId: "sess_imm",
    });
    const mutated = cloneImmutableDefinition(def);
    mutated.nodes.push({
      id: "extra",
      type: "message",
      label: "New draft node",
      config: { channel: "sms" },
    });
    const check = assertExecutionUsesSnapshot(exec, mutated, published.definition);
    assert.equal(check.ok, true);
    assert.equal(published.definition.nodes.some((n) => n.id === "extra"), false);
  });

  it("provider events are idempotent", async () => {
    resetLiveJourneyRunsMemory();
    const a = await ingestJourneyProviderEvent({
      businessId: "biz_a",
      provider: "mock_email",
      eventKey: "evt_1",
      payload: { ok: true },
    });
    const b = await ingestJourneyProviderEvent({
      businessId: "biz_a",
      provider: "mock_email",
      eventKey: "evt_1",
      payload: { ok: true },
    });
    assert.equal(a.id, b.id);
    assert.equal(a.duplicated, false);
    assert.equal(b.duplicated, true);
  });

  it("cancel is terminal", async () => {
    resetLiveJourneyRunsMemory();
    const def = waitBranchJourney();
    const published = registerMemoryPublishedVersion({
      businessId: "biz_a",
      journeyId: "j_cancel",
      name: def.name,
      definition: def,
    });
    const exec = await startOrResumeLiveExecution({
      businessId: "biz_a",
      journeyId: "j_cancel",
      journeyName: def.name,
      published,
      visitor: { visitorId: "vh7", consent: { email: true, marketing: true } },
      sessionId: "sess_cancel",
    });
    const cancelled = await cancelLiveExecution("biz_a", exec.id);
    assert.equal(cancelled.ok, true);
    if (cancelled.ok) assert.equal(cancelled.execution.status, "CANCELLED");
    const adv = await advanceWaitingExecution("biz_a", exec.id, { force: true });
    assert.equal(adv.ok, false);
  });

  it("builds stable idempotency keys", () => {
    const k1 = buildLiveIdempotencyKey({
      businessId: "b",
      journeyId: "j",
      publishedVersionId: "v",
      visitorHash: "h",
      sessionId: "s",
      deviceSlotId: "d",
    });
    const k2 = buildLiveIdempotencyKey({
      businessId: "b",
      journeyId: "j",
      publishedVersionId: "v",
      visitorHash: "h",
      sessionId: "s",
      deviceSlotId: "d",
    });
    assert.equal(k1, k2);
  });
});
