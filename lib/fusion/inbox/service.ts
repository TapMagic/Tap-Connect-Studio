/**
 * TapInbox + TapCase domain — FUNCTIONAL with mock messaging provider.
 * Channel Guardian must pass before any outbound send.
 */

import type {
  FusionCaseStatus,
  FusionMessageDirection,
  FusionThreadChannel,
  FusionThreadStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  evaluateChannelGuardian,
  type GuardianPurpose,
  type MessageChannel,
} from "@/lib/fusion/comms/channel-guardian";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { isAddressSuppressed } from "@/lib/fusion/comms/suppression";
import { sendEmailViaMock } from "@/lib/fusion/comms/email-mock";
import { recordContactTimelineEvent } from "@/lib/fusion/audience/timeline";
import {
  canCaseTransition,
  nextCaseStatus,
  type CaseAction,
  type CaseStatus,
} from "./case-lifecycle";
import { evaluateReplyEligibility } from "./reply-eligibility";

export type ThreadRecord = {
  id: string;
  businessId: string;
  contactId: string | null;
  relationshipId: string | null;
  leadId: string | null;
  channel: MessageChannel;
  status: "OPEN" | "PENDING" | "CLOSED";
  subject: string | null;
  participant: string | null;
  assignedToId: string | null;
  lastMessageAt: string;
  messageCount?: number;
};

export type InboxMessageRecord = {
  id: string;
  threadId: string;
  direction: "INBOUND" | "OUTBOUND" | "SYSTEM";
  body: string;
  subject: string | null;
  provider: string;
  guardianCode: string | null;
  suppressed: boolean;
  createdAt: string;
};

export type TapCaseRecord = {
  id: string;
  businessId: string;
  threadId: string | null;
  contactId: string | null;
  status: FusionCaseStatus;
  subject: string;
  assigneeId: string | null;
  priority: number;
  openedAt: string;
  closedAt: string | null;
};

function enumToChannel(c: FusionThreadChannel): MessageChannel {
  const map: Record<FusionThreadChannel, MessageChannel> = {
    EMAIL: "email",
    MESSENGER: "messenger",
    INSTAGRAM_DM: "instagram_dm",
    WHATSAPP: "whatsapp",
    TELEGRAM: "telegram",
    SMS: "sms",
    MANYCHAT: "manychat",
  };
  return map[c];
}

function mapThread(row: {
  id: string;
  businessId: string;
  contactId: string | null;
  relationshipId: string | null;
  leadId: string | null;
  channel: FusionThreadChannel;
  status: FusionThreadStatus;
  subject: string | null;
  participant: string | null;
  assignedToId: string | null;
  lastMessageAt: Date;
  _count?: { messages: number };
}): ThreadRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    contactId: row.contactId,
    relationshipId: row.relationshipId,
    leadId: row.leadId,
    channel: enumToChannel(row.channel),
    status: row.status,
    subject: row.subject,
    participant: row.participant,
    assignedToId: row.assignedToId,
    lastMessageAt: row.lastMessageAt.toISOString(),
    messageCount: row._count?.messages,
  };
}

export async function createThreadFromLead(input: {
  businessId: string;
  leadId: string;
  email: string;
  subject?: string;
  body?: string;
  contactId?: string;
  relationshipId?: string;
}): Promise<ThreadRecord> {
  const thread = await prisma.messageThread.create({
    data: {
      businessId: input.businessId,
      leadId: input.leadId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      channel: "EMAIL",
      status: "OPEN",
      subject: input.subject ?? "Lead conversation",
      participant: input.email,
      messages: {
        create: {
          businessId: input.businessId,
          direction: "INBOUND",
          body: input.body ?? `New lead from ${input.email}`,
          subject: input.subject ?? "Lead conversation",
          provider: "lead_capture",
        },
      },
    },
  });

  enqueueOutboxSync(
    "inbox.thread_created",
    createGovernedEvent({
      name: "inbox.thread.created",
      businessId: input.businessId,
      aggregateType: "message_thread",
      aggregateId: thread.id,
      correlationId: crypto.randomUUID(),
      payload: { leadId: input.leadId, channel: "email" },
    })
  );

  if (input.relationshipId && input.contactId) {
    await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      kind: "lead_capture",
      threadId: thread.id,
      metadata: {
        leadId: input.leadId,
        email: input.email,
        subject: input.subject ?? "Lead conversation",
      },
    });
    await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      kind: "inbox_inbound",
      threadId: thread.id,
      metadata: {
        leadId: input.leadId,
        provider: "lead_capture",
      },
    });
  }

  return mapThread(thread);
}

