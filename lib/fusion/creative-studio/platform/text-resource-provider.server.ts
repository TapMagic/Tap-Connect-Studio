import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFontById } from "@/lib/fusion/creative-studio/fonts/catalog";
import { STUDIO_TEXT_ROLES } from "./text-authoring";
import type { StudioResourceProvider } from "./resource-provider-registry.server";

export const textAuthoringResourceProvider: StudioResourceProvider = {
  provider: "tapconnect-text",
  async resolve(input) {
    const [resourceKind, id] = input.resource.resourceId.split(":", 2);
    const font = resourceKind === "font" ? getFontById(id) : null;
    const role = resourceKind === "role" ? STUDIO_TEXT_ROLES.find((candidate) => candidate.id === id) : null;
    if (!font && !role) throw new Error(`Unknown Text authoring resource: ${input.resource.resourceId}`);
    const displayName = font?.family || role?.label || id;
    const name = `Studio Text · ${resourceKind} · ${displayName}`;
    const activeNameKey = `${input.businessId}:TEXT_STYLE:${name.toLocaleLowerCase("en-US")}`;
    const existing = await prisma.creativeResource.findUnique({ where: { activeNameKey }, include: { currentRevision: true } });
    if (existing?.currentRevision) return { resourceId: existing.id, kind: resourceKind };
    const payload = {
      schemaVersion: 1,
      resourceKind: "TEXT_STYLE",
      value: font ? { fontId: font.id, family: font.family, category: font.category } : { roleId: role!.id, defaults: role!.defaults },
      metadata: { studioResourceRef: { provider: "tapconnect-text", resourceId: input.resource.resourceId, version: 1 }, studioResourceKind: resourceKind, provenance: "tapconnect-canonical" },
    } as unknown as Prisma.InputJsonValue;
    return prisma.$transaction(async (tx) => {
      const resource = await tx.creativeResource.create({ data: { businessId: input.businessId, kind: "TEXT_STYLE", name, activeNameKey, status: "APPROVED", createdById: input.userId, updatedById: input.userId, approvedById: input.userId, approvedAt: new Date() } });
      const revision = await tx.creativeResourceRevision.create({ data: { resourceId: resource.id, version: 1, schemaVersion: 1, payload, createdById: input.userId } });
      await tx.creativeResource.update({ where: { id: resource.id }, data: { currentRevisionId: revision.id } });
      return { resourceId: resource.id, kind: resourceKind };
    }).catch(async (error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await prisma.creativeResource.findUnique({ where: { activeNameKey } });
        if (raced) return { resourceId: raced.id, kind: resourceKind };
      }
      throw error;
    });
  },
};
