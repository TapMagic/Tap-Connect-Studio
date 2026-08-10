/**
 * Reusable Signature ornament geometry (TapConnect-original).
 * Vector/SVG — not baked into Button bitmaps.
 */

export const COPPER_LEAVES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="tcCopperLeaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f3d0a8"/>
      <stop offset="45%" stop-color="#c56a2d"/>
      <stop offset="100%" stop-color="#3a1a0c"/>
    </linearGradient>
  </defs>
  <path fill="url(#tcCopperLeaf)" d="M12 40c8-18 22-28 40-32-2 18-10 34-28 44-4-2-8-6-12-12z"/>
  <path fill="url(#tcCopperLeaf)" opacity=".9" d="M8 28c10-8 22-10 34-8-6 10-14 18-26 22-4-2-6-8-8-14z"/>
  <path stroke="#f3d0a8" stroke-width="1.2" d="M14 42c10-8 18-18 22-30"/>
</svg>`;

export const COPPER_DIVIDER_ENDCAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path fill="#c56a2d" d="M8 30c6-14 16-22 32-26-2 14-8 26-22 34-4-2-7-5-10-8z"/>
  <path fill="#e8a56a" d="M6 22c9-6 18-6 28-3-6 8-12 12-22 14-3-2-5-6-6-11z"/>
</svg>`;

export function ornamentSvg(assetId: string): string {
  switch (assetId) {
    case "copper_leaves":
      return COPPER_LEAVES_SVG;
    case "copper_divider_endcap":
      return COPPER_DIVIDER_ENDCAP_SVG;
    default:
      return "";
  }
}

/** Faceted Icon Station clip (octagon-like). */
export const FACETED_STATION_CLIP =
  "polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%)";

/** Pounded Copper rim — shared CSS background for rim overlays (same part ID everywhere). */
export function poundedCopperRimBackground(): string {
  return [
    "radial-gradient(circle at 12% 28%, #f3d0a8 0 1px, transparent 2px)",
    "radial-gradient(circle at 28% 72%, #e8a56a 0 1.5px, transparent 3px)",
    "radial-gradient(circle at 47% 18%, #f3d0a8 0 1px, transparent 2px)",
    "radial-gradient(circle at 63% 78%, #c56a2d 0 2px, transparent 3px)",
    "radial-gradient(circle at 81% 30%, #e8a56a 0 1.5px, transparent 3px)",
    "radial-gradient(circle at 92% 65%, #f3d0a8 0 1px, transparent 2px)",
    "repeating-linear-gradient(118deg, transparent 0 3px, rgba(255,210,150,.08) 3px 4px)",
    "radial-gradient(140% 90% at 18% -10%, #f3d0a8, transparent 42%)",
    "radial-gradient(110% 80% at 88% 120%, #3a1a0c, transparent 48%)",
    "conic-gradient(from 200deg at 50% 50%, #5a2410, #e8a56a, #3a1a0c, #f3d0a8, #c56a2d, #2a1208, #d4894a, #5a2410)",
  ].join(",");
}
