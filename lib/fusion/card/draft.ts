import { Prisma, type PrismaClient } from "@prisma/client";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";

type DraftClient = Pick<PrismaClient, "brandKit">;

const MAX_DRAFT_BYTES = 2_000_000;
const MAX_SECTIONS = 100;

export class CardDraftError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_draft" | "revision_conflict" | "missing_brand_kit",
    readonly status: number
  ) {
    super(message);
    this.name = "CardDraftError";
  }
}

export function isTapConnectCardDraft(value: unknown): value is TapConnectCardConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (![1, 2, 3].includes(Number(candidate.version))) return false;
  if (!Array.isArray(candidate.sections) || candidate.sections.length > MAX_SECTIONS) return false;
  if (
    !candidate.sections.every(
      (section) =>
        section &&
        typeof section === "object" &&
        typeof (section as Record<string, unknown>).id === "string" &&
        typeof (section as Record<string, unknown>).type === "string"
    )
  ) {
    return false;
  }
  if (candidate.experience != null) {
    if (!candidate.experience || typeof candidate.experience !== "object" || Array.isArray(candidate.experience)) return false;
    const experience = candidate.experience as Record<string, unknown>;
    if (experience.contractId !== "tapExperience@1.0.0" || typeof experience.experienceId !== "string" || typeof experience.defaultPageId !== "string" || !Array.isArray(experience.pages) || experience.pages.length < 1 || experience.pages.length > 40) return false;
    const pageIds = new Set<string>();
    for (const rawPage of experience.pages) {
      if (!rawPage || typeof rawPage !== "object" || Array.isArray(rawPage)) return false;
      const page = rawPage as Record<string, unknown>;
      if (typeof page.pageId !== "string" || !page.pageId || pageIds.has(page.pageId) || typeof page.title !== "string") return false;
      pageIds.add(page.pageId);
      if (!page.composition || typeof page.composition !== "object" || Array.isArray(page.composition)) return false;
      const composition = page.composition as Record<string, unknown>;
      if (!Array.isArray(composition.sections) || composition.sections.length > MAX_SECTIONS) return false;
    }
    if (!pageIds.has(experience.defaultPageId)) return false;
  }
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= MAX_DRAFT_BYTES;
  } catch {
    return false;
  }
}

export async function getCardDraft(
  businessId: string,
  client: DraftClient = prisma
) {
  const kit = await client.brandKit.findUnique({
    where: { businessId },
    select: {
      id: true,
      tapCard: true,
      tapCardDraft: true,
      tapCardDraftRevision: true,
      tapCardDraftUpdatedAt: true,
      tapCardPublishedAt: true,
    },
  });
  if (!kit) {
    throw new CardDraftError("Brand Kit not found.", "missing_brand_kit", 404);
  }
  return kit;
}

/**
 * Compatibility copy for an existing published Card. This is called only when
 * an authorized editor starts editing; it never writes tapCard or a snapshot.
 */
export async function beginCardDraftEditing(
  businessId: string,
  fallbackDraft: TapConnectCardConfig,
  client: DraftClient = prisma
) {
  const current = await getCardDraft(businessId, client);
  if (isTapConnectCardDraft(current.tapCardDraft)) return current;

  const initial = isTapConnectCardDraft(current.tapCard)
    ? current.tapCard
    : fallbackDraft;
  await client.brandKit.updateMany({
    where: {
      businessId,
      tapCardDraft: { equals: Prisma.DbNull },
      tapCardDraftRevision: 0,
    },
    data: {
      tapCardDraft: initial as unknown as Prisma.InputJsonValue,
      tapCardDraftUpdatedAt: new Date(),
      tapCardDraftRevision: 1,
    },
  });
  return getCardDraft(businessId, client);
}

export async function saveCardDraft(input: {
  businessId: string;
  draft: unknown;
  expectedRevision: number;
  client?: DraftClient;
}) {
  if (!isTapConnectCardDraft(input.draft)) {
    throw new CardDraftError(
      "The Card draft is invalid or too large.",
      "invalid_draft",
      400
    );
  }
  const client = input.client ?? prisma;
  const updated = await client.brandKit.updateMany({
    where: {
      businessId: input.businessId,
      tapCardDraftRevision: input.expectedRevision,
    },
    data: {
      tapCardDraft: input.draft as unknown as Prisma.InputJsonValue,
      tapCardDraftUpdatedAt: new Date(),
      tapCardDraftRevision: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw new CardDraftError(
      "This draft changed in another session. Reload before saving.",
      "revision_conflict",
      409
    );
  }
  return getCardDraft(input.businessId, client);
}
