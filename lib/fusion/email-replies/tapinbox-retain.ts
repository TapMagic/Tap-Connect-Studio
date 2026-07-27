/**
 * Authoritative TapInbox retention for inbound replies.
 * Reuses MessageThread / InboxMessage — never a parallel Inbox.
 * Does not auto-open Cases.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createThreadFromEmail } from "@/lib/fusion/inbox/service";

export type RetainInTapInboxInput = {
  businessId: string;
  fromAddress: string;
  subject: string;
  body: string;
  contactId?: string | null;
  relationshipId?: string | null;
  campaignId?: string | null;
  campaignTitle?: string | null;
  provider?: string;
  providerMessageId?: string | null;
  internetMessageId?: string | null;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  replyAlias?: string | null;
  attachmentMetadata?: unknown;
  classification?: string | null;
  urgency?: string | null;
};

export type RetainInTapInboxResult =
  | {
      ok: true;
      created: boolean;
      threadId: string;
      messageId: string;
    }
  | { ok: false; error: string };

/**
 * Create or reuse TapInbox thread/message for an inbound reply.
 * Idempotent on providerMessageId when present.
 */
export async function retainInboundReplyInTapInbox(
  input: RetainInTapInboxInput
): Promise<RetainInTapInboxResult> {
  const provider = input.provider ?? "email_inbound_reply";
  const providerRef = input.providerMessageId?.trim() || null;

  if (providerRef) {
    const existing = await prisma.inboxMessage.findFirst({
      where: {
        businessId: input.businessId,
        providerRef,
      },
      select: { id: true, threadId: true },
    });
    if (existing) {
      return {
        ok: true,
        created: false,
        threadId: existing.threadId,
        messageId: existing.id,
      };
    }
  }

  const messageMetadata: Prisma.InputJsonValue = {
    source: "email_replies",
    replyAlias: input.replyAlias ?? null,
    internetMessageId: input.internetMessageId ?? null,
    inReplyTo: input.inReplyTo ?? null,
    references: input.referencesHeader ?? null,
    classification: input.classification ?? null,
    urgency: input.urgency ?? null,
    attachments: input.attachmentMetadata ?? [],
    unread: true,
  };

  try {
    const thread = await createThreadFromEmail({
      businessId: input.businessId,
      email: input.fromAddress,
      subject: input.subject || "(no subject)",
      body: input.body,
      contactId: input.contactId ?? undefined,
      relationshipId: input.relationshipId ?? undefined,
      campaignId: input.campaignId ?? undefined,
      campaignTitle: input.campaignTitle ?? undefined,
      provider,
      providerRef: providerRef ?? undefined,
      messageMetadata,
    });

    const first = await prisma.inboxMessage.findFirst({
      where: { threadId: thread.id, businessId: input.businessId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!first) {
      return { ok: false, error: "TapInbox message was not created" };
    }

    return {
      ok: true,
      created: true,
      threadId: thread.id,
      messageId: first.id,
    };
  } catch (err) {
    // Race: duplicate providerRef insert
    if (providerRef) {
      const again = await prisma.inboxMessage.findFirst({
        where: { businessId: input.businessId, providerRef },
        select: { id: true, threadId: true },
      });
      if (again) {
        return {
          ok: true,
          created: false,
          threadId: again.threadId,
          messageId: again.id,
        };
      }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "TapInbox retention failed",
    };
  }
}
