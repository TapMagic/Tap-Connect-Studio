import type { FusionConsentChannel, FusionConsentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { ConsentChannel, ConsentRecordDto, ConsentStatus } from "./contracts";

export async function recordConsent(params: {
  businessId: string;
  contactId: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  legalBasis?: string;
  sourceType?: string;
  sourceId?: string;
}): Promise<ConsentRecordDto> {
  const row = await prisma.consentRecord.create({
    data: {
      businessId: params.businessId,
      contactId: params.contactId,
      channel: params.channel as FusionConsentChannel,
      status: params.status as FusionConsentStatus,
      legalBasis: params.legalBasis,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
    },
  });

  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `consent_${Date.now()}`;

  try {
    await prisma.platformAuditEvent.create({
      data: {
        businessId: params.businessId,
        actorType: "PUBLIC",
        action: "consent.record",
        resourceType: "contact",
        resourceId: params.contactId,
        correlationId,
        metadata: {
          channel: params.channel,
          status: params.status,
          sourceType: params.sourceType ?? null,
        },
      },
    });
  } catch {
    // audit optional mid-migration
  }

  enqueueOutboxSync(
    "consent.record",
    createGovernedEvent({
      name: "consent.recorded",
      businessId: params.businessId,
      aggregateType: "contact",
      aggregateId: params.contactId,
      correlationId,
      payload: {
        channel: params.channel,
        status: params.status,
        consentRecordId: row.id,
      },
    })
  );

  return {
    id: row.id,
    contactId: row.contactId,
    channel: params.channel,
    status: params.status,
    legalBasis: row.legalBasis,
    sourceType: row.sourceType,
    recordedAt: row.recordedAt.toISOString(),
  };
}

export async function getLatestConsentForContact(contactId: string, channel: ConsentChannel) {
  return prisma.consentRecord.findFirst({
    where: { contactId, channel: channel as FusionConsentChannel },
    orderBy: { recordedAt: "desc" },
  });
}
