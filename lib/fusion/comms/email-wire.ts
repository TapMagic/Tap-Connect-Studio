/**
 * Wire outbound email → TapInbox message + contact timeline event.
 * Used by mock adapter and lead thank-you path (no live Resend required).
 */

import type { FusionMessageDirection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordContactTimelineEvent } from "@/lib/fusion/audience/timeline";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

export type EmailLinkContext = {
  threadId?: string;
  leadId?: string;
  contactId?: string;
  relationshipId?: string;
  correlationId?: string;
  /** When caller already wrote the InboxMessage (e.g. replyToThread) */
  skipInboxMessage?: boolean;
  /** When caller records timeline after persisting the message */
  skipTimeline?: boolean;
  messageId?: string;
};

export type EmailWireResult = {
  threadId: string | null;
  messageId: string | null;
  timelineEventId: string | null;
};

async function resolveEmailThread(input: {
  businessId: string;
  threadId?: string;
  leadId?: string;
  contactId?: string;
  participant: string;
}) {
  if (!isIsolatedFusionDatabaseConfigured()) return null;

  if (input.threadId) {
    return prisma.messageThread.findFirst({
      where: { id: input.threadId, businessId: input.businessId },
    });
  }
  if (input.leadId) {
    return prisma.messageThread.findFirst({
      where: { leadId: input.leadId, businessId: input.businessId },
      orderBy: { lastMessageAt: "desc" },
    });
  }
  if (input.contactId) {
    return prisma.messageThread.findFirst({
      where: {
        businessId: input.businessId,
        contactId: input.contactId,
        channel: "EMAIL",
        participant: input.participant,
      },
      orderBy: { lastMessageAt: "desc" },
    });
  }
  return null;
}

export async function wireEmailOutboundSideEffects(input: {
  businessId: string;
  to: string;
  subject: string;
  body: string;
  providerRef: string;
  mock: boolean;
  link?: EmailLinkContext;
}): Promise<EmailWireResult> {
  const link = input.link;
  if (!link?.contactId && !link?.relationshipId && !link?.threadId && !link?.leadId) {
    return { threadId: null, messageId: null, timelineEventId: null };
  }

  let threadId = link.threadId ?? null;
  let messageId = link.messageId ?? null;

  if (!link.skipInboxMessage && isIsolatedFusionDatabaseConfigured()) {
    try {
      let thread = await resolveEmailThread({
        businessId: input.businessId,
        threadId: link.threadId,
        leadId: link.leadId,
        contactId: link.contactId,
        participant: input.to,
      });

      if (!thread && link.contactId) {
        thread = await prisma.messageThread.create({
          data: {
            businessId: input.businessId,
            contactId: link.contactId,
            relationshipId: link.relationshipId,
            leadId: link.leadId,
            channel: "EMAIL",
            status: "OPEN",
            subject: input.subject,
            participant: input.to,
          },
        });
      }

      if (thread) {
        threadId = thread.id;
        const message = await prisma.inboxMessage.create({
          data: {
            threadId: thread.id,
            businessId: input.businessId,
            direction: "OUTBOUND" as FusionMessageDirection,
            body: input.body,
            subject: input.subject,
            provider: input.mock ? "mock" : "resend",
            providerRef: input.providerRef,
            metadata: {
              wiredBy: "email-wire",
              mock: input.mock,
            },
          },
        });
        messageId = message.id;
        await prisma.messageThread.update({
          where: { id: thread.id },
          data: { lastMessageAt: new Date(), status: "PENDING" },
        });
      }
    } catch (err) {
      console.warn("[comms] email inbox wire failed", err);
    }
  }

  let timelineEventId: string | null = null;
  if (link.relationshipId && link.contactId && !link.skipTimeline) {
    const timeline = await recordContactTimelineEvent({
      businessId: input.businessId,
      contactId: link.contactId,
      relationshipId: link.relationshipId,
      kind: link.skipInboxMessage ? "inbox_reply" : "email_outbound",
      correlationId: link.correlationId,
      threadId: threadId ?? undefined,
      messageId: messageId ?? undefined,
      providerRef: input.providerRef,
      metadata: {
        to: input.to,
        subject: input.subject,
        mock: input.mock,
      },
    });
    timelineEventId = timeline?.id ?? null;
  }

  return { threadId, messageId, timelineEventId };
}
