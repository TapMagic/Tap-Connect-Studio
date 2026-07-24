/**
 * TapCommerce → Insights provenance — in-memory evidence records for mock checkout wiring.
 * Mock path uses modeled evidence class; counts surface on Insights hub with TapProof labels.
 */

import type { EvidenceClass } from "./tapproof";
import type { InsightKpi } from "./types";

export type CommerceEvidenceRecord = {
  id: string;
  businessId: string;
  orderId: string;
  relationshipId: string | null;
  contactId: string | null;
  paymentRef: string | null;
  totalCents: number;
  currency: string;
  mock: boolean;
  loyaltyAwardStubId: string | null;
  timelineEventId: string | null;
  occurredAt: string;
};

const store: CommerceEvidenceRecord[] = [];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cev_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `cev_${Date.now().toString(36)}`;
}

/** Test helper */
export function resetCommerceEvidenceStore(): void {
  store.length = 0;
}

export function recordCommerceEvidence(input: {
  businessId: string;
  orderId: string;
  relationshipId?: string | null;
  contactId?: string | null;
  paymentRef?: string | null;
  totalCents: number;
  currency: string;
  mock: boolean;
  loyaltyAwardStubId?: string | null;
  timelineEventId?: string | null;
  occurredAt?: string;
}): CommerceEvidenceRecord {
  const record: CommerceEvidenceRecord = {
    id: newId(),
    businessId: input.businessId,
    orderId: input.orderId,
    relationshipId: input.relationshipId ?? null,
    contactId: input.contactId ?? null,
    paymentRef: input.paymentRef ?? null,
    totalCents: input.totalCents,
    currency: input.currency,
    mock: input.mock,
    loyaltyAwardStubId: input.loyaltyAwardStubId ?? null,
    timelineEventId: input.timelineEventId ?? null,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  store.unshift(record);
  return record;
}

export function listCommerceEvidence(input: {
  businessId: string;
  from?: Date;
  limit?: number;
}): CommerceEvidenceRecord[] {
  const limit = input.limit ?? 100;
  return store
    .filter((r) => {
      if (r.businessId !== input.businessId) return false;
      if (input.from && new Date(r.occurredAt) < input.from) return false;
      return true;
    })
    .slice(0, limit);
}

export function commerceEvidenceClass(mock: boolean, hasRecords: boolean): EvidenceClass {
  if (!hasRecords) return "incomplete";
  return mock ? "modeled" : "confirmed";
}

/** Pure KPI builder — testable without async I/O */
export function buildCommerceInsightKpis(input: {
  businessId: string;
  rangeDays: number;
  from: Date;
}): InsightKpi[] {
  const inRange = listCommerceEvidence({
    businessId: input.businessId,
    from: input.from,
  });
  const all = listCommerceEvidence({ businessId: input.businessId, limit: 500 });
  const paidCount = inRange.length;
  const revenueCents = inRange.reduce((s, r) => s + r.totalCents, 0);
  const loyaltyStubs = inRange.filter((r) => r.loyaltyAwardStubId).length;
  const linked = inRange.filter((r) => r.relationshipId).length;
  const mock = all.some((r) => r.mock);
  const hasAny = all.length > 0;

  return [
    {
      key: "commerce_orders_paid",
      label: `Orders paid (${input.rangeDays}d)`,
      value: paidCount,
      evidenceClass: commerceEvidenceClass(mock, paidCount > 0 || hasAny),
      source: "TapCommerce/commerce-wire",
      seeded: false,
    },
    {
      key: "commerce_revenue_mock",
      label: `Revenue mock (${input.rangeDays}d)`,
      value: Math.round(revenueCents / 100),
      evidenceClass: paidCount > 0 ? "derived" : commerceEvidenceClass(mock, hasAny),
      source: "CommerceOrder.totalCents",
      seeded: false,
    },
    {
      key: "commerce_relationship_links",
      label: `Relationship links (${input.rangeDays}d)`,
      value: linked,
      evidenceClass: linked > 0 ? "confirmed" : commerceEvidenceClass(mock, hasAny),
      source: "CustomerRelationship",
      seeded: false,
    },
    {
      key: "commerce_loyalty_stubs",
      label: `Loyalty award stubs (${input.rangeDays}d)`,
      value: loyaltyStubs,
      evidenceClass: loyaltyStubs > 0 ? "modeled" : commerceEvidenceClass(mock, hasAny),
      source: "loyalty.award.stub",
      seeded: false,
    },
  ];
}
