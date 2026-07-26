/**
 * Card → Support entry — creates Contact/Relationship/Consent, Inbox thread,
 * optional TapCase, deterministic suggested reply, analytics + evidence.
 */

import { prisma } from "@/lib/db";
import { upsertContact } from "@/lib/fusion/audience/contacts";
import { recordConsent } from "@/lib/fusion/audience/consent";
import { ensureCustomerRelationship } from "@/lib/fusion/audience/relationships";
import { recordContactTimelineEvent } from "@/lib/fusion/audience/timeline";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { createThreadFromEmail, openCase } from "@/lib/fusion/inbox";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import {
  buildDeterministicSupportReply,
  type SupportRequestType,
  type SuggestedReply,
} from "./suggested-reply";
import { evaluateActionEligibility } from "./action-registry";

export type CardSupportEntryInput = {
  businessId: string;
  email: string;
  name?: string;
  question: string;
  requestType?: SupportRequestType;
  consentGiven: boolean;
  campaignId?: string;
  deviceSlotId?: string;
  sectionId?: string;
  featureOverrides?: Parameters<typeof isFeatureEnabled>[1];
};

export type CardSupportEntryResult =
  | {
      ok: true;
      threadId: string;
      caseId: string | null;
      contactId: string;
      relationshipId: string;
      publicToken: string;
      myTapPath: string;
      suggestedReply: SuggestedReply;
      mock: true;
      classification: "IMPLEMENTED BUT NOT OWNER-READY";
    }
  | {
      ok: false;
      code:
        | "feature_off"
        | "consent_required"
        | "validation"
        | "business_not_found"
        | "inbox_unavailable";
      error: string;
    };

const CASE_TYPES: SupportRequestType[] = ["complaint", "billing"];

