import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import sharp from "sharp";
import type { CreativeSurfaceKind, MediaAsset, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { providerFixtureModeEnabled } from "@/lib/media/providers/types";
import { logoDevUpstreamUrl } from "@/lib/services/logo-search";
import type { VerifiedProviderCandidate } from "./candidate-token";
import {
  fetchRemoteImage,
  sniffImageMime,
  type RemoteImage,
} from "./remote-image";
import { sanitizeMediaSvg } from "./safe-svg";
import {
  MAX_UPLOAD_IMAGE_PIXELS,
  MAX_UPLOAD_SOURCE_BYTES,
  MAX_UPLOAD_SOURCE_MEGABYTES,
  RUNTIME_IMAGE_MAX_EDGE_PX,
  RUNTIME_IMAGE_WEBP_QUALITY,
} from "./upload-policy";
import { deleteMediaObject, extensionForMime, putMediaObject } from "./storage";

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
    readonly status: number,
    readonly code = "media_error",
  ) {
    super(message);
  }
}

export function mediaStorageError(error: unknown): MediaServiceError {
  const detail =
    error && typeof error === "object"
      ? (error as {
          name?: string;
          Code?: string;
          code?: string;
          message?: string;
          $metadata?: { httpStatusCode?: number };
        })
      : {};
  const providerCode = detail.Code || detail.code || detail.name;
  const status = detail.$metadata?.httpStatusCode;
  if (status === 403 || providerCode === "AccessDenied") {
    return new MediaServiceError(
      "Media storage rejected the upload (403 AccessDenied). The configured storage credential needs object-write permission for this bucket. Nothing was saved.",
      503,
      "storage_access_denied",
    );
  }
  if (/not configured/i.test(detail.message || "")) {
    return new MediaServiceError(
      "Media storage is not configured for this environment. Ask an administrator to configure the production media bucket before retrying.",
      503,
      "storage_not_configured",
    );
  }
  return new MediaServiceError(
    `Media storage could not save the image${status ? ` (provider HTTP ${status})` : ""}. Nothing was saved; retry after checking storage availability.`,
    503,
    "storage_provider_failed",
  );
}

function safeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 120);
}