export async function createThreadFromEmail(input: {
  businessId: string;
  email: string;
  subject: string;
  body: string;
  contactId?: string;
  relationshipId?: string;
}): Promise<ThreadRecord> {
  const thread = await prisma.messageThread.create({
    data: {
      businessId: input.businessId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      channel: "EMAIL",
      status: "OPEN",
      subject: input.subject,
      participant: input.email,
      messages: {
        create: {
          businessId: input.businessId,
          direction: "INBOUND",
          body: input.body,
          subject: input.subject,
          provider: "email_inbound",
        },
      },
    },
  });
  return mapThread(thread);
}

export async function listInboxThreads(input: {
  businessId: string;
  status?: FusionThreadStatus;
  limit?: number;
}): Promise<ThreadRecord[]> {
  const rows = await prisma.messageThread.findMany({
    where: {
      businessId: input.businessId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: input.limit ?? 50,
    include: { _count: { select: { messages: true } } },
  });
  return rows.map(mapThread);
}

export async function getThreadDetail(input: {
  businessId: string;
  threadId: string;
}): Promise<{
  thread: ThreadRecord;
  messages: InboxMessageRecord[];
  cases: TapCaseRecord[];
} | null> {
  const thread = await prisma.messageThread.findFirst({
    where: { id: input.threadId, businessId: input.businessId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      cases: { orderBy: { openedAt: "desc" } },
      _count: { select: { messages: true } },
    },
  });
  if (!thread) return null;

  return {
    thread: mapThread(thread),
    messages: thread.messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      direction: m.direction as InboxMessageRecord["direction"],
      body: m.body,
      subject: m.subject,
      provider: m.provider,
      guardianCode: m.guardianCode,
      suppressed: m.suppressed,
      createdAt: m.createdAt.toISOString(),
    })),
    cases: thread.cases.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      threadId: c.threadId,
      contactId: c.contactId,
      status: c.status,
      subject: c.subject,
      assigneeId: c.assigneeId,
      priority: c.priority,
      openedAt: c.openedAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
  };
}

export async function replyToThread(input: {
  businessId: string;
  threadId: string;
  body: string;
  purpose?: GuardianPurpose;
  consentGiven?: boolean;
  actorId?: string;
  featureEnabled?: boolean;
}): Promise<
  | { ok: true; message: InboxMessageRecord; mock: boolean }
  | { ok: false; code: string; error: string }
