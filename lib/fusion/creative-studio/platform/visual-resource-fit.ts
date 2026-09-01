import type {
  StudioNormalizedArtworkBounds,
  StudioVisualResourceBackingMode,
  StudioVisualResourceFitContract,
  StudioVisualResourceMetadata,
} from "./semantic-resource-slot";

export type StudioPixelBuffer = {
  data: ArrayLike<number>;
  width: number;
  height: number;
};

const rawBounds: StudioNormalizedArtworkBounds = { x: 0, y: 0, width: 1, height: 1 };

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizedBounds(left: number, top: number, right: number, bottom: number, width: number, height: number) {
  const paddingX = Math.max(1, Math.round(width * 0.012));
  const paddingY = Math.max(1, Math.round(height * 0.012));
  const x0 = clamp((left - paddingX) / width);
  const y0 = clamp((top - paddingY) / height);
  const x1 = clamp((right + 1 + paddingX) / width);
  const y1 = clamp((bottom + 1 + paddingY) / height);
  return { x: x0, y: y0, width: Math.max(0.001, x1 - x0), height: Math.max(0.001, y1 - y0) };
}

function scanBounds(buffer: StudioPixelBuffer, visible: (index: number) => boolean) {
  let left = buffer.width;
  let top = buffer.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const index = (y * buffer.width + x) * 4;
      if (!visible(index)) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left || bottom < top ? null : { left, top, right, bottom };
}

function edgeSamples(buffer: StudioPixelBuffer) {
  const samples: number[][] = [];
  const push = (x: number, y: number) => {
    const index = (y * buffer.width + x) * 4;
    samples.push([buffer.data[index] ?? 0, buffer.data[index + 1] ?? 0, buffer.data[index + 2] ?? 0]);
  };
  const strideX = Math.max(1, Math.floor(buffer.width / 32));
  const strideY = Math.max(1, Math.floor(buffer.height / 32));
  for (let x = 0; x < buffer.width; x += strideX) { push(x, 0); push(x, buffer.height - 1); }
  for (let y = 0; y < buffer.height; y += strideY) { push(0, y); push(buffer.width - 1, y); }
  return samples;
}

