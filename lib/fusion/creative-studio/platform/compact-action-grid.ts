import { nanoid } from "nanoid";
import type { StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";

export const COMPACT_ACTION_GRID_CONTRACT = "compactActionGrid@1.0.0" as const;
export const COMPACT_ACTION_TILE_CONTRACT = "compactActionTile@1.0.0" as const;

export type CompactActionGridPresentation = "neutral-icon" | "everencore-love-and-theft-pick";
export type CompactActionGridDensity = "compact" | "standard" | "roomy";
export type CompactActionTileLockMode = "none" | "hidden" | "message" | "cta";

export type CompactActionTile = {
  contractId: typeof COMPACT_ACTION_TILE_CONTRACT;
  componentId: string;
  actionId: string;
  analyticsId: string;
  label: string;
  sublabel?: string;
  iconAssetRef: string;
  actionType: StandardButtonActionIntent;
  destinationRef: string;
  new?: boolean;
  active?: boolean;
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
  columns: 2 | 3 | 4;
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
    actionType: input.actionType || "website",
    destinationRef: input.destinationRef || "https://example.com",
    new: input.new,
    active: input.active,
    hidden: input.hidden,
    locked: input.locked,
    lockedBehavior: input.lockedBehavior ? { ...input.lockedBehavior } : undefined,
  };
}

export function createCompactActionGrid(input: Partial<CompactActionGridState> = {}): CompactActionGridState {
  const componentId = input.componentId || `compact-grid-${nanoid(9)}`;
  return {
    contractId: COMPACT_ACTION_GRID_CONTRACT,
    componentId,
    analyticsId: input.analyticsId || `compact-grid:${componentId}`,
    presentation: input.presentation === "neutral-icon" ? "neutral-icon" : "everencore-love-and-theft-pick",
    columns: input.columns === 2 || input.columns === 4 ? input.columns : 3,
    density: input.density === "compact" || input.density === "roomy" ? input.density : "standard",
    columnGapPx: number(input.columnGapPx, 10, 0, 40),
    rowGapPx: number(input.rowGapPx, 14, 0, 48),
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
    flowAlignment: "stretch",
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
