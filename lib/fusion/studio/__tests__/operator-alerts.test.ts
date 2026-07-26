import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  createGovernedEvent,
  enqueueOutboxSync,
  markOutboxFailed,
  resetMemoryOutbox,
} from "@/lib/fusion/publication/events";
import {
  countOperatorFailures,
  decisionItemFromOutbox,
  isOperatorAlertTopic,
  kindFromTopic,
  listDecisionQueueItems,
  recordOperatorAlert,
} from "../operator-alerts";

describe("operator alerts → decision queue", () => {
  beforeEach(() => {
    resetMemoryOutbox();
  });

  it("classifies studio.operator topics", () => {
    assert.equal(isOperatorAlertTopic("studio.operator.assign_failed"), true);
    assert.equal(isOperatorAlertTopic("audience.lead_capture"), false);
    assert.equal(kindFromTopic("studio.operator.publish_failed"), "publish_failed");
    assert.equal(kindFromTopic("email.send"), "outbox_dead_letter");
  });

  it("maps outbox payload to remediation href", async () => {
    const prevUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      resetMemoryOutbox();
      const record = enqueueOutboxSync(
        "studio.operator.assign_failed",
        createGovernedEvent({
          name: "studio.operator.assign_failed",
          businessId: "b1",
          aggregateType: "campaign",
          aggregateId: "c1",
          correlationId: "x1",
          payload: {
            kind: "assign_failed",
            title: "Assign failed",
            detail: "Device not found",
            href: "/dashboard/campaigns/c1",
          },
        })
      );
      await markOutboxFailed(record.id, "Device not found");
      const item = decisionItemFromOutbox({
        ...record,
        status: "FAILED",
        lastError: "Device not found",
      });
      assert.equal(item.href, "/dashboard/campaigns/c1");
      assert.equal(item.kind, "assign_failed");
      assert.equal(countOperatorFailures([item]), 1);

      const queued = await listDecisionQueueItems({ businessId: "b1" });
      assert.ok(queued.some((q) => q.id === record.id));
    } finally {
      if (prevUrl !== undefined) process.env.DATABASE_URL = prevUrl;
    }
  });

  it("recordOperatorAlert marks FAILED for decision queue", async () => {
    const prevUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      resetMemoryOutbox();
      const row = await recordOperatorAlert({
        businessId: "b1",
        kind: "assign_failed",
        title: "Could not assign campaign",
        detail: "Slot closed",
        href: "/dashboard/campaigns/abc",
        aggregateType: "campaign",
        aggregateId: "abc",
      });
      assert.equal(row.status, "FAILED");
      assert.ok(isOperatorAlertTopic(row.topic));
    } finally {
      if (prevUrl !== undefined) process.env.DATABASE_URL = prevUrl;
    }
  });
});
