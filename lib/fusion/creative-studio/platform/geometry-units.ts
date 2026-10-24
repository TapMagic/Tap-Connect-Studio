import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { layeredCompositionParentSizePx } from "./layered-region";

export const STUDIO_GEOMETRY_UNITS_CONTRACT = "studioGeometryUnits@1.0.0" as const;

export type StudioGeometryUnit = "percent" | "px";
export type StudioGeometryAxis = "x" | "y" | "width" | "height";

export function geometryParentSize(
  block: CreativeCompositionBlock,
  node: Pick<CreativeCompositionNode, "parentId">,
): { widthPx: number; heightPx: number } {
  return layeredCompositionParentSizePx(block, node.parentId ?? null);
}

export function normalizedGeometryToDisplay(
  normalized: number,
  axis: StudioGeometryAxis,
  unit: StudioGeometryUnit,
  parent: { widthPx: number; heightPx: number },
): number {
  const scale = axis === "x" || axis === "width" ? parent.widthPx : parent.heightPx;
  return unit === "px"
    ? Math.round(normalized * scale * 100) / 100
    : Math.round(normalized * 10000) / 100;
}

export function displayGeometryToNormalized(
  value: number,
  axis: StudioGeometryAxis,
  unit: StudioGeometryUnit,
  parent: { widthPx: number; heightPx: number },
): number {
  const scale = axis === "x" || axis === "width" ? parent.widthPx : parent.heightPx;
  return unit === "px" ? value / Math.max(1, scale) : value / 100;
}

