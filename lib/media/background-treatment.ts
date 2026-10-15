import { createHash } from "node:crypto";
import sharp from "sharp";
import type { MediaAsset, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  deleteMediaObject,
  putMediaObject,
  readMediaObject,
} from "@/lib/media/storage";
import { MediaServiceError, mediaStorageError } from "@/lib/media/service";

export type BackgroundRefinementStroke = {
  intent: "keep" | "remove";
  points: { x: number; y: number }[];
  radius: number;
};

export type BackgroundTreatmentRecipe = {
  mode: "auto" | "solid-color";
  /** Flips automatic foreground/background classification before manual refinement. */
  invertSelection?: boolean;
  targetColor?: string;
  tolerance: number;
  featherPx: number;
  edgeCleanup: number;
  colorDecontamination: number;
  transparencyThreshold: number;
  strokes: BackgroundRefinementStroke[];
  /** Explicitly creates a flattened derivative. Preview backdrops omit this. */
  replacementColor?: string;
};

export type BackgroundVariantAsset = Pick<
  MediaAsset,
  | "id"
  | "url"
  | "filename"
  | "mimeType"
  | "width"
  | "height"
  | "source"
  | "provider"
  | "providerAssetId"
  | "parentAssetId"
  | "renditionKind"
  | "derivationRecipe"
  | "approvalStatus"
  | "defaultAltText"
>;

const DEFAULT_RECIPE: BackgroundTreatmentRecipe = {
  mode: "auto",
  tolerance: 36,
  featherPx: 1,
  edgeCleanup: 45,
  colorDecontamination: 55,
  transparencyThreshold: 8,
  strokes: [],
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : undefined;
}

export function normalizeBackgroundRecipe(
  value: Partial<BackgroundTreatmentRecipe> | null | undefined,
): BackgroundTreatmentRecipe {
  const strokes = Array.isArray(value?.strokes)
    ? value.strokes.slice(0, 80).flatMap((stroke) => {
        if (stroke?.intent !== "keep" && stroke?.intent !== "remove") return [];
        const points = Array.isArray(stroke.points)
          ? stroke.points.slice(0, 800).map((point) => ({
              x: clamp(point?.x, 0, 1, 0.5),
              y: clamp(point?.y, 0, 1, 0.5),
            }))
          : [];
        if (!points.length) return [];
        return [{
          intent: stroke.intent,
          points,
          radius: clamp(stroke.radius, 0.005, 0.25, 0.04),
        } satisfies BackgroundRefinementStroke];
      })
    : [];

  const mode = value?.mode === "solid-color" ? "solid-color" : "auto";
  return {
    mode,
    ...(mode === "auto" && value?.invertSelection ? { invertSelection: true } : {}),
    targetColor: normalizeColor(value?.targetColor),
    tolerance: clamp(value?.tolerance, 0, 100, DEFAULT_RECIPE.tolerance),
    featherPx: clamp(value?.featherPx, 0, 24, DEFAULT_RECIPE.featherPx),
    edgeCleanup: clamp(value?.edgeCleanup, 0, 100, DEFAULT_RECIPE.edgeCleanup),
    colorDecontamination: clamp(
      value?.colorDecontamination,
      0,
      100,
      DEFAULT_RECIPE.colorDecontamination,
    ),
    transparencyThreshold: clamp(
      value?.transparencyThreshold,
      0,
      255,
      DEFAULT_RECIPE.transparencyThreshold,
    ),
    strokes,
    replacementColor: normalizeColor(value?.replacementColor),
  };
}

function rgbFromHex(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  target: [number, number, number],
): number {
  const dr = r - target[0];
  const dg = g - target[1];
  const db = b - target[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function estimateBorderColor(
  data: Buffer,
  width: number,
  height: number,
): [number, number, number] {
  const samples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));
  const add = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    if (data[index + 3] < 24) return;
    samples.push([data[index], data[index + 1], data[index + 2]]);
  };
  for (let x = 0; x < width; x += step) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = step; y < height - step; y += step) {
    add(0, y);
    add(width - 1, y);
  }
  if (!samples.length) return [255, 255, 255];
  samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const middle = samples[Math.floor(samples.length / 2)];
  return middle;
}

function borderColorComplexity(
  data: Buffer,
  width: number,
  height: number,
  target: [number, number, number],
): number {
  let total = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 80));
  const add = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    if (data[index + 3] < 24) return;
    total += colorDistance(data[index], data[index + 1], data[index + 2], target);
    count += 1;
  };
  for (let x = 0; x < width; x += step) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = step; y < height - step; y += step) {
    add(0, y);
    add(width - 1, y);
  }
  return count ? total / count : 0;
}

