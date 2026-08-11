/**
 * Relational depth — spatial staging between composition layers.
 * Distinct from Effects (decorative) and Material (surface response).
 * Intensity is continuous and must change pixels.
 */

export type VisualDepthLevel =
  | 0 // Page / Environment
  | 1 // Surface / Stage
  | 2 // Mount / Backplate
  | 3 // Core Action
  | 4 // Icon Station / Medallion / Trim
  | 5; // Accent / Ornament

export type DepthDescriptor = Readonly<{
  level: VisualDepthLevel;
  contactShadow?: string;
  castShadow?: string;
  insetShadow?: string;
  rimLight?: string;
  elevationPx: number;
  zIndex: number;
}>;

type ShadowRecipe = {
  cast?: { y: number; blur: number; spread: number; a: number };
  contact?: { y: number; blur: number; a: number };
  inset?: { y: number; blur: number; a: number };
  rim?: { a: number };
  elevationPx: number;
  zIndex: number;
};

const RECIPE: Record<VisualDepthLevel, ShadowRecipe> = {
  0: { elevationPx: 0, zIndex: 0 },
  1: {
    cast: { y: 14, blur: 32, spread: 0, a: 0.28 },
    // Inset must remain pixel-visible when cast/contact are clipped by overflow surfaces.
    inset: { y: 2, blur: 12, a: 0.16 },
    elevationPx: 4,
    zIndex: 1,
  },
  2: {
    cast: { y: 10, blur: 22, spread: 0, a: 0.4 },
    contact: { y: 1, blur: 0, a: 0.45 },
    rim: { a: 0.18 },
    elevationPx: 8,
    zIndex: 2,
  },
  3: {
    cast: { y: 12, blur: 24, spread: 0, a: 0.42 },
    contact: { y: 2, blur: 0, a: 0.35 },
    rim: { a: 0.22 },
    elevationPx: 12,
    zIndex: 3,
  },
  4: {
    cast: { y: 4, blur: 10, spread: 0, a: 0.45 },
    contact: { y: 1, blur: 0, a: 0.4 },
    rim: { a: 0.25 },
    elevationPx: 14,
    zIndex: 4,
  },
  5: {
    cast: { y: 2, blur: 6, spread: 0, a: 0.35 },
    elevationPx: 16,
    zIndex: 5,
  },
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function rgba(a: number) {
  return `rgba(0,0,0,${Math.min(0.95, Math.max(0, a)).toFixed(3)})`;
}

function rgbaWhite(a: number) {
  return `rgba(255,255,255,${Math.min(0.95, Math.max(0, a)).toFixed(3)})`;
}

export function depthDescriptor(level: VisualDepthLevel, intensity = 1): DepthDescriptor {
  const i = clamp01(intensity);
  const r = RECIPE[level];
  const elevScale = 0.35 + i * 0.65;
  const blurScale = 0.45 + i * 0.55;
  const alphaScale = i;
  const cast = r.cast
    ? `0 ${Math.round(r.cast.y * elevScale)}px ${Math.round(r.cast.blur * blurScale)}px ${
        r.cast.spread ? `${Math.round(r.cast.spread * elevScale)}px ` : ""
      }${rgba(r.cast.a * alphaScale)}`
    : undefined;
  const contact = r.contact
    ? `0 ${Math.max(1, Math.round(r.contact.y * elevScale))}px ${Math.round(r.contact.blur)}px ${rgba(
        r.contact.a * alphaScale
      )}`
    : undefined;
  const inset = r.inset
    ? `inset 0 ${Math.max(1, Math.round(r.inset.y * elevScale))}px ${Math.max(
        0,
        Math.round(r.inset.blur * blurScale)
      )}px ${rgba(r.inset.a * (0.45 + i * 0.55))}`
    : undefined;
  const rimLight = r.rim
    ? `inset 0 1px 0 ${rgbaWhite(r.rim.a * (0.35 + i * 0.65))}`
    : undefined;
  return {
    level,
    castShadow: cast,
    contactShadow: contact,
    insetShadow: inset,
    rimLight,
    elevationPx: Math.round(r.elevationPx * elevScale),
    zIndex: r.zIndex,
  };
}

/** Compose CSS box-shadow from relational depth. Intensity continuously scales pixels. */
export function composeDepthShadow(level: VisualDepthLevel, intensity = 1): string {
  const i = clamp01(intensity);
  if (i <= 0.001) return "none";
  const d = depthDescriptor(level, i);
  const parts = [d.castShadow, d.contactShadow, d.insetShadow, d.rimLight].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "none";
}

export function depthZIndex(level: VisualDepthLevel): number {
  return RECIPE[level].zIndex;
}

/** Map Host 0–1 surface/relational depth to a continuous intensity for a given level. */
export function depthIntensityFromHost(hostDepth: number | null | undefined, fallback = 0.55): number {
  if (hostDepth == null || Number.isNaN(Number(hostDepth))) return fallback;
  return clamp01(Number(hostDepth));
}
