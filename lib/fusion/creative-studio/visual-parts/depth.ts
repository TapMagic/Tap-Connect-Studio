/**
 * Relational depth model — objects look staged above/within Surface.
 * Not a single generic box-shadow; not MaterialRecipe.depth.
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

const LEVEL: Record<VisualDepthLevel, DepthDescriptor> = {
  0: { level: 0, elevationPx: 0, zIndex: 0 },
  1: {
    level: 1,
    castShadow: "0 18px 40px rgba(0,0,0,.35)",
    insetShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
    elevationPx: 4,
    zIndex: 1,
  },
  2: {
    level: 2,
    castShadow: "0 10px 22px rgba(0,0,0,.4), 0 2px 4px rgba(0,0,0,.35)",
    contactShadow: "0 1px 0 rgba(0,0,0,.45)",
    rimLight: "inset 0 1px 0 rgba(255,255,255,.18)",
    elevationPx: 8,
    zIndex: 2,
  },
  3: {
    level: 3,
    castShadow: "0 12px 24px rgba(0,0,0,.42), 0 3px 6px rgba(0,0,0,.28)",
    contactShadow: "0 2px 0 rgba(0,0,0,.35)",
    rimLight: "inset 0 1px 0 rgba(255,255,255,.22)",
    elevationPx: 12,
    zIndex: 3,
  },
  4: {
    level: 4,
    castShadow: "0 4px 10px rgba(0,0,0,.45)",
    contactShadow: "0 1px 0 rgba(0,0,0,.4)",
    rimLight: "inset 0 1px 0 rgba(255,255,255,.25)",
    elevationPx: 14,
    zIndex: 4,
  },
  5: {
    level: 5,
    castShadow: "0 2px 6px rgba(0,0,0,.35)",
    elevationPx: 16,
    zIndex: 5,
  },
};

export function depthDescriptor(level: VisualDepthLevel): DepthDescriptor {
  return LEVEL[level];
}

/** Compose CSS box-shadow from relational depth (Mount casts onto Surface, etc.). */
export function composeDepthShadow(
  level: VisualDepthLevel,
  intensity = 1
): string {
  const d = depthDescriptor(level);
  const parts = [d.castShadow, d.contactShadow, d.insetShadow, d.rimLight].filter(Boolean) as string[];
  if (!parts.length || intensity <= 0) return "none";
  if (intensity >= 0.99) return parts.join(", ");
  // Intensity scales opacity tokens lightly by repeating; keep simple for proof.
  return parts.join(", ");
}

export function depthZIndex(level: VisualDepthLevel): number {
  return depthDescriptor(level).zIndex;
}
