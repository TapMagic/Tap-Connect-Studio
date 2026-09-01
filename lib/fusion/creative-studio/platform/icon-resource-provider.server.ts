import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nativeIconAsset, createIconAsset, type IconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import { fetchIconSvg } from "@/lib/fusion/creative-studio/providers/iconify";
import type { StudioResourceProvider } from "./resource-provider-registry.server";

function parseIconId(resourceId: string) {
  const split = resourceId.indexOf(":");
  if (split <= 0 || split >= resourceId.length - 1) return null;
  return { collection: resourceId.slice(0, split), name: resourceId.slice(split + 1) };
}

async function resolveAsset(provider: "native" | "iconify", resourceId: string): Promise<IconAsset | null> {
  const parsed = parseIconId(resourceId);
  if (!parsed) return null;
  if (provider === "native") return nativeIconAsset(parsed.name);
  const svg = await fetchIconSvg(parsed.collection, parsed.name);
  return svg ? createIconAsset({ provider, collection: parsed.collection, iconName: parsed.name, svg }) : null;
}

async function resolveIconResource(input: { businessId: string; userId: string; provider: "native" | "iconify"; resourceId: string }) {
  const asset = await resolveAsset(input.provider, input.resourceId);
  if (!asset) throw new Error(`Unknown or unavailable icon: ${input.resourceId}`);
  const name = `Studio Icon · ${asset.canonicalId}`;
  const activeNameKey = `${input.businessId}:ICON:${name.toLocaleLowerCase("en-US")}`;
  const existing = await prisma.creativeResource.findUnique({ where: { activeNameKey }, include: { currentRevision: true } });
  if (existing?.currentRevision) return { resourceId: existing.id, kind: "icon" };
  const payload = {
    schemaVersion: 1,
    resourceKind: "ICON",
    value: asset,
    metadata: {
      studioResourceRef: { provider: input.provider, resourceId: asset.canonicalId, version: 1 },
      studioResourceKind: "icon",
      provenance: asset.source,
    },
  } as unknown as Prisma.InputJsonValue;
  return prisma.$transaction(async (tx) => {
    const resource = await tx.creativeResource.create({ data: { businessId: input.businessId, kind: "ICON", name, activeNameKey, status: "APPROVED", createdById: input.userId, updatedById: input.userId, approvedById: input.userId, approvedAt: new Date() } });
    const revision = await tx.creativeResourceRevision.create({ data: { resourceId: resource.id, version: 1, schemaVersion: 1, payload, createdById: input.userId } });
    await tx.creativeResource.update({ where: { id: resource.id }, data: { currentRevisionId: revision.id } });
    return { resourceId: resource.id, kind: "icon" };
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.creativeResource.findUnique({ where: { activeNameKey } });
      if (raced) return { resourceId: raced.id, kind: "icon" };
    }
    throw error;
  });
}

export const studioIconResourceProviders: readonly StudioResourceProvider[] = (["native", "iconify"] as const).map((provider) => ({
  provider,
  resolve: (input) => resolveIconResource({ businessId: input.businessId, userId: input.userId, provider, resourceId: input.resource.resourceId }),
}));
