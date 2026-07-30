/**
 * Asset Studio Collections — organization over a single MediaAsset SoT.
 * Membership is many-to-many; files are never duplicated into Collections.
 */

import { prisma } from "@/lib/db";
import type { CollectionDto } from "@/lib/fusion/assets/collection-types";

export type { CollectionDto };

export async function listCollections(businessId: string): Promise<CollectionDto[]> {
  const rows = await prisma.mediaCollection.findMany({
    where: { businessId },
    orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { members: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    accent: r.accent,
    sortOrder: r.sortOrder,
    pinned: r.pinned,
    parentId: r.parentId,
    memberCount: r._count.members,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createCollection(
  businessId: string,
  input: {
    name: string;
    description?: string;
    icon?: string;
    accent?: string;
    parentId?: string | null;
  }
): Promise<CollectionDto> {
  const name = input.name.trim();
  if (!name) throw new Error("Collection name is required");
  const maxOrder = await prisma.mediaCollection.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });
  const row = await prisma.mediaCollection.create({
    data: {
      businessId,
      name,
      description: input.description?.trim() || null,
      icon: input.icon || null,
      accent: input.accent || null,
      parentId: input.parentId || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { _count: { select: { members: true } } },
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    accent: row.accent,
    sortOrder: row.sortOrder,
    pinned: row.pinned,
    parentId: row.parentId,
    memberCount: row._count.members,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateCollection(
  businessId: string,
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    icon: string | null;
    accent: string | null;
    pinned: boolean;
    sortOrder: number;
    parentId: string | null;
  }>
): Promise<CollectionDto | null> {
  const existing = await prisma.mediaCollection.findFirst({
    where: { id, businessId },
  });
  if (!existing) return null;
  const row = await prisma.mediaCollection.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.accent !== undefined ? { accent: patch.accent } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.parentId !== undefined ? { parentId: patch.parentId } : {}),
    },
    include: { _count: { select: { members: true } } },
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    accent: row.accent,
    sortOrder: row.sortOrder,
    pinned: row.pinned,
    parentId: row.parentId,
    memberCount: row._count.members,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteCollection(
  businessId: string,
  id: string
): Promise<boolean> {
  const existing = await prisma.mediaCollection.findFirst({
    where: { id, businessId },
  });
  if (!existing) return false;
  await prisma.mediaCollection.delete({ where: { id } });
  return true;
}

export async function reorderCollections(
  businessId: string,
  orderedIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.mediaCollection.updateMany({
        where: { id, businessId },
        data: { sortOrder },
      })
    )
  );
}

export async function addMembers(
  businessId: string,
  collectionId: string,
  mediaAssetIds: string[]
): Promise<number> {
  const collection = await prisma.mediaCollection.findFirst({
    where: { id: collectionId, businessId },
  });
  if (!collection) throw new Error("Collection not found");
  const assets = await prisma.mediaAsset.findMany({
    where: { businessId, id: { in: mediaAssetIds } },
    select: { id: true },
  });
  let added = 0;
  for (const asset of assets) {
    try {
      await prisma.mediaCollectionMember.create({
        data: {
          businessId,
          collectionId,
          mediaAssetId: asset.id,
        },
      });
      added += 1;
    } catch {
      // unique membership — already present
    }
  }
  return added;
}

export async function removeMembers(
  businessId: string,
  collectionId: string,
  mediaAssetIds: string[]
): Promise<number> {
  const result = await prisma.mediaCollectionMember.deleteMany({
    where: {
      businessId,
      collectionId,
      mediaAssetId: { in: mediaAssetIds },
    },
  });
  return result.count;
}

export async function memberAssetIds(
  businessId: string,
  collectionId: string
): Promise<string[]> {
  const rows = await prisma.mediaCollectionMember.findMany({
    where: { businessId, collectionId },
    orderBy: { sortOrder: "asc" },
    select: { mediaAssetId: true },
  });
  return rows.map((r) => r.mediaAssetId);
}
