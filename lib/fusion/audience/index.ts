import { prisma } from "@/lib/db";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import type { LeadCaptureAudienceInput, LeadCaptureAudienceResult } from "./contracts";
import { upsertContact } from "./contacts";
import { recordConsent } from "./consent";
import { ensureCustomerRelationship } from "./relationships";

export { upsertContact, findContactByEmail, listContactsForBusiness, countContactsForBusiness } from "./contacts";
export { ensureCustomerRelationship, findRelationshipByPublicToken, countRelationshipsForBusiness } from "./relationships";
export { recordConsent, getLatestConsentForContact } from "./consent";
export { getMyTapProjection } from "./mytap-projection";
export { computeRelationshipHealth } from "./health";
export type { RelationshipHealth, HealthInput, HealthSignal } from "./health";
export type * from "./contracts";
/**
 * Dual-write bridge: V1 Lead remains source of truth; Contact + Relationship + Consent added when possible.
 */
export async function upsertAudienceFromLeadCapture(
  input: LeadCaptureAudienceInput
): Promise<LeadCaptureAudienceResult> {
  const contact = await upsertContact({
    businessId: input.businessId,
    email: input.email,
    name: input.name,
    phone: input.phone,
    metadata: { lastLeadId: input.leadId, captureType: input.captureType ?? "email_capture" },
  });

  await prisma.lead.update({
    where: { id: input.leadId },
    data: { contactId: contact.id },
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
    sourceType: "lead",
    sourceLeadId: input.leadId,
    sourceTapPointId,
  });

  let consentRecorded = false;
  if (input.consentGiven) {
    await recordConsent({
      businessId: input.businessId,
      contactId: contact.id,
      channel: "EMAIL",
      status: "GRANTED",
      legalBasis: "consent",
      sourceType: "lead_form",
      sourceId: input.leadId,
    });
    consentRecorded = true;
  }

  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `aud_${Date.now()}`;

  enqueueOutboxSync(
    "audience.lead_capture",
    createGovernedEvent({
      name: "audience.contact.upserted",
      businessId: input.businessId,
      aggregateType: "contact",
      aggregateId: contact.id,
      correlationId,
      payload: {
        leadId: input.leadId,
        relationshipToken: relationship.publicToken,
        consentRecorded,
      },
    })
  );

  return {
    contactId: contact.id,
    relationshipId: relationship.id,
    publicToken: relationship.publicToken,
    consentRecorded,
  };
}
