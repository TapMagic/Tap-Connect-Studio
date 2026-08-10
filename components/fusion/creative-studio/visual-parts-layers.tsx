"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  readVisualPartsState,
  resolveAccentDescriptor,
  resolveRimDescriptor,
  visualPartsDataAttrs,
} from "@/lib/fusion/creative-studio/visual-parts";

type Props = {
  props: Record<string, unknown>;
  radius: string | number;
  children: ReactNode;
  testIdPrefix?: string;
};

/**
 * Shared Visual Parts overlays (rim + accents) for Button / frame / Action Surface.
 * Edit, Preview, and Public share this component — no Signature-only renderer.
 */
export function VisualPartsShell({ props, radius, children, testIdPrefix = "vp" }: Props) {
  const state = readVisualPartsState(props);
  const rim = resolveRimDescriptor(state);
  const accent = resolveAccentDescriptor(state);
  const attrs = visualPartsDataAttrs(props);
  const position = state.iconStationPosition || "left";

  if (!rim && !accent) {
    return (
      <span className="relative block h-full w-full" {...attrs}>
        {children}
      </span>
    );
  }

  return (
    <span
      className="relative block h-full w-full"
      {...attrs}
      data-testid={`${testIdPrefix}-shell`}
      style={
        rim
          ? ({
              padding: rim.rimWidthPx,
              borderRadius: radius,
              background: rim.background,
              boxShadow: rim.copperFamily
                ? "inset 0 2px 0 rgba(255,236,200,.55), inset 0 -3px 4px rgba(30,8,2,.65), 0 0 0 1px rgba(70,28,8,.55), 0 10px 18px rgba(0,0,0,.35)"
                : "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 2px rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.28)",
            } satisfies CSSProperties)
          : undefined
      }
    >
      {rim ? (
        <span aria-hidden data-testid={`${testIdPrefix}-rim`} data-vp-rim-part={rim.partId} className="sr-only">
          {rim.partId}
        </span>
      ) : null}
      <span
        className="relative block h-full w-full overflow-hidden"
        style={{ borderRadius: radius }}
      >
        {children}
      </span>
      {accent ? (
        <>
          {(position === "left" || position === "both") && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-[3]"
              data-testid={`${testIdPrefix}-accent-left`}
              data-vp-accent-part={accent.partId}
              style={{ left: 2, top: -4, width: 28, height: 28 } satisfies CSSProperties}
              dangerouslySetInnerHTML={{ __html: accent.svg }}
            />
          )}
          {(position === "right" || position === "both") && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-[3]"
              data-testid={`${testIdPrefix}-accent-right`}
              data-vp-accent-part={accent.partId}
              style={{ right: 2, bottom: -4, width: 28, height: 28, transform: "scaleX(-1)" } satisfies CSSProperties}
              dangerouslySetInnerHTML={{ __html: accent.svg }}
            />
          )}
        </>
      ) : null}
    </span>
  );
}

export function IconStationShell({
  props,
  children,
  testIdPrefix = "vp-icon-station",
}: {
  props: Record<string, unknown>;
  children: ReactNode;
  testIdPrefix?: string;
}) {
  const state = readVisualPartsState(props);
  const geometryId = state.iconStationGeometryPartId;
  if (!geometryId) return <>{children}</>;
  const shape = String(props.iconStationShape || "round");
  const clip = typeof props.iconStationClipPath === "string" ? props.iconStationClipPath : undefined;
  const mediaUrl = typeof props.iconMediaUrl === "string" ? props.iconMediaUrl : "";
  const fit = String(props.iconMediaFit || "cover");

  return (
    <span
      className="relative grid place-items-center overflow-hidden"
      data-testid={testIdPrefix}
      data-vp-icon-station-geometry={geometryId}
      data-vp-icon-station-shape={shape}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: shape === "round" ? "50%" : 8,
        clipPath: shape === "faceted" ? clip : undefined,
        background: "radial-gradient(circle at 35% 28%, #3a3a44, #0a0a0d 62%, #000)",
        boxShadow:
          "0 0 0 2px #8a4a22, 0 0 0 3px #3a1a0c, inset 0 2px 4px rgba(255,255,255,.12), inset 0 -4px 8px rgba(0,0,0,.7)",
      }}
    >
      {mediaUrl ? (
        // Host-owned upload inside TapConnect craft frame
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt=""
          data-testid={`${testIdPrefix}-media`}
          style={{ width: "100%", height: "100%", objectFit: fit as CSSProperties["objectFit"] }}
        />
      ) : (
        children
      )}
    </span>
  );
}
