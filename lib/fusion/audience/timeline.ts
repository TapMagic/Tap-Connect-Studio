/**
 * Contact / relationship timeline — persisted as TapSaveMoment rows + governed outbox.
 * Comms and lead events surface on Audience contact detail and MyTap moments.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { createMoment } from "@/lib/fusion/tapsave/moments";

export type ContactTimelineKind =
  | "lead_capture"
  | "email_outbound"
  | "inbox_inbound"
  | "inbox_reply"
  | "commerce_order_paid";

export type ContactTimelineEvent = {
  id: string;
  businessId: string;
  contactId: string;
  relationshipId: string;
  kind: ContactTimelineKind;
  occurredAt: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export const CONTACT_TIMELINE_LABELS: Record<ContactTimelineKind, string> = {
  lead_capture: "Lead captured",
  email_outbound: "Email sent",
  inbox_inbound: "Inbox message received",
  inbox_reply: "Inbox reply sent",
  commerce_order_paid: "Order paid (mock)",
};

const memoryTimeline: ContactTimelineEvent[] = [];

function correlationId(explicit?: string) {
  if (explicit) return explicit;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tl_${Date.now().toString(36)}`;
}

export async function recordContactTimelineEvent(input: {
  businessId: string;
  contactId: string;
  relationshipId: string;
  kind: ContactTimelineKind;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  threadId?: string;
  messageId?: string;
  providerRef?: string;
}): Promise<ContactTimelineEvent | null> {
  if (!input.relationshipId?.trim()) return null;

  const moment = createMoment({
    businessId: input.businessId,
    relationshipId: input.relationshipId,
    visitorRef: input.contactId,
    kind: input.kind as never,
    metadata: {
      contactId: input.contactId,
      threadId: input.threadId,
      messageId: input.messageId,
      providerRef: input.providerRef,
      ...input.metadata,
    },
  });

  const event: ContactTimelineEvent = {
    id: moment.id,
    businessId: input.businessId,
    contactId: input.contactId,
    relationshipId: input.relationshipId,
    kind: input.kind,
    occurredAt: moment.occurredAt,
    label: CONTACT_TIMELINE_LABELS[input.kind],
    metadata: moment.metadata,
  };

  enqueueOutboxSync(
    "audience.contact_timeline",
    createGovernedEvent({
      name: "audience.contact.timeline",
      businessId: input.businessId,
      aggregateType: "contact",
      aggregateId: input.contactId,
      correlationId: correlationId(input.correlationId),
      payload: {
        relationshipId: input.relationshipId,
        kind: input.kind,
        threadId: input.threadId,
        messageId: input.messageId,
        providerRef: input.providerRef,
      },
    })
  );

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      await prisma.tapSaveMoment.create({
        data: {
          id: moment.id,
          businessId: input.businessId,
          relationshipId: input.relationshipId,
          visitorRef: input.contactId,
          kind: input.kind,
          metadata: (moment.metadata ?? {}) as Prisma.InputJsonValue,
          occurredAt: new Date(moment.occurredAt),
        },
      });
      return event;
    } catch (err) {
      console.warn("[audience] timeline persist failed; using memory", err);
    }
  }

  memoryTimeline.unshift(event);
  return event;
}

export async function listContactTimelineEvents(input: {
  businessId: string;
  contactId: string;
  limit?: number;
}): Promise<ContactTimelineEvent[]> {
  const limit = input.limit ?? 30;

  if (isIsolatedFusionDatabaseConfigured()) {
    try {
      const relationships = await prisma.customerRelationship.findMany({
        where: { businessId: input.businessId, contactId: input.contactId },
        select: { id: true },
      });
      const relationshipIds = relationships.map((r) => r.id);
      if (relationshipIds.length === 0) return [];

      const rows = await prisma.tapSaveMoment.findMany({
        where: {
          businessId: input.businessId,
          relationshipId: { in: relationshipIds },
          kind: {
            in: [
              "lead_capture",
              "email_outbound",
              "inbox_inbound",
              "inbox_reply",
              "commerce_order_paid",
            ],
          },
        },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });

      return rows.map((row) => {
        const kind = row.kind as ContactTimelineKind;
        return {
          id: row.id,
          businessId: row.businessId,
          contactId: input.contactId,
          relationshipId: row.relationshipId,
          kind,
          occurredAt: row.occurredAt.toISOString(),
          label: CONTACT_TIMELINE_LABELS[kind] ?? row.kind,
          metadata:
            row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : undefined,
        };
      });
    } catch (err) {
      console.warn("[audience] timeline list failed; using memory", err);
    }
  }

  return memoryTimeline
    .filter((e) => e.businessId === input.businessId && e.contactId === input.contactId)
    .slice(0, limit);
}

/** Test helper — reset in-memory timeline between unit tests */
export function resetMemoryContactTimeline() {
  memoryTimeline.length = 0;
}
