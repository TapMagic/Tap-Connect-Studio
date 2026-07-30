import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  CreativeSurfaceKind,
  MediaAsset,
  Prisma,
} from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoDevUpstreamUrl } from "@/lib/services/logo-search";
import type { VerifiedProviderCandidate } from "./candidate-token";
import { fetchRemoteImage, MAX_MEDIA_BYTES, sniffImageMime } from "./remote-image";
import {
  deleteMediaObject,
  extensionForMime,
  putMediaObject,
} from "./storage";

export type MediaImportDependencies = {
  fetchRemoteImage: typeof fetchRemoteImage;
  putMediaObject: typeof putMediaObject;
  deleteMediaObject: typeof deleteMediaObject;
};

const defaultImportDependencies: MediaImportDependencies = {
  fetchRemoteImage,
  putMediaObject,
  deleteMediaObject,
};

export class MediaServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 120);
}

function providerImportUrl(payload: VerifiedProviderCandidate): string {
  const { candidate } = payload;
  if (candidate.provider === "pexels") {
    const imageUrl = String(candidate.importDescriptor.imageUrl || "");
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "images.pexels.com") {
      throw new MediaServiceError("Invalid Pexels import candidate", 400);
    }
    return parsed.toString();
  }

  const descriptor = candidate.importDescriptor;
  const upstream = logoDevUpstreamUrl({
    domain: typeof descriptor.domain === "string" ? descriptor.domain : undefined,
    name: typeof descriptor.name === "string" ? descriptor.name : undefined,
    theme:
      descriptor.theme === "light" || descriptor.theme === "dark"
        ? descriptor.theme
        : "auto",
    greyscale: descriptor.greyscale === true,
    size: typeof descriptor.size === "number" ? descriptor.size : 512,
  });
  if (!upstream) throw new MediaServiceError("Logo.dev is not configured", 503);
  return upstream;
}

