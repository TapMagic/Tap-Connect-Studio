import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { normalizeExperienceType, prepareIndependentExperienceDraft } from "@/lib/fusion/card/experience-library";
import { appendAuditEvent } from "@/lib/control/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  clientName: z.string().trim().min(1).max(120),
  experienceType: z.string().optional(),
  sourceId: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const archived = new URL(request.url).searchParams.get("archived") === "1";
  const documents = await prisma.cardCreativeDocument.findMany({
    where: { businessId: business.id, documentType: "EXPERIENCE", archivedAt: archived ? { not: null } : null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, clientName: true, experienceType: true, experienceStatus: true,
      coverUrl: true, publicationActive: true, draftRevision: true, previewedAt: true, publishedAt: true,
      archivedAt: true, currentPublicationSnapshotId: true, createdAt: true, updatedAt: true,
      publicDestination: { select: { slug: true, accessActive: true, credentials: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { credentialType: true }, take: 1 } } },
    },
  });
  const currentIds = documents.flatMap((item) => item.currentPublicationSnapshotId ? [item.currentPublicationSnapshotId] : []);
  const snapshots = currentIds.length
    ? await prisma.publicationSnapshot.findMany({ where: { id: { in: currentIds } }, select: { id: true, version: true } })
    : [];
  const versions = new Map(snapshots.map((item) => [item.id, item.version]));
  return NextResponse.json({ documents: documents.map((item) => ({
    ...item,
    publicSlug: item.publicDestination?.slug ?? null,
    accessActive: item.publicDestination?.accessActive ?? false,
    qrStatus: item.publicDestination?.credentials.length ? "ACTIVE" : "NOT_GENERATED",
    qrType: item.publicDestination?.credentials[0]?.credentialType ?? null,
    publicDestination: undefined,
    publishedRevision: item.currentPublicationSnapshotId ? versions.get(item.currentPublicationSnapshotId) ?? null : null,
  })) });
}

export async function POST(request: Request) {
  const { business, user } = await requireBusinessCapability("card.draft.edit");
  const input = createSchema.parse(await request.json());
  let source: unknown = null;
  let sourceDocumentId: string | null = null;
  if (input.sourceId && input.sourceId !== "main-card") {
    const sourceDocument = await prisma.cardCreativeDocument.findFirst({
      where: { id: input.sourceId, businessId: business.id },
      select: { id: true, draft: true },
    });
    if (!sourceDocument) return NextResponse.json({ error: "Source Experience not found." }, { status: 404 });
    source = sourceDocument.draft;
    sourceDocumentId = sourceDocument.id;
  } else {
    const brandKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
      select: { tapCardDraft: true, tapCard: true },
    });
    source = brandKit?.tapCardDraft ?? brandKit?.tapCard;
  }
  if (!isTapConnectCardDraft(source)) {
    return NextResponse.json({ error: "Create or save a valid Card before starting an Experience." }, { status: 409 });
  }
  const draft = prepareIndependentExperienceDraft(source, input.name);
  const document = await prisma.cardCreativeDocument.create({
    data: {
      businessId: business.id,
      name: input.name,
      documentType: "EXPERIENCE",
      clientName: input.clientName,
      experienceType: normalizeExperienceType(input.experienceType),
      experienceStatus: "DRAFT",
      sourceDocumentId,
      draft: draft as unknown as Prisma.InputJsonValue,
    },
  });
  await appendAuditEvent({
    actorId: user.id,
    businessId: business.id,
    action: sourceDocumentId ? "studio.experience.cloned" : "studio.experience.created",
    permissionUsed: "card.draft.edit",
    resourceType: "Experience",
    resourceId: document.id,
    reason: sourceDocumentId ? "Created an independent Experience clone" : "Created an Experience",
    newValue: { experienceId: document.id, sourceExperienceId: sourceDocumentId, experienceType: document.experienceType },
  });
  return NextResponse.json({ document }, { status: 201 });
}
