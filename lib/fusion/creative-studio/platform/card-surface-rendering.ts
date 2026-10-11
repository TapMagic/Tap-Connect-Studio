import type { CSSProperties } from "react";
import type { CreativeCompositionBlock } from "../composition";

type CompositionBackground = NonNullable<CreativeCompositionBlock["background"]>;

export type CardSurfaceImagePresentation = "cover_page" | "viewport_immersive" | "focal_cover" | "ambient_extend" | "tile";

export const CARD_SURFACE_IMAGE_PRESENTATIONS: ReadonlyArray<{
  id: CardSurfaceImagePresentation;
  label: string;
  description: string;
}> = [
  {
    id: "cover_page",
    label: "Cover Page",
    description: "One image covers the full authored Page.",
  },
  {
    id: "viewport_immersive",
    label: "Viewport Immersive",
    description: "The image stays anchored while content scrolls.",
  },
  {
    id: "focal_cover",
    label: "Focal Cover",
    description: "Cover with focal point and zoom emphasized.",
  },
  {
    id: "ambient_extend",
    label: "Ambient Extend",
    description: "A softened extension fills extreme aspect ratios.",
  },
  {
    id: "tile",
    label: "Tile",
    description: "Explicit repeating specialty treatment.",
  },
];

export function cardSurfaceImagePresentation(background: CompositionBackground | null | undefined): CardSurfaceImagePresentation {
  if (background?.kind !== "image" || !background.image) return "cover_page";
  // Preserve the established fixed, full-bleed behavior of legacy documents.
  return background.image.presentationMode ?? "viewport_immersive";
}

export function cardSurfaceImageUsesViewportAnchor(background: CompositionBackground | null | undefined): boolean {
  return cardSurfaceImagePresentation(background) === "viewport_immersive";
}

function alphaColor(color: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${Math.round(clamped * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(clamped * 100)}%, transparent)`;
}

/**
 * Canonical image-Surface projection shared by Studio, Preview, Live Device,
 * and public Card shells. The caller owns clipping/inset geometry; this helper
 * owns responsive fit, focal intent, non-destructive treatment, and opacity.
 */
export function cardSurfaceImageLayerStyle(background: CompositionBackground | null | undefined, layer: "primary" | "ambient" = "primary"): CSSProperties | null {
  if (background?.kind !== "image" || !background.image?.src) return null;
  const image = background.image;
  const presentation = cardSurfaceImagePresentation(background);
  const scale = Math.max(0.5, Math.min(3, image.scale || 1));
  const ambient = presentation === "ambient_extend" && layer === "ambient";
  const tile = presentation === "tile";
  const blur = ambient ? Math.max(24, image.blur || 0) : image.blur || 0;
  const blurScale = blur > 0 ? 1 + Math.min(blur, 30) / 100 : 1;
  const overlay = image.overlayColor && (image.overlayOpacity || 0) > 0 ? `linear-gradient(${alphaColor(image.overlayColor, image.overlayOpacity || 0)},${alphaColor(image.overlayColor, image.overlayOpacity || 0)}),` : "";
  return {
    backgroundColor: "#0b0f19",
    backgroundImage: `${overlay}url("${image.src.replaceAll('"', "%22")}")`,
    backgroundSize: tile ? `${Math.max(10, Math.min(100, Math.round(scale * 100)))}% auto` : ambient ? "cover" : presentation === "ambient_extend" ? "contain" : image.fit === "fill" ? "100% 100%" : image.fit === "original" ? "auto" : image.fit,
    backgroundPosition: `${image.focalX * 100}% ${image.focalY * 100}%`,
    backgroundRepeat: tile ? "repeat" : "no-repeat",
    backgroundBlendMode: image.blendMode || "normal",
    opacity: ambient ? Math.min(0.82, background.opacity ?? 1) : (background.opacity ?? 1),
    filter: [`blur(${blur}px)`, `brightness(${image.brightness || 1})`, `contrast(${image.contrast || 1})`, `saturate(${background.saturation ?? 1})`, `brightness(${background.brightness ?? 1})`, `contrast(${background.contrast ?? 1})`].join(" "),
    transform: tile ? undefined : scale !== 1 || blurScale !== 1 ? `scale(${scale * blurScale})` : undefined,
    transformOrigin: `${image.focalX * 100}% ${image.focalY * 100}%`,
  };
}
