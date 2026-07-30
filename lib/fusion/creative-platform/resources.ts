import {
  Prisma,
  type CreativeResourceKind,
  type CreativeResourceStatus,
  type CreativeSurfaceKind,
  type UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseCreativeResourcePayload,
  type CreativeResourcePayload,
} from "@/lib/fusion/creative-platform/model";

export class CreativeResourceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const EDIT_ROLES = new Set<UserRole>(["OWNER", "MANAGER", "MARKETING"]);
const APPROVE_ROLES = new Set<UserRole>(["OWNER", "MANAGER"]);

export function canEditCreativeResources(role: UserRole): boolean {
  return EDIT_ROLES.has(role);
}

export function canApproveCreativeResources(role: UserRole): boolean {
  return APPROVE_ROLES.has(role);
}

export function creativeResourceRoleForBusiness(
  user: { memberships: { businessId: string; role: UserRole }[] },
  businessId: string
): UserRole {
  const role = user.memberships.find(
    (membership) => membership.businessId === businessId
  )?.role;
  if (!role) throw new CreativeResourceError("Workspace membership not found", 404);
  return role;
}

export function requireCreativeResourcePermission(
  role: UserRole,
  action: "edit" | "approve"
) {
  const allowed =
    action === "approve"
      ? canApproveCreativeResources(role)
      : canEditCreativeResources(role);
  if (!allowed) {
    throw new CreativeResourceError(
      action === "approve"
        ? "Owner or Manager approval is required"
        : "Creative resource editing is not permitted",
      403
    );
  }
}

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function activeNameKey(
  businessId: string,
  kind: CreativeResourceKind,
  name: string
) {
  return `${businessId}:${kind}:${normalizedName(name).toLocaleLowerCase("en-US")}`;
}

function jsonPayload(payload: CreativeResourcePayload): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function assertPayloadKind(
  kind: CreativeResourceKind,
  payload: CreativeResourcePayload
) {
  if (payload.resourceKind !== kind) {
    throw new CreativeResourceError(
      `Payload kind ${payload.resourceKind} does not match ${kind}`,
      400
    );
  }
}

function mapKnownError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new CreativeResourceError(
      "A reusable design with this name and kind already exists",
      409
    );
  }
  throw error;
}

export async function listCreativeResources(input: {
  businessId: string;
  userId?: string;
  kind?: CreativeResourceKind;
  status?: CreativeResourceStatus;
  query?: string;
}) {
  return prisma.creativeResource.findMany({
    where: {
      businessId: input.businessId,
      deletedAt: null,
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.query
        ? { name: { contains: input.query.trim(), mode: "insensitive" } }
        : {}),
    },
    include: {
      currentRevision: true,
      _count: { select: { usages: true, revisions: true } },
      favorites: input.userId
        ? { where: { userId: input.userId }, select: { id: true } }
        : false,
      recents: input.userId
        ? {
            where: { userId: input.userId },
            select: { lastUsedAt: true, useCount: true },
          }
        : false,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 200,
  });
}

export async function getCreativeResource(input: {
  businessId: string;
  id: string;
}) {
  const resource = await prisma.creativeResource.findFirst({
    where: { id: input.id, businessId: input.businessId, deletedAt: null },
    include: {
      currentRevision: true,
      revisions: { orderBy: { version: "desc" } },
      usages: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!resource) throw new CreativeResourceError("Reusable design not found", 404);
  return resource;
}

export async function createCreativeResource(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  kind: CreativeResourceKind;
  name: string;
  payload: unknown;
}) {
  requireCreativeResourcePermission(input.role, "edit");
  const name = normalizedName(input.name);
  if (!name || name.length > 120) {
    throw new CreativeResourceError("Name must be between 1 and 120 characters", 400);
  }
  const payload = parseCreativeResourcePayload(input.payload);
  assertPayloadKind(input.kind, payload);
  try {
    return await prisma.$transaction(async (tx) => {
      const resource = await tx.creativeResource.create({
        data: {
          businessId: input.businessId,
          kind: input.kind,
          name,
          activeNameKey: activeNameKey(input.businessId, input.kind, name),
          createdById: input.userId,
          updatedById: input.userId,
        },
      });
      const revision = await tx.creativeResourceRevision.create({
        data: {
          resourceId: resource.id,
          version: 1,
          schemaVersion: payload.schemaVersion,
          payload: jsonPayload(payload),
          createdById: input.userId,
        },
      });
      return tx.creativeResource.update({
        where: { id: resource.id },
        data: { currentRevisionId: revision.id },
        include: { currentRevision: true },
      });
    });
  } catch (error) {
    return mapKnownError(error);
  }
}

export async function reviseCreativeResource(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  id: string;
  name?: string;
  payload: unknown;
}) {
  requireCreativeResourcePermission(input.role, "edit");
  const payload = parseCreativeResourcePayload(input.payload);
  const current = await getCreativeResource({
    businessId: input.businessId,
    id: input.id,
  });
  assertPayloadKind(current.kind, payload);
  const name = input.name ? normalizedName(input.name) : current.name;
  try {
    return await prisma.$transaction(async (tx) => {
      const latest = await tx.creativeResourceRevision.aggregate({
        where: { resourceId: current.id },
        _max: { version: true },
      });
      const revision = await tx.creativeResourceRevision.create({
        data: {
          resourceId: current.id,
          version: (latest._max.version ?? 0) + 1,
          schemaVersion: payload.schemaVersion,
          payload: jsonPayload(payload),
          createdById: input.userId,
        },
      });
      return tx.creativeResource.update({
        where: { id: current.id },
        data: {
          name,
          activeNameKey: activeNameKey(input.businessId, current.kind, name),
          currentRevisionId: revision.id,
          updatedById: input.userId,
          status: "DRAFT",
          approvedAt: null,
          approvedById: null,
        },
        include: { currentRevision: true },
      });
    });
  } catch (error) {
    return mapKnownError(error);
  }
}