function distance(a: readonly number[], b: readonly number[]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function channelLuminance(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: readonly number[]) {
  return 0.2126 * channelLuminance(rgb[0]) + 0.7152 * channelLuminance(rgb[1]) + 0.0722 * channelLuminance(rgb[2]);
}

function hexColor(rgb: readonly number[]) {
  return `#${rgb.slice(0, 3).map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function artworkTone(buffer: StudioPixelBuffer, visible: (index: number) => boolean) {
  let total = 0;
  let count = 0;
  for (let index = 0; index < buffer.data.length; index += 4) {
    if (!visible(index)) continue;
    total += luminance([buffer.data[index] ?? 0, buffer.data[index + 1] ?? 0, buffer.data[index + 2] ?? 0]);
    count += 1;
  }
  if (!count) return "unknown" as const;
  const average = total / count;
  return average < 0.28 ? "dark" as const : average > 0.64 ? "light" as const : "mixed" as const;
}

function recommendedBacking(tone: "light" | "dark" | "mixed" | "unknown") {
  return tone === "dark" ? "light" as const : tone === "light" ? "dark" as const : "transparent" as const;
}

/**
 * Finds meaningful logo artwork without altering the canonical source Asset.
 * Alpha is authoritative when present. For opaque logo canvases, a stable edge
 * color may be treated as background; photographic or noisy edges fail safely
 * to raw containment.
 */
export function detectStudioVisibleArtworkBounds(buffer: StudioPixelBuffer): Pick<StudioVisualResourceMetadata, "visibleBounds" | "boundsSource" | "compatibility" | "legibility"> {
  if (buffer.width < 1 || buffer.height < 1 || buffer.data.length < buffer.width * buffer.height * 4) {
    return { visibleBounds: rawBounds, boundsSource: "raw", compatibility: "incompatible", legibility: { sourceTransparency: "unknown", opaqueBackground: "unknown", artworkTone: "unknown", recommendedBacking: "transparent", recommendationReason: "insufficient-evidence" } };
  }
  let transparentPixels = 0;
  for (let index = 3; index < buffer.data.length; index += 4) if ((buffer.data[index] ?? 255) < 245) transparentPixels += 1;
  if (transparentPixels > 0) {
    const alpha = scanBounds(buffer, (index) => (buffer.data[index + 3] ?? 0) > 12);
    if (!alpha) return { visibleBounds: rawBounds, boundsSource: "raw", compatibility: "incompatible", legibility: { sourceTransparency: "transparent", opaqueBackground: "none", artworkTone: "unknown", recommendedBacking: "transparent", recommendationReason: "insufficient-evidence" } };
    const bounds = normalizedBounds(alpha.left, alpha.top, alpha.right, alpha.bottom, buffer.width, buffer.height);
    const tone = artworkTone(buffer, (index) => (buffer.data[index + 3] ?? 0) > 12);
    const recommendation = recommendedBacking(tone);
    return { visibleBounds: bounds, boundsSource: "alpha", compatibility: bounds.width * bounds.height < 0.015 ? "incompatible" : "compatible", legibility: { sourceTransparency: "transparent", opaqueBackground: "none", artworkTone: tone, recommendedBacking: recommendation, recommendationReason: recommendation === "transparent" ? "not-needed" : "contrast" } };
  }
  const edge = edgeSamples(buffer);
  const background = edge.reduce((sum, sample) => [sum[0] + sample[0], sum[1] + sample[1], sum[2] + sample[2]], [0, 0, 0]).map((value) => value / edge.length);
  const stableEdgeRatio = edge.filter((sample) => distance(sample, background) <= 22).length / Math.max(1, edge.length);
  if (stableEdgeRatio < 0.86) return { visibleBounds: rawBounds, boundsSource: "raw", compatibility: "safe-fallback", legibility: { sourceTransparency: "opaque", opaqueBackground: "unknown", artworkTone: "mixed", recommendedBacking: "transparent", recommendationReason: "insufficient-evidence" } };
  const subject = scanBounds(buffer, (index) => distance([
    buffer.data[index] ?? 0,
    buffer.data[index + 1] ?? 0,
    buffer.data[index + 2] ?? 0,
  ], background) > 30);
  if (!subject) return { visibleBounds: rawBounds, boundsSource: "raw", compatibility: "incompatible", legibility: { sourceTransparency: "opaque", opaqueBackground: "baked-in-likely", detectedBackgroundColor: hexColor(background), artworkTone: "unknown", recommendedBacking: "transparent", recommendationReason: "baked-source-background" } };
  const bounds = normalizedBounds(subject.left, subject.top, subject.right, subject.bottom, buffer.width, buffer.height);
  const tone = artworkTone(buffer, (index) => distance([buffer.data[index] ?? 0, buffer.data[index + 1] ?? 0, buffer.data[index + 2] ?? 0], background) > 30);
  return { visibleBounds: bounds, boundsSource: "edge-background", compatibility: bounds.width * bounds.height < 0.015 ? "incompatible" : "compatible", legibility: { sourceTransparency: "opaque", opaqueBackground: "baked-in-likely", detectedBackgroundColor: hexColor(background), artworkTone: tone, recommendedBacking: "transparent", recommendationReason: "baked-source-background" } };
}

export function resolveStudioVisualResourceBackingPlate(input: {
  metadata?: StudioVisualResourceMetadata;
  contract: StudioVisualResourceFitContract;
  requestedMode?: StudioVisualResourceBackingMode;
  customColor?: string;
}) {
  const authority = input.contract.backingPlate;
  const allowed = authority.capability === "governed-choice" ? authority.allowedModes : ["transparent"];
  const requested = allowed.includes(input.requestedMode ?? authority.defaultMode) ? input.requestedMode ?? authority.defaultMode : authority.defaultMode;
  let mode = requested;
  let resolution: "host" | "auto-contrast" | "contract-default" = input.requestedMode ? "host" : "contract-default";
  if (requested === "auto-contrast") {
    mode = input.metadata?.legibility?.opaqueBackground === "baked-in-likely"
      ? "transparent"
      : input.metadata?.legibility?.recommendedBacking ?? "transparent";
    resolution = "auto-contrast";
  }
  const resolvedColor = mode === "light" ? authority.lightColor
    : mode === "dark" ? authority.darkColor
      : mode === "brand" && authority.brandColor ? authority.brandColor
        : mode === "custom" && authority.customColorAllowed && /^#[0-9a-f]{6}$/i.test(input.customColor ?? "") ? input.customColor!
          : "transparent";
  return { mode: requested, resolvedColor, customColor: requested === "custom" ? input.customColor : undefined, resolution } as const;
}

export function studioVisualResourceLegibilityGuidance(metadata: StudioVisualResourceMetadata | undefined) {
  const legibility = metadata?.legibility;
  if (!legibility) return null;
  if (legibility.opaqueBackground === "baked-in-likely") return "This Asset appears to contain a baked-in background. A backing plate cannot remove it; choose a transparent or alternate Brand Asset.";
  if (legibility.recommendedBacking === "light") return "This artwork may disappear on a dark socket. Use Light Plate or Auto Contrast.";
  if (legibility.recommendedBacking === "dark") return "This artwork may disappear on a light socket. Use Dark Plate or Auto Contrast.";
  return null;
}

export type StudioVisualResourcePlacement = {
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
  visibleUtilization: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function resolveStudioVisualResourceTranslationBounds(input: {
  intrinsicWidth: number;
  intrinsicHeight: number;
  visibleBounds?: StudioNormalizedArtworkBounds;
  requestedScale?: number;
  contract: StudioVisualResourceFitContract;
}) {
  const bounds = input.visibleBounds ?? rawBounds;
  const safeSize = Math.max(0.05, 1 - input.contract.safeInset * 2);
  const artworkWidth = Math.max(1, bounds.width * input.intrinsicWidth);
  const artworkHeight = Math.max(1, bounds.height * input.intrinsicHeight);
  const scale = clamp(input.requestedScale ?? input.contract.scale.value, input.contract.scale.min, input.contract.scale.max);
  const normalizedFit = Math.min(safeSize / artworkWidth, safeSize / artworkHeight);
  const visibleWidth = artworkWidth * normalizedFit * scale;
  const visibleHeight = artworkHeight * normalizedFit * scale;
  // Keep a contained mark inside the visible slot; once zoomed beyond it, keep
  // the slot covered. The safe inset still governs the default fit. This is
  // resource/slot math, not a family-specific drag limit.
  const allowedX = Math.abs(visibleWidth - 1) / 2;
  const allowedY = Math.abs(visibleHeight - 1) / 2;
  return {
    minX: Math.max(input.contract.translation.minX, -allowedX),
    maxX: Math.min(input.contract.translation.maxX, allowedX),
    minY: Math.max(input.contract.translation.minY, -allowedY),
    maxY: Math.min(input.contract.translation.maxY, allowedY),
  };
}

export function clampStudioVisualResourceCrop(input: {
  crop: NonNullable<StudioVisualResourceMetadata["crop"]>;
  intrinsicWidth: number;
  intrinsicHeight: number;
  visibleBounds?: StudioNormalizedArtworkBounds;
  contract: StudioVisualResourceFitContract;
}) {
  const zoom = clamp(input.crop.zoom, input.contract.scale.min, input.contract.scale.max);
  const bounds = resolveStudioVisualResourceTranslationBounds({ ...input, requestedScale: zoom });
  return {
    zoom,
    offsetX: clamp(input.crop.offsetX, bounds.minX, bounds.maxX),
    offsetY: clamp(input.crop.offsetY, bounds.minY, bounds.maxY),
  };
}

export function resolveStudioVisualResourcePlacement(input: {
  slotWidth: number;
  slotHeight: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
  visibleBounds?: StudioNormalizedArtworkBounds;
  requestedScale?: number;
  offsetX?: number;
  offsetY?: number;
  contract: StudioVisualResourceFitContract;
}): StudioVisualResourcePlacement {
  const bounds = input.visibleBounds ?? rawBounds;
  const safeWidth = input.slotWidth * Math.max(0.05, 1 - input.contract.safeInset * 2);
  const safeHeight = input.slotHeight * Math.max(0.05, 1 - input.contract.safeInset * 2);
  const artworkWidth = Math.max(1, bounds.width * input.intrinsicWidth);
  const artworkHeight = Math.max(1, bounds.height * input.intrinsicHeight);
  const requestedScale = input.requestedScale ?? input.contract.scale.value;
  const governedScale = clamp(requestedScale, input.contract.scale.min, input.contract.scale.max);
  const pixelScale = Math.min(safeWidth / artworkWidth, safeHeight / artworkHeight) * governedScale;
  const widthPx = input.intrinsicWidth * pixelScale;
  const heightPx = input.intrinsicHeight * pixelScale;
  const artworkCenterX = (bounds.x + bounds.width / 2) * input.intrinsicWidth;
  const artworkCenterY = (bounds.y + bounds.height / 2) * input.intrinsicHeight;
  const governedCrop = clampStudioVisualResourceCrop({
    crop: { zoom: governedScale, offsetX: input.offsetX ?? 0, offsetY: input.offsetY ?? 0 },
    intrinsicWidth: input.intrinsicWidth,
    intrinsicHeight: input.intrinsicHeight,
    visibleBounds: bounds,
    contract: input.contract,
  });
  const offsetX = governedCrop.offsetX;
  const offsetY = governedCrop.offsetY;
  const leftPx = input.slotWidth / 2 - artworkCenterX * pixelScale + offsetX * input.slotWidth;
  const topPx = input.slotHeight / 2 - artworkCenterY * pixelScale + offsetY * input.slotHeight;
  const visibleWidth = artworkWidth * pixelScale;
  const visibleHeight = artworkHeight * pixelScale;
  return {
    leftPx,
    topPx,
    widthPx,
    heightPx,
    visibleUtilization: Math.min(visibleWidth / input.slotWidth, visibleHeight / input.slotHeight),
    scale: governedScale,
    offsetX,
    offsetY,
  };
}

export function studioVisualResourceCompatibility(metadata: StudioVisualResourceMetadata | undefined, contract: StudioVisualResourceFitContract) {
  if (metadata?.compatibility === "incompatible") return { ok: false as const, reason: "This Asset has no usable visible artwork." };
  if (metadata?.compatibility === "safe-fallback") return { ok: true as const, warning: "Visible artwork could not be isolated; Studio is using safe containment." };
  const bounds = metadata?.visibleBounds ?? rawBounds;
  const utilization = Math.min(bounds.width, bounds.height) * (1 - contract.safeInset * 2);
  return utilization < contract.minimumVisibleArtworkUtilization
    ? { ok: true as const, warning: "This Asset contains substantial margin; Studio normalized the visible artwork." }
    : { ok: true as const };
}
