import type { CreativeSurfaceKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CreativeResourceError } from "@/lib/fusion/creative-platform/resources";

export type DocumentCreativeResourceReference = {
  resourceId: string;
  resourceRevisionId: string;
  documentPath: string;
};

export function collectDocumentCreativeResourceReferences(
  value: unknown,
  rootPath = "$"
): DocumentCreativeResourceReference[] {
  const references: DocumentCreativeResourceReference[] = [];
  const visit = (current: unknown, path: string) => {
    if (!current || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    const record = current as Record<string, unknown>;
    const resourceRef = record.resourceRef;
    if (resourceRef && typeof resourceRef === "object") {
      const ref = resourceRef as Record<string, unknown>;
      if (
        typeof ref.resourceId === "string" &&
        typeof ref.revisionId === "string"
      ) {
        references.push({
          resourceId: ref.resourceId,
          resourceRevisionId: ref.revisionId,
          documentPath: `${path}.resourceRef`,
        });
      }
    }
    for (const [key, child] of Object.entries(record)) {
      if (key !== "resourceRef") visit(child, `${path}.${key}`);
    }
  };
  visit(value, rootPath);
  return references.filter(
    (reference, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.resourceId === reference.resourceId &&
          candidate.resourceRevisionId === reference.resourceRevisionId &&
          candidate.documentPath === reference.documentPath
      ) === index
  );
}

export async function recordSavedDocumentResourceUsage(input: {
  businessId: string;
  surface: CreativeSurfaceKind;
  subjectId: string;
  references: DocumentCreativeResourceReference[];
}) {
  const resourceIds = [...new Set(input.references.map((item) => item.resourceId))];
  const resources = await prisma.creativeResource.findMany({
    where: {
      id: { in: resourceIds },
      businessId: input.businessId,
      deletedAt: null,
    },
    include: { revisions: { select: { id: true } } },
  });
  const allowed = new Map(
    resources.map((resource) => [
      resource.id,
      new Set(resource.revisions.map((revision) => revision.id)),
    ])
  );
  for (const reference of input.references) {
    if (!allowed.get(reference.resourceId)?.has(reference.resourceRevisionId)) {
      throw new CreativeResourceError("Reusable design not found", 404);
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.creativeResourceUsage.deleteMany({
      where: {
        businessId: input.businessId,
        surface: input.surface,
        subjectId: input.subjectId,
      },
    });
    if (input.references.length) {
      await tx.creativeResourceUsage.createMany({
        data: input.references.map((reference) => ({
          businessId: input.businessId,
          surface: input.surface,
          subjectId: input.subjectId,
          resourceId: reference.resourceId,
          resourceRevisionId: reference.resourceRevisionId,
          documentPath: reference.documentPath,
        })),
      });
    }
  });
}
