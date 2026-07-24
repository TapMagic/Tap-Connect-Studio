import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  PRODUCTIVITY_PROVIDERS,
  resetProductivityMemory,
  connectWorkProvider,
  createExternalWorkItem,
  updateExternalWorkItem,
  getProductivitySnapshot,
  evaluateWorkProviderHealth,
  ingestKnowledgeMock,
  postCollabAlert,
  workBridges,
  applyExternalCompletionToTapConnect,
  mapExternalActivityToTapConnect,
  setDefaultWorkProvider,
  getDefaultWorkProvider,
  listWorkItems,
  discoverWorkspaces,
  addWorkItemComment,
  pollProviderSync,
  resolveWorkItemConflict,
  retryWorkItemSync,
  applyInboundWebhook,
  postCollabApproval,
  runAutomationAction,
  upsertWorkItem,
} from "../index";

const BIZ = "biz_productivity_test";

describe("Productivity & Work Management", () => {
  beforeEach(() => {
    resetProductivityMemory();
  });

  it("catalog covers the full provider family", () => {
    const ids = PRODUCTIVITY_PROVIDERS.map((p) => p.id).sort();
    assert.deepEqual(ids, [
      "airtable",
      "asana",
      "clickup",
      "github",
      "google_calendar",
      "google_drive",
      "jira",
      "make",
      "microsoft_outlook",
      "microsoft_planner",
      "microsoft_teams",
      "monday",
      "n8n",
      "notion",
      "onedrive",
      "slack",
      "trello",
      "zapier",
    ]);
    assert.equal(PRODUCTIVITY_PROVIDERS.length, 18);
    for (const p of PRODUCTIVITY_PROVIDERS) {
      assert.equal(p.categoryLabel, "Productivity & Work Management");
      assert.equal(p.supportsMock, true);
    }
  });

  it("connects mock and creates ExternalWorkItem with deep link", () => {
    const conn = connectWorkProvider({ businessId: BIZ, provider: "asana" });
    assert.equal(conn.ok, true);
    if (!conn.ok) return;
    assert.equal(conn.mode, "mock");

    const created = createExternalWorkItem({
      provider: "asana",
      businessId: BIZ,
      title: "Campaign review",
      sourceType: "campaign_approval",
      sourceId: "camp_1",
      priority: "high",
      dueAt: "2026-08-01T12:00:00.000Z",
      idempotencyKey: "campaign_approval:camp_1:asana",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.data.provider, "asana");
    assert.equal(created.data.sourceType, "campaign_approval");
    assert.match(created.data.url ?? "", /asana\/item\//);
    assert.equal(created.data.syncStatus, "pushed");
  });

  it("idempotency returns the same work item", () => {
    const key = "tapcase:case_9:monday";
    const a = createExternalWorkItem({
      provider: "monday",
      businessId: BIZ,
      title: "Case A",
      sourceType: "tapcase",
      sourceId: "case_9",
      idempotencyKey: key,
    });
    const b = createExternalWorkItem({
      provider: "monday",
      businessId: BIZ,
      title: "Case A duplicate",
      sourceType: "tapcase",
      sourceId: "case_9",
      idempotencyKey: key,
    });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.data.id, b.data.id);
    assert.equal(listWorkItems({ businessId: BIZ }).length, 1);
  });

  it("bridges TapCase, inbox, and provider failure workflows", () => {
    const tap = workBridges.tapCaseToTask({
      businessId: BIZ,
      title: "Case follow-up",
      sourceId: "case_1",
    });
    assert.equal(tap.ok, true);
    if (tap.ok) assert.equal(tap.data.sourceType, "tapcase");

    const inbox = workBridges.inboxFollowUpToTask({
      businessId: BIZ,
      title: "Reply needed",
      sourceId: "thr_1",
    });
    assert.equal(inbox.ok, true);

    const incident = workBridges.providerFailureToIncident({
      businessId: BIZ,
      title: "Stripe webhook down",
      sourceId: "fail_1",
    });
    assert.equal(incident.ok, true);
    if (incident.ok) assert.equal(incident.data.priority, "high");
  });

  it("updates status and maps completion back to TapConnect activity", () => {
    const created = createExternalWorkItem({
      provider: "jira",
      businessId: BIZ,
      title: "Loyalty exception",
      sourceType: "loyalty_commerce_exception",
      sourceId: "exc_1",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const updated = updateExternalWorkItem({
      id: created.data.id,
      businessId: BIZ,
      patch: { status: "done" },
    });
    assert.equal(updated.ok, true);
    if (!updated.ok) return;
    assert.equal(updated.data.syncStatus, "synced");

    const activity = mapExternalActivityToTapConnect({
      businessId: BIZ,
      workItemId: updated.data.id,
      kind: "status_change",
      message: "done",
    });
    assert.equal(activity.authorized, true);

    const completion = applyExternalCompletionToTapConnect({
      businessId: BIZ,
      workItem: { ...updated.data, status: "done" },
    });
    assert.equal(completion.kind, "completed");
    assert.equal(completion.tapConnectUpdate.relatedObjectId, "exc_1");
  });

  it("knowledge ingest and collab alerts respect capabilities", () => {
    const know = ingestKnowledgeMock({
      businessId: BIZ,
      provider: "notion",
      title: "Brand guide",
      excerpt: "Use neon lime accents",
    });
    assert.equal(know.ok, true);

    const refuse = ingestKnowledgeMock({
      businessId: BIZ,
      provider: "monday",
      title: "Nope",
      excerpt: "boards are not docs",
    });
    assert.equal(refuse.ok, false);

    const alert = postCollabAlert({
      businessId: BIZ,
      provider: "slack",
      text: "Approval needed",
      severity: "warning",
    });
    assert.equal(alert.ok, true);
  });

  it("health reports credentials_required without live env; snapshot is honest", () => {
    const health = evaluateWorkProviderHealth("monday", BIZ);
    assert.equal(health.mode, "credentials_required");
    assert.ok(health.missingEnvVars.includes("MONDAY_CLIENT_ID"));

    connectWorkProvider({ businessId: BIZ, provider: "slack" });
    setDefaultWorkProvider(BIZ, "slack");
    assert.equal(getDefaultWorkProvider(BIZ), "slack");

    const snap = getProductivitySnapshot(BIZ);
    assert.equal(snap.category, "Productivity & Work Management");
    assert.equal(snap.defaultProvider, "slack");
    assert.ok(
      snap.displayStatus === "functional_final_verification_required" ||
        snap.displayStatus === "verified_credentials_required"
    );
    assert.equal(snap.health.length, 18);
  });

  it("discovers workspaces, comments, poll sync, and conflict/retry", () => {
    const disc = discoverWorkspaces({ businessId: BIZ, provider: "monday" });
    assert.equal(disc.ok, true);
    if (!disc.ok) return;
    assert.ok(disc.data.workspaces.length >= 1);

    const created = createExternalWorkItem({
      provider: "monday",
      businessId: BIZ,
      title: "Sync me",
      sourceType: "manual",
      sourceId: "m1",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const comment = addWorkItemComment({
      businessId: BIZ,
      workItemId: created.data.id,
      body: "External update note",
    });
    assert.equal(comment.ok, true);

    const poll = pollProviderSync({ businessId: BIZ, provider: "monday" });
    assert.equal(poll.ok, true);
    if (poll.ok) assert.ok(poll.data.synced >= 1);

    const conflicted = {
      ...created.data,
      syncStatus: "conflict" as const,
      status: "open",
    };
    upsertWorkItem(conflicted);
    const resolved = resolveWorkItemConflict({
      businessId: BIZ,
      workItemId: created.data.id,
      strategy: "prefer_provider",
      providerStatus: "done",
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.equal(resolved.data.status, "done");

    const retried = retryWorkItemSync({
      businessId: BIZ,
      workItemId: created.data.id,
    });
    assert.equal(retried.ok, true);
    if (retried.ok) assert.equal(retried.data.retryCount, 1);
  });

  it("handles inbound webhooks, Slack approvals, and Zapier actions", () => {
    const created = createExternalWorkItem({
      provider: "asana",
      businessId: BIZ,
      title: "Webhook target",
      sourceType: "manual",
      sourceId: "wh1",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const wh = applyInboundWebhook({
      businessId: BIZ,
      provider: "asana",
      eventType: "item.updated",
      externalId: created.data.externalId,
      patch: { status: "in_progress" },
      comment: "Moved by provider",
      idempotencyKey: "wh-asana-1",
    });
    assert.equal(wh.ok, true);
    if (!wh.ok) return;
    assert.equal(wh.data.duplicate, false);
    assert.equal(wh.data.activity?.authorized, true);

    const dup = applyInboundWebhook({
      businessId: BIZ,
      provider: "asana",
      eventType: "item.updated",
      externalId: created.data.externalId,
      idempotencyKey: "wh-asana-1",
    });
    assert.equal(dup.ok, true);
    if (dup.ok) assert.equal(dup.data.duplicate, true);

    const approval = postCollabApproval({
      businessId: BIZ,
      provider: "microsoft_teams",
      text: "Approve campaign",
    });
    assert.equal(approval.ok, true);

    const zap = runAutomationAction({
      businessId: BIZ,
      provider: "zapier",
      action: "create_task",
      idempotencyKey: "zap-1",
    });
    assert.equal(zap.ok, true);
    const zapDup = runAutomationAction({
      businessId: BIZ,
      provider: "zapier",
      action: "create_task",
      idempotencyKey: "zap-1",
    });
    assert.equal(zapDup.ok, true);
    if (zap.ok && zapDup.ok) assert.equal(zap.data.runId, zapDup.data.runId);
  });
});
