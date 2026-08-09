/**
 * Shared Visual Plane authority — one fill model, three targets:
 * page (Card background) · surface (Section) · container (nested plane).
 */

import type { CSSProperties } from "react";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import type {
  CreativeCompositionBlock,
  CreativeCompositionNode,
} from "@/lib/fusion/creative-studio/composition";
import {
  compositionBackgroundToFill,
  creativeFillToCompositionBackground,
} from "@/lib/fusion/creative-platform/composition-adapter";
import { creativeFillToStyle } from "@/lib/fusion/creative-platform/render";
import type {
  BackgroundImageTreatment,
  CreativeFill,
} from "@/lib/fusion/creative-platform/model";
import { DEFAULT_IMAGE_TREATMENT } from "@/lib/fusion/creative-platform/model";
import {
  DEFAULT_SURFACE_PATTERN,
  SURFACE_PATTERN_CATALOG,
  type SurfacePatternModel,
} from "@/lib/fusion/creative-studio/patterns";

export type VisualPlaneTarget = "page" | "surface" | "container";
export type VisualPlane = CreativeFill;

export const VISUAL_PLANE_LABELS: Record<VisualPlaneTarget, string> = {
  page: "Card / Background",
  surface: "Surface / Background",
  container: "Container / Background",
};

export const DEFAULT_BACKGROUND_TREATMENT: BackgroundImageTreatment = {
  focalPoint: DEFAULT_IMAGE_TREATMENT.focalPoint,
  fit: "cover",
  scale: 1,
  position: DEFAULT_IMAGE_TREATMENT.position,
  opacity: 1,
  altText: "",
  decorative: true,
  repeat: "no-repeat",
  blurPx: 0,
  overlayOpacity: 0,
  blendMode: "normal",
};

export function visualPlaneToStyle(plane: VisualPlane): CSSProperties {
  return creativeFillToStyle(plane);
}

export function emptyVisualPlane(): VisualPlane {
  return { kind: "none" };
}

export function solidVisualPlane(color: string): VisualPlane {
  return { kind: "solid", color };
}

export function patternVisualPlane(
  patternId: string,
  kind: "pattern" | "texture",
  options?: Partial<SurfacePatternModel>
): VisualPlane {
  const definition = SURFACE_PATTERN_CATALOG.find((item) => item.id === patternId);
  const pattern: SurfacePatternModel = {
    ...DEFAULT_SURFACE_PATTERN,
    id: patternId,
    kind: definition?.kind || kind,
    ...options,
  };
  const resolvedKind =
    kind === "texture" || definition?.kind === "texture" ? "texture" : "pattern";
  return resolvedKind === "texture"
    ? { kind: "texture", pattern }
    : { kind: "pattern", pattern };
}

/** Tile a durable logo/media asset as a Pattern Source (shared pattern engine). */
export function repeatingMediaPatternPlane(input: {
  url: string;
  mediaAssetId?: string;
  scale?: number;
  opacity?: number;
  tint?: string;
}): VisualPlane {
  return {
    kind: "image",
    media: {
      mediaAssetId: input.mediaAssetId || input.url,
      fallbackUrl: input.url,
    },
    treatment: {
      ...DEFAULT_BACKGROUND_TREATMENT,
      fit: "contain",
      scale: input.scale ?? 0.22,
      repeat: "repeat",
      opacity: input.opacity ?? 0.35,
      tint: input.tint,
      overlayOpacity: input.tint ? 0.15 : 0,
      decorative: true,
      altText: "Repeating brand pattern",
    },
  };
}

export function photographyVisualPlane(input: {
  url: string;
  mediaAssetId?: string;
  fit?: BackgroundImageTreatment["fit"];
  overlayOpacity?: number;
  tint?: string;
}): VisualPlane {
  return {
    kind: "image",
    media: {
      mediaAssetId: input.mediaAssetId || input.url,
      fallbackUrl: input.url,
    },
    treatment: {
      ...DEFAULT_BACKGROUND_TREATMENT,
      fit: input.fit || "cover",
      overlayOpacity: input.overlayOpacity ?? 0.2,
      tint: input.tint || "#000000",
      decorative: true,
      altText: "Background photography",
    },
  };
}

