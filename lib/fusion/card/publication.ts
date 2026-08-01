import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import {
  hashPublishManifest,
  type CardPublishManifest,
} from "@/lib/fusion/publication/snapshots";

type CardPublicationClient = Pick<
  PrismaClient,
  "brandKit" | "publicationSnapshot" | "cardPublication"
>;

export class CardPublicationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "missing_draft"
      | "revision_conflict"
      | "publication_not_found"
      | "current_revision"
      | "invalid_revision",
    readonly status: number,
  ) {
    super(message);
    this.name = "CardPublicationError";
  }
}

type CardDocument = { sections: Array<Record<string, unknown>> } & Record<string, unknown>;

function sectionMap(document: CardDocument) {
  return new Map(document.sections.map((section) => [String(section.id), section]));
}

export function summarizeCardComparison(previous: unknown, next: unknown) {
  const empty = { added: [], removed: [], changed: [], reordered: false, summary: "Initial publication" };
  if (!isTapConnectCardDraft(next)) return empty;
  if (!isTapConnectCardDraft(previous)) {
    return {
      ...empty,
      added: next.sections.map((section) => section.id),
      summary: `Initial publication with ${next.sections.length} sections`,
    };
  }
  const before = sectionMap(previous as CardDocument);
  const after = sectionMap(next as CardDocument);
  const added = [...after.keys()].filter((id) => !before.has(id));
  const removed = [...before.keys()].filter((id) => !after.has(id));
  const changed = [...after.keys()].filter((id) => {
    const prior = before.get(id);
    return prior && JSON.stringify(prior) !== JSON.stringify(after.get(id));
  });
  const beforeOrder = previous.sections.map((section) => section.id).join("|");
  const afterOrder = next.sections.map((section) => section.id).join("|");
  const reordered = beforeOrder !== afterOrder && added.length === 0 && removed.length === 0;
  const parts = [
    added.length ? `${added.length} added` : "",
    removed.length ? `${removed.length} removed` : "",
    changed.length ? `${changed.length} changed` : "",
    reordered ? "order changed" : "",
  ].filter(Boolean);
  return {
    added,
    removed,
    changed,
    reordered,
    summary: parts.join(", ") || "No visible content changes",
  };
}

async function findSnapshotDocument(client: CardPublicationClient, snapshotId: string) {
  const snapshot = await client.publicationSnapshot.findUnique({ where: { id: snapshotId } });
  const manifest = snapshot?.manifest as { kind?: string; tapCard?: unknown } | null;
  if (!snapshot || manifest?.kind !== "card" || !isTapConnectCardDraft(manifest.tapCard)) {
    throw new CardPublicationError("Published Card revision is invalid.", "invalid_revision", 409);
  }
  return { snapshot, document: manifest.tapCard };
}

export async function listCardPublications(
  businessId: string,
  client: CardPublicationClient = prisma,
) {
  const kit = await client.brandKit.findUnique({
    where: { businessId },
    select: { id: true, currentCardPublicationId: true, tapCardDraftRevision: true },
  });
  if (!kit) throw new CardPublicationError("Card not found.", "publication_not_found", 404);
  const rows = await client.cardPublication.findMany({
    where: { businessId, brandKitId: kit.id },
    orderBy: { version: "desc" },
  });
  return { currentId: kit.currentCardPublicationId, draftRevision: kit.tapCardDraftRevision, rows };
}

