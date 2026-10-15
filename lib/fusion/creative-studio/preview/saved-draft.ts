import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { getCardDraft, isTapConnectCardDraft } from "@/lib/fusion/card/draft";

export type SavedPhonePreviewDraft = {
  config: TapConnectCardConfig;
  revision: number;
  updatedAt: string;
  documentName: string | null;
};

/**
 * Resolve the durable saved document behind a Phone Preview session.
 *
 * The browser snapshot is intentionally not authoritative here: a temporary
 * phone credential may read the selected saved Draft, but it must never make
 * unsaved editor state public or silently fall back to another Experience.
 */
export async function getSavedPhonePreviewDraft(input: {
  businessId: string;
  documentId: string;
}): Promise<SavedPhonePreviewDraft | null> {
  if (input.documentId === "main-card") {
    const draft = await getCardDraft(input.businessId).catch(() => null);
    if (!draft || !isTapConnectCardDraft(draft.tapCardDraft)) return null;
    return {
      config: draft.tapCardDraft,
      revision: draft.tapCardDraftRevision,
      updatedAt: draft.tapCardDraftUpdatedAt?.toISOString() || new Date(0).toISOString(),
      documentName: null,
    };
  }

  const document = await prisma.cardCreativeDocument.findFirst({
    where: {
      id: input.documentId,
      businessId: input.businessId,
      archivedAt: null,
    },
    select: {
      name: true,
      draft: true,
      draftRevision: true,
      updatedAt: true,
    },
  });
  if (!document || !isTapConnectCardDraft(document.draft)) return null;
  return {
    config: document.draft,
    revision: document.draftRevision,
    updatedAt: document.updatedAt.toISOString(),
    documentName: document.name,
  };
}
