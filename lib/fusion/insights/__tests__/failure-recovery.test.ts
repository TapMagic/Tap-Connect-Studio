import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFailureRecoverySnapshot } from "../failure-recovery";
import type { OutboxRecord } from "@/lib/fusion/publication/events";
import type { JourneyRunRecord } from "@/lib/fusion/journey/runs";

function deadLetter(topic: string): OutboxRecord {
  return {
    id: "d1",
    topic,
    envelope: {
      name: topic,
      schemaVersion: 1,
      aggregateType: "JourneyDraft",
      aggregateId: "j1",
      correlationId: "c1",
      occurredAt: new Date().toISOString(),
      payload: {},
    },
    status: "FAILED",
    attempts: 1,
    availableAt: new Date().toISOString(),
    source: "memory",
    lastError: "drain failed",
  };
}

function run(status: JourneyRunRecord["status"]): JourneyRunRecord {
  return {
    id: "r1",
    businessId: "biz_a",
    journeyName: "Test",
    status,
    path: ["t1"],
    issues: [],
    visitor: {},
    createdAt: new Date().toISOString(),
    dryRun: true,
  };
}

describe("Failure / recovery analytics", () => {
  it("labels confirmed counts when dead letters exist", () => {
    const snap = buildFailureRecoverySnapshot({
      deadLetters: [deadLetter("tapflow.effect.email"), deadLetter("journey.run")],
      journeyRuns: [run("blocked"), run("failed")],
      businessId: "biz_a",
    });
    assert.equal(snap.metrics.find((m) => m.key === "outbox_failed")?.value, 2);
    assert.equal(snap.metrics.find((m) => m.key === "tapflow_effect_failed")?.value, 1);
    assert.equal(snap.metrics.find((m) => m.key === "journey_blocked")?.value, 1);
    assert.equal(snap.empty, false);
    assert.equal(snap.metrics[0]?.evidenceClass, "confirmed");
  });

  it("reports empty snapshot with incomplete evidence", () => {
    const snap = buildFailureRecoverySnapshot({
      deadLetters: [],
      journeyRuns: [],
      businessId: "biz_a",
    });
    assert.equal(snap.empty, true);
    assert.ok(snap.metrics.every((m) => m.evidenceClass === "incomplete"));
  });
});
