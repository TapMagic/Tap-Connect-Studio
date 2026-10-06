export type ExperienceNavigationComposition = {
  tier: "single" | "paired" | "clustered" | "balanced" | "full";
  clusterWidthPercent: number;
  standardIconSizePx: number;
};

export type LoveAndTheftNavigationArtwork = {
  tier: "large" | "medium" | "compact";
  layoutWidthPx: number;
  visualScale: number;
};

/**
 * Shared shell rhythm for a visible Page count. The item slot remains the
 * accessible hit area; family artwork is sized independently by its renderer.
 */
export function resolveExperienceNavigationComposition(visibleSlotCount: number): ExperienceNavigationComposition {
  const count = Math.max(1, Math.floor(visibleSlotCount));
  if (count === 1) return { tier: "single", clusterWidthPercent: 44, standardIconSizePx: 21 };
  if (count === 2) return { tier: "paired", clusterWidthPercent: 62, standardIconSizePx: 21 };
  if (count === 3) return { tier: "clustered", clusterWidthPercent: 78, standardIconSizePx: 20 };
  if (count === 4) return { tier: "balanced", clusterWidthPercent: 90, standardIconSizePx: 19 };
  return { tier: "full", clusterWidthPercent: 100, standardIconSizePx: 18 };
}

/** Love & Theft owns pick geometry; the shared count rule above does not. */
export function resolveLoveAndTheftNavigationArtwork(visibleSlotCount: number): LoveAndTheftNavigationArtwork {
  const count = Math.max(1, Math.floor(visibleSlotCount));
  if (count <= 3) return { tier: "large", layoutWidthPx: 53, visualScale: 1.18 };
  if (count === 4) return { tier: "medium", layoutWidthPx: 48, visualScale: 1.17 };
  return { tier: "compact", layoutWidthPx: 44, visualScale: 1.13 };
}
