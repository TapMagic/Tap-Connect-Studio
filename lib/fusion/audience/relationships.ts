import { prisma } from "@/lib/db";
import type { CustomerRelationshipRecord } from "./contracts";

export async function ensureCustomerRelationship(params: {
  businessId: string;
  contactId: string;
  sourceType?: string;
  sourceLeadId?: string;
  sourceTapPointId?: string;
}): Promise<CustomerRelationshipRecord> {
  const existing = await prisma.customerRelationship.findUnique({
    where: {
      businessId_contactId: {
        businessId: params.businessId,
        contactId: params.contactId,
      },
    },
  });

  if (existing) {
    return mapRelationship(existing);
  }

  const created = await prisma.customerRelationship.create({
    data: {
      businessId: params.businessId,
      contactId: params.contactId,
      sourceType: params.sourceType,
      sourceLeadId: params.sourceLeadId,
      sourceTapPointId: params.sourceTapPointId,
      tapSaveEnabled: false,
    },
  });
  return mapRelationship(created);
}

export async function findRelationshipByPublicToken(publicToken: string) {
  return prisma.customerRelationship.findUnique({
    where: { publicToken },
    include: {
      contact: { select: { id: true } },
      business: { select: { name: true, logoUrl: true, slug: true } },
    },
  });
}

export async function countRelationshipsForBusiness(businessId: string) {
  return prisma.customerRelationship.count({
    where: { businessId, status: "ACTIVE" },
  });
}

function mapRelationship(row: {
  id: string;
  businessId: string;
  contactId: string;
  publicToken: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  tapSaveEnabled: boolean;
  sourceType: string | null;
  createdAt: Date;
}): CustomerRelationshipRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    contactId: row.contactId,
    publicToken: row.publicToken,
    status: row.status,
    tapSaveEnabled: row.tapSaveEnabled,
    sourceType: row.sourceType,
    createdAt: row.createdAt.toISOString(),
  };
}
