/**
 * Server-only Email audience loader — Contact + ConsentRecord + suppression.
 * Do not import from Client Components.
 */

import { prisma } from "@/lib/db";
import { normalizeSuppressionAddress } from "@/lib/fusion/comms/suppression-utils";
import type { AudienceContactSummary } from "./audience-readiness";

export async function loadEmailAudienceContactSummaries(businessId: string): Promise<{
  contacts: AudienceContactSummary[];
  consentLoaded: boolean;
  suppressionLoaded: boolean;
}> {
  const contacts = await prisma.contact.findMany({
    where: { businessId },
    take: 500,
    select: { id: true, email: true },
    orderBy: { createdAt: "desc" },
  });

  let consentByContact = new Map<string, boolean>();
  let consentLoaded = false;
  try {
    const contactIds = contacts.map((c) => c.id);
    if (contactIds.length > 0) {
      const rows = await prisma.consentRecord.findMany({
        where: {
          businessId,
          contactId: { in: contactIds },
          channel: "EMAIL",
        },
        orderBy: { recordedAt: "desc" },
        select: { contactId: true, status: true },
      });
      for (const row of rows) {
        if (consentByContact.has(row.contactId)) continue;
        consentByContact.set(row.contactId, row.status === "GRANTED");
      }
    }
    consentLoaded = true;
  } catch {
    consentLoaded = false;
    consentByContact = new Map();
  }

  let suppressedAddresses = new Set<string>();
  let suppressionLoaded = false;
  try {
    const rows = await prisma.communicationSuppression.findMany({
      where: { businessId, channel: "email" },
      select: { address: true },
      take: 2000,
    });
    for (const row of rows) {
      const normalized = normalizeSuppressionAddress(row.address);
      if (normalized) suppressedAddresses.add(normalized);
    }
    suppressionLoaded = true;
  } catch {
    suppressionLoaded = false;
    suppressedAddresses = new Set();
  }

  const summaries: AudienceContactSummary[] = contacts.map((c) => {
    const email = c.email?.trim() || null;
    const normalized = email ? normalizeSuppressionAddress(email) : null;
    const hasConsentRow = consentByContact.has(c.id);
    return {
      contactId: c.id,
      email,
      consentKnown: consentLoaded && hasConsentRow,
      consentEmail: hasConsentRow ? consentByContact.get(c.id) : null,
      suppressed:
        suppressionLoaded && normalized
          ? suppressedAddresses.has(normalized)
          : false,
    };
  });

  return { contacts: summaries, consentLoaded, suppressionLoaded };
}