export async function importProviderCandidate(
  payload: VerifiedProviderCandidate,
  dependencies: MediaImportDependencies = defaultImportDependencies
): Promise<MediaAsset> {
  const { candidate, businessId } = payload;
  const existing = await prisma.mediaAsset.findUnique({
    where: {
      businessId_provider_providerAssetId: {
        businessId,
        provider: candidate.provider,
        providerAssetId: candidate.providerAssetId,
      },
    },
  });
  if (existing) return existing;

  const remote = await dependencies.fetchRemoteImage(providerImportUrl(payload));
  const contentHash = createHash("sha256").update(remote.bytes).digest("hex");
  const extension = extensionForMime(remote.mimeType);
  const storageKey = `${businessId}/imports/${candidate.provider}/${safeSegment(
    candidate.providerAssetId
  )}-${contentHash.slice(0, 12)}.${extension}`;
  const url = await dependencies.putMediaObject({
    storageKey,
    bytes: remote.bytes,
    mimeType: remote.mimeType,
  });

  try {
    const asset = await prisma.mediaAsset.upsert({
      where: {
        businessId_provider_providerAssetId: {
          businessId,
          provider: candidate.provider,
          providerAssetId: candidate.providerAssetId,
        },
      },
      update: {},
      create: {
        businessId,
        url,
        storageKey,
        contentHash,
        filename: `${candidate.provider}-${safeSegment(
          candidate.providerAssetId
        )}.${extension}`,
        mimeType: remote.mimeType,
        sizeBytes: remote.bytes.byteLength,
        width: candidate.width,
        height: candidate.height,
        source: candidate.provider,
        provider: candidate.provider,
        providerAssetId: candidate.providerAssetId,
        providerId: candidate.providerAssetId,
        sourcePageUrl: candidate.sourcePageUrl,
        sourceUrl: candidate.sourcePageUrl,
        creatorName: candidate.creatorName,
        creatorUrl: candidate.creatorUrl,
        attributionName: candidate.creatorName,
        attributionUrl: candidate.creatorUrl,
        licenseCode: candidate.licenseCode,
        licenseUrl: candidate.licenseUrl,
        attributionText: candidate.attributionText,
        rightsNote: candidate.rightsNote,
        rights: candidate.rightsNote,
        approvalStatus: "UNREVIEWED",
        defaultAltText: candidate.altText,
        importedAt: new Date(),
      },
    });
    if (asset.storageKey !== storageKey) await dependencies.deleteMediaObject(storageKey);
    return asset;
  } catch (error) {
    await dependencies.deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function importExternalImage(input: {
  businessId: string;
  url: string;
  filename: string;
}, dependencies: MediaImportDependencies = defaultImportDependencies): Promise<MediaAsset> {
  const remote = await dependencies.fetchRemoteImage(input.url);
  const contentHash = createHash("sha256").update(remote.bytes).digest("hex");
  const existing = await prisma.mediaAsset.findFirst({
    where: { businessId: input.businessId, contentHash },
  });
  if (existing) return existing;

  const extension = extensionForMime(remote.mimeType);
  const storageKey = `${input.businessId}/imports/url/${contentHash}.${extension}`;
  const url = await dependencies.putMediaObject({
    storageKey,
    bytes: remote.bytes,
    mimeType: remote.mimeType,
  });
  try {
    return await prisma.mediaAsset.create({
      data: {
        businessId: input.businessId,
        url,
        storageKey,
        contentHash,
        filename: input.filename || `external-${nanoid(6)}.${extension}`,
        mimeType: remote.mimeType,
        sizeBytes: remote.bytes.byteLength,
        source: "url",
        sourcePageUrl: remote.finalUrl,
        sourceUrl: remote.finalUrl,
        licenseCode: "EXTERNAL_UNVERIFIED",
        rightsNote: "Owner-supplied external URL; rights were not verified by TapConnect.",
        rights: "Owner-supplied external URL; rights were not verified by TapConnect.",
        approvalStatus: "UNREVIEWED",
        importedAt: new Date(),
      },
    });
  } catch (error) {
    await dependencies.deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function storeUploadedImage(input: {
  businessId: string;
  filename: string;
  declaredMimeType: string;
  bytes: Buffer;
}): Promise<MediaAsset> {
  if (input.bytes.byteLength > MAX_MEDIA_BYTES) {
    throw new MediaServiceError("Source image exceeds 8MB", 413);
  }
  const mimeType = sniffImageMime(input.bytes);
  if (!mimeType || (input.declaredMimeType && input.declaredMimeType !== mimeType)) {
    throw new MediaServiceError("Uploaded file is not a supported image", 415);
  }
  const contentHash = createHash("sha256").update(input.bytes).digest("hex");
  const existing = await prisma.mediaAsset.findFirst({
    where: { businessId: input.businessId, contentHash },
  });
  if (existing) return existing;

  const extension = extensionForMime(mimeType);
  const storageKey = `${input.businessId}/uploads/${contentHash}.${extension}`;
  const url = await putMediaObject({
    storageKey,
    bytes: input.bytes,
    mimeType,
  });
  try {
    return await prisma.mediaAsset.create({
      data: {
        businessId: input.businessId,
        url,
        storageKey,
        contentHash,
        filename: input.filename,
        mimeType,
        sizeBytes: input.bytes.byteLength,
        source: "upload",
        licenseCode: "OWNER_SUPPLIED",
        rightsNote: "Owner supplied this asset and is responsible for usage rights.",
        rights: "Owner supplied this asset and is responsible for usage rights.",
        approvalStatus: "UNREVIEWED",
        importedAt: new Date(),
      },
    });
  } catch (error) {
    await deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function assertTenantAsset(
  businessId: string,
  mediaAssetId: string
): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: mediaAssetId, businessId },
  });
  if (!asset) throw new MediaServiceError("Media asset not found", 404);
  return asset;
}

export async function setMediaFavorite(input: {
  businessId: string;
  userId: string;
  mediaAssetId: string;
  favorite: boolean;
}): Promise<void> {
  await assertTenantAsset(input.businessId, input.mediaAssetId);
  const key = {
    businessId_userId_mediaAssetId: {
      businessId: input.businessId,
      userId: input.userId,
      mediaAssetId: input.mediaAssetId,
    },
  };
  if (input.favorite) {
    await prisma.mediaAssetFavorite.upsert({
      where: key,
      create: {
        businessId: input.businessId,
        userId: input.userId,
        mediaAssetId: input.mediaAssetId,
      },
      update: {},
    });
  } else {
    await prisma.mediaAssetFavorite.deleteMany({
      where: key.businessId_userId_mediaAssetId,
    });
  }
}

export async function recordMediaRecent(input: {
  businessId: string;
  userId: string;
  mediaAssetId: string;
}): Promise<void> {
  await assertTenantAsset(input.businessId, input.mediaAssetId);
  await prisma.mediaAssetRecent.upsert({
    where: {
      businessId_userId_mediaAssetId: input,
    },
    create: input,
    update: {
      lastUsedAt: new Date(),
      useCount: { increment: 1 },
    },
  });
}

export function canApproveBrandMedia(user: SessionUser, businessId: string): boolean {
  const role = user.memberships.find((membership) => membership.businessId === businessId)?.role;
  return role === "OWNER" || role === "MANAGER";
}

export async function setMediaApproval(input: {
  businessId: string;
  userId: string;
  mediaAssetId: string;
  approved: boolean;
}): Promise<MediaAsset> {
  await assertTenantAsset(input.businessId, input.mediaAssetId);
  return prisma.mediaAsset.update({
    where: { id: input.mediaAssetId },
    data: input.approved
      ? {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          approvedById: input.userId,
        }
      : {
          approvalStatus: "REJECTED",
          approvedAt: null,
          approvedById: null,
        },
  });
}

export async function resolveApprovedBrandLogo(
  businessId: string,
  mediaAssetId: string
): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaAssetId,
      businessId,
      approvalStatus: "APPROVED",
    },
  });
  if (!asset) {
    throw new MediaServiceError(
      "Approve this Brand asset before making it the primary logo.",
      409
    );
  }
  return asset;
}

