import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";

export const STUDIO_COMPOSITION_DENSITY_CONTRACT = "studioCompositionDensity@1.0.0" as const;

export type StudioCompositionDensityMode = "dense" | "standard" | "airy" | "custom";

export type StudioCompositionDensity = Readonly<{
  mode: StudioCompositionDensityMode;
  gapPx: number;
  rowGapPx: number;
  columnGapPx: number;
  internalGroupGapPx: number;
  sectionGapPx: number;
  defaultModuleSpacingPx: number;
  snapGrid: number;
}>;

const PRESETS: Record<Exclude<StudioCompositionDensityMode, "custom">, Omit<StudioCompositionDensity, "mode">> = {
  dense: { gapPx: 8, rowGapPx: 8, columnGapPx: 8, internalGroupGapPx: 4, sectionGapPx: 12, defaultModuleSpacingPx: 4, snapGrid: 0.02 },
  standard: { gapPx: 16, rowGapPx: 16, columnGapPx: 16, internalGroupGapPx: 8, sectionGapPx: 24, defaultModuleSpacingPx: 8, snapGrid: 0.04 },
  airy: { gapPx: 28, rowGapPx: 28, columnGapPx: 28, internalGroupGapPx: 14, sectionGapPx: 40, defaultModuleSpacingPx: 14, snapGrid: 0.07 },
};

function clampGap(value: unknown, fallback = 16) {
  const number = Number(value);
  return Math.max(0, Math.min(64, Number.isFinite(number) ? number : fallback));
}

function resolve(mode: StudioCompositionDensityMode, customGapPx?: unknown, custom?: { rowGapPx?: unknown; columnGapPx?: unknown; internalGroupGapPx?: unknown }): StudioCompositionDensity {
  if (mode !== "custom") return { mode, ...PRESETS[mode] };
  const gapPx = clampGap(customGapPx);
  return {
    mode,
    gapPx,
    rowGapPx: clampGap(custom?.rowGapPx, gapPx),
    columnGapPx: clampGap(custom?.columnGapPx, gapPx),
    internalGroupGapPx: clampGap(custom?.internalGroupGapPx, Math.round(gapPx / 2)),
    sectionGapPx: Math.min(96, Math.round(gapPx * 1.5)),
    defaultModuleSpacingPx: Math.round(gapPx / 2),
    snapGrid: Math.max(0.01, Math.min(0.12, gapPx / 400)),
  };
}

export function readCardSurfaceDensity(block: CreativeCompositionBlock): StudioCompositionDensity {
  const state = block.compositionDensity;
  const mode = state?.mode ?? "standard";
  return resolve(mode, state?.customGapPx ?? block.parentAuthority?.cardGapPx, state);
}

export function setCardSurfaceDensity(
  block: CreativeCompositionBlock,
  mode: StudioCompositionDensityMode,
  customGapPx?: number,
  custom?: { rowGapPx?: number; columnGapPx?: number; internalGroupGapPx?: number },
): CreativeCompositionBlock {
  const density = resolve(mode, customGapPx ?? block.compositionDensity?.customGapPx, { ...block.compositionDensity, ...custom });
  return {
    ...block,
    compositionDensity: {
      version: 1,
      mode,
      customGapPx: mode === "custom" ? density.gapPx : block.compositionDensity?.customGapPx,
      rowGapPx: mode === "custom" ? density.rowGapPx : block.compositionDensity?.rowGapPx,
      columnGapPx: mode === "custom" ? density.columnGapPx : block.compositionDensity?.columnGapPx,
      internalGroupGapPx: mode === "custom" ? density.internalGroupGapPx : block.compositionDensity?.internalGroupGapPx,
    },
    parentAuthority: block.parentAuthority
      ? { ...block.parentAuthority, cardGapPx: density.gapPx }
      : block.parentAuthority,
  };
}

export function readContainerDensity(node: CreativeCompositionNode): StudioCompositionDensity {
  const candidate = String(node.props.compositionDensityMode || "standard");
  const mode: StudioCompositionDensityMode = candidate === "dense" || candidate === "airy" || candidate === "custom"
    ? candidate
    : "standard";
  return resolve(mode, node.props.compositionCustomGapPx ?? node.props.gap, {
    rowGapPx: node.props.compositionRowGapPx,
    columnGapPx: node.props.compositionColumnGapPx,
    internalGroupGapPx: node.props.compositionInternalGroupGapPx,
  });
}

export function setContainerDensity(
  props: Record<string, unknown>,
  mode: StudioCompositionDensityMode,
  customGapPx?: number,
  custom?: { rowGapPx?: number; columnGapPx?: number; internalGroupGapPx?: number },
): Record<string, unknown> {
  const density = resolve(mode, customGapPx ?? props.compositionCustomGapPx, {
    rowGapPx: custom?.rowGapPx ?? props.compositionRowGapPx,
    columnGapPx: custom?.columnGapPx ?? props.compositionColumnGapPx,
    internalGroupGapPx: custom?.internalGroupGapPx ?? props.compositionInternalGroupGapPx,
  });
  return {
    ...props,
    compositionDensityMode: mode,
    compositionCustomGapPx: mode === "custom" ? density.gapPx : props.compositionCustomGapPx,
    compositionRowGapPx: mode === "custom" ? density.rowGapPx : props.compositionRowGapPx,
    compositionColumnGapPx: mode === "custom" ? density.columnGapPx : props.compositionColumnGapPx,
    compositionInternalGroupGapPx: mode === "custom" ? density.internalGroupGapPx : props.compositionInternalGroupGapPx,
    gap: density.rowGapPx,
  };
}
