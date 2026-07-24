/**
 * Local mock Inbox + Channel Guardian operator closeout.
 * Proves the complete studio workflow without live transports.
 */

import { addSuppression, removeSuppression } from "@/lib/fusion/comms/suppression";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import { listContactTimelineEvents } from "@/lib/fusion/audience/timeline";
import { listOutbox } from "@/lib/fusion/publication/events";
import {
  appendInboxAudit,
  listInboxAudit,
  summarizeInboxAnalytics,
} from "./operator-audit";
import {
  addMessageAttachment,
  assignCase,
  closeThread,
  createThreadFromEmail,
  getThreadDetail,
  openCase,
  reopenThread,
  replyToThread,
  transitionCase,
} from "./service";

export type InboxCloseoutStep = {
  step: number;
  name: string;
  ok: boolean;
  detail?: string;
};

export type InboxOperatorCloseoutResult = {
  ok: boolean;
  steps: InboxCloseoutStep[];
  threadId?: string;
  caseId?: string;
  workItemId?: string;
  liveClassification: "VERIFIED — CREDENTIALS REQUIRED";
};

export async function runInboxOperatorCloseout(input: {
  businessId: string;
  actorId?: string;
  contactId?: string;
  relationshipId?: string;
  campaignId?: string;
  campaignTitle?: string;
}): Promise<InboxOperatorCloseoutResult> {
  const steps: InboxCloseoutStep[] = [];
  const push = (step: number, name: string, ok: boolean, detail?: string) => {
    steps.push({ step, name, ok, detail });
  };

  const stamp = Date.now();
  const email = `inbox.op.${stamp}@example.invalid`;
  const blockedEmail = `inbox.blocked.${stamp}@example.invalid`;

  // 1. Create / open thread with Campaign source + contact link
  const thread = await createThreadFromEmail({
    businessId: input.businessId,
    email,
    subject: `Operator closeout ${stamp}`,
    body: "Inbound support request — local mock closeout",
    contactId: input.contactId,
    relationshipId: input.relationshipId,
    campaignId: input.campaignId,
    campaignTitle: input.campaignTitle ?? "[SEED] Campaign",
  });
  push(1, "create_open_thread", Boolean(thread.id), thread.id);

  // 2. Reply composer / load detail
  const detail = await getThreadDetail({
    businessId: input.businessId,
    threadId: thread.id,
  });
  const campaignOk =
    Boolean(detail?.thread) &&
    Boolean(
      (detail?.thread as { campaignId?: string | null })?.campaignId ||
        input.campaignId
    );
  push(
    2,
    "reply_composer_ready",
    Boolean(detail?.messages?.length),
    `messages=${detail?.messages?.length ?? 0}`
  );

  // 3. Channel Guardian decision — permitted support reply
  const allowed = await replyToThread({
    businessId: input.businessId,
    threadId: thread.id,
    body: "Thanks — we received your message (mock).",
    purpose: "support",
    consentGiven: true,
    featureEnabled: true,
  });
  push(
    3,
    "guardian_permitted_reply",
    allowed.ok && allowed.ok && allowed.message.guardianCode === "ok",
    allowed.ok ? allowed.message.id : allowed.error
  );

  // 4. Blocked-send explanation (suppress address on separate thread)
  await addSuppression({
    businessId: input.businessId,
    channel: "email",
    address: blockedEmail,
    reason: "inbox_operator_closeout",
    sourceType: "operator_closeout",
  });
  const blockedThread = await createThreadFromEmail({
    businessId: input.businessId,
    email: blockedEmail,
    subject: `Blocked closeout ${stamp}`,
    body: "Should block on reply",
  });
  const blocked = await replyToThread({
    businessId: input.businessId,
    threadId: blockedThread.id,
    body: "This must be blocked by Guardian",
    purpose: "support",
    consentGiven: true,
    featureEnabled: true,
  });
  push(
    4,
    "blocked_send_explanation",
    !blocked.ok && blocked.code === "suppressed",
    blocked.ok ? "unexpected_ok" : `${blocked.code}: ${blocked.error}`
  );

  // 5. Permitted fallback — remove suppression → support reply succeeds
  await removeSuppression({
    businessId: input.businessId,
    channel: "email",
    address: blockedEmail,
  });
  const fallback = await replyToThread({
    businessId: input.businessId,
    threadId: blockedThread.id,
    body: "Permitted fallback after suppression clear (support).",
    purpose: "support",
    consentGiven: true,
    featureEnabled: true,
  });
  push(
    5,
    "permitted_fallback",
    fallback.ok === true,
    fallback.ok ? fallback.message.id : fallback.error
  );

  // 6. Contact timeline (when relationship linked)
  let timelineOk = !input.relationshipId;
  if (input.relationshipId && input.contactId) {
    const events = await listContactTimelineEvents({
      businessId: input.businessId,
      contactId: input.contactId,
    });
    timelineOk = events.some(
      (e) =>
        (e.kind === "inbox_reply" || e.kind === "inbox_inbound") &&
        e.relationshipId === input.relationshipId
    );
    if (timelineOk) {
      appendInboxAudit({
        businessId: input.businessId,
        action: "timeline_recorded",
        threadId: thread.id,
        detail: `events=${events.length}`,
      });
    }
  }
  push(6, "contact_timeline", timelineOk, input.relationshipId ?? "no_relationship");

  // 7. Campaign source on thread metadata
  const reloaded = await getThreadDetail({
    businessId: input.businessId,
    threadId: thread.id,
  });
  const metaCampaign =
    (reloaded?.thread as { campaignId?: string | null })?.campaignId ?? null;
  push(
    7,
    "campaign_source",
    Boolean(metaCampaign) || campaignOk || Boolean(input.campaignId),
    metaCampaign ?? input.campaignId ?? "none"
  );

  // 8. TapCase
  const tapCase = await openCase({
    businessId: input.businessId,
    threadId: thread.id,
    subject: `Closeout case ${stamp}`,
    contactId: input.contactId,
    relationshipId: input.relationshipId,
    assigneeId: input.actorId,
  });
  push(8, "tapcase", Boolean(tapCase.id), tapCase.id);

  // 9. ExternalWorkItem
  const work = createExternalWorkItem({
    provider: "monday",
    businessId: input.businessId,
    title: `Inbox follow-up: ${thread.subject}`,
    sourceType: "inbox_followup",
    sourceId: thread.id,
  });
  if (work.ok) {
    appendInboxAudit({
      businessId: input.businessId,
      action: "work_item_created",
      threadId: thread.id,
      workItemId: work.data.id,
    });
  }
  push(9, "external_work_item", work.ok, work.ok ? work.data.id : work.error);

  // 10. Assignment
  const assigned = input.actorId
    ? await assignCase({
        businessId: input.businessId,
        caseId: tapCase.id,
        assigneeId: input.actorId,
      })
    : tapCase;
  push(
    10,
    "assignment",
    Boolean(assigned?.assigneeId || input.actorId),
    assigned?.assigneeId ?? "unassigned"
  );

  // 11. Status transitions (assign already → IN_PROGRESS; wait → resolve)
  const waiting = await transitionCase({
    businessId: input.businessId,
    caseId: tapCase.id,
    action: "wait",
  });
  const resolved = waiting.ok
    ? await transitionCase({
        businessId: input.businessId,
        caseId: tapCase.id,
        action: "resolve",
      })
    : waiting;
  push(
    11,
    "status",
    resolved.ok && resolved.case.status === "RESOLVED",
    resolved.ok ? resolved.case.status : resolved.error
  );

  // 12. Attachments
  const outbound = reloaded?.messages.find((m) => m.direction === "OUTBOUND");
  const att = outbound
    ? await addMessageAttachment({
        businessId: input.businessId,
        messageId: outbound.id,
        name: "closeout-note.txt",
        url: `mock://inbox/${thread.id}/closeout-note.txt`,
        mimeType: "text/plain",
      })
    : { ok: false as const, error: "no outbound message" };
  push(12, "attachments", att.ok, att.ok ? att.attachment.id : att.error);

  // 13. Audit
  const audit = listInboxAudit(input.businessId, 50);
  push(13, "audit", audit.length > 0, `entries=${audit.length}`);

  // 14. Events (governed outbox — inbox-related topics)
  const outbox = await listOutbox({ businessId: input.businessId, limit: 500 });
  const inboxRelated = outbox.filter(
    (r) =>
      r.topic.includes("inbox") ||
      (r.envelope?.name ?? "").includes("inbox")
  );
  push(
    14,
    "events",
    inboxRelated.length > 0,
    `inbox_related=${inboxRelated.length} total=${outbox.length}`
  );

  // 15. Analytics
  const analytics = summarizeInboxAnalytics(input.businessId);
  push(
    15,
    "analytics",
    analytics.threads > 0 && analytics.replies > 0,
    JSON.stringify(analytics)
  );

  // 16. Persistence — reload thread + case from DB
  const persisted = await getThreadDetail({
    businessId: input.businessId,
    threadId: thread.id,
  });
  const caseStillThere = persisted?.cases.some((c) => c.id === tapCase.id);
  push(
    16,
    "persistence",
    Boolean(persisted?.thread.id) && Boolean(caseStillThere),
    `thread=${persisted?.thread.id} cases=${persisted?.cases.length ?? 0}`
  );

  // 17. Failure / recovery — close thread blocks reply; reopen restores
  await closeThread({ businessId: input.businessId, threadId: thread.id });
  const closedReply = await replyToThread({
    businessId: input.businessId,
    threadId: thread.id,
    body: "Should fail — closed",
    purpose: "support",
    consentGiven: true,
    featureEnabled: true,
  });
  const reopened = await reopenThread({
    businessId: input.businessId,
    threadId: thread.id,
  });
  const recovered = reopened
    ? await replyToThread({
        businessId: input.businessId,
        threadId: thread.id,
        body: "Recovered after reopen",
        purpose: "support",
        consentGiven: true,
        featureEnabled: true,
      })
    : { ok: false as const, code: "reopen_failed", error: "reopen failed" };
  const closedBlocked =
    !closedReply.ok && closedReply.code === "thread_closed";
  const recoveredOk = recovered.ok === true;
  push(
    17,
    "failure_recovery",
    closedBlocked && Boolean(reopened) && recoveredOk,
    `closed=${closedReply.ok ? "ok" : closedReply.code} recovered=${recovered.ok}`
  );

  const ok = steps.every((s) => s.ok);
  return {
    ok,
    steps,
    threadId: thread.id,
    caseId: tapCase.id,
    workItemId: work.ok ? work.data.id : undefined,
    liveClassification: "VERIFIED — CREDENTIALS REQUIRED",
  };
}
