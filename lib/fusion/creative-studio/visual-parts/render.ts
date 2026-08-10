/**
 * Shared Visual Parts render descriptors — Edit / Preview / Public parity.
 */

import type { CSSProperties } from "react";
import { getVisualPart } from "./registry";
import { ornamentSvg, poundedCopperRimBackground } from "./ornaments";
import { readVisualPartsState } from "./apply";
import type { VisualPartsState } from "./types";

export type VisualPartRimDescriptor = {
  partId: string;
  cssClass: string;
  rimWidthPx: number;
  background: string;
  copperFamily: boolean;
};

export type VisualPartAccentDescriptor = {
  partId: string;
  svg: string;
  position: "left" | "right" | "both";
};

export function resolveRimDescriptor(state: VisualPartsState): VisualPartRimDescriptor | null {
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
    background: copper
      ? poundedCopperRimBackground()
      : "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)",
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
    "data-vp-icon-position": state.iconStationPosition || undefined,
    "data-vp-layout": state.layoutIntent || undefined,
    "data-vp-phone-stack": state.layoutIntent === "two_column" ? "auto" : state.layoutIntent ? "off" : undefined,
    "data-vp-divider": state.dividerLinePartId || undefined,
    "data-vp-action-surface": state.actionSurfacePartId || undefined,
  };
}
