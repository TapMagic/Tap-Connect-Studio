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
 * Finish feeds these channels via props.highlight / shine — not a parallel paint path.
 */
export function MaterialSurfaceLayers({ surface, clipPath, testIdPrefix = "material" }: Props) {
  const clipStyle: CSSProperties | undefined = clipPath ? { clipPath } : undefined;
  const texture = textureLayerStyle(surface);
  const microSurface =
    surface.textureToken === "hammered" || surface.textureToken === "brushed"
      ? ({
          backgroundImage:
            "radial-gradient(circle at 20% 30%,#ffffff18 0 0.8px,transparent 1.4px), radial-gradient(circle at 70% 60%,#00000022 0 1px,transparent 1.6px)",
          backgroundSize: "7px 7px, 9px 9px",
          opacity: 0.55,
          mixBlendMode: "overlay" as const,
        } satisfies CSSProperties)
      : null;
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
      {microSurface ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          data-testid={`${testIdPrefix}-micro-surface`}
          style={{ ...microSurface, ...clipStyle }}
        />
      ) : null}
      {surface.highlight ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          data-testid={`${testIdPrefix}-highlight`}
          data-material-response-channel="highlight"
          style={{ background: surface.highlight, ...clipStyle }}
        />
      ) : null}
      {surface.shine ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent"
          data-testid={`${testIdPrefix}-shine`}
          data-material-response-channel="shine"
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
