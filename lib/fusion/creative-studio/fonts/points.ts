/**
 * Point-based typography sizing.
 * Internal CSS uses px; owner-facing UI uses points (pt).
 *
 * Conversion (CSS absolute): 1pt = 96/72 px = 4/3 px
 * Documented for Creative Studio Rescue.
 */

export const PT_TO_PX = 96 / 72;
export const PX_TO_PT = 72 / 96;

export const POINT_SIZE_PRESETS = [
  8, 10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60,
] as const;

export const POINT_SIZE_MIN = 6;
export const POINT_SIZE_MAX = 120;

export function ptToPx(pt: number): number {
  return Math.round(pt * PT_TO_PX * 100) / 100;
}

export function pxToPt(px: number): number {
  return Math.round(px * PX_TO_PT * 100) / 100;
}

export function clampPointSize(pt: number): number {
  if (!Number.isFinite(pt)) return 16;
  return Math.min(POINT_SIZE_MAX, Math.max(POINT_SIZE_MIN, Math.round(pt)));
}

export function formatPointSize(pt: number): string {
  return `${clampPointSize(pt)} pt`;
}

/** Map legacy preset tokens to approximate points for migration display. */
export const PRESET_TO_PT: Record<string, number> = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  "2xl": 24,
  "3xl": 30,
};

export function resolvePointSize(input: {
  fontSizePx?: number | null;
  fontSize?: string | null;
  fallbackPt?: number;
}): number {
  if (typeof input.fontSizePx === "number" && input.fontSizePx > 0) {
    return clampPointSize(pxToPt(input.fontSizePx));
  }
  if (input.fontSize && PRESET_TO_PT[input.fontSize]) {
    return PRESET_TO_PT[input.fontSize];
  }
  return input.fallbackPt ?? 16;
}
