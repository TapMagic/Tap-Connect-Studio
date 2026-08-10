/**
 * Shared Visual Parts render descriptors — Edit / Preview / Public parity.
 */

import type { CSSProperties } from "react";
import { getVisualPart } from "./registry";
import { ornamentSvg, poundedCopperRimBackground } from "./ornaments";
import { deriveFinishSurface, LACQUER_PROOF_COLORS } from "./finish-color";
import { composeDepthShadow, depthZIndex } from "./depth";
import { readVisualPartsState } from "./apply";
import type { VisualPartDefinition, VisualPartsState } from "./types";

export type VisualPartRimDescriptor = {
  partId: string;
  cssClass: string;
  rimWidthPx: number;
  background: string;
  copperFamily: boolean;
  previewKind: "rim-copper" | "rim-chrome" | "rim-industrial" | "rim-electric";
};

export type VisualPartAccentDescriptor = {
  partId: string;
  svg: string;
  position: "left" | "right" | "both";
};

export type VisualPartIconStationBackingDescriptor = {
  partId: string;
  background: string;
  tone: "neutral" | "dark";
};

export type VisualPartMountDescriptor = {
  partId: string;
  style: string;
  paddingPx: number;
  radius: number;
  background: string;
  border?: string;
  shadow: string;
  zIndex: number;
};

const SIMPLE_CHROME_RIM_BACKGROUND = "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)";

export function resolveRimDescriptor(
  state: Pick<VisualPartsState, "rimPartId"> & { rimPartId?: string | null }
): VisualPartRimDescriptor | null {
  const partId = state.rimPartId;
  if (!partId) return null;
  const part = getVisualPart(partId);
  if (!part || part.payload.kind !== "rim") return null;
  const copper = Boolean(part.payload.copperFamily);
  const industrial = Boolean(part.payload.industrialFamily);
  const electric = Boolean(part.payload.electricFamily);
  return {
    partId,
    cssClass: part.payload.cssClass,
    rimWidthPx: part.payload.rimWidthPx,
    copperFamily: copper,
    previewKind: copper ? "rim-copper" : electric ? "rim-electric" : industrial ? "rim-industrial" : "rim-chrome",
    background: copper
      ? poundedCopperRimBackground()
      : electric
        ? "linear-gradient(90deg,#0ea5e9,#38bdf8 40%,#022c55 100%)"
        : SIMPLE_CHROME_RIM_BACKGROUND,
  };
}

export function partTilePreviewBackground(part: VisualPartDefinition): string | undefined {
  if (part.payload.kind === "rim") {
    return resolveRimDescriptor({ rimPartId: part.id })?.background;
  }
  if (part.payload.kind === "finish") {
    return deriveFinishSurface(part.payload.finishId, LACQUER_PROOF_COLORS.green).gradient;
  }
  if (part.payload.kind === "icon_station_backing") {
    return part.payload.background;
  }
  if (part.payload.kind === "mount") {
    return part.payload.background;
  }
  if (part.payload.kind === "action_surface") {
    return part.payload.backgroundTone === "energy_field"
      ? "linear-gradient(155deg,#0b1224,#111c3a)"
      : part.payload.backgroundTone === "copper_harmonized"
        ? "linear-gradient(160deg,#3a2418,#1a1410)"
        : "#111827";
  }
  return undefined;
}

export function partTilePreviewKind(part: VisualPartDefinition): string | undefined {
  if (part.payload.kind === "rim") {
    return resolveRimDescriptor({ rimPartId: part.id })?.previewKind;
  }
  if (part.payload.kind === "finish") return `finish-${part.payload.finishId}`;
  if (part.payload.kind === "icon_station_backing") return `backing-${part.payload.tone}`;
  if (part.payload.kind === "icon_station_geometry") return `geometry-${part.payload.shape}`;
  if (part.payload.kind === "mount") return `mount-${part.payload.style}`;
  return part.previewHint;
}

export function resolveIconStationBackingDescriptor(
  state: VisualPartsState
): VisualPartIconStationBackingDescriptor | null {
  const partId = state.iconStationBackingPartId;
  if (!partId) return null;
  const part = getVisualPart(partId);
  if (!part || part.payload.kind !== "icon_station_backing") return null;
  return {
    partId,
    background: part.payload.background,
    tone: part.payload.tone,
  };
}

export function resolveMountDescriptor(state: VisualPartsState): VisualPartMountDescriptor | null {
  const partId = state.mountPartId;
  if (!partId) return null;
  const part = getVisualPart(partId);
  if (!part || part.payload.kind !== "mount") return null;
  return {
    partId,
    style: part.payload.style,
    paddingPx: part.payload.paddingPx,
    radius: part.payload.radius,
    background: part.payload.background,
    border: part.payload.border,
    shadow: part.payload.shadow || composeDepthShadow(2),
    zIndex: depthZIndex(2),
  };
}