export function readPageVisualPlane(config: TapConnectCardConfig): VisualPlane {
  const root = config.rootComposition as CreativeCompositionBlock | undefined;
  return compositionBackgroundToFill(root?.background);
}

export function writePageVisualPlane(
  config: TapConnectCardConfig,
  plane: VisualPlane
): Partial<TapConnectCardConfig> {
  const root = (config.rootComposition || {
    version: 1,
    id: "card-root-composition",
    label: "Card Elements",
    nodes: [],
    background: { kind: "none" },
    mobileFallback: "scale",
    safeAreaPaddingPx: 12,
  }) as CreativeCompositionBlock;
  return {
    rootComposition: {
      ...root,
      background: creativeFillToCompositionBackground(plane),
    },
  };
}

export function readSurfaceVisualPlane(section: TapCardSection): VisualPlane {
  if (section.surfaceVisualPlane && typeof section.surfaceVisualPlane === "object") {
    return section.surfaceVisualPlane as VisualPlane;
  }
  const kind = section.surfaceBackgroundKind || "transparent";
  if (kind === "transparent") return { kind: "none" };
  if (kind === "solid") {
    return { kind: "solid", color: section.backgroundColor || "#0b0f19" };
  }
  if (kind === "gradient") {
    return {
      kind: "gradient",
      gradient: {
        version: 1,
        kind: "linear",
        angle: section.surfaceGradientAngle ?? 135,
        centerX: 50,
        centerY: 50,
        stops: [
          {
            id: "a",
            color: section.surfaceGradientStart || "#111827",
            position: 0,
            opacity: 1,
          },
          {
            id: "b",
            color: section.surfaceGradientEnd || "#0b0f19",
            position: 100,
            opacity: 1,
          },
        ],
      },
    };
  }
  if (kind === "image" && section.backgroundImageUrl) {
    return {
      kind: "image",
      media: {
        mediaAssetId: section.backgroundMediaAssetId || section.backgroundImageUrl,
        fallbackUrl: section.backgroundImageUrl,
      },
      treatment: {
        ...DEFAULT_BACKGROUND_TREATMENT,
        fit: (section.backgroundFit as "cover" | "contain" | "fill") || "cover",
        overlayOpacity: section.overlayOpacity ?? 0,
        tint: section.overlayColor,
        decorative: true,
      },
    };
  }
  if (kind === "pattern" || kind === "texture") {
    const id =
      kind === "pattern"
        ? mapLegacySurfacePattern(section.surfacePattern)
        : mapLegacySurfaceTexture(section.surfaceTexture);
    return patternVisualPlane(id, kind === "texture" ? "texture" : "pattern", {
      foreground: section.overlayColor || "#ffffff",
      background: section.backgroundColor || "#0b0f19",
      opacity: 0.28,
    });
  }
  return { kind: "none" };
}

export function writeSurfaceVisualPlane(plane: VisualPlane): Partial<TapCardSection> {
  const base: Partial<TapCardSection> = {
    surfaceVisualPlane: plane,
  };
  if (plane.kind === "none") {
    return {
      ...base,
      surfaceBackgroundKind: "transparent",
      backgroundColor: undefined,
      backgroundImageUrl: undefined,
      backgroundMediaAssetId: undefined,
    };
  }
  if (plane.kind === "solid") {
    return {
      ...base,
      surfaceBackgroundKind: "solid",
      backgroundColor: plane.color,
      backgroundImageUrl: undefined,
      backgroundMediaAssetId: undefined,
    };
  }
  if (plane.kind === "gradient") {
    return {
      ...base,
      surfaceBackgroundKind: "gradient",
      surfaceGradientStart: plane.gradient.stops[0]?.color,
      surfaceGradientEnd:
        plane.gradient.stops[plane.gradient.stops.length - 1]?.color,
      surfaceGradientAngle: plane.gradient.angle,
      backgroundImageUrl: undefined,
    };
  }
  if (plane.kind === "image") {
    return {
      ...base,
      surfaceBackgroundKind: "image",
      backgroundImageUrl: plane.media.fallbackUrl,
      backgroundMediaAssetId: plane.media.mediaAssetId,
      backgroundFit: plane.treatment.fit,
      overlayColor: plane.treatment.tint,
      overlayOpacity: plane.treatment.overlayOpacity,
    };
  }
  return {
    ...base,
    surfaceBackgroundKind: plane.kind,
    backgroundColor: plane.pattern.background,
    overlayColor: plane.pattern.foreground,
    surfacePattern: plane.kind === "pattern" ? "grid" : undefined,
    surfaceTexture: plane.kind === "texture" ? "paper" : undefined,
  };
}

