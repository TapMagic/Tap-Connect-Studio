import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ContactRecord } from "./contracts";

export async function findContactByEmail(businessId: string, email: string) {
  return prisma.contact.findFirst({
    where: { businessId, email: email.toLowerCase().trim() },
  });
}

export async function upsertContact(params: {
  businessId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ContactRecord> {
  const email = params.email.toLowerCase().trim();
  const existing = await findContactByEmail(params.businessId, email);

  if (existing) {
    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        name: params.name?.trim() || existing.name,
        phone: params.phone?.trim() || existing.phone,
        metadata: {
          ...(typeof existing.metadata === "object" && existing.metadata && !Array.isArray(existing.metadata)
            ? (existing.metadata as Record<string, unknown>)
            : {}),
          ...(params.metadata ?? {}),
        } as Prisma.InputJsonValue,
      },
    });
    return mapContact(updated);
  }

  const created = await prisma.contact.create({
    data: {
      businessId: params.businessId,
      email,
      name: params.name?.trim() || undefined,
      phone: params.phone?.trim() || undefined,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
  return mapContact(created);
}

export async function listContactsForBusiness(businessId: string, limit = 100): Promise<ContactRecord[]> {
  const rows = await prisma.contact.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(mapContact);
}

export async function countContactsForBusiness(businessId: string) {
  return prisma.contact.count({ where: { businessId } });
}

function mapContact(row: {
  id: string;
  businessId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ContactRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    email: row.email,
    phone: row.phone,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
