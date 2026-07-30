import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const BRAND_PROPERTY_KEYS = [
  "logo",
  "alternateMark",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "fontStyle",
  "imageryDirection",
  "styleCue",
  "voiceCue",
  "accessibility",
] as const;

export type BrandPropertyKey = (typeof BRAND_PROPERTY_KEYS)[number];

export class BrandDecisionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "BrandDecisionError";
  }
}

function jsonCandidate(value: unknown): Prisma.InputJsonValue {
  const encoded = JSON.stringify(value);
  if (encoded === undefined || Buffer.byteLength(encoded, "utf8") > 16_000) {
    throw new BrandDecisionError("Brand candidate is invalid or too large.");
  }
  return value as Prisma.InputJsonValue;
}

export async function listBrandDecisions(businessId: string) {
  return prisma.brandPropertyDecision.findMany({
    where: { businessId },
    include: {
      mediaAsset: {
        select: {
          id: true,
          url: true,
          source: true,
          provider: true,
          approvalStatus: true,
          licenseCode: true,
          rightsNote: true,
          attributionText: true,
        },
      },
      knowledgeSource: {
        select: { id: true, kind: true, displayLabel: true, normalizedUri: true },
      },
    },
    orderBy: [{ propertyKey: "asc" }, { updatedAt: "desc" }],
  });
}

export async function proposeBrandDecision(input: {
  businessId: string;
  propertyKey: BrandPropertyKey;
  candidate: unknown;
  scope: "BRAND" | "CARD_ONLY";
  mediaAssetId?: string | null;
  knowledgeSourceId?: string | null;
  provider?: string | null;
  confidence?: number | null;
  rationale?: string | null;
  rightsStatus: "CONFIRMED" | "NEEDS_CONFIRMATION" | "NOT_APPLICABLE";
  actorId: string;
}) {
  const brandKit = await prisma.brandKit.findUniqueOrThrow({
    where: { businessId: input.businessId },
    select: { id: true },
  });
  if (input.mediaAssetId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: input.mediaAssetId, businessId: input.businessId },
      select: { id: true },
    });
    if (!asset) throw new BrandDecisionError("Media asset not found.", 404);
  }
  if (input.knowledgeSourceId) {
    const source = await prisma.knowledgeSource.findFirst({
      where: { id: input.knowledgeSourceId, businessId: input.businessId },
      select: { id: true },
    });
    if (!source) throw new BrandDecisionError("Knowledge source not found.", 404);
  }
  return prisma.brandPropertyDecision.create({
    data: {
      businessId: input.businessId,
      brandKitId: brandKit.id,
      propertyKey: input.propertyKey,
      candidate: jsonCandidate(input.candidate),
      scope: input.scope,
      mediaAssetId: input.mediaAssetId,
      knowledgeSourceId: input.knowledgeSourceId,
      provider: input.provider,
      confidence:
        input.confidence === null || input.confidence === undefined
          ? null
          : Math.max(0, Math.min(1, input.confidence)),
      rationale: input.rationale,
      rightsStatus: input.rightsStatus,
      actedById: input.actorId,
    },
  });
}

function stringCandidate(candidate: unknown): string | undefined {
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const value = (candidate as Record<string, unknown>).value;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export async function decideBrandProperty(input: {
  businessId: string;
  decisionId: string;
  action: "KEEP" | "APPROVE" | "REJECT" | "LOCK" | "UNLOCK";
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const decision = await tx.brandPropertyDecision.findFirst({
      where: { id: input.decisionId, businessId: input.businessId },
      include: { mediaAsset: true },
    });
    if (!decision) throw new BrandDecisionError("Brand decision not found.", 404);

    const locked = await tx.brandPropertyDecision.findFirst({
      where: {
        businessId: input.businessId,
        propertyKey: decision.propertyKey,
        scope: decision.scope,
        status: "APPROVED",
        locked: true,
        id: { not: decision.id },
      },
    });
    if (locked && input.action !== "UNLOCK") {
      throw new BrandDecisionError(
        "This Brand choice is locked. Unlock it before choosing a replacement.",
        409
      );
    }

    if (input.action === "KEEP") {
      return tx.brandPropertyDecision.update({
        where: { id: decision.id },
        data: { status: "KEPT", actedById: input.actorId },
      });
    }
    if (input.action === "REJECT") {
      return tx.brandPropertyDecision.update({
        where: { id: decision.id },
        data: { status: "REJECTED", locked: false, lockedAt: null, actedById: input.actorId },
      });
    }
    if (input.action === "LOCK" || input.action === "UNLOCK") {
      if (decision.status !== "APPROVED") {
        throw new BrandDecisionError("Approve this Brand choice before locking it.");
      }
      const lock = input.action === "LOCK";
      return tx.brandPropertyDecision.update({
        where: { id: decision.id },
        data: {
          locked: lock,
          lockedAt: lock ? new Date() : null,
          actedById: input.actorId,
        },
      });
    }

    if (decision.rightsStatus === "NEEDS_CONFIRMATION") {
      throw new BrandDecisionError(
        "Confirm the asset rights before approving this Brand choice.",
        409
      );
    }
    if (
      (decision.propertyKey === "logo" ||
        decision.propertyKey === "alternateMark") &&
      (!decision.mediaAsset ||
        decision.mediaAsset.businessId !== input.businessId ||
        decision.mediaAsset.approvalStatus !== "APPROVED")
    ) {
      throw new BrandDecisionError(
        "Approve the tenant-owned media asset before using it as Brand identity.",
        409
      );
    }

    await tx.brandPropertyDecision.updateMany({
      where: {
        businessId: input.businessId,
        propertyKey: decision.propertyKey,
        scope: decision.scope,
        status: "APPROVED",
        id: { not: decision.id },
      },
      data: { status: "REPLACED", locked: false, lockedAt: null },
    });

    const value =
      decision.propertyKey === "logo" && decision.mediaAsset
        ? decision.mediaAsset.url
        : stringCandidate(decision.candidate);
    if (decision.scope === "BRAND" && value) {
      if (decision.propertyKey === "logo") {
        await tx.business.update({
          where: { id: input.businessId },
          data: { logoUrl: value },
        });
      } else if (
        [
          "primaryColor",
          "secondaryColor",
          "accentColor",
          "backgroundColor",
          "textColor",
        ].includes(decision.propertyKey)
      ) {
        if (!/^#[0-9a-f]{6}$/i.test(value)) {
          throw new BrandDecisionError("Brand colors must use six-digit hex values.");
        }
        await tx.brandKit.update({
          where: { id: decision.brandKitId },
          data: { [decision.propertyKey]: value },
        });
      } else if (decision.propertyKey === "fontStyle") {
        if (!["MODERN", "CLASSIC", "PLAYFUL", "PREMIUM", "MINIMAL"].includes(value)) {
          throw new BrandDecisionError("Unsupported Brand font style.");
        }
        await tx.brandKit.update({
          where: { id: decision.brandKitId },
          data: { fontStyle: value as "MODERN" },
        });
      }
    }

    return tx.brandPropertyDecision.update({
      where: { id: decision.id },
      data: {
        status: "APPROVED",
        actedById: input.actorId,
        approvedAt: new Date(),
      },
    });
  });
}
