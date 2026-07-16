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
  sortOrder: number;
  enabled: boolean;
};

export function defaultImageFraming() {
  return {
    imageFit: "cover" as const,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
    imagePanelPercent: 38,
  };
}
