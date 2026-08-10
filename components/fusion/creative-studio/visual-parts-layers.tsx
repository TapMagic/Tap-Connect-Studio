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
  rimEdgeBoxShadow,
  rimKindFromDescriptor,
  themedBottomStopBackground,
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
 * Rim paint comes from canonical resolveRimDescriptor + rimEdgeBoxShadow.
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
      data-vp-rim-authority={rim ? rim.partId : undefined}
      style={
        rim
          ? ({
              padding: rim.rimWidthPx,
              borderRadius: radius,
              background: rim.background,
              boxShadow: rimEdgeBoxShadow(rimKindFromDescriptor(rim)),
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

/** Mount / Backplate between Surface and Core Action — depth via shared composeDepthShadow. */
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
      data-vp-depth-level="2"
      style={{
        padding: mount.paddingPx,
        borderRadius: mount.radius,
        background: mount.background,
        border: mount.border,
        boxShadow: mount.shadow || composeDepthShadow(2, state.surfaceDepth ?? 0.55),
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
 * Rim uses canonical Rim authority (same path as Action rim).
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
    : state.rimPartId
      ? resolveRimDescriptor({ rimPartId: state.rimPartId })
      : null;
  const size = iconStationSizePx(state.iconStationScale, state.actionRole);
  const overflow = Math.max(0, Math.round((size - 28) * 0.55));
  const anchorStyle = iconStationAnchorTransform(state.iconStationAnchor, overflow);
  const depthShadow = composeDepthShadow(4, state.surfaceDepth ?? 0.55);

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
      data-vp-rim-authority={stationRim?.partId || undefined}
      data-vp-icon-station-scale={state.iconStationScale != null ? String(state.iconStationScale) : undefined}
      data-vp-icon-station-anchor={state.iconStationAnchor || "left_center"}
      data-vp-depth-level="4"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: shape === "round" || shape === "circle" || shape === "oval" ? "50%" : shape === "rounded_square" ? 10 : 8,
        clipPath: shape === "faceted" || shape === "shield" ? clip : undefined,
        background: stationRim?.background ?? backing?.background ?? "transparent",
        padding: stationRim ? Math.max(2, Math.round(stationRim.rimWidthPx * 0.45)) : 0,
        boxShadow: stationRim
          ? `${rimEdgeBoxShadow(rimKindFromDescriptor(stationRim))}, ${depthShadow}`
          : backing
            ? `inset 0 1px 2px rgba(255,255,255,.1), inset 0 -2px 4px rgba(0,0,0,.55), ${depthShadow}`
            : depthShadow,
        overflow: "hidden",
        zIndex: 4,
        ...anchorStyle,
      }}
    >
      <span
        className="grid h-full w-full place-items-center overflow-hidden"
        style={{
          borderRadius: "inherit",
          background: backing?.background && stationRim ? backing.background : undefined,
        }}
      >
        {content}
      </span>
    </span>
  );
}

/** Compact Bottom Stop / Footer Cap — shared Edit/Preview/Public path; shared Copper authority. */
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
  const themed =
    state.bottomStopPartId.includes("themed") ||
    state.rimPartId === "rim_pounded_copper" ||
    Boolean(state.rimPartId && String(state.rimPartId).includes("copper"));
  return (
    <div
      data-testid={testIdPrefix}
      data-vp-bottom-stop={state.bottomStopPartId}
      data-vp-rim-authority={themed ? state.rimPartId || "rim_pounded_copper" : undefined}
      style={{
        width: "100%",
        minWidth: 48,
        height,
        minHeight: height,
        flex: "1 1 auto",
        marginTop: 4,
        borderRadius: 999,
        background: themed
          ? themedBottomStopBackground(state.rimPartId || "rim_pounded_copper")
          : themedBottomStopBackground(null),
        boxShadow: themed
          ? rimEdgeBoxShadow("copper")
          : "0 -2px 8px rgba(0,0,0,.25)",
        opacity: 0.92,
      }}
    />
  );
}

/** Hero flow-shape layer — structured vector, not business content. */
export function HeroFlowShapeLayer({
  props,
  testIdPrefix = "vp-hero-flow",
}: {
  props: Record<string, unknown>;
  testIdPrefix?: string;
}) {
  const state = readVisualPartsState(props);
  const flow = String(state.heroFlowShape || props.vpHeroFlow || "none");
  if (!flow || flow === "none") return null;
  if (flow === "arc") {
    return (
      <svg
        aria-hidden
        data-testid={testIdPrefix}
        data-vp-hero-flow="arc"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-8 w-full opacity-80"
      >
        <path
          d="M0 18 Q50 0 100 18"
          fill="none"
          stroke="rgba(184,255,44,.55)"
          strokeWidth="2.5"
        />
        <path
          d="M0 22 Q50 6 100 22"
          fill="none"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (flow === "geometric_band" || flow === "swoosh" || flow === "organic_wave") {
    return (
      <div
        aria-hidden
        data-testid={testIdPrefix}
        data-vp-hero-flow={flow === "geometric_band" ? "geometric_band" : flow}
        className="pointer-events-none absolute inset-x-3 top-3 z-[1] h-3 overflow-hidden rounded-sm"
        style={{
          background:
            flow === "geometric_band"
              ? "repeating-linear-gradient(90deg,#b8ff2c55 0 10px,#ffffff22 10px 18px,#38bdf855 18px 28px)"
              : flow === "swoosh"
                ? "linear-gradient(90deg,transparent,#b8ff2c66 40%,#38bdf866 70%,transparent)"
                : "linear-gradient(105deg,#ffffff22 0%,#b8ff2c44 45%,#ffffff18 100%)",
          boxShadow: "0 2px 8px rgba(0,0,0,.25)",
        }}
      />
    );
  }
  return null;
}