export async function submitCardSupportEntry(
  input: CardSupportEntryInput
): Promise<CardSupportEntryResult> {
  const question = input.question.trim();
  const email = input.email.trim().toLowerCase();
  if (!email || !question) {
    return { ok: false, code: "validation", error: "Email and question are required." };
  }
  if (!input.consentGiven) {
    return {
      ok: false,
      code: "consent_required",
      error: "Consent is required to open a support conversation.",
    };
  }

  const eligibility = evaluateActionEligibility({
    kind: "support",
    featureEnabled: (id) => isFeatureEnabled(id, input.featureOverrides ?? {}),
  });
  if (!eligibility.ok) {
    return {
      ok: false,
      code: "feature_off",
      error: eligibility.message,
    };
  }

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { id: true, name: true, brandKit: { select: { tone: true } } },
  });
  if (!business) {
    return { ok: false, code: "business_not_found", error: "Business not found." };
  }

  const requestType: SupportRequestType = input.requestType ?? "question";

  const contact = await upsertContact({
    businessId: input.businessId,
    email,
    name: input.name,
    metadata: {
      lastSupportSource: "card",
      lastSupportAt: new Date().toISOString(),
    },
  });

  let sourceTapPointId: string | undefined;
  if (input.deviceSlotId) {
    const tapPoint = await prisma.tapPoint.findUnique({
      where: { deviceSlotId: input.deviceSlotId },
      select: { id: true },
    });
    sourceTapPointId = tapPoint?.id;
  }

  const relationship = await ensureCustomerRelationship({
    businessId: input.businessId,
    contactId: contact.id,
    sourceType: "card_support",
    sourceTapPointId,
  });

  await recordConsent({
    businessId: input.businessId,
    contactId: contact.id,
    channel: "EMAIL",
    status: "GRANTED",
    legalBasis: "consent",
    sourceType: "card_support",
    sourceId: input.sectionId ?? relationship.id,
  });

  const subject = supportSubject(requestType, input.name, email);
  let thread;
  try {
    thread = await createThreadFromEmail({
      businessId: input.businessId,
      email,
      subject,
      body: question,
      contactId: contact.id,
      relationshipId: relationship.id,
      campaignId: input.campaignId,
      campaignTitle: undefined,
    });
  } catch {
    return {
      ok: false,
      code: "inbox_unavailable",
      error: "Could not create inbox thread. Please try again or email us directly.",
    };
  }

  const suggestedReply = buildDeterministicSupportReply({
    businessName: business.name,
    customerName: input.name,
    question,
    requestType,
    brandTone: business.brandKit?.tone,
  });

  await prisma.messageThread.update({
    where: { id: thread.id },
    data: {
      metadata: {
        source: "card_support",
        requestType,
        sectionId: input.sectionId ?? null,
        campaignId: input.campaignId ?? null,
        deviceSlotId: input.deviceSlotId ?? null,
        suggestedReply: {
          ...suggestedReply,
          status: "pending_review",
          createdAt: new Date().toISOString(),
        },
      },
    },
  });

  let caseId: string | null = null;
  if (CASE_TYPES.includes(requestType)) {
    const opened = await openCase({
      businessId: input.businessId,
      subject,
      threadId: thread.id,
      contactId: contact.id,
      relationshipId: relationship.id,
      priority: requestType === "complaint" ? 2 : 3,
    });
    caseId = opened.id;
  }

  await recordContactTimelineEvent({
    businessId: input.businessId,
    contactId: contact.id,
    relationshipId: relationship.id,
    kind: "inbox_inbound",
    threadId: thread.id,
    metadata: {
      source: "card_support",
      requestType,
      caseId,
    },
  });

  try {
    await prisma.clickEvent.create({
      data: {
        businessId: input.businessId,
        campaignId: input.campaignId,
        deviceSlotId: input.deviceSlotId,
        eventType: "card_support_submitted",
        blockId: input.sectionId,
      },
    });
  } catch {
    // analytics best-effort
  }

  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `card_support_${Date.now()}`;

  enqueueOutboxSync(
    "card.support_submitted",
    createGovernedEvent({
      name: "card.support.submitted",
      businessId: input.businessId,
      aggregateType: "message_thread",
      aggregateId: thread.id,
      correlationId,
      payload: {
        contactId: contact.id,
        relationshipId: relationship.id,
        caseId,
        requestType,
        evidenceClass: "confirmed",
        claim: "Customer submitted support question from Card",
      },
    })
  );

  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId: input.businessId,
        actorType: "PUBLIC",
        action: "card.support.submit",
        resourceType: "message_thread",
        resourceId: thread.id,
        correlationId,
        metadata: {
          contactId: contact.id,
          caseId,
          requestType,
          consent: "GRANTED",
        },
      },
    });
  } catch {
    // audit optional
  }

  return {
    ok: true,
    threadId: thread.id,
    caseId,
    contactId: contact.id,
    relationshipId: relationship.id,
    publicToken: relationship.publicToken,
    myTapPath: `/mytap/${relationship.publicToken}`,
    suggestedReply,
    mock: true,
    classification: "IMPLEMENTED BUT NOT OWNER-READY",
  };
}

function supportSubject(
  requestType: SupportRequestType,
  name: string | undefined,
  email: string
): string {
  const who = name?.trim() || email;
  switch (requestType) {
    case "feedback":
      return `Card feedback · ${who}`;
    case "complaint":
      return `Card complaint · ${who}`;
    case "billing":
      return `Card billing · ${who}`;
    default:
      return `Card question · ${who}`;
  }
}

export function readSuggestedReplyFromThreadMetadata(metadata: unknown): {
  suggestedReply: SuggestedReply & { status?: string; createdAt?: string };
} | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).suggestedReply;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.body !== "string") return null;
  return {
    suggestedReply: {
      mode: "deterministic",
      body: s.body,
      confidence: typeof s.confidence === "number" ? s.confidence : 0.5,
      grounding: Array.isArray(s.grounding)
        ? (s.grounding as SuggestedReply["grounding"])
        : [],
      requestType: (s.requestType as SupportRequestType) || "question",
      requiresHumanApproval: true,
      aiUnavailable: true,
      costVisible: false,
      status: typeof s.status === "string" ? s.status : undefined,
      createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
    },
  };
}