function providerImportUrl(payload: VerifiedProviderCandidate): string {
  const { candidate } = payload;
  if (candidate.provider === "pexels") {
    const imageUrl = String(candidate.importDescriptor.imageUrl || "");
    const parsed = new URL(imageUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "images.pexels.com"
    ) {
      throw new MediaServiceError("Invalid Pexels import candidate", 400);
    }
    return parsed.toString();
  }

  const descriptor = candidate.importDescriptor;
  const upstream = logoDevUpstreamUrl({
    domain:
      typeof descriptor.domain === "string" ? descriptor.domain : undefined,
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

async function fixtureProviderImage(
  provider: VerifiedProviderCandidate["candidate"]["provider"],
): Promise<RemoteImage> {
  if (!providerFixtureModeEnabled()) {
    throw new Error("Fixture provider media is disabled");
  }
  const relativePath =
    provider === "logo_dev"
      ? "tap-connect-logo.png"
      : path.join("marketing", "use-cases", "boutiques.jpg");
  const bytes = await readFile(
    path.join(process.cwd(), "public", relativePath),
  );
  const mimeType = sniffImageMime(bytes);
  if (!mimeType)
    throw new Error("Checked-in provider fixture is not a supported image");
  return {
    finalUrl: `fixture://${provider}/${relativePath}`,
    bytes,
    mimeType,
    declaredSize: bytes.byteLength,
  };
}

export async function importProviderCandidate(
  payload: VerifiedProviderCandidate,
  dependencies: MediaImportDependencies = defaultImportDependencies,
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

  const remote = providerFixtureModeEnabled()
    ? await fixtureProviderImage(candidate.provider)
    : await dependencies.fetchRemoteImage(providerImportUrl(payload));
  const contentHash = createHash("sha256").update(remote.bytes).digest("hex");
  const extension = extensionForMime(remote.mimeType);
  const storageKey = `${businessId}/imports/${candidate.provider}/${safeSegment(
    candidate.providerAssetId,
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
          candidate.providerAssetId,
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
    if (asset.storageKey !== storageKey)
      await dependencies.deleteMediaObject(storageKey);
    return asset;
  } catch (error) {
    await dependencies.deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function importExternalImage(
  input: {
    businessId: string;
    url: string;
    filename: string;
  },
  dependencies: MediaImportDependencies = defaultImportDependencies,
): Promise<MediaAsset> {
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
        rightsNote:
          "Owner-supplied external URL; rights were not verified by TapConnect.",
        rights:
          "Owner-supplied external URL; rights were not verified by TapConnect.",
        approvalStatus: "UNREVIEWED",
        importedAt: new Date(),
      },
    });
  } catch (error) {
    await dependencies.deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}

export type StoredUploadedImage = {
  asset: MediaAsset;
  processing: {
    optimized: boolean;
    originalSizeBytes: number;
    runtimeSizeBytes: number;
    width: number | null;
    height: number | null;
  };
};

export async function prepareUploadedImage(input: {
  bytes: Buffer;
  declaredMimeType: string;
  filename?: string;
}): Promise<{
  originalBytes: Buffer;
  originalMimeType: NonNullable<ReturnType<typeof sniffImageMime>>;
  runtimeBytes: Buffer;
  runtimeMimeType: NonNullable<ReturnType<typeof sniffImageMime>>;
  width: number | null;
  height: number | null;
  optimized: boolean;
}> {
  if (input.bytes.byteLength > MAX_UPLOAD_SOURCE_BYTES) {
    throw new MediaServiceError(
      `Source image exceeds the ${MAX_UPLOAD_SOURCE_MEGABYTES} MB upload limit.`,
      413,
      "source_too_large",
    );
  }
  const mimeType = sniffImageMime(input.bytes);
  const declared = input.declaredMimeType?.split(";")[0]?.trim().toLowerCase();
  const extension = input.filename?.split(".").pop()?.toLowerCase();
  if (
    declared === "image/heic" ||
    declared === "image/heif" ||
    extension === "heic" ||
    extension === "heif"
  ) {
    throw new MediaServiceError(
      "Apple HEIC/HEIF images are not supported yet. Export or share the image as JPG, PNG, or WebP and upload that file.",
      415,
      "heic_not_supported",
    );
  }
  if (
    !mimeType ||
    (declared &&
      declared !== mimeType &&
      declared !== "application/octet-stream")
  ) {
    throw new MediaServiceError(
      "Uploaded bytes are not a supported JPG, PNG, WebP, GIF, or SVG image, or the file type does not match the file contents.",
      415,
      "unsupported_image",
    );
  }

  let originalBytes = input.bytes;
  if (mimeType === "image/svg+xml") {
    const sanitized = sanitizeMediaSvg(originalBytes);
    if (!sanitized) {
      throw new MediaServiceError(
        "SVG failed safety sanitization.",
        415,
        "unsafe_svg",
      );
    }
    originalBytes = sanitized;
  }

  if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
    return {
      originalBytes,
      originalMimeType: mimeType,
      runtimeBytes: originalBytes,
      runtimeMimeType: mimeType,
      width: null,
      height: null,
      optimized: false,
    };
  }

  try {
    const pipeline = sharp(originalBytes, {
      failOn: "error",
      limitInputPixels: MAX_UPLOAD_IMAGE_PIXELS,
    }).rotate();
    const metadata = await pipeline.metadata();
    const generated = await pipeline
      .resize({
        width: RUNTIME_IMAGE_MAX_EDGE_PX,
        height: RUNTIME_IMAGE_MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: RUNTIME_IMAGE_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const sourceTooLargeForRuntime =
      Math.max(metadata.width ?? 0, metadata.height ?? 0) >
      RUNTIME_IMAGE_MAX_EDGE_PX;
    const materiallySmaller =
      generated.data.byteLength < originalBytes.byteLength * 0.9;
    const optimized = sourceTooLargeForRuntime || materiallySmaller;
    return {
      originalBytes,
      originalMimeType: mimeType,
      runtimeBytes: optimized ? generated.data : originalBytes,
      runtimeMimeType: optimized ? "image/webp" : mimeType,
      width: generated.info.width || metadata.width || null,
      height: generated.info.height || metadata.height || null,
      optimized,
    };
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError(
      `Image could not be decoded safely. Images may contain at most ${MAX_UPLOAD_IMAGE_PIXELS.toLocaleString()} pixels.`,
      422,
      "image_decode_failed",
    );
  }
}

export async function storeUploadedImage(input: {
  businessId: string;
  filename: string;
  declaredMimeType: string;
  bytes: Buffer;
}): Promise<StoredUploadedImage> {
  const prepared = await prepareUploadedImage(input);
  const contentHash = createHash("sha256")
    .update(prepared.originalBytes)
    .digest("hex");
  const existing = await prisma.mediaAsset.findFirst({
    where: { businessId: input.businessId, contentHash },
  });
  const processing = {
    optimized: prepared.optimized,
    originalSizeBytes: prepared.originalBytes.byteLength,
    runtimeSizeBytes: prepared.runtimeBytes.byteLength,
    width: prepared.width,
    height: prepared.height,
  };
  if (existing)
    return {
      asset: existing,
      processing: { ...processing, runtimeSizeBytes: existing.sizeBytes },
    };

  const originalExtension = extensionForMime(prepared.originalMimeType);
  const originalStorageKey = `${input.businessId}/uploads/originals/${contentHash}.${originalExtension}`;
  let originalUrl: string;
  try {
    originalUrl = await putMediaObject({
      storageKey: originalStorageKey,
      bytes: prepared.originalBytes,
      mimeType: prepared.originalMimeType,
    });
  } catch (error) {
    throw mediaStorageError(error);
  }
  const runtimeStorageKey = prepared.optimized
    ? `${input.businessId}/uploads/runtime/${contentHash}.webp`
    : originalStorageKey;
  let url = originalUrl;
  if (prepared.optimized) {
    try {
      url = await putMediaObject({
        storageKey: runtimeStorageKey,
        bytes: prepared.runtimeBytes,
        mimeType: prepared.runtimeMimeType,
      });
    } catch (error) {
      await deleteMediaObject(originalStorageKey).catch(() => undefined);
      throw mediaStorageError(error);
    }
  }
  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        businessId: input.businessId,
        url,
        storageKey: runtimeStorageKey,
        contentHash,
        filename: input.filename,
        mimeType: prepared.runtimeMimeType,
        sizeBytes: prepared.runtimeBytes.byteLength,
        width: prepared.width,
        height: prepared.height,
        source: "upload",
        sourceUrl: originalUrl,
        renditionKind: prepared.optimized ? "runtime-optimized" : "original",
        licenseCode: "OWNER_SUPPLIED",
        rightsNote:
          "Owner supplied this asset and is responsible for usage rights.",
        rights:
          "Owner supplied this asset and is responsible for usage rights.",
        approvalStatus: "UNREVIEWED",
        importedAt: new Date(),
      },
    });
    return { asset, processing };
  } catch (error) {
    await deleteMediaObject(originalStorageKey).catch(() => undefined);
    if (runtimeStorageKey !== originalStorageKey) {
      await deleteMediaObject(runtimeStorageKey).catch(() => undefined);
    }
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError(
      "The image reached media storage but its Asset record could not be saved. Uploaded bytes were removed; retry after database availability is restored.",
      503,
      "asset_persistence_failed",
    );
  }
}

export async function assertTenantAsset(
  businessId: string,
  mediaAssetId: string,
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

export function canApproveBrandMedia(
  user: SessionUser,
  businessId: string,
): boolean {
  const role = user.memberships.find(
    (membership) => membership.businessId === businessId,
  )?.role;
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
  mediaAssetId: string,
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
      409,
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
      ]),
    ).values(),
  );
  if (unique.length) {
    const count = await prisma.mediaAsset.count({
      where: {
        businessId: input.businessId,
        id: { in: unique.map((usage) => usage.mediaAssetId) },
      },
    });
    if (count !== new Set(unique.map((usage) => usage.mediaAssetId)).size) {
      throw new MediaServiceError(
        "A media usage references another business",
        404,
      );
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
      ]),
    ).values(),
  );
  const mediaAssetIds = Array.from(
    new Set(unique.map((usage) => usage.mediaAssetId)),
  );
  if (mediaAssetIds.length) {
    const count = await prisma.mediaAsset.count({
      where: { businessId: input.businessId, id: { in: mediaAssetIds } },
    });
    if (count !== mediaAssetIds.length) {
      throw new MediaServiceError(
        "A media usage references another business",
        404,
      );
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
      }),
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
        }),
      );
    }
  }
  await prisma.$transaction(operations);
}