export async function publishSavedCard(input: {
  businessId: string;
  expectedDraftRevision: number;
  publishedById?: string | null;
  client?: CardPublicationClient;
}) {
  const client = input.client ?? prisma;
  const execute = async (tx: CardPublicationClient) => {
    const kit = await tx.brandKit.findUnique({ where: { businessId: input.businessId } });
    if (!kit || !isTapConnectCardDraft(kit.tapCardDraft)) {
      throw new CardPublicationError("Save a valid Card draft before publishing.", "missing_draft", 409);
    }
    if (kit.tapCardDraftRevision !== input.expectedDraftRevision) {
      throw new CardPublicationError(
        "This Card draft changed. Reload before publishing.",
        "revision_conflict",
        409,
      );
    }

    const comparisonSummary = summarizeCardComparison(kit.tapCard, kit.tapCardDraft);
    const manifest: CardPublishManifest = {
      kind: "card",
      tapCard: kit.tapCardDraft,
      label: `Published Card revision ${kit.tapCardDraftRevision}`,
      sourceDraftRevision: kit.tapCardDraftRevision,
      comparisonSummary,
    };
    const contentHash = hashPublishManifest(manifest);
    let snapshot = await tx.publicationSnapshot.findUnique({
      where: {
        subjectType_subjectId_contentHash: {
          subjectType: "card",
          subjectId: kit.id,
          contentHash,
        },
      },
    });
    if (!snapshot) {
      const latest = await tx.publicationSnapshot.findFirst({
        where: { subjectType: "card", subjectId: kit.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      snapshot = await tx.publicationSnapshot.create({
        data: {
          businessId: input.businessId,
          subjectType: "card",
          subjectId: kit.id,
          version: (latest?.version ?? 0) + 1,
          schemaVersion: 2,
          manifest: manifest as unknown as Prisma.InputJsonValue,
          contentHash,
          publishedById: input.publishedById ?? undefined,
        },
      });
    }

    let publication = await tx.cardPublication.findUnique({
      where: { publicationSnapshotId: snapshot.id },
    });
    if (!publication) {
      publication = await tx.cardPublication.create({
        data: {
          businessId: input.businessId,
          brandKitId: kit.id,
          publicationSnapshotId: snapshot.id,
          version: snapshot.version,
          sourceDraftRevision: kit.tapCardDraftRevision,
          comparisonSummary: comparisonSummary as Prisma.InputJsonValue,
          publishedById: input.publishedById ?? undefined,
        },
      });
    }

    const updated = await tx.brandKit.updateMany({
      where: { id: kit.id, tapCardDraftRevision: input.expectedDraftRevision },
      data: {
        tapCard: kit.tapCardDraft as Prisma.InputJsonValue,
        tapCardPublishedAt: new Date(),
        currentCardPublicationId: publication.id,
      },
    });
    if (updated.count !== 1) {
      throw new CardPublicationError(
        "This Card draft changed. Reload before publishing.",
        "revision_conflict",
        409,
      );
    }
    return { publication, snapshot, comparisonSummary, created: kit.currentCardPublicationId !== publication.id };
  };

  if (input.client) return execute(client);
  return prisma.$transaction((tx) => execute(tx), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function rollbackPublishedCard(input: {
  businessId: string;
  publicationId: string;
  actorId?: string | null;
  client?: CardPublicationClient;
}) {
  const client = input.client ?? prisma;
  const execute = async (tx: CardPublicationClient) => {
    const [kit, target] = await Promise.all([
      tx.brandKit.findUnique({ where: { businessId: input.businessId } }),
      tx.cardPublication.findFirst({ where: { id: input.publicationId, businessId: input.businessId } }),
    ]);
    if (!kit || !target || target.brandKitId !== kit.id || target.status === "ARCHIVED") {
      throw new CardPublicationError("Published Card revision not found.", "publication_not_found", 404);
    }
    const { document } = await findSnapshotDocument(tx, target.publicationSnapshotId);
    await tx.brandKit.update({
      where: { id: kit.id },
      data: {
        tapCard: document as Prisma.InputJsonValue,
        tapCardPublishedAt: new Date(),
        currentCardPublicationId: target.id,
      },
    });
    return { publication: target, document, rolledBackFromId: kit.currentCardPublicationId };
  };
  if (input.client) return execute(client);
  return prisma.$transaction((tx) => execute(tx));
}

export async function archiveCardPublication(input: {
  businessId: string;
  publicationId: string;
  client?: CardPublicationClient;
}) {
  const client = input.client ?? prisma;
  const kit = await client.brandKit.findUnique({ where: { businessId: input.businessId } });
  if (kit?.currentCardPublicationId === input.publicationId) {
    throw new CardPublicationError("Roll back before archiving the public revision.", "current_revision", 409);
  }
  const updated = await client.cardPublication.updateMany({
    where: { id: input.publicationId, businessId: input.businessId, status: "PUBLISHED" },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  if (updated.count !== 1) {
    throw new CardPublicationError("Published Card revision not found.", "publication_not_found", 404);
  }
}