> {
  const messagingOn =
    input.featureEnabled ??
    (isFeatureEnabled("comms.messaging", {}) || isFeatureEnabled("comms.email", {}));

  const thread = await prisma.messageThread.findFirst({
    where: { id: input.threadId, businessId: input.businessId },
  });
  if (!thread) return { ok: false, code: "not_found", error: "Thread not found" };

  const eligibility = evaluateReplyEligibility({
    threadStatus: thread.status,
    featureEnabled: messagingOn,
    body: input.body,
    purpose: input.purpose,
  });
  if (!eligibility.ok) {
    return { ok: false, code: eligibility.code, error: eligibility.error };
  }

  const channel = enumToChannel(thread.channel);
  const participant = thread.participant ?? "";
  const suppressed = participant
    ? await isAddressSuppressed({
        businessId: input.businessId,
        channel,
        address: participant,
      })
    : false;

  const guardian = evaluateChannelGuardian({
    channel,
    businessId: input.businessId,
    recipientId: participant || undefined,
    purpose: input.purpose ?? "support",
    consentGiven: input.consentGiven ?? true,
    suppressed,
    featureEnabled: true,
    providerReady: true, // mock path always ready
    planAllows: true,
    userInitiated: true,
  });

  if (!guardian.allowed) {
    await prisma.inboxMessage.create({
      data: {
        threadId: thread.id,
        businessId: input.businessId,
        direction: "SYSTEM",
        body: `Blocked by Channel Guardian: ${guardian.reason}`,
        provider: "guardian",
        guardianCode: guardian.code,
        suppressed: true,
      },
    });
    return { ok: false, code: guardian.code, error: guardian.reason };
  }

  let providerRef: string | undefined;
  let mock = true;

  if (channel === "email" && participant) {
    const sent = await sendEmailViaMock({
      businessId: input.businessId,
      to: participant,
      subject: thread.subject ?? "Reply from Tap Connect",
      body: input.body,
      purpose: input.purpose ?? "support",
      consentGiven: input.consentGiven ?? true,
      skipGuardian: true, // already checked
      link: {
        threadId: thread.id,
        contactId: thread.contactId ?? undefined,
        relationshipId: thread.relationshipId ?? undefined,
        leadId: thread.leadId ?? undefined,
        skipInboxMessage: true,
        skipTimeline: true,
      },
    });
    if (!sent.ok) {
      return { ok: false, code: sent.code, error: sent.error };
    }
    providerRef = sent.providerRef;
    mock = sent.mock;
  } else {
    enqueueOutboxSync(
      "inbox.reply_mock",
      createGovernedEvent({
        name: "inbox.message.outbound",
        businessId: input.businessId,
        aggregateType: "message_thread",
        aggregateId: thread.id,
        correlationId: crypto.randomUUID(),
        payload: { channel, body: input.body, mock: true },
      })
    );
    providerRef = `mock_msg_${Date.now()}`;
  }

  const message = await prisma.inboxMessage.create({
    data: {
      threadId: thread.id,
      businessId: input.businessId,
      direction: "OUTBOUND" as FusionMessageDirection,
      body: input.body,
      subject: thread.subject,
      provider: mock ? "mock" : "provider",
      providerRef,
      guardianCode: guardian.code,
    },
  });

  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), status: "PENDING" },
  });

  if (thread.relationshipId && thread.contactId) {
    await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId: thread.contactId,
      relationshipId: thread.relationshipId,
      kind: "inbox_reply",
      threadId: thread.id,
      messageId: message.id,
      providerRef,
      metadata: { mock },
    });
  }

  return {
    ok: true,
    mock,
    message: {
      id: message.id,
      threadId: message.threadId,
      direction: "OUTBOUND",
      body: message.body,
      subject: message.subject,
      provider: message.provider,
      guardianCode: message.guardianCode,
      suppressed: message.suppressed,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function openCase(input: {
  businessId: string;
  subject: string;
  threadId?: string;
  contactId?: string;
  relationshipId?: string;
  assigneeId?: string;
  priority?: number;
}): Promise<TapCaseRecord> {
  const row = await prisma.tapCase.create({
    data: {
      businessId: input.businessId,
      threadId: input.threadId,
      contactId: input.contactId,
      relationshipId: input.relationshipId,
      subject: input.subject,
      assigneeId: input.assigneeId,
      priority: input.priority ?? 3,
      status: "OPEN",
    },
  });
  return {
    id: row.id,
    businessId: row.businessId,
    threadId: row.threadId,
    contactId: row.contactId,
    status: row.status,
    subject: row.subject,
    assigneeId: row.assigneeId,
    priority: row.priority,
    openedAt: row.openedAt.toISOString(),
    closedAt: null,
  };
}

export async function closeCase(input: {
  businessId: string;
  caseId: string;
}): Promise<TapCaseRecord | null> {
  const existing = await prisma.tapCase.findFirst({
    where: { id: input.caseId, businessId: input.businessId },
  });
  if (!existing) return null;

  const transition = nextCaseStatus(existing.status as CaseStatus, "close");
  if (!transition.ok) return null;

  const row = await prisma.tapCase.update({
    where: { id: existing.id },
    data: {
      status: transition.status as FusionCaseStatus,
      closedAt: transition.status === "CLOSED" ? new Date() : existing.closedAt,
    },
  });
  return {
    id: row.id,
    businessId: row.businessId,
    threadId: row.threadId,
    contactId: row.contactId,
    status: row.status,
    subject: row.subject,
    assigneeId: row.assigneeId,
    priority: row.priority,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}

export async function transitionCase(input: {
  businessId: string;
  caseId: string;
  action: CaseAction;
  assigneeId?: string;
}): Promise<
  | { ok: true; case: TapCaseRecord }
  | { ok: false; code: "not_found" | "invalid_transition"; error: string }
> {
  const existing = await prisma.tapCase.findFirst({
    where: { id: input.caseId, businessId: input.businessId },
  });
  if (!existing) {
    return { ok: false, code: "not_found", error: "Case not found" };
  }

  const status = existing.status as CaseStatus;
  if (!canCaseTransition(status, input.action)) {
    return {
      ok: false,
      code: "invalid_transition",
      error: `Cannot ${input.action} case in status ${status}`,
    };
  }

  const transition = nextCaseStatus(status, input.action);
  if (!transition.ok) {
    return { ok: false, code: "invalid_transition", error: transition.error };
  }

  const row = await prisma.tapCase.update({
    where: { id: existing.id },
    data: {
      status: transition.status as FusionCaseStatus,
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      ...(transition.status === "CLOSED" ? { closedAt: new Date() } : {}),
      ...(transition.status === "OPEN" || transition.status === "IN_PROGRESS"
        ? { closedAt: null }
        : {}),
    },
  });

  return {
    ok: true,
    case: {
      id: row.id,
      businessId: row.businessId,
      threadId: row.threadId,
      contactId: row.contactId,
      status: row.status,
      subject: row.subject,
      assigneeId: row.assigneeId,
      priority: row.priority,
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
    },
  };
}

export async function assignCase(input: {
  businessId: string;
  caseId: string;
  assigneeId: string;
}): Promise<TapCaseRecord | null> {
  const result = await transitionCase({
    businessId: input.businessId,
    caseId: input.caseId,
    action: "assign",
    assigneeId: input.assigneeId,
  });
  return result.ok ? result.case : null;
}

export async function closeThread(input: {
  businessId: string;
  threadId: string;
}): Promise<ThreadRecord | null> {
  const existing = await prisma.messageThread.findFirst({
    where: { id: input.threadId, businessId: input.businessId },
  });
  if (!existing) return null;
  const row = await prisma.messageThread.update({
    where: { id: existing.id },
    data: { status: "CLOSED" },
  });
  return mapThread(row);
}

export async function reopenThread(input: {
  businessId: string;
  threadId: string;
}): Promise<ThreadRecord | null> {
  const existing = await prisma.messageThread.findFirst({
    where: { id: input.threadId, businessId: input.businessId },
  });
  if (!existing || existing.status !== "CLOSED") return null;
  const row = await prisma.messageThread.update({
    where: { id: existing.id },
    data: { status: "OPEN" },
  });
  return mapThread(row);
}

export async function countOpenThreads(businessId: string): Promise<number> {
  return prisma.messageThread.count({
    where: { businessId, status: { in: ["OPEN", "PENDING"] } },
  });
}