function protectPrimarySubject(
  alpha: Uint8Array,
  pixels: Buffer,
  width: number,
  height: number,
  borderComplexity: number,
) {
  if (borderComplexity < 24) return;

  // Complex photographs do not have one reliable border color. If that
  // approximation reaches into the primary subject, preserve a feathered
  // center-safe area before exposing the reversible mask to the Host.
  for (let y = 0; y < height; y += 1) {
    const normalizedY = (y / Math.max(1, height - 1) - 0.53) / 0.58;
    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x / Math.max(1, width - 1) - 0.5) / 0.4;
      const distance = Math.sqrt(normalizedX ** 2 + normalizedY ** 2);
      if (distance >= 1) continue;
      const protection = Math.max(0, Math.min(1, (1 - distance) / 0.18));
      const pixel = y * width + x;
      const originalAlpha = pixels[pixel * 4 + 3];
      alpha[pixel] = Math.max(alpha[pixel], Math.round(originalAlpha * protection));
    }
  }
}

function connectedBackgroundMask(
  candidates: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const connected = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let read = 0;
  let write = 0;
  const enqueue = (index: number) => {
    if (!candidates[index] || connected[index]) return;
    connected[index] = 1;
    queue[write++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (read < write) {
    const index = queue[read++];
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < width * height) enqueue(index + width);
  }
  return connected;
}

function applyRefinementStrokes(
  alpha: Uint8Array,
  width: number,
  height: number,
  strokes: BackgroundRefinementStroke[],
) {
  for (const stroke of strokes) {
    const radius = Math.max(1, Math.round(stroke.radius * Math.min(width, height)));
    for (const point of stroke.points) {
      const cx = Math.round(point.x * (width - 1));
      const cy = Math.round(point.y * (height - 1));
      for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y += 1) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x += 1) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue;
          alpha[y * width + x] = stroke.intent === "keep" ? 255 : 0;
        }
      }
    }
  }
}

export async function renderBackgroundVariant(
  sourceBytes: Buffer,
  requestedRecipe: Partial<BackgroundTreatmentRecipe>,
): Promise<{ bytes: Buffer; width: number; height: number; recipe: BackgroundTreatmentRecipe }> {
  const recipe = normalizeBackgroundRecipe(requestedRecipe);
  const decoded = await sharp(sourceBytes, { failOn: "error", animated: false })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = decoded.info.width;
  const height = decoded.info.height;
  const pixels = decoded.data;
  const target = recipe.targetColor
    ? rgbFromHex(recipe.targetColor)
    : estimateBorderColor(pixels, width, height);
  const tolerance = 8 + recipe.tolerance * 2.05;
  const softness = 8 + recipe.featherPx * 5 + (100 - recipe.edgeCleanup) * 0.12;
  const candidates = new Uint8Array(width * height);
  const distance = new Float32Array(width * height);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const d = colorDistance(pixels[offset], pixels[offset + 1], pixels[offset + 2], target);
    distance[pixel] = d;
    if (d <= tolerance + softness) candidates[pixel] = 1;
  }
  const removable = recipe.mode === "auto"
    ? connectedBackgroundMask(candidates, width, height)
    : candidates;
  let alpha = new Uint8Array(width * height);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const originalAlpha = pixels[pixel * 4 + 3];
    if (!removable[pixel]) {
      alpha[pixel] = originalAlpha;
      continue;
    }
    const edge = Math.max(0, Math.min(1, (distance[pixel] - tolerance) / Math.max(1, softness)));
    alpha[pixel] = Math.round(originalAlpha * edge);
  }

  if (recipe.edgeCleanup > 60) {
    const medianSize = recipe.edgeCleanup > 86 ? 5 : 3;
    alpha = new Uint8Array(
      await sharp(Buffer.from(alpha), { raw: { width, height, channels: 1 } })
        .median(medianSize)
        .raw()
        .toBuffer(),
    );
  }
  if (recipe.featherPx > 0.4) {
    alpha = new Uint8Array(
      await sharp(Buffer.from(alpha), { raw: { width, height, channels: 1 } })
        .blur(Math.max(0.3, recipe.featherPx / 2))
        .raw()
        .toBuffer(),
    );
  }
  if (recipe.mode === "auto") {
    protectPrimarySubject(
      alpha,
      pixels,
      width,
      height,
      borderColorComplexity(pixels, width, height, target),
    );
  }
  if (recipe.mode === "auto" && recipe.invertSelection) {
    for (let pixel = 0; pixel < alpha.length; pixel += 1) {
      const originalAlpha = pixels[pixel * 4 + 3];
      alpha[pixel] = Math.max(0, originalAlpha - alpha[pixel]);
    }
  }
  applyRefinementStrokes(alpha, width, height, recipe.strokes);

  const decontaminate = recipe.colorDecontamination / 100;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    let nextAlpha = alpha[pixel];
    if (nextAlpha < recipe.transparencyThreshold) nextAlpha = 0;
    pixels[offset + 3] = nextAlpha;
    if (!nextAlpha || nextAlpha >= 250 || decontaminate <= 0) continue;
    const fraction = Math.max(0.08, nextAlpha / 255);
    for (let channel = 0; channel < 3; channel += 1) {
      const unblended = (pixels[offset + channel] - target[channel] * (1 - fraction)) / fraction;
      const corrected = Math.max(0, Math.min(255, unblended));
      pixels[offset + channel] = Math.round(
        pixels[offset + channel] * (1 - decontaminate) + corrected * decontaminate,
      );
    }
  }

  let output = sharp(pixels, { raw: { width, height, channels: 4 } });
  if (recipe.replacementColor) {
    output = output.flatten({ background: recipe.replacementColor });
  }
  return {
    bytes: await output.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(),
    width,
    height,
    recipe,
  };
}