export function resolveAccentDescriptor(state: VisualPartsState): VisualPartAccentDescriptor | null {
  const partId = state.accentPartId;
  if (!partId || partId === "accent_none") return null;
  const part = getVisualPart(partId);
  if (!part || part.payload.kind !== "accent") return null;
  const svg = ornamentSvg(part.payload.svgAssetId);
  if (!svg) return null;
  return {
    partId,
    svg,
    position: part.payload.defaultPlacement,
  };
}

export function rimOuterStyle(rim: VisualPartRimDescriptor, radius: string | number): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    padding: rim.rimWidthPx,
    background: rim.background,
    boxShadow: rim.copperFamily
      ? "inset 0 2px 0 rgba(255,236,200,.55), inset 0 -3px 4px rgba(30,8,2,.65), 0 0 0 1px rgba(70,28,8,.55)"
      : "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 2px rgba(0,0,0,.35)",
    pointerEvents: "none",
    zIndex: 0,
  };
}

export function rimInnerClipStyle(rim: VisualPartRimDescriptor, radius: string | number): CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    borderRadius: radius,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  };
}

/** Icon Station size from 0–1 scale within safe MIN/MAX (px). */
export function iconStationSizePx(scale: number | null | undefined, role: string | null | undefined): number {
  const s = Math.min(1, Math.max(0, scale ?? 0.45));
  const min = role === "hero" || role === "launch" ? 28 : 22;
  const max = role === "hero" || role === "launch" ? 72 : 48;
  return Math.round(min + (max - min) * s);
}

export function iconStationAnchorTransform(
  anchor: string | null | undefined,
  overflowPx: number
): CSSProperties {
  switch (anchor) {
    case "right_center":
      return { transformOrigin: "right center", marginRight: -overflowPx };
    case "top_left":
      return { transformOrigin: "left top", marginTop: -overflowPx, marginLeft: -Math.round(overflowPx * 0.35) };
    case "top_right":
      return { transformOrigin: "right top", marginTop: -overflowPx, marginRight: -Math.round(overflowPx * 0.35) };
    case "center_overlap":
      return { transformOrigin: "center center", marginLeft: -Math.round(overflowPx * 0.25) };
    case "left_center":
    default:
      return { transformOrigin: "left center", marginLeft: -overflowPx };
  }
}

export function visualPartsDataAttrs(props: Record<string, unknown>): Record<string, string | undefined> {
  const state = readVisualPartsState(props);
  const phoneStack =
    state.layoutIntent === "two_column" || state.layoutIntent === "round_team_grid"
      ? "auto"
      : state.layoutIntent
        ? "off"
        : undefined;
  return {
    "data-vp-family": state.curatedFamilyId || undefined,
    "data-vp-finish": state.finishPartId || undefined,
    "data-vp-base-color": state.baseColor || undefined,
    "data-vp-brand-recipe": state.brandRecipeId || undefined,
    "data-vp-rim": state.rimPartId || undefined,
    "data-vp-accent": state.accentPartId || undefined,
    "data-vp-icon-station": state.iconStationGeometryPartId || undefined,
    "data-vp-icon-station-backing": state.iconStationBackingPartId || undefined,
    "data-vp-icon-station-rim": state.iconStationRimPartId || undefined,
    "data-vp-icon-position": state.iconStationPosition || undefined,
    "data-vp-icon-scale": state.iconStationScale != null ? String(state.iconStationScale) : undefined,
    "data-vp-icon-anchor": state.iconStationAnchor || undefined,
    "data-vp-layout": state.layoutIntent || String(props.vpLayoutIntent || "") || undefined,
    "data-vp-phone-stack": phoneStack || (props.vpAutoStackPhone ? "auto" : undefined),
    "data-vp-phone-stack-active":
      typeof props.vpPhoneStackActive === "string" ? props.vpPhoneStackActive : undefined,
    "data-vp-action-group": props.vpActionGroup === true ? "true" : undefined,
    "data-vp-action-group-child": props.vpActionGroupChild === true ? "true" : undefined,
    "data-vp-divider": state.dividerLinePartId || undefined,
    "data-vp-action-surface": state.actionSurfacePartId || undefined,
    "data-vp-surface": state.surfaceEnabled === false ? "off" : state.surfaceTreatment || undefined,
    "data-vp-mount": state.mountPartId || undefined,
    "data-vp-bottom-stop": state.bottomStopPartId || undefined,
    "data-vp-action-role": state.actionRole || undefined,
    "data-vp-hero": state.heroStructure || undefined,
    "data-vp-hero-size": state.heroSizeIntent || undefined,
    "data-vp-assembly": state.assemblyRecipeId || undefined,
  };
}