export async function replaceAssetUsages(input: {
  businessId: string;
  surface: CreativeSurfaceKind;
  subjectId: string;
  usages: { mediaAssetId: string; documentPath: string }[];
}): Promise<void> {
  const unique = Array.from(
    new Map(
      input.usages.map((usage) => [
        `${usage.mediaAssetId}:${usage.documentPath}`,
        usage,
      ])
    ).values()
  );
  if (unique.length) {
    const count = await prisma.mediaAsset.count({
      where: {
        businessId: input.businessId,
        id: { in: unique.map((usage) => usage.mediaAssetId) },
      },
    });
    if (count !== new Set(unique.map((usage) => usage.mediaAssetId)).size) {
      throw new MediaServiceError("A media usage references another business", 404);
    }
  }
  await prisma.$transaction([
    prisma.creativeAssetUsage.deleteMany({
      where: {
        businessId: input.businessId,
        surface: input.surface,
        subjectId: input.subjectId,
      },
    }),
    prisma.creativeAssetUsage.createMany({
      data: unique.map((usage) => ({
        businessId: input.businessId,
        surface: input.surface,
        subjectId: input.subjectId,
        mediaAssetId: usage.mediaAssetId,
        documentPath: usage.documentPath,
      })),
      skipDuplicates: true,
    }),
  ]);
}

export async function recordSavedDocumentAssetUsage(input: {
  businessId: string;
  userId: string;
  surface: CreativeSurfaceKind;
  subjectId: string;
  usages: { mediaAssetId: string; documentPath: string }[];
}): Promise<void> {
  const unique = Array.from(
    new Map(
      input.usages.map((usage) => [
        `${usage.mediaAssetId}:${usage.documentPath}`,
        usage,
      ])
    ).values()
  );
  const mediaAssetIds = Array.from(new Set(unique.map((usage) => usage.mediaAssetId)));
  if (mediaAssetIds.length) {
    const count = await prisma.mediaAsset.count({
      where: { businessId: input.businessId, id: { in: mediaAssetIds } },
    });
    if (count !== mediaAssetIds.length) {
      throw new MediaServiceError("A media usage references another business", 404);
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.creativeAssetUsage.deleteMany({
      where: {
        businessId: input.businessId,
        surface: input.surface,
        subjectId: input.subjectId,
      },
    }),
  ];
  if (unique.length) {
    operations.push(
      prisma.creativeAssetUsage.createMany({
        data: unique.map((usage) => ({
          businessId: input.businessId,
          surface: input.surface,
          subjectId: input.subjectId,
          mediaAssetId: usage.mediaAssetId,
          documentPath: usage.documentPath,
        })),
      })
    );
    for (const mediaAssetId of mediaAssetIds) {
      operations.push(
        prisma.mediaAssetRecent.upsert({
          where: {
            businessId_userId_mediaAssetId: {
              businessId: input.businessId,
              userId: input.userId,
              mediaAssetId,
            },
          },
          create: {
            businessId: input.businessId,
            userId: input.userId,
            mediaAssetId,
          },
          update: {
            lastUsedAt: new Date(),
            useCount: { increment: 1 },
          },
        })
      );
    }
  }
  await prisma.$transaction(operations);
}