export function backgroundRecipeCacheKey(
  asset: Pick<MediaAsset, "id" | "contentHash">,
  recipe: BackgroundTreatmentRecipe,
): string {
  return createHash("sha256")
    // Version the renderer as part of the durable cache identity. This keeps
    // a corrected automatic mask from reusing a derivative rendered by an
    // older algorithm while preserving every prior derivative as evidence.
    .update(`v2:${asset.contentHash || asset.id}:${JSON.stringify(recipe)}`)
    .digest("hex");
}

export async function resolveBackgroundAsset(
  businessId: string,
  mediaAssetId: string,
): Promise<{ asset: MediaAsset; original: MediaAsset }> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: mediaAssetId, businessId },
  });
  if (!asset) throw new MediaServiceError("Media asset not found", 404);
  const original = asset.parentAssetId
    ? await prisma.mediaAsset.findFirst({
        where: { id: asset.parentAssetId, businessId },
      })
    : asset;
  if (!original) throw new MediaServiceError("Original media asset not found", 404);
  return { asset, original };
}

export async function createBackgroundVariant(input: {
  businessId: string;
  mediaAssetId: string;
  recipe: Partial<BackgroundTreatmentRecipe>;
}): Promise<{ asset: MediaAsset; original: MediaAsset; cached: boolean }> {
  const { original } = await resolveBackgroundAsset(input.businessId, input.mediaAssetId);
  if (!original.mimeType.startsWith("image/") || !original.storageKey) {
    throw new MediaServiceError(
      "This image must be stored in Assets before its background can be edited.",
      409,
      "background_source_not_durable",
    );
  }
  const recipe = normalizeBackgroundRecipe(input.recipe);
  const cacheKey = backgroundRecipeCacheKey(original, recipe);
  const existing = await prisma.mediaAsset.findUnique({
    where: {
      businessId_provider_providerAssetId: {
        businessId: input.businessId,
        provider: "tapconnect-background",
        providerAssetId: cacheKey,
      },
    },
  });
  if (existing) return { asset: existing, original, cached: true };

  let sourceBytes: Buffer;
  try {
    sourceBytes = await readMediaObject(original.storageKey);
  } catch (error) {
    throw mediaStorageError(error);
  }
  let rendered: Awaited<ReturnType<typeof renderBackgroundVariant>>;
  try {
    rendered = await renderBackgroundVariant(sourceBytes, recipe);
  } catch {
    throw new MediaServiceError(
      "The image could not be decoded for background cleanup. The original remains unchanged.",
      422,
      "background_decode_failed",
    );
  }
  const storageKey = `${input.businessId}/background-variants/${original.id}/${cacheKey}.png`;
  let url: string;
  try {
    url = await putMediaObject({ storageKey, bytes: rendered.bytes, mimeType: "image/png" });
  } catch (error) {
    throw mediaStorageError(error);
  }

  const baseName = (original.filename || "Image").replace(/\.[^.]+$/, "");
  try {
    const asset = await prisma.mediaAsset.upsert({
      where: {
        businessId_provider_providerAssetId: {
          businessId: input.businessId,
          provider: "tapconnect-background",
          providerAssetId: cacheKey,
        },
      },
      update: {},
      create: {
        businessId: input.businessId,
        campaignId: original.campaignId,
        url,
        storageKey,
        contentHash: createHash("sha256").update(rendered.bytes).digest("hex"),
        filename: `${baseName} — ${recipe.replacementColor ? "Background replaced" : "Transparent"}.png`,
        mimeType: "image/png",
        sizeBytes: rendered.bytes.byteLength,
        width: rendered.width,
        height: rendered.height,
        source: "bg-remove",
        provider: "tapconnect-background",
        providerAssetId: cacheKey,
        sourcePageUrl: original.sourcePageUrl,
        sourceUrl: original.url,
        creatorName: original.creatorName,
        creatorUrl: original.creatorUrl,
        attributionName: original.attributionName,
        attributionUrl: original.attributionUrl,
        licenseCode: original.licenseCode,
        licenseUrl: original.licenseUrl,
        attributionText: original.attributionText,
        rightsNote: original.rightsNote,
        rights: original.rights,
        approvalStatus: original.approvalStatus,
        approvedAt: original.approvedAt,
        approvedById: original.approvedById,
        defaultAltText: original.defaultAltText,
        parentAssetId: original.id,
        renditionKind: recipe.replacementColor
          ? "background-flattened"
          : "background-transparent",
        derivationRecipe: rendered.recipe as unknown as Prisma.InputJsonValue,
        importedAt: new Date(),
      },
    });
    if (asset.storageKey !== storageKey) {
      await deleteMediaObject(storageKey).catch(() => undefined);
    }
    return { asset, original, cached: false };
  } catch (error) {
    await deleteMediaObject(storageKey).catch(() => undefined);
    throw error;
  }
}
