/**
 * Local / mock background remover — non-destructive chroma-key against corner samples.
 * Live providers plug in via the same BgRemoveAdapter interface.
 */

import type { BgRemoveAdapter, BgRemoveRequest, BgRemoveResult } from "./types";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for background removal"));
    img.src = url;
  });
}

function sampleCorner(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number
): [number, number, number] {
  const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Pure canvas processor — also exported for unit tests with ImageData mocks. */
export function chromaKeyImageData(
  imageData: ImageData,
  threshold = 42,
  refine = false
): ImageData {
  const { data, width, height } = imageData;
  const corners: [number, number, number][] = [
    sampleCorner(data, width, height, 2, 2),
    sampleCorner(data, width, height, width - 3, 2),
    sampleCorner(data, width, height, 2, height - 3),
    sampleCorner(data, width, height, width - 3, height - 3),
  ];
  const avg: [number, number, number] = [
    Math.round(corners.reduce((s, c) => s + c[0], 0) / 4),
    Math.round(corners.reduce((s, c) => s + c[1], 0) / 4),
    Math.round(corners.reduce((s, c) => s + c[2], 0) / 4),
  ];
  const outData = new Uint8ClampedArray(data);
  const soft = refine ? threshold * 1.35 : threshold;
  for (let i = 0; i < outData.length; i += 4) {
    const px: [number, number, number] = [outData[i], outData[i + 1], outData[i + 2]];
    const d = colorDist(px, avg);
    if (d < soft) {
      const alpha = d < soft * 0.55 ? 0 : Math.round(255 * ((d - soft * 0.55) / (soft * 0.45)));
      outData[i + 3] = Math.min(outData[i + 3], Math.max(0, alpha));
    }
  }
  if (typeof ImageData !== "undefined") {
    try {
      return new ImageData(outData, width, height);
    } catch {
      // fall through to plain object for Node tests
    }
  }
  return { data: outData, width, height, colorSpace: "srgb" } as ImageData;
}

export async function runLocalMockRemove(req: BgRemoveRequest): Promise<BgRemoveResult> {
  if (typeof document === "undefined") {
    return {
      ok: false,
      error: "Background removal runs in the browser (local mock).",
      code: "unsupported",
    };
  }
  try {
    const img = await loadImage(req.imageUrl);
    const canvas = document.createElement("canvas");
    const pad = Math.max(0, Math.min(64, req.paddingPx ?? 0));
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth || img.width;
    let sh = img.naturalHeight || img.height;
    if (req.crop) {
      sx = Math.max(0, Math.floor(req.crop.x * sw));
      sy = Math.max(0, Math.floor(req.crop.y * sh));
      sw = Math.max(1, Math.floor(req.crop.w * sw));
      sh = Math.max(1, Math.floor(req.crop.h * sh));
    }
    canvas.width = sw + pad * 2;
    canvas.height = sh + pad * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: "Canvas unavailable", code: "process_failed" };
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (req.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }
    ctx.drawImage(img, sx, sy, sw, sh, pad, pad, sw, sh);
    ctx.shadowColor = "transparent";
    const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const keyed = chromaKeyImageData(raw, req.threshold ?? 42, Boolean(req.refine));
    ctx.putImageData(keyed, 0, 0);
    const derivedUrl = canvas.toDataURL("image/png");
    const createdAt = new Date().toISOString();
    return {
      ok: true,
      derivedUrl,
      mimeType: "image/png",
      provenance: {
        provider: "local-mock",
        originalUrl: req.imageUrl,
        derivedUrl,
        createdAt,
        refined: Boolean(req.refine),
        crop: req.crop,
        focal: req.focal,
        paddingPx: pad || undefined,
        shadow: req.shadow,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Background removal failed",
      code: "process_failed",
    };
  }
}

export const localMockBgRemoveAdapter: BgRemoveAdapter = {
  id: "local-mock",
  label: "Local mock (chroma key)",
  removeBackground: runLocalMockRemove,
};
