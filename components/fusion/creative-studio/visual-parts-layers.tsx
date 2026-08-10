"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  composeDepthShadow,
  iconStationAnchorTransform,
  iconStationSizePx,
  readVisualPartsState,
  resolveAccentDescriptor,
  resolveIconStationBackingDescriptor,
  resolveMountDescriptor,
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
      <span className="relative block h-full w-full overflow-hidden" style={{ borderRadius: radius }}>
        {children}
      </span>
      {accent ? (
        <>
          {(position === "left" || position === "both") && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-[5]"
              data-testid={`${testIdPrefix}-accent-left`}
              data-vp-accent-part={accent.partId}
              style={{ left: 2, top: -4, width: 28, height: 28 } satisfies CSSProperties}
              dangerouslySetInnerHTML={{ __html: accent.svg }}
            />
          )}
          {(position === "right" || position === "both") && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-[5]"
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

/** Mount / Backplate between Surface and Core Action. */
export function MountShell({
  props,
  children,
  testIdPrefix = "vp-mount",
}: {
  props: Record<string, unknown>;
  children: ReactNode;
  testIdPrefix?: string;
}) {
  const state = readVisualPartsState(props);
  const mount = resolveMountDescriptor(state);
  if (!mount) return <>{children}</>;
  return (
    <span
      className="relative block h-full w-full"
      data-testid={testIdPrefix}
      data-vp-mount-part={mount.partId}
      data-vp-mount-style={mount.style}
      style={{
        padding: mount.paddingPx,
        borderRadius: mount.radius,
        background: mount.background,
        border: mount.border,
        boxShadow: mount.shadow || composeDepthShadow(2),
        zIndex: mount.zIndex,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Icon Station geometry shell.
 * Hard law: geometry ≠ backing ≠ rim ≠ content ≠ accent.
 * Scale grows away from fixed anchor; Foundation Round alone is not Signature copper.
 */
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
  const backing = resolveIconStationBackingDescriptor(state);
  const stationRim = state.iconStationRimPartId
    ? resolveRimDescriptor({ rimPartId: state.iconStationRimPartId })
    : null;
  const size = iconStationSizePx(state.iconStationScale, state.actionRole);
  const overflow = Math.max(0, Math.round((size - 28) * 0.55));
  const anchorStyle = iconStationAnchorTransform(state.iconStationAnchor, overflow);

  const content = mediaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl}
      alt=""
      data-testid={`${testIdPrefix}-media`}
      style={{ width: "100%", height: "100%", objectFit: fit as CSSProperties["objectFit"] }}
    />
  ) : (
    children
  );

  return (
    <span
      className="relative grid place-items-center overflow-visible"
      data-testid={testIdPrefix}
      data-vp-icon-station-geometry={geometryId}
      data-vp-icon-station-shape={shape}
      data-vp-icon-station-backing={backing?.partId || undefined}
      data-vp-icon-station-rim={stationRim?.partId || undefined}
      data-vp-icon-station-scale={state.iconStationScale != null ? String(state.iconStationScale) : undefined}
      data-vp-icon-station-anchor={state.iconStationAnchor || "left_center"}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: shape === "round" || shape === "circle" || shape === "oval" ? "50%" : shape === "rounded_square" ? 10 : 8,
        clipPath: shape === "faceted" || shape === "shield" ? clip : undefined,
        background: backing?.background ?? "transparent",
        boxShadow: stationRim
          ? stationRim.copperFamily
            ? "0 0 0 2px #8a4a22, 0 0 0 3px #3a1a0c, inset 0 2px 4px rgba(255,255,255,.12), inset 0 -4px 8px rgba(0,0,0,.7)"
            : "0 0 0 2px #94a3b8, 0 0 0 3px #475569, inset 0 1px 2px rgba(255,255,255,.4)"
          : backing
            ? "inset 0 1px 2px rgba(255,255,255,.1), inset 0 -2px 4px rgba(0,0,0,.55)"
            : undefined,
        overflow: "hidden",
        zIndex: 4,
        ...anchorStyle,
      }}
    >
      {content}
    </span>
  );
}

/** Compact Bottom Stop / Footer Cap — borrows little vertical space. */
export function BottomStopBar({
  props,
  testIdPrefix = "vp-bottom-stop",
}: {
  props: Record<string, unknown>;
  testIdPrefix?: string;
}) {
  const state = readVisualPartsState(props);
  if (!state.bottomStopPartId) return null;
  const height = Number(props.vpBottomStopHeightPx || 12);
  const themed = state.bottomStopPartId.includes("themed") || state.rimPartId === "rim_pounded_copper";
  return (
    <div
      data-testid={testIdPrefix}
      data-vp-bottom-stop={state.bottomStopPartId}
      style={{
        height,
        marginTop: 4,
        borderRadius: 999,
        background: themed
          ? poundedCopperLike()
          : "linear-gradient(90deg,transparent,#ffffff33 20%,#ffffff55 50%,#ffffff33 80%,transparent)",
        boxShadow: "0 -2px 8px rgba(0,0,0,.25)",
        opacity: 0.9,
      }}
    />
  );
}

function poundedCopperLike() {
  return "linear-gradient(90deg,#5c2e14,#c56a2d 35%,#f0c27a 50%,#c56a2d 65%,#5c2e14)";
}
