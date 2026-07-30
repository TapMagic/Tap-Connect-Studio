import type { CSSProperties } from "react";
import { gradientToCss } from "@/lib/fusion/creative-studio/gradient";
import { surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";
import type {
  CreativeFill,
  CreativeOutline,
  ImageTreatment,
} from "@/lib/fusion/creative-platform/model";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function creativeFillToStyle(fill: CreativeFill): CSSProperties {
  if (fill.kind === "none") return { background: "transparent" };
  if (fill.kind === "solid") return { background: fill.color };
  if (fill.kind === "gradient") {
    return { background: gradientToCss(fill.gradient) };
  }
  if (fill.kind === "pattern" || fill.kind === "texture") {
    return surfacePatternStyle(fill.pattern);
  }
  const overlay =
    fill.treatment.tint && fill.treatment.overlayOpacity > 0
      ? `linear-gradient(color-mix(in srgb, ${fill.treatment.tint} ${
          fill.treatment.overlayOpacity * 100
        }%, transparent), color-mix(in srgb, ${fill.treatment.tint} ${
          fill.treatment.overlayOpacity * 100
        }%, transparent)), `
      : "";
  return {
    backgroundColor: "#0b0f19",
    backgroundImage: `${overlay}url("${fill.media.fallbackUrl.replace(/"/g, "%22")}")`,
    backgroundPosition: `${fill.treatment.focalPoint.x * 100}% ${
      fill.treatment.focalPoint.y * 100
    }%`,
    backgroundSize:
      fill.treatment.scale === 1
        ? fill.treatment.fit
        : `${fill.treatment.scale * 100}% auto`,
    backgroundRepeat: fill.treatment.repeat,
    backgroundBlendMode: fill.treatment.blendMode,
    opacity: fill.treatment.opacity,
    filter:
      fill.treatment.blurPx > 0
        ? `blur(${fill.treatment.blurPx}px)`
        : undefined,
  };
}

export function imageTreatmentToStyle(
  treatment: ImageTreatment
): CSSProperties {
  const adjustments = treatment.adjustments;
  const temperatureSepia = Math.max(0, adjustments.temperature) * 0.35;
  const coolHue = Math.max(0, -adjustments.temperature) * 18;
  const tintHue = adjustments.tint * 14;
  return {
    objectFit: treatment.fit,
    objectPosition: `${treatment.focalPoint.x * 100}% ${
      treatment.focalPoint.y * 100
    }%`,
    opacity: treatment.opacity,
    transform: [
      `translate(${(treatment.position.x - 0.5) * 200}%, ${
        (treatment.position.y - 0.5) * 200
      }%)`,
      `scale(${treatment.scale * (treatment.flipX ? -1 : 1)}, ${
        treatment.scale * (treatment.flipY ? -1 : 1)
      })`,
      `rotate(${treatment.rotationDeg}deg)`,
    ].join(" "),
    filter: [
      `brightness(${adjustments.brightness})`,
      `contrast(${adjustments.contrast})`,
      `saturate(${adjustments.saturation})`,
      `sepia(${temperatureSepia})`,
      `hue-rotate(${coolHue + tintHue}deg)`,
      `blur(${adjustments.blurPx}px)`,
    ].join(" "),
    clipPath: treatment.crop
      ? `inset(${treatment.crop.y * 100}% ${
          (1 - treatment.crop.x - treatment.crop.width) * 100
        }% ${(1 - treatment.crop.y - treatment.crop.height) * 100}% ${
          treatment.crop.x * 100
        }%)`
      : undefined,
  };
}

export function resolveOutlineWidthPx(input: {
  outline: CreativeOutline;
  currentShortEdgePx: number;
}): number {
  const { outline } = input;
  const requested =
    outline.scaleMode === "scale_with_object" && outline.baselineShortEdgePx
      ? outline.widthPx *
        (input.currentShortEdgePx / outline.baselineShortEdgePx)
      : outline.widthPx;
  return clamp(requested, 0, Math.max(0, input.currentShortEdgePx / 2 - 0.5));
}

export function creativeOutlineToStyle(input: {
  outline?: CreativeOutline;
  currentShortEdgePx: number;
}): CSSProperties {
  if (!input.outline || input.outline.widthPx <= 0) return {};
  const width = resolveOutlineWidthPx({
    outline: input.outline,
    currentShortEdgePx: input.currentShortEdgePx,
  });
  const color = hexToRgba(input.outline.color, input.outline.opacity);
  return {
    borderWidth: width,
    borderStyle: input.outline.style,
    borderColor: color,
    borderRadius: input.outline.radiusPx,
    boxSizing:
      input.outline.placement === "outside" ? "content-box" : "border-box",
    outline:
      input.outline.placement === "outside"
        ? `${width}px ${input.outline.style} ${color}`
        : undefined,
    outlineOffset:
      input.outline.placement === "outside" ? 0 : undefined,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
  return [
    Number.parseInt(safe.slice(1, 3), 16),
    Number.parseInt(safe.slice(3, 5), 16),
    Number.parseInt(safe.slice(5, 7), 16),
  ];
}

function hexToRgba(hex: string, opacity: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

export function suggestedReadableText(background: string): {
  color: "#000000" | "#ffffff";
  ratio: number;
} {
  const black = contrastRatio("#000000", background);
  const white = contrastRatio("#ffffff", background);
  return black >= white
    ? { color: "#000000", ratio: black }
    : { color: "#ffffff", ratio: white };
}
