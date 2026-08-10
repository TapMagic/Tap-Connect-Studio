/**
 * Rendered visual parity for assembly reassembly — pixel compare via pngjs.
 * Allows small anti-aliasing tolerance. Not OCR. Not ID-only success.
 */

import { PNG } from "pngjs";

export type ImageParityResult = Readonly<{
  ok: boolean;
  maxChannelDelta: number;
  meanChannelDelta: number;
  differingPixels: number;
  comparedPixels: number;
  width: number;
  height: number;
  reason?: string;
}>;

const DEFAULT_MAX_CHANNEL = 28;
const DEFAULT_MAX_DIFF_RATIO = 0.035;

export function comparePngBuffers(
  reference: Buffer,
  candidate: Buffer,
  options?: { maxChannelDelta?: number; maxDiffRatio?: number }
): ImageParityResult {
  const maxChannel = options?.maxChannelDelta ?? DEFAULT_MAX_CHANNEL;
  const maxDiffRatio = options?.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO;
  let ref: PNG;
  let cand: PNG;
  try {
    ref = PNG.sync.read(reference);
    cand = PNG.sync.read(candidate);
  } catch (error) {
    return {
      ok: false,
      maxChannelDelta: 255,
      meanChannelDelta: 255,
      differingPixels: 0,
      comparedPixels: 0,
      width: 0,
      height: 0,
      reason: `PNG decode failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (ref.width !== cand.width || ref.height !== cand.height) {
    return {
      ok: false,
      maxChannelDelta: 255,
      meanChannelDelta: 255,
      differingPixels: 0,
      comparedPixels: 0,
      width: ref.width,
      height: ref.height,
      reason: `Dimension mismatch ${ref.width}x${ref.height} vs ${cand.width}x${cand.height}`,
    };
  }
  const total = ref.width * ref.height;
  let differing = 0;
  let maxDelta = 0;
  let sumDelta = 0;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const dr = Math.abs(ref.data[o]! - cand.data[o]!);
    const dg = Math.abs(ref.data[o + 1]! - cand.data[o + 1]!);
    const db = Math.abs(ref.data[o + 2]! - cand.data[o + 2]!);
    const da = Math.abs(ref.data[o + 3]! - cand.data[o + 3]!);
    const delta = Math.max(dr, dg, db, da);
    maxDelta = Math.max(maxDelta, delta);
    sumDelta += delta;
    if (delta > maxChannel) differing += 1;
  }
  const ratio = differing / Math.max(1, total);
  return {
    ok: ratio <= maxDiffRatio,
    maxChannelDelta: maxDelta,
    meanChannelDelta: sumDelta / Math.max(1, total),
    differingPixels: differing,
    comparedPixels: total,
    width: ref.width,
    height: ref.height,
    reason: ratio > maxDiffRatio ? `diff ratio ${ratio.toFixed(4)} > ${maxDiffRatio}` : undefined,
  };
}
