import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetMemoryOutbox } from "@/lib/fusion/publication/events";
import { drainTapFlowEffect } from "../effect-providers";
import type { OutboxRecord } from "@/lib/fusion/publication/events";

function sample(topic: string, payload: Record<string, unknown> = {}): OutboxRecord {
  return {
    id: "o1",
    topic,
    envelope: {
      name: topic,
      schemaVersion: 1,
      businessId: "biz_1",
      aggregateType: "JourneyDraft",
      aggregateId: "j1",
      correlationId: "c1",
      occurredAt: new Date().toISOString(),
      payload: {
        visitorId: "v_hash",
        runId: "run_1",
        guardian: "ok",
        ...payload,
      },
    },
    status: "PENDING",
    attempts: 0,
    availableAt: new Date().toISOString(),
    source: "memory",
  };
}

describe("TapFlow effect provider stubs", () => {
  it("returns null for non-tapflow topics", async () => {
    const r = await drainTapFlowEffect(sample("email.send"));
    assert.equal(r, null);
  });

  it("enqueues mock email when Guardian ok", async () => {
    resetMemoryOutbox();
    const r = await drainTapFlowEffect(
      sample("tapflow.effect.email", { detail: "Welcome offer", recipientEmail: "a@b.com" })
    );
    assert.ok(r);
    assert.equal(r!.handled, true);
    assert.equal(r!.action, "email");
    assert.equal(r!.ok, true);
    assert.match(r!.note, /mock|enqueued/i);
    assert.ok(r!.providerRef);
  });

  it("blocks email when Guardian code is not ok", async () => {
    const r = await drainTapFlowEffect(
      sample("tapflow.effect.email", { guardian: "no_consent" })
    );
    assert.ok(r);
    assert.equal(r!.ok, false);
    assert.equal(r!.code, "no_consent");
  });

  it("stubs message channel effects", async () => {
    const r = await drainTapFlowEffect(
      sample("tapflow.effect.message", { detail: "whatsapp" })
    );
    assert.ok(r);
    assert.equal(r!.action, "message");
    assert.equal(r!.ok, true);
    assert.match(r!.providerRef ?? "", /mock_whatsapp/);
  });

  it("stubs loyalty, case, and handoff", async () => {
    const loyalty = await drainTapFlowEffect(
      sample("tapflow.effect.award_loyalty", { detail: "points=25 (dry-run)" })
    );
    assert.equal(loyalty?.ok, true);
    assert.match(loyalty?.note ?? "", /25 pts/);

    const caseR = await drainTapFlowEffect(
      sample("tapflow.effect.create_case", { detail: "Need help" })
    );
    assert.equal(caseR?.ok, true);
    assert.match(caseR?.note ?? "", /Need help/);

    const handoff = await drainTapFlowEffect(sample("tapflow.effect.human_handoff"));
    assert.equal(handoff?.ok, true);
    assert.match(handoff?.note ?? "", /handoff/i);
  });
});
