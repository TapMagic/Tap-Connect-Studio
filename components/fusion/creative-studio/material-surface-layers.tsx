"use client";

import type { CSSProperties } from "react";
import type { MaterialSurfaceDescriptor } from "@/lib/fusion/creative-studio/material-surface";

type Props = {
  surface: MaterialSurfaceDescriptor;
  /** Optional clip for Badge silhouettes etc. */
  clipPath?: string;
  testIdPrefix?: string;
};

/**
 * Shared Material overlay layers — highlight/specular + shine + (optional) bevel wash.
 * Used by Material tiles and authored Button/Badge/backing surfaces so previews cannot drift.
 */
export function MaterialSurfaceLayers({ surface, clipPath, testIdPrefix = "material" }: Props) {
  const clipStyle: CSSProperties | undefined = clipPath ? { clipPath } : undefined;
  return (
    <>
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
