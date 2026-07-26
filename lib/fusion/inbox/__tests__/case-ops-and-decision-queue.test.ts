import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASE_ACTION_COPY,
  allowedCaseActionsForUi,
  caseMatchesQueueView,
  nextCaseStatus,
} from "@/lib/fusion/inbox/case-lifecycle";
import {
  appendInternalNote,
  applyExternalResolution,
  customerSafeCaseProjection,
  parseCaseMetadata,
} from "@/lib/fusion/inbox/case-metadata";
import {
  syncCaseToExternal,
  syncExternalToCase,
} from "@/lib/fusion/inbox/external-work-sync";
import {
  decisionItemFromOutbox,
  groupDecisionQueueItems,
  type DecisionQueueItem,
} from "@/lib/fusion/studio/operator-alerts";
import type { OutboxRecord } from "@/lib/fusion/publication/events";

describe("case lifecycle UX", () => {
  it("exposes operator labels and wait_customer transition", () => {
    assert.equal(CASE_ACTION_COPY.wait_customer.label, "Waiting for customer");
    const r = nextCaseStatus("IN_PROGRESS", "wait_internal");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.status, "WAITING");
    assert.ok(allowedCaseActionsForUi("OPEN").includes("wait_customer"));
    assert.ok(!allowedCaseActionsForUi("OPEN").includes("wait"));
  });

  it("maps queue views from status + metadata", () => {
    assert.equal(
      caseMatchesQueueView("OPEN", "new", { assigneeId: null }),
      true
    );
    assert.equal(
      caseMatchesQueueView("WAITING", "waiting_internal", { waitKind: "internal" }),
      true
    );
    assert.equal(
      caseMatchesQueueView("RESOLVED", "ready_to_close", { readyToClose: true }),
      true
    );
  });
});

describe("case internal notes", () => {
  it("never includes internal notes in customer-safe projection", () => {
    const meta = appendInternalNote({}, {
      id: "n1",
      body: "Private ops note",
      createdAt: new Date().toISOString(),
    });
    assert.equal(meta.internalNotes?.[0]?.internal, true);
    const safe = customerSafeCaseProjection(meta);
    assert.equal("internalNotes" in safe, false);
  });
});

describe("external work sync", () => {
  it("links mock item honestly and marks ready-to-close on resolve", () => {
    const linked = syncCaseToExternal({
      caseMeta: {},
      mode: "mock",
      item: {
        id: "ew1",
        provider: "monday",
        externalId: "ext_1",
        title: "Follow up",
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    assert.equal(linked.ok, true);
    assert.match(linked.message, /mock/i);
    assert.equal(linked.caseMeta.externalWork?.mode, "mock");

    const inbound = syncExternalToCase({
      caseMeta: linked.caseMeta,
      externalStatus: "Done",
      mode: "mock",
    });
    assert.equal(inbound.suggestReadyToClose, true);
    assert.equal(inbound.caseMeta.readyToClose, true);
  });

  it("applyExternalResolution respects auto-close config", () => {
    const meta = parseCaseMetadata({
      externalWork: {
        provider: "monday",
        externalId: "1",
        syncHealth: "mock",
        mode: "mock",
        autoCloseOnExternalResolve: true,
      },
    });
    const r = applyExternalResolution(meta, {
      status: "resolved",
      autoCloseConfigured: true,
    });
    assert.equal(r.autoClose, true);
  });
});

describe("decision queue grouping", () => {
  it("groups duplicates and filters test artifacts", () => {
    const mk = (id: string, aggregateId: string, title: string): DecisionQueueItem =>
      decisionItemFromOutbox({
        id,
        topic: "studio.operator.assign_failed",
        status: "FAILED",
        attempts: 1,
        lastError: "fail",
        availableAt: new Date().toISOString(),
        source: "memory",
        envelope: {
          name: "studio.operator.assign_failed",
          businessId: "b1",
          aggregateType: "device",
          aggregateId,
          occurredAt: new Date().toISOString(),
          payload: { title, detail: "x", href: "/dashboard/tap-points", kind: "assign_failed" },
        },
      } as unknown as OutboxRecord);

    const a = mk("1", "dev_a", "Assign failed");
    const b = mk("2", "dev_a", "Assign failed");
    const test = mk("3", "seed_x", "seed proof failure");
    const grouped = groupDecisionQueueItems([a, b, test], { includeTest: false });
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].occurrenceCount, 2);
    assert.equal(grouped[0].nextActionLabel, "Open Tap Points");
  });
});
