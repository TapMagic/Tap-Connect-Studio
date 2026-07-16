/** Shared shape for landing “Built for the physical world” tiles. */

export type LandingUseCaseTile = {
  id: string;
  industry: string;
  image: string;
  imageAlt: string;
  tap: string;
  opens: string;
  action: string;
  captures: string;
  imageFit: "cover" | "contain";
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
  imagePanelPercent: number;
  glowColor: string;
  sortOrder: number;
  enabled: boolean;
};

export const DEFAULT_GLOW_COLOR = "#3b82f6";

export function defaultImageFraming() {
  return {
    imageFit: "cover" as const,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
    imagePanelPercent: 38,
    glowColor: DEFAULT_GLOW_COLOR,
  };
}

/** Parse #rgb / #rrggbb into rgba() for glow borders. */
export function glowToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(59, 130, 246, ${alpha})`;
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
