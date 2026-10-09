import { ExperienceLibrary, type ExperienceLibraryItem } from "@/components/fusion/card/experience-library";
import { isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { ensureLoveAndTheftExperienceRegistration } from "@/lib/fusion/card/public-experience-registry";

export const dynamic = "force-dynamic";

export default async function ExperienceLibraryPage() {
  const { business, user } = await requireBusinessCapability("card.draft.edit");
  if (isPlatformAdmin(user) || business.slug === "the-monkey-cage") {
    await ensureLoveAndTheftExperienceRegistration(business.id).catch(() => null);
  }
  const documents = await prisma.cardCreativeDocument.findMany({
    where: { businessId: business.id, documentType: "EXPERIENCE" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, clientName: true, experienceType: true, experienceStatus: true,
      coverUrl: true, publicationActive: true, draftRevision: true, previewedAt: true, publishedAt: true,
      archivedAt: true, currentPublicationSnapshotId: true, updatedAt: true,
      publicDestination: { select: { slug: true, accessActive: true, credentials: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { credentialType: true }, take: 1 } } },
    },
  });
  const currentIds = documents.flatMap((item) => item.currentPublicationSnapshotId ? [item.currentPublicationSnapshotId] : []);
  const snapshots = currentIds.length ? await prisma.publicationSnapshot.findMany({ where: { id: { in: currentIds } }, select: { id: true, version: true } }) : [];
  const versionById = new Map(snapshots.map((item) => [item.id, item.version]));
  const items: ExperienceLibraryItem[] = documents.map((item) => ({
    id: item.id,
    name: item.name,
    clientName: item.clientName,
    experienceType: item.experienceType,
    experienceStatus: item.archivedAt ? "ARCHIVED" : item.experienceStatus,
    coverUrl: item.coverUrl,
    publicSlug: item.publicDestination?.slug ?? null,
    publicationActive: item.publicationActive,
    accessActive: item.publicDestination?.accessActive ?? false,
    qrStatus: item.publicDestination?.credentials.length ? "ACTIVE" : "NOT_GENERATED",
    qrType: item.publicDestination?.credentials[0]?.credentialType ?? null,
    draftRevision: item.draftRevision,
    publishedRevision: item.currentPublicationSnapshotId ? versionById.get(item.currentPublicationSnapshotId) ?? null : null,
    previewedAt: item.previewedAt?.toISOString() ?? null,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    archivedAt: item.archivedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  }));
  return <ExperienceLibrary initialItems={items} />;
}
