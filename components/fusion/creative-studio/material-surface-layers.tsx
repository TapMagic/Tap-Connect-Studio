"use client";

import type { CSSProperties } from "react";
import type { MaterialSurfaceDescriptor } from "@/lib/fusion/creative-studio/material-surface";
import {
  surfacePatternFromTextureToken,
  surfacePatternStyle,
} from "@/lib/fusion/creative-studio/patterns";

type Props = {
  surface: MaterialSurfaceDescriptor;
  /** Optional clip for Badge silhouettes etc. */
  clipPath?: string;
  testIdPrefix?: string;
};

function textureLayerStyle(surface: MaterialSurfaceDescriptor): CSSProperties | null {
  if (!surface.textureToken) return null;
  const model = surfacePatternFromTextureToken(surface.textureToken, {
    background: "transparent",
    opacity: 0.32,
  });
  if (!model) return null;
  const style = surfacePatternStyle(model);
  return {
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundBlendMode: style.backgroundBlendMode as CSSProperties["backgroundBlendMode"],
  };
}

/**
 * Shared Material overlay layers — highlight/specular + shine + (optional) bevel wash.
 * Used by Material tiles and authored Button/Badge/backing surfaces so previews cannot drift.
 */
export function MaterialSurfaceLayers({ surface, clipPath, testIdPrefix = "material" }: Props) {
  const clipStyle: CSSProperties | undefined = clipPath ? { clipPath } : undefined;
  const texture = textureLayerStyle(surface);
  return (
    <>
      {texture ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          data-testid={`${testIdPrefix}-texture`}
          data-surface-texture={surface.textureToken || undefined}
          style={{ ...texture, ...clipStyle }}
        />
      ) : null}
      {surface.highlight ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          data-testid={`${testIdPrefix}-highlight`}
          style={{ background: surface.highlight, ...clipStyle }}
        />
      ) : null}
      {surface.shine ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent"
          data-testid={`${testIdPrefix}-shine`}
          style={clipStyle}
        />
      ) : null}
    </>
  );
}

/** Material catalog swatch — same fill + layers as applied targets. */
export function MaterialSurfaceSwatch({
  surface,
  className,
  testId,
}: {
  surface: MaterialSurfaceDescriptor;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      className={`relative block overflow-hidden ${className || ""}`}
      data-testid={testId}
      data-material-fill-authority={surface.fillAuthority}
      data-material-stop-count={String(surface.gradientStopCount)}
      data-material-texture={surface.textureToken || undefined}
      style={{
        background: surface.background,
        backgroundSize: surface.backgroundSize,
        boxShadow: surface.boxShadow,
        borderWidth: surface.borderWidth,
        borderStyle: surface.borderStyle as CSSProperties["borderStyle"],
        borderColor: surface.borderColor,
        opacity: surface.opacity,
      }}
    >
      <MaterialSurfaceLayers surface={surface} testIdPrefix="material-swatch" />
    </span>
  );
}
