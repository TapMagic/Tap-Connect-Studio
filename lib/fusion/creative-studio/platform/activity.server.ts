import "server-only";

import { prisma } from "@/lib/db";
import { markCreativeResourceUsed } from "@/lib/fusion/creative-platform/resources";
import type { StudioRecentResource, StudioResourceUsageEvent } from "./activity";

export async function recordStudioResourceUsage(
  event: StudioResourceUsageEvent & { canonicalCreativeResourceId: string }
): Promise<StudioRecentResource> {
  const recent = await markCreativeResourceUsed({
    businessId: event.businessId,
    userId: event.userId,
    resourceId: event.canonicalCreativeResourceId,
    resourceKind: event.resourceKind,
    consumer: event.consumer,
    context: event.context ?? "general",
    operation: event.operation,
  });
  return {
    resource: event.resource,
    resourceKind: event.resourceKind,
    consumer: event.consumer,
    context: event.context ?? "general",
    lastOperation: event.operation,
    lastUsedAt: recent.lastUsedAt.toISOString(),
    useCount: recent.useCount,
  };
}

export async function listStudioRecentResources(input: {
  businessId: string;
  userId: string;
  consumer: string;
  context?: string;
  resourceKind?: string;
  limit?: number;
}): Promise<StudioRecentResource[]> {
  const rows = await prisma.creativeResourceRecent.findMany({
    where: {
      businessId: input.businessId,
      userId: input.userId,
      consumer: input.consumer,
      context: input.context ?? "general",
      ...(input.resourceKind ? { resourceKind: input.resourceKind } : {}),
      resource: { deletedAt: null },
    },
    include: { resource: { include: { currentRevision: true } } },
    orderBy: { lastUsedAt: "desc" },
    take: Math.max(1, Math.min(100, input.limit ?? 20)),
  });
  return rows.map((row) => {
    const payload = row.resource.currentRevision?.payload as { metadata?: { studioResourceRef?: { provider?: unknown; resourceId?: unknown; version?: unknown } } } | null;
    const source = payload?.metadata?.studioResourceRef;
    const resource = typeof source?.provider === "string" && typeof source.resourceId === "string"
      ? { provider: source.provider, resourceId: source.resourceId, ...(typeof source.version === "string" || typeof source.version === "number" ? { version: source.version } : {}), canonicalResourceId: row.resourceId }
      : { provider: "creative-resource", resourceId: row.resourceId, canonicalResourceId: row.resourceId };
    return {
      resource,
      resourceKind: row.resourceKind,
      consumer: row.consumer,
      context: row.context,
      lastOperation: row.lastOperation as StudioRecentResource["lastOperation"],
      lastUsedAt: row.lastUsedAt.toISOString(),
      useCount: row.useCount,
    };
  });
}
