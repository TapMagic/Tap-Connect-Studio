import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  listPendingOutbox,
  resetMemoryOutbox,
} from "../../publication/events";
import {
  recordContactTimelineEvent,
  listContactTimelineEvents,
  resetMemoryContactTimeline,
} from "../../audience/timeline";
import { sendEmailViaMock } from "../email-mock";

describe("Email → Inbox → contact timeline wiring", () => {
  beforeEach(() => {
    resetMemoryOutbox();
    resetMemoryContactTimeline();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetMemoryOutbox();
    resetMemoryContactTimeline();
  });

  it("mock send with link enqueues email.send and contact timeline outbox", async () => {
    const result = await sendEmailViaMock({
      businessId: "biz_wire",
      to: "lead@example.com",
      subject: "Thanks from Tap Connect",
      body: "Your offer is ready.",
      purpose: "transactional",
      featureEnabled: true,
      link: {
        contactId: "contact_1",
        relationshipId: "rel_1",
        threadId: "thread_1",
        leadId: "lead_1",
        correlationId: "corr_lead_1",
      },
    });

    assert.equal(result.ok, true);
    const topics = listPendingOutbox().map((r) => r.topic);
    assert.ok(topics.includes("email.send"));
    assert.ok(topics.includes("audience.contact_timeline"));

    const timeline = await listContactTimelineEvents({
      businessId: "biz_wire",
      contactId: "contact_1",
    });
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]?.kind, "email_outbound");
    assert.equal(timeline[0]?.label, "Email sent");
  });

  it("records lead capture and inbound inbox moments on timeline", async () => {
    await recordContactTimelineEvent({
      businessId: "biz_wire",
      contactId: "contact_1",
      relationshipId: "rel_1",
      kind: "lead_capture",
      threadId: "thread_1",
      metadata: { leadId: "lead_1" },
    });
    await recordContactTimelineEvent({
      businessId: "biz_wire",
      contactId: "contact_1",
      relationshipId: "rel_1",
      kind: "inbox_inbound",
      threadId: "thread_1",
    });

    const timeline = await listContactTimelineEvents({
      businessId: "biz_wire",
      contactId: "contact_1",
    });
    assert.equal(timeline.length, 2);
    assert.deepEqual(
      timeline.map((e) => e.kind).sort(),
      ["inbox_inbound", "lead_capture"]
    );
  });

  it("reply path skips duplicate inbox message but still records timeline via service contract", async () => {
    const result = await sendEmailViaMock({
      businessId: "biz_wire",
      to: "lead@example.com",
      subject: "Re: Your question",
      body: "We can help.",
      purpose: "support",
      featureEnabled: true,
      link: {
        contactId: "contact_1",
        relationshipId: "rel_1",
        threadId: "thread_1",
        skipInboxMessage: true,
      },
    });
    assert.equal(result.ok, true);
    assert.ok(listPendingOutbox().some((r) => r.topic === "audience.contact_timeline"));
  });
});