export function readContainerVisualPlane(node: CreativeCompositionNode): VisualPlane {
  const stored = node.props.visualPlane as VisualPlane | undefined;
  if (stored && typeof stored === "object" && "kind" in stored) return stored;
  if (node.props.gradientStart && node.props.gradientEnd) {
    return {
      kind: "gradient",
      gradient: {
        version: 1,
        kind: "linear",
        angle: Number(node.props.gradientAngle || 145),
        centerX: 50,
        centerY: 50,
        stops: [
          {
            id: "a",
            color: String(node.props.gradientStart),
            position: 0,
            opacity: 1,
          },
          {
            id: "b",
            color: String(node.props.gradientEnd),
            position: 100,
            opacity: 1,
          },
        ],
      },
    };
  }
  if (
    typeof node.props.fill === "string" &&
    node.props.fill &&
    node.props.fill !== "transparent"
  ) {
    return { kind: "solid", color: node.props.fill };
  }
  if (typeof node.props.texture === "string" && node.props.texture) {
    return patternVisualPlane(String(node.props.texture), "texture", {
      background:
        typeof node.props.fill === "string" ? node.props.fill : "#1f2937",
    });
  }
  return { kind: "none" };
}

export function writeContainerVisualPlane(plane: VisualPlane): Record<string, unknown> {
  if (plane.kind === "none") {
    return {
      visualPlane: plane,
      fill: "transparent",
      gradientStart: undefined,
      gradientEnd: undefined,
      gradientFill: undefined,
      texture: undefined,
      backgroundImageUrl: undefined,
    };
  }
  if (plane.kind === "solid") {
    return {
      visualPlane: plane,
      fill: plane.color,
      gradientStart: undefined,
      gradientEnd: undefined,
      gradientFill: undefined,
      texture: undefined,
    };
  }
  if (plane.kind === "gradient") {
    return {
      visualPlane: plane,
      fill: undefined,
      gradientStart: plane.gradient.stops[0]?.color,
      gradientEnd: plane.gradient.stops[plane.gradient.stops.length - 1]?.color,
      gradientAngle: plane.gradient.angle,
      texture: undefined,
    };
  }
  if (plane.kind === "image") {
    return {
      visualPlane: plane,
      fill: undefined,
      backgroundImageUrl: plane.media.fallbackUrl,
      mediaAssetId: plane.media.mediaAssetId,
      surfaceFillKind: "image",
      texture: undefined,
    };
  }
  return {
    visualPlane: plane,
    fill: plane.pattern.background,
    gradientStart: undefined,
    gradientEnd: undefined,
    gradientFill: undefined,
    gradientAngle: undefined,
    texture: plane.pattern.id,
    surfaceFillKind: plane.kind,
    backgroundImageUrl: undefined,
  };
}

function mapLegacySurfacePattern(value: string | undefined): string {
  if (value === "dots") return "dots";
  if (value === "diagonal") return "pinstripes";
  return "editorial-grid";
}

function mapLegacySurfaceTexture(value: string | undefined): string {
  if (value === "paper") return "paper-fiber";
  if (value === "fabric") return "linen";
  return "subtle-grain";
}
