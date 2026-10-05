import type { CSSProperties } from "react";
import type { CreativeCompositionBlock } from "../composition";

type CompositionBackground = NonNullable<CreativeCompositionBlock["background"]>;

function alphaColor(color: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${Math.round(clamped * 255).toString(16).padStart(2, "0")}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(clamped * 100)}%, transparent)`;
}

/**
 * Canonical image-Surface projection shared by Studio, Preview, Live Device,
 * and public Card shells. The caller owns clipping/inset geometry; this helper
 * owns responsive fit, focal intent, non-destructive treatment, and opacity.
 */
export function cardSurfaceImageLayerStyle(
  background: CompositionBackground | null | undefined,
): CSSProperties | null {
  if (background?.kind !== "image" || !background.image?.src) return null;
  const image = background.image;
  const scale = Math.max(.5, Math.min(3, image.scale || 1));
  const blurScale = (image.blur || 0) > 0 ? 1 + Math.min(image.blur || 0, 20) / 100 : 1;
  const overlay = image.overlayColor && (image.overlayOpacity || 0) > 0
    ? `linear-gradient(${alphaColor(image.overlayColor, image.overlayOpacity || 0)},${alphaColor(image.overlayColor, image.overlayOpacity || 0)}),`
    : "";
  return {
    backgroundColor: "#0b0f19",
    backgroundImage: `${overlay}url("${image.src.replaceAll('"', "%22")}")`,
    backgroundSize: image.fit === "fill" ? "100% 100%" : image.fit === "original" ? "auto" : image.fit,
    backgroundPosition: `${image.focalX * 100}% ${image.focalY * 100}%`,
    backgroundRepeat: image.repeat,
    backgroundBlendMode: image.blendMode || "normal",
    opacity: background.opacity ?? 1,
    filter: [
      `blur(${image.blur || 0}px)`,
      `brightness(${image.brightness || 1})`,
      `contrast(${image.contrast || 1})`,
      `saturate(${background.saturation ?? 1})`,
      `brightness(${background.brightness ?? 1})`,
      `contrast(${background.contrast ?? 1})`,
    ].join(" "),
    transform: scale !== 1 || blurScale !== 1 ? `scale(${scale * blurScale})` : undefined,
    transformOrigin: `${image.focalX * 100}% ${image.focalY * 100}%`,
  };
}
