/**
 * Shared Visual Parts render descriptors — Edit / Preview / Public parity.
 */

import type { CSSProperties } from "react";
import { getVisualPart } from "./registry";
import { ornamentSvg, poundedCopperRimBackground } from "./ornaments";
import { deriveFinishSurface, LACQUER_PROOF_COLORS } from "./finish-color";
import { readVisualPartsState } from "./apply";
import type { VisualPartDefinition, VisualPartsState } from "./types";

export type VisualPartRimDescriptor = {
  partId: string;
  cssClass: string;
  rimWidthPx: number;
  background: string;
  copperFamily: boolean;
  previewKind: "rim-copper" | "rim-chrome";
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

const SIMPLE_CHROME_RIM_BACKGROUND = "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)";

export function resolveRimDescriptor(
  state: Pick<VisualPartsState, "rimPartId"> & { rimPartId?: string | null }
): VisualPartRimDescriptor | null {
  const partId = state.rimPartId;
  if (!partId) return null;
  const part = getVisualPart(partId);
  if (!part || part.payload.kind !== "rim") return null;
  const copper = Boolean(part.payload.copperFamily);
  return {
    partId,
    cssClass: part.payload.cssClass,
    rimWidthPx: part.payload.rimWidthPx,
    copperFamily: copper,
    previewKind: copper ? "rim-copper" : "rim-chrome",
    background: copper ? poundedCopperRimBackground() : SIMPLE_CHROME_RIM_BACKGROUND,
  };
}

/** Cabinet tile + applied rendering share this preview authority. */
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
  return undefined;
}

export function partTilePreviewKind(part: VisualPartDefinition): string | undefined {
  if (part.payload.kind === "rim") {
    return resolveRimDescriptor({ rimPartId: part.id })?.previewKind;
  }
  if (part.payload.kind === "finish") return `finish-${part.payload.finishId}`;
  if (part.payload.kind === "icon_station_backing") return `backing-${part.payload.tone}`;
  if (part.payload.kind === "icon_station_geometry") return `geometry-${part.payload.shape}`;
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

export function visualPartsDataAttrs(props: Record<string, unknown>): Record<string, string | undefined> {
  const state = readVisualPartsState(props);
  return {
    "data-vp-family": state.curatedFamilyId || undefined,
    "data-vp-finish": state.finishPartId || undefined,
    "data-vp-base-color": state.baseColor || undefined,
    "data-vp-rim": state.rimPartId || undefined,
    "data-vp-accent": state.accentPartId || undefined,
    "data-vp-icon-station": state.iconStationGeometryPartId || undefined,
    "data-vp-icon-station-backing": state.iconStationBackingPartId || undefined,
    "data-vp-icon-station-rim": state.iconStationRimPartId || undefined,
    "data-vp-icon-position": state.iconStationPosition || undefined,
    "data-vp-layout": state.layoutIntent || undefined,
    "data-vp-phone-stack": state.layoutIntent === "two_column" ? "auto" : state.layoutIntent ? "off" : undefined,
    "data-vp-divider": state.dividerLinePartId || undefined,
    "data-vp-action-surface": state.actionSurfacePartId || undefined,
  };
}