export async function approveCreativeResource(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  id: string;
}) {
  requireCreativeResourcePermission(input.role, "approve");
  const resource = await getCreativeResource({
    businessId: input.businessId,
    id: input.id,
  });
  return prisma.creativeResource.update({
    where: { id: resource.id },
    data: {
      status: "APPROVED",
      approvedById: input.userId,
      approvedAt: new Date(),
      updatedById: input.userId,
    },
    include: { currentRevision: true },
  });
}

export async function duplicateCreativeResource(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  id: string;
  name: string;
}) {
  const resource = await getCreativeResource({
    businessId: input.businessId,
    id: input.id,
  });
  if (!resource.currentRevision) {
    throw new CreativeResourceError("Reusable design has no active revision", 409);
  }
  return createCreativeResource({
    businessId: input.businessId,
    userId: input.userId,
    role: input.role,
    kind: resource.kind,
    name: input.name,
    payload: resource.currentRevision.payload,
  });
}

export async function deleteCreativeResource(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  id: string;
}) {
  requireCreativeResourcePermission(input.role, "approve");
  const resource = await getCreativeResource({
    businessId: input.businessId,
    id: input.id,
  });
  if (resource.usages.some((usage) => usage.published)) {
    throw new CreativeResourceError(
      "This reusable design is required by published content and cannot be deleted",
      409
    );
  }
  return prisma.creativeResource.update({
    where: { id: resource.id },
    data: {
      deletedAt: new Date(),
      activeNameKey: null,
      status: "DEPRECATED",
      updatedById: input.userId,
    },
  });
}

export async function recordCreativeResourceUsage(input: {
  businessId: string;
  resourceId: string;
  resourceRevisionId: string;
  surface: CreativeSurfaceKind;
  subjectId: string;
  documentPath: string;
  published?: boolean;
}) {
  const resource = await prisma.creativeResource.findFirst({
    where: {
      id: input.resourceId,
      businessId: input.businessId,
      deletedAt: null,
      revisions: { some: { id: input.resourceRevisionId } },
    },
    select: { id: true },
  });
  if (!resource) throw new CreativeResourceError("Reusable design not found", 404);
  return prisma.creativeResourceUsage.upsert({
    where: {
      businessId_surface_subjectId_documentPath: {
        businessId: input.businessId,
        surface: input.surface,
        subjectId: input.subjectId,
        documentPath: input.documentPath,
      },
    },
    create: {
      ...input,
      published: Boolean(input.published),
    },
    update: {
      resourceId: input.resourceId,
      resourceRevisionId: input.resourceRevisionId,
      published: Boolean(input.published),
    },
  });
}

export async function setCreativeResourceFavorite(input: {
  businessId: string;
  userId: string;
  resourceId: string;
  favorite: boolean;
}) {
  const resource = await prisma.creativeResource.findFirst({
    where: {
      id: input.resourceId,
      businessId: input.businessId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!resource) throw new CreativeResourceError("Reusable design not found", 404);
  const key = {
    businessId_userId_resourceId: {
      businessId: input.businessId,
      userId: input.userId,
      resourceId: input.resourceId,
    },
  };
  if (!input.favorite) {
    await prisma.creativeResourceFavorite.deleteMany({
      where: key.businessId_userId_resourceId,
    });
    return { favorite: false };
  }
  await prisma.creativeResourceFavorite.upsert({
    where: key,
    create: {
      businessId: input.businessId,
      userId: input.userId,
      resourceId: input.resourceId,
    },
    update: {},
  });
  return { favorite: true };
}

export async function markCreativeResourceUsed(input: {
  businessId: string;
  userId: string;
  resourceId: string;
}) {
  const resource = await prisma.creativeResource.findFirst({
    where: {
      id: input.resourceId,
      businessId: input.businessId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!resource) throw new CreativeResourceError("Reusable design not found", 404);
  return prisma.creativeResourceRecent.upsert({
    where: {
      businessId_userId_resourceId: {
        businessId: input.businessId,
        userId: input.userId,
        resourceId: input.resourceId,
      },
    },
    create: {
      businessId: input.businessId,
      userId: input.userId,
      resourceId: input.resourceId,
    },
    update: {
      lastUsedAt: new Date(),
      useCount: { increment: 1 },
    },
  });
}
