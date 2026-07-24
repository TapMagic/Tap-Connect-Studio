/**
 * End-to-end local closeout workflow for Productivity & Work Management.
 * Proves the 18 required mock surfaces against one canonical ExternalWorkItem.
 */

import {
  connectWorkProvider,
  disconnectWorkProvider,
  createExternalWorkItem,
  updateExternalWorkItem,
  evaluateWorkProviderHealth,
  getProductivitySnapshot,
  ingestKnowledgeMock,
  postCollabAlert,
} from "./adapter";
import {
  discoverWorkspaces,
  addWorkItemComment,
  addWorkItemAttachment,
  pollProviderSync,
  applyInboundWebhook,
  resolveWorkItemConflict,
  retryWorkItemSync,
  postCollabApproval,
  runAutomationAction,
} from "./operations";
import {
  setDefaultWorkProvider,
  getDefaultWorkProvider,
  isConnected,
  upsertWorkItem,
  summarizeAnalytics,
  listAudit,
} from "./store";
import { workBridges, applyExternalCompletionToTapConnect } from "./workflows";

export type CloseoutStepResult = {
  step: number;
  name: string;
  ok: boolean;
  detail?: string;
};

export function runProductivityCloseoutWorkflow(businessId: string): {
  ok: boolean;
  steps: CloseoutStepResult[];
  workItemId?: string;
  liveClassification: "VERIFIED — CREDENTIALS REQUIRED";
} {
  const steps: CloseoutStepResult[] = [];
  const push = (step: number, name: string, ok: boolean, detail?: string) => {
    steps.push({ step, name, ok, detail });
  };

  // 1. Choose default work platform
  setDefaultWorkProvider(businessId, "monday");
  push(1, "choose_default", getDefaultWorkProvider(businessId) === "monday");

  // 2. Connect mock provider
  const conn = connectWorkProvider({ businessId, provider: "monday" });
  push(2, "connect_mock", conn.ok && isConnected(businessId, "monday"), conn.ok ? conn.mode : "fail");

  // 3. Discover workspaces/boards
  const disc = discoverWorkspaces({ businessId, provider: "monday" });
  push(
    3,
    "discover",
    disc.ok && (disc.ok ? disc.data.workspaces.length > 0 : false),
    disc.ok ? String(disc.data.workspaces.length) : disc.error
  );

  // 4. TapCase → task
  const tap = workBridges.tapCaseToTask({
    businessId,
    title: "Closeout TapCase task",
    sourceId: `case_closeout_${Date.now()}`,
  });
  push(4, "tapcase_task", tap.ok, tap.ok ? tap.data.id : tap.error);

  // 5. Campaign approval task
  const camp = workBridges.campaignApprovalToReviewTask({
    businessId,
    title: "Closeout campaign approval",
    sourceId: `camp_closeout_${Date.now()}`,
  });
  push(5, "campaign_approval", camp.ok);

  // 6. Incident from provider/Tap Point failure
  const incident = workBridges.providerFailureToIncident({
    businessId,
    title: "Closeout provider failure",
    sourceId: `fail_closeout_${Date.now()}`,
  });
  const tapPoint = workBridges.tapPointFailureToServiceTask({
    businessId,
    title: "Closeout Tap Point failure",
    sourceId: `tp_closeout_${Date.now()}`,
  });
  push(6, "incident_tasks", incident.ok && tapPoint.ok);

  // 7. Inbox follow-up
  const inbox = workBridges.inboxFollowUpToTask({
    businessId,
    title: "Closeout inbox follow-up",
    sourceId: `inbox_closeout_${Date.now()}`,
  });
  push(7, "inbox_followup", inbox.ok);

  // Primary item for sync proofs — use TapCase item
  if (!tap.ok) {
    return {
      ok: false,
      steps,
      liveClassification: "VERIFIED — CREDENTIALS REQUIRED",
    };
  }
  const workItemId = tap.data.id;
  const externalId = tap.data.externalId;

  // 8. Update assignee, status, priority, due date + custom fields
  const updated = updateExternalWorkItem({
    id: workItemId,
    businessId,
    patch: {
      assigneeExternalIds: ["user_mock_1"],
      status: "in_progress",
      priority: "high",
      dueAt: "2026-08-15T17:00:00.000Z",
      customFields: { lane: "ops", estimate: 2 },
    },
  });
  push(
    8,
    "update_fields",
    updated.ok &&
      updated.ok &&
      updated.data.assigneeExternalIds?.[0] === "user_mock_1" &&
      updated.data.status === "in_progress" &&
      updated.data.priority === "high" &&
      updated.data.customFields?.lane === "ops"
  );

  // 9. Comment + attachment sync
  const comment = addWorkItemComment({
    businessId,
    workItemId,
    body: "Closeout sync comment",
  });
  const att = addWorkItemAttachment({
    businessId,
    workItemId,
    name: "brief.pdf",
    url: "https://mock.tapconnect.local/files/brief.pdf",
  });
  push(9, "comment_attachment", comment.ok && att.ok);

  // 10. Simulated webhook
  const wh = applyInboundWebhook({
    businessId,
    provider: "monday",
    eventType: "item.updated",
    externalId,
    patch: { status: "review" },
    comment: "Webhook update",
    idempotencyKey: `closeout-wh-${workItemId}`,
  });
  push(10, "webhook", wh.ok && wh.ok && !wh.data.duplicate);

  // 11. Polling fallback
  const poll = pollProviderSync({ businessId, provider: "monday" });
  push(11, "poll_sync", poll.ok && poll.ok && poll.data.synced >= 0);

  // 12. Idempotent duplicate webhook
  const whDup = applyInboundWebhook({
    businessId,
    provider: "monday",
    eventType: "item.updated",
    externalId,
    idempotencyKey: `closeout-wh-${workItemId}`,
  });
  push(12, "idempotent_webhook", whDup.ok && whDup.ok && whDup.data.duplicate === true);

  // 13. Conflict detection + resolution
  const current = updated.ok ? updated.data : tap.data;
  upsertWorkItem({
    ...current,
    id: workItemId,
    syncStatus: "conflict",
    status: "in_progress",
    raw: { ...current.raw, localEdit: true },
  });
  const resolved = resolveWorkItemConflict({
    businessId,
    workItemId,
    strategy: "prefer_provider",
    providerStatus: "done",
  });
  const retried = retryWorkItemSync({ businessId, workItemId });
  push(13, "conflict_retry", resolved.ok && retried.ok);

  // 14. Complete → TapConnect object update
  const completed = updateExternalWorkItem({
    id: workItemId,
    businessId,
    patch: { status: "done" },
  });
  const activity =
    completed.ok
      ? applyExternalCompletionToTapConnect({
          businessId,
          workItem: completed.data,
        })
      : null;
  push(
    14,
    "completion_tapconnect",
    Boolean(completed.ok && activity?.kind === "completed" && activity.tapConnectUpdate)
  );

  // 15. Audit, health, analytics
  const health = evaluateWorkProviderHealth("monday", businessId);
  const snap = getProductivitySnapshot(businessId);
  const analytics = summarizeAnalytics(businessId);
  const audit = listAudit(businessId);
  push(
    15,
    "audit_health_analytics",
    health.connected &&
      audit.length > 0 &&
      analytics.total > 0 &&
      snap.liveClassification === "VERIFIED — CREDENTIALS REQUIRED"
  );

  // 16. Disconnect + reconnect
  disconnectWorkProvider(businessId, "monday");
  const afterDisc = !isConnected(businessId, "monday");
  const recon = connectWorkProvider({ businessId, provider: "monday" });
  push(16, "disconnect_reconnect", afterDisc && recon.ok && isConnected(businessId, "monday"));

  // 17. Slack/Teams alert + approval
  const alert = postCollabAlert({
    businessId,
    provider: "slack",
    text: "Closeout alert",
    severity: "warning",
  });
  const approval = postCollabApproval({
    businessId,
    provider: "microsoft_teams",
    text: "Closeout approval",
  });
  push(17, "slack_teams", alert.ok && approval.ok);

  // 18. Knowledge ingestion (Notion / Drive / OneDrive)
  const notion = ingestKnowledgeMock({
    businessId,
    provider: "notion",
    title: "Closeout brand",
    excerpt: "Neon lime",
  });
  const drive = ingestKnowledgeMock({
    businessId,
    provider: "google_drive",
    title: "Closeout doc",
    excerpt: "Drive knowledge",
  });
  const od = ingestKnowledgeMock({
    businessId,
    provider: "onedrive",
    title: "Closeout od",
    excerpt: "OneDrive knowledge",
  });
  const zap = runAutomationAction({
    businessId,
    provider: "zapier",
    action: "sync_closeout",
    idempotencyKey: `zap-closeout-${businessId}`,
  });
  push(18, "knowledge_automation", notion.ok && drive.ok && od.ok && zap.ok);

  return {
    ok: steps.every((s) => s.ok),
    steps,
    workItemId,
    liveClassification: "VERIFIED — CREDENTIALS REQUIRED",
  };
}
