"use client";

import type { StudioVisualResourceMetadata } from "./semantic-resource-slot";
import { detectStudioVisibleArtworkBounds } from "./visual-resource-fit";

const CANDIDATE_DECODE_TIMEOUT_MS = 15_000;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    const timeout = window.setTimeout(() => finish(() => reject(new Error("Asset decode timed out."))), CANDIDATE_DECODE_TIMEOUT_MS);
    const finish = (complete: () => void) => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      complete();
    };
    image.onload = () => finish(() => resolve(image));
    image.onerror = () => finish(() => reject(new Error("Asset could not be decoded.")));
    image.src = src;
  });
}

export type StudioVisualResourceCandidatePreparation =
  | { ok: true; metadata: StudioVisualResourceMetadata }
  | { ok: false; error: string };

/** Decode the exact candidate first, then enrich it when pixel inspection is
 * available. A CORS/canvas limitation is a safe-fit fallback; a failed image
 * decode is an honest candidate error and must never become a blank cropper. */
export async function prepareStudioVisualResourceCandidate(src: string): Promise<StudioVisualResourceCandidatePreparation> {
  if (!src.trim()) return { ok: false, error: "The selected Asset has no renderable source." };
  let image: HTMLImageElement;
  try {
    image = await loadImage(src);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Asset could not be decoded." };
  }
  const fallback: StudioVisualResourceMetadata = {
    intrinsicWidth: image.naturalWidth,
    intrinsicHeight: image.naturalHeight,
    fitMode: "raw-contain",
    crop: { zoom: 1, offsetX: 0, offsetY: 0 },
    visibleBounds: { x: 0, y: 0, width: 1, height: 1 },
    boundsSource: "raw",
    compatibility: "safe-fallback",
    legibility: { sourceTransparency: "unknown", opaqueBackground: "unknown", artworkTone: "unknown", recommendedBacking: "transparent", recommendationReason: "insufficient-evidence" },
  };
  try {
    const maximum = 512;
    const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { ok: true, metadata: fallback };
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    return {
      ok: true,
      metadata: {
        intrinsicWidth: image.naturalWidth,
        intrinsicHeight: image.naturalHeight,
        fitMode: "visible-contain",
        crop: { zoom: 1, offsetX: 0, offsetY: 0 },
        ...detectStudioVisibleArtworkBounds(pixels),
      },
    };
  } catch {
    return { ok: true, metadata: fallback };
  }
}

/**
 * Browser-side intake helper. Same-origin and CORS-enabled Assets receive
 * canonical visible-artwork metadata. Other sources remain renderable through
 * governed safe containment and are honestly marked as a fallback.
 */
export async function inspectStudioVisualResource(src: string): Promise<StudioVisualResourceMetadata> {
  const result = await prepareStudioVisualResourceCandidate(src);
  return result.ok ? result.metadata : {
    fitMode: "raw-contain",
    crop: { zoom: 1, offsetX: 0, offsetY: 0 },
    visibleBounds: { x: 0, y: 0, width: 1, height: 1 },
    boundsSource: "raw",
    compatibility: "safe-fallback",
    legibility: { sourceTransparency: "unknown", opaqueBackground: "unknown", artworkTone: "unknown", recommendedBacking: "transparent", recommendationReason: "insufficient-evidence" },
  };
}
