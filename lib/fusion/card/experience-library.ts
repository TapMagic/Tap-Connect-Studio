import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { cloneExperienceDocument } from "@/lib/fusion/card/experience-pages";
import { summarizeCardComparison } from "@/lib/fusion/card/publication";
import { validateSignaturePublication } from "@/lib/fusion/card/signature-publication-validation";
import { hashPublishManifest, type ExperiencePublishManifest } from "@/lib/fusion/publication/snapshots";
import type { SignatureEntitlementKey } from "@/lib/fusion/creative-studio/signature-assets/types";

export const EXPERIENCE_TYPES = ["DEMO", "CLIENT", "TEMPLATE", "SPECIAL"] as const;
export const EXPERIENCE_STATUSES = ["DRAFT", "PREVIEW_READY", "PUBLISHED", "ARCHIVED"] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

export class ExperienceLibraryError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "invalid_draft" | "revision_conflict" | "slug_conflict" | "publication_blocked",
    readonly status: number,
  ) {
    super(message);
    this.name = "ExperienceLibraryError";
  }
}

export function normalizeExperienceType(value: unknown): ExperienceType {
  return EXPERIENCE_TYPES.includes(value as ExperienceType) ? value as ExperienceType : "DEMO";
}

export function experiencePublicSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || `experience-${nanoid(7).toLowerCase()}`;
}

export function prepareIndependentExperienceDraft(source: TapConnectCardConfig, name: string) {
  return cloneExperienceDocument(source, name);
}

async function allocateSlug(tx: Prisma.TransactionClient, preferred: string, documentId: string) {
  const base = experiencePublicSlug(preferred);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const occupied = await tx.experiencePublicDestination.findFirst({
      where: { slug: candidate, experienceId: { not: documentId } },
      select: { id: true },
    });
    if (!occupied) return candidate;
  }
  throw new ExperienceLibraryError("A stable public URL could not be reserved.", "slug_conflict", 409);
}

export async function listExperiencePublications(businessId: string, documentId: string) {
  const document = await prisma.cardCreativeDocument.findFirst({
    where: { id: documentId, businessId },
    select: { id: true, draftRevision: true, publicationActive: true, currentPublicationSnapshotId: true },
  });
  if (!document) throw new ExperienceLibraryError("Experience not found.", "not_found", 404);
  const revisions = await prisma.publicationSnapshot.findMany({
    where: { businessId, subjectType: "experience", subjectId: documentId },
    orderBy: { version: "desc" },
  });
  return { document, revisions };
}

