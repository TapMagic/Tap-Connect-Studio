import { nanoid } from "nanoid";
import type { StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import type { LoveAndTheftPickInsertConstruction } from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";
import type { ActionPresentationEffectSettings } from "@/lib/fusion/creative-studio/action-presentation-effects";

export const COMPACT_ACTION_GRID_CONTRACT = "compactActionGrid@1.0.0" as const;
export const COMPACT_ACTION_TILE_CONTRACT = "compactActionTile@1.0.0" as const;

export type CompactActionGridPresentation = "neutral-icon" | "everencore-love-and-theft-pick";
export type CompactActionGridDensity = "compact" | "standard" | "roomy";
export type CompactActionGridWidthMode = "full" | "fit_content" | "custom";
export type CompactActionGridAlignment = "left" | "center" | "right";
export type CompactActionGridTileSizing = "auto_fill" | "fixed";
export type CompactActionGridLastRowAlignment = "left" | "center" | "right" | "space_between";
export type CompactActionTileLockMode = "none" | "hidden" | "message" | "cta";

export type CompactActionTile = {
  contractId: typeof COMPACT_ACTION_TILE_CONTRACT;
  componentId: string;
  actionId: string;
  analyticsId: string;
  label: string;
  sublabel?: string;
  iconAssetRef: string;
  insertConstruction?: LoveAndTheftPickInsertConstruction;
  actionType: StandardButtonActionIntent;
  destinationRef: string;
  new?: boolean;
  active?: boolean;
  presentationEffects?: ActionPresentationEffectSettings;
  hidden?: boolean;
  locked?: boolean;
  lockedBehavior?: {
    mode: CompactActionTileLockMode;
    message?: string;
    ctaLabel?: string;
    ctaDestinationType?: "internal_page" | "external";
    ctaDestinationRef?: string;
  };
};

export type CompactActionGridState = {
  contractId: typeof COMPACT_ACTION_GRID_CONTRACT;
  componentId: string;
  analyticsId: string;
  presentation: CompactActionGridPresentation;
  columns: 1 | 2 | 3 | 4;
  tileSizing: CompactActionGridTileSizing;
  tileSizePx: number;
  widthMode: CompactActionGridWidthMode;
  customWidthPx: number;
  gridAlignment: CompactActionGridAlignment;
  lastRowAlignment: CompactActionGridLastRowAlignment;
  density: CompactActionGridDensity;
  columnGapPx: number;
  rowGapPx: number;
  labelFontFamily: string;
  labelFontSizePx: number;
  labelFontWeight: number;
  labelColor: string;
  labelAlign: "left" | "center" | "right";
  sublabelFontSizePx: number;
  sublabelColor: string;
  tiles: CompactActionTile[];
};

const number = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

function legacyTileSizeForColumns(columns: CompactActionGridState["columns"]) {
  return columns === 1 ? 132 : columns === 2 ? 114 : columns === 4 ? 74 : 92;
}

export function createCompactActionTile(input: Partial<CompactActionTile> & Pick<CompactActionTile, "label">): CompactActionTile {
  const componentId = input.componentId || `compact-tile-${nanoid(9)}`;
  return {
    contractId: COMPACT_ACTION_TILE_CONTRACT,
    componentId,
    actionId: input.actionId || `action-${nanoid(9)}`,
    analyticsId: input.analyticsId || `compact-action:${componentId}`,
    label: input.label,
    sublabel: input.sublabel,
    iconAssetRef: input.iconAssetRef || "lucide:star",
    insertConstruction: input.insertConstruction === "direct-engrave" || input.insertConstruction === "recessed-medallion" || input.insertConstruction === "secondary-insert" ? input.insertConstruction : undefined,
    actionType: input.actionType || "website",
    destinationRef: input.destinationRef || "https://example.com",
    new: input.new,
    active: input.active,
    presentationEffects: input.presentationEffects ? {
      enabled: input.presentationEffects.enabled === true,
      glow: input.presentationEffects.glow === true,
      interaction: input.presentationEffects.interaction,
      motion: input.presentationEffects.motion,
      intensity: number(input.presentationEffects.intensity, 40, 0, 100),
      durationSeconds: number(input.presentationEffects.durationSeconds, 2.4, .4, 12),
      delaySeconds: number(input.presentationEffects.delaySeconds, 0, 0, 12),
      play: input.presentationEffects.play,
      trigger: input.presentationEffects.trigger,
      reducedMotionFallback: input.presentationEffects.reducedMotionFallback,
    } : undefined,
    hidden: input.hidden,
    locked: input.locked,
    lockedBehavior: input.lockedBehavior ? { ...input.lockedBehavior } : undefined,
  };
}

export function createCompactActionGrid(input: Partial<CompactActionGridState> = {}): CompactActionGridState {
  const componentId = input.componentId || `compact-grid-${nanoid(9)}`;
  const columns = input.columns === 1 || input.columns === 2 || input.columns === 4 ? input.columns : 3;
  const tileSizePx = number(input.tileSizePx, legacyTileSizeForColumns(columns), 44, 180);
  const columnGapPx = number(input.columnGapPx, 10, 0, 64);
  const widthMode = input.widthMode === "fit_content" || input.widthMode === "custom" ? input.widthMode : "full";
  return {
    contractId: COMPACT_ACTION_GRID_CONTRACT,
    componentId,
    analyticsId: input.analyticsId || `compact-grid:${componentId}`,
    presentation: input.presentation === "neutral-icon" ? "neutral-icon" : "everencore-love-and-theft-pick",
    columns,
    // Persisted grids created before sizing policy existed retain their former
    // behavior: full-width grids fill tracks, while bounded grids use the
    // authored tile size.
    tileSizing: input.tileSizing === "fixed" || input.tileSizing === "auto_fill"
      ? input.tileSizing
      : widthMode === "full" ? "auto_fill" : "fixed",
    tileSizePx,
    widthMode,
    customWidthPx: number(input.customWidthPx, tileSizePx * columns + columnGapPx * Math.max(0, columns - 1), 44, 1200),
    gridAlignment: input.gridAlignment === "left" || input.gridAlignment === "right" ? input.gridAlignment : "center",
    lastRowAlignment: input.lastRowAlignment === "center" || input.lastRowAlignment === "right" || input.lastRowAlignment === "space_between"
      ? input.lastRowAlignment
      : "left",
    density: input.density === "compact" || input.density === "roomy" ? input.density : "standard",
    columnGapPx,
    rowGapPx: number(input.rowGapPx, 14, 0, 64),
    labelFontFamily: input.labelFontFamily || "Cormorant Garamond, Georgia, serif",
    labelFontSizePx: number(input.labelFontSizePx, 14, 9, 28),
    labelFontWeight: number(input.labelFontWeight, 700, 300, 900),
    labelColor: input.labelColor || "#fff5df",
    labelAlign: input.labelAlign === "left" || input.labelAlign === "right" ? input.labelAlign : "center",
    sublabelFontSizePx: number(input.sublabelFontSizePx, 9, 7, 16),
    sublabelColor: input.sublabelColor || "#d8c18d",
    tiles: Array.isArray(input.tiles) ? input.tiles.map((tile) => createCompactActionTile(tile)) : [],
  };
}

export function compactActionGridVisibleTiles(state: CompactActionGridState) {
  return state.tiles.filter((tile) => !tile.hidden && tile.lockedBehavior?.mode !== "hidden");
}

/**
 * Canonical visual metrics for Compact Action Grid layout and placement.
 * Columns arrange fixed-size Tiles; they never select the artwork scale.
 */
export function compactActionGridLayoutMetrics(state: CompactActionGridState) {
  const visibleTiles = compactActionGridVisibleTiles(state);
  const occupiedColumns = Math.max(1, Math.min(state.columns, visibleTiles.length || 1));
  const trackColumns = state.widthMode === "fit_content" ? occupiedColumns : state.columns;
  const rows = Math.max(1, Math.ceil(visibleTiles.length / state.columns));
  const finalRowCount = visibleTiles.length === 0 ? 0 : visibleTiles.length % state.columns || Math.min(state.columns, visibleTiles.length);
  const densityScale = (state.density === "compact" ? .86 : state.density === "roomy" ? 1.12 : 1) * (state.columns === 4 ? .76 : 1);
  const labelLinePx = state.labelFontSizePx * densityScale * 1.04;
  const hasSublabel = state.columns < 4 && visibleTiles.some((tile) => Boolean(tile.sublabel));
  const sublabelLinePx = hasSublabel ? 4 + state.sublabelFontSizePx * densityScale * 1.15 : 0;
  const tileHeightPx = Math.ceil(12 + state.tileSizePx + 4 + labelLinePx + sublabelLinePx);
  const contentWidthPx = state.tileSizePx * occupiedColumns + state.columnGapPx * Math.max(0, occupiedColumns - 1);
  const contentHeightPx = tileHeightPx * rows + state.rowGapPx * Math.max(0, rows - 1);
  return { visibleTiles, occupiedColumns, trackColumns, rows, finalRowCount, tileHeightPx, contentWidthPx, contentHeightPx } as const;
}

/**
 * Assigns only incomplete-final-row tiles to explicit tracks. Complete rows
 * continue through normal grid auto-placement. Space Between anchors the first
 * and last item to the outside tracks and distributes any others between them.
 */
export function compactActionGridTileColumn(
  state: CompactActionGridState,
  tileIndex: number,
  visibleTileCount = compactActionGridVisibleTiles(state).length,
) {
  const finalRowCount = visibleTileCount === 0 ? 0 : visibleTileCount % state.columns;
  const trackColumns = state.widthMode === "fit_content" ? Math.max(1, Math.min(state.columns, visibleTileCount || 1)) : state.columns;
  if (finalRowCount === 0 || finalRowCount >= trackColumns || tileIndex < visibleTileCount - finalRowCount) return undefined;
  const indexInRow = tileIndex - (visibleTileCount - finalRowCount);
  if (state.lastRowAlignment === "right") return trackColumns - finalRowCount + indexInRow + 1;
  if (state.lastRowAlignment === "center") return Math.floor((trackColumns - finalRowCount) / 2) + indexInRow + 1;
  if (state.lastRowAlignment === "space_between") {
    if (finalRowCount === 1) return Math.floor((trackColumns - 1) / 2) + 1;
    return Math.round(indexInRow * (trackColumns - 1) / (finalRowCount - 1)) + 1;
  }
  return indexInRow + 1;
}

export function compactActionGridRequiredRowWidthPx(state: CompactActionGridState) {
  const occupiedColumns = Math.max(1, Math.min(state.columns, compactActionGridVisibleTiles(state).length || 1));
  return state.tileSizePx * occupiedColumns + state.columnGapPx * Math.max(0, occupiedColumns - 1);
}

export function readCompactActionGrid(props: Record<string, unknown>): CompactActionGridState | null {
  if (props.componentKind !== "compact-action-grid") return null;
  const raw = props.compactActionGrid && typeof props.compactActionGrid === "object" && !Array.isArray(props.compactActionGrid)
    ? props.compactActionGrid as Partial<CompactActionGridState>
    : props as Partial<CompactActionGridState>;
  return createCompactActionGrid(raw);
}

export function compactActionGridNodeProps(state: CompactActionGridState): Record<string, unknown> {
  return {
    componentKind: "compact-action-grid",
    elementKind: "button",
    compactActionGrid: state,
    label: "Compact Action Grid",
    accessibleLabel: "Compact Action Grid",
    flowWidthPercent: 100,
    flowAlignment: state.gridAlignment === "left" ? "start" : state.gridAlignment === "right" ? "end" : "center",
    minimumTouchTargetPx: 44,
    contentEditing: false,
  };
}

export function compactActionGridProofFixture(): CompactActionGridState {
  return createCompactActionGrid({
    componentId: "review-compact-social-grid",
    analyticsId: "review:compact-social-grid",
    presentation: "everencore-love-and-theft-pick",
    columns: 3,
    density: "standard",
    tiles: [
      ["Spotify", "Listen", "simple-icons:spotify", "https://open.spotify.com/"],
      ["Apple Music", "Stream", "simple-icons:apple-music", "https://music.apple.com/"],
      ["YouTube", "Watch", "simple-icons:youtube", "https://youtube.com/"],
      ["Instagram", "Follow", "simple-icons:instagram", "https://instagram.com/"],
      ["Facebook", "Connect", "simple-icons:facebook", "https://facebook.com/"],
      ["Bandsintown", "Tour dates", "simple-icons:bandsintown", "https://bandsintown.com/"],
    ].map(([label, sublabel, iconAssetRef, destinationRef], index) => createCompactActionTile({
      componentId: `review-social-tile-${index + 1}`,
      actionId: `review-social-action-${index + 1}`,
      analyticsId: `review:social:${index + 1}`,
      label,
      sublabel,
      iconAssetRef,
      destinationRef,
      actionType: "website",
      new: label === "Bandsintown",
    })),
  });
}