export async function publishExperience(input: {
  businessId: string;
  documentId: string;
  expectedDraftRevision: number;
  publishedById?: string | null;
  signatureEntitlementKeys: readonly SignatureEntitlementKey[];
}) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.cardCreativeDocument.findFirst({
      where: { id: input.documentId, businessId: input.businessId },
    });
    if (!document || document.archivedAt) throw new ExperienceLibraryError("Experience not found.", "not_found", 404);
    if (!isTapConnectCardDraft(document.draft)) throw new ExperienceLibraryError("Save a valid Experience draft before publishing.", "invalid_draft", 409);
    if (document.draftRevision !== input.expectedDraftRevision) {
      throw new ExperienceLibraryError("This Experience changed. Reload before publishing.", "revision_conflict", 409);
    }
    const validation = validateSignaturePublication(document.draft, input.signatureEntitlementKeys, undefined, "card.publish");
    if (!validation.ok) {
      throw new ExperienceLibraryError(validation.findings.map((item) => item.remediation.message).join(" "), "publication_blocked", 403);
    }
    const previous = document.currentPublicationSnapshotId
      ? await tx.publicationSnapshot.findUnique({ where: { id: document.currentPublicationSnapshotId } })
      : null;
    const previousManifest = previous?.manifest as { kind?: string; document?: unknown } | null;
    const comparisonSummary = summarizeCardComparison(previousManifest?.kind === "experience" ? previousManifest.document : null, document.draft);
    const manifest: ExperiencePublishManifest = {
      kind: "experience",
      document: document.draft,
      label: `Published Experience revision ${document.draftRevision}`,
      sourceDraftRevision: document.draftRevision,
      comparisonSummary,
    };
    // Comparison text depends on the previously selected public revision and is
    // not content identity. Hash the saved revision itself so republishing an
    // unchanged draft reuses the immutable snapshot.
    const contentHash = hashPublishManifest({ ...manifest, comparisonSummary: {} });
    let snapshot = await tx.publicationSnapshot.findUnique({
      where: { subjectType_subjectId_contentHash: { subjectType: "experience", subjectId: document.id, contentHash } },
    });
    if (!snapshot) {
      const latest = await tx.publicationSnapshot.findFirst({
        where: { subjectType: "experience", subjectId: document.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      snapshot = await tx.publicationSnapshot.create({
        data: {
          businessId: input.businessId,
          subjectType: "experience",
          subjectId: document.id,
          version: (latest?.version ?? 0) + 1,
          schemaVersion: 1,
          manifest: manifest as unknown as Prisma.InputJsonValue,
          contentHash,
          publishedById: input.publishedById ?? undefined,
        },
      });
    }
    const existingDestination = await tx.experiencePublicDestination.findUnique({ where: { experienceId: document.id } });
    const publicSlug = existingDestination?.slug || await allocateSlug(tx, document.clientName || document.name, document.id);
    if (!existingDestination) {
      await tx.experiencePublicDestination.create({
        data: { businessId: input.businessId, experienceId: document.id, slug: publicSlug, accessActive: true },
      });
    }
    const updated = await tx.cardCreativeDocument.updateMany({
      where: { id: document.id, businessId: input.businessId, draftRevision: input.expectedDraftRevision },
      data: {
        publicationActive: true,
        currentPublicationSnapshotId: snapshot.id,
        publishedAt: new Date(),
        experienceStatus: "PUBLISHED",
      },
    });
    if (updated.count !== 1) throw new ExperienceLibraryError("This Experience changed. Reload before publishing.", "revision_conflict", 409);
    return { snapshot, publicSlug, comparisonSummary };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rollbackExperiencePublication(input: {
  businessId: string;
  documentId: string;
  publicationSnapshotId: string;
  signatureEntitlementKeys: readonly SignatureEntitlementKey[];
}) {
  return prisma.$transaction(async (tx) => {
    const [document, snapshot] = await Promise.all([
      tx.cardCreativeDocument.findFirst({ where: { id: input.documentId, businessId: input.businessId } }),
      tx.publicationSnapshot.findFirst({ where: { id: input.publicationSnapshotId, businessId: input.businessId, subjectType: "experience", subjectId: input.documentId } }),
    ]);
    const manifest = snapshot?.manifest as { kind?: string; document?: unknown } | null;
    if (!document || !snapshot || manifest?.kind !== "experience" || !isTapConnectCardDraft(manifest.document)) {
      throw new ExperienceLibraryError("Published Experience revision not found.", "not_found", 404);
    }
    const validation = validateSignaturePublication(manifest.document, input.signatureEntitlementKeys, undefined, "card.rollback");
    if (!validation.ok) throw new ExperienceLibraryError(validation.findings.map((item) => item.remediation.message).join(" "), "publication_blocked", 403);
    await tx.cardCreativeDocument.update({
      where: { id: document.id },
      data: { currentPublicationSnapshotId: snapshot.id, publicationActive: true, publishedAt: new Date(), experienceStatus: "PUBLISHED" },
    });
    return { snapshot };
  });
}

export async function unpublishExperience(businessId: string, documentId: string) {
  const current = await prisma.cardCreativeDocument.findFirst({
    where: { id: documentId, businessId, documentType: "EXPERIENCE", archivedAt: null },
    select: { publicationActive: true, currentPublicationSnapshotId: true },
  });
  if (!current) throw new ExperienceLibraryError("Experience not found.", "not_found", 404);
  const updated = await prisma.cardCreativeDocument.updateMany({
    where: { id: documentId, businessId, documentType: "EXPERIENCE", archivedAt: null },
    data: { publicationActive: false, experienceStatus: "DRAFT" },
  });
  if (updated.count !== 1) throw new ExperienceLibraryError("Experience not found.", "not_found", 404);
  return current;
}

export async function setExperienceAccessActive(businessId: string, documentId: string, accessActive: boolean) {
  const destination = await prisma.experiencePublicDestination.findFirst({
    where: { experienceId: documentId, businessId },
    select: { id: true, accessActive: true },
  });
  if (!destination) throw new ExperienceLibraryError("Publish this Experience once before changing public access.", "not_found", 409);
  await prisma.experiencePublicDestination.update({ where: { id: destination.id }, data: { accessActive } });
  return { destinationId: destination.id, previousAccessActive: destination.accessActive, accessActive };
}
