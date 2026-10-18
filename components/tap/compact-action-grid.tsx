"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { LockKeyhole } from "lucide-react";
import { PremiumIcon } from "@/components/design/premium-icon";
import {
  compactActionGridLayoutMetrics,
  compactActionGridRequiredRowWidthPx,
  compactActionGridTileColumn,
  type CompactActionGridState,
  type CompactActionTile,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import {
  EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE,
  EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  loveAndTheftPickInsertResolution,
} from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";
import { cn } from "@/lib/utils";
import { ActionPresentationEffects } from "@/components/fusion/creative-studio/action-presentation-effects";
import { AccessNoticeOverlay } from "@/components/tap/access-notice-overlay";
import { accessNoticeContent } from "@/lib/fusion/card/access-notice";

export function LoveAndTheftPickVisual({ iconAssetRef, active = false, className }: {
  iconAssetRef: string;
  insertConstruction?: CompactActionTile["insertConstruction"];
  active?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const insert = loveAndTheftPickInsertResolution(iconAssetRef);
  const mastered = insert.kind === "mastered" ? insert.sourceAsset : null;
  return <span
    className={cn("relative block aspect-square overflow-visible", className)}
    data-love-and-theft-pick="true"
    data-mastered-pick={mastered ? "true" : "false"}
    data-pick-insert-kind={insert.kind}
    data-pick-insert-construction={insert.kind === "blank" ? "blank" : insert.construction}
    data-pick-master-id={insert.kind === "mastered" ? insert.canonicalId : EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID}
    data-pick-active={active ? "true" : "false"}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={mastered || EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full select-none object-contain"
      data-certified-source-master="true"
    />
  </span>;
}

function tileHref(tile: CompactActionTile): string | undefined {
  const destination = tile.destinationRef.trim();
  if (!destination || tile.actionType === "internal_page") return undefined;
  if (tile.actionType === "call") return destination.startsWith("tel:") ? destination : `tel:${destination.replace(/[^+\d]/g, "")}`;
  if (tile.actionType === "sms") return destination.startsWith("sms:") ? destination : `sms:${destination.replace(/[^+\d]/g, "")}`;
  if (tile.actionType === "email") return destination.startsWith("mailto:") ? destination : `mailto:${destination}`;
  return destination;
}

export function CompactActionGrid({ state, editMode = false }: { state: CompactActionGridState; editMode?: boolean }) {
  const [lockedTileId, setLockedTileId] = useState<string | null>(null);
  const lockedTriggerRef = useRef<HTMLElement | null>(null);
  const closeAccessNotice = useCallback(() => setLockedTileId(null), []);
  const activeLockedTile = state.tiles.find((tile) => tile.componentId === lockedTileId && tile.locked);
  const activeLockedPolicy = activeLockedTile?.lockedBehavior;
  const activeNotice = activeLockedTile ? accessNoticeContent({
    actionLabel: activeLockedTile.label,
    title: activeLockedPolicy?.title,
    message: activeLockedPolicy?.message,
  }) : null;
  const activeCtaDestination = activeLockedPolicy?.ctaDestinationRef?.trim();
  const activeCta = activeLockedPolicy?.mode === "cta" && activeLockedPolicy.ctaLabel?.trim() && activeCtaDestination ? {
    label: activeLockedPolicy.ctaLabel.trim(),
    internalPageId: activeLockedPolicy.ctaDestinationType === "internal_page" ? activeCtaDestination : undefined,
    href: activeLockedPolicy.ctaDestinationType !== "internal_page" ? activeCtaDestination : undefined,
    actionId: activeLockedTile?.actionId,
  } : undefined;
  const authoredDensityScale = state.density === "compact" ? .86 : state.density === "roomy" ? 1.12 : 1;
  // Four columns are a governed compact presentation, not browser zoom. The
  // optical type reduction keeps the longest admitted platform labels intact.
  const densityScale = authoredDensityScale * (state.columns === 4 ? .76 : 1);
  const { visibleTiles, occupiedColumns, trackColumns } = compactActionGridLayoutMetrics(state);
  const fixedTracks = state.tileSizing === "fixed";
  const requiredRowWidthPx = compactActionGridRequiredRowWidthPx(state);
  const style = {
    gridTemplateColumns: fixedTracks
      ? `repeat(${trackColumns}, ${state.tileSizePx}px)`
      : `repeat(${trackColumns}, minmax(0, 1fr))`,
    columnGap: state.columnGapPx,
    rowGap: state.rowGapPx,
    justifyContent: state.gridAlignment === "left" ? "start" : state.gridAlignment === "right" ? "end" : "center",
    "--compact-grid-density": densityScale,
    "--compact-grid-label-font": state.labelFontFamily,
    "--compact-grid-label-size": `${state.labelFontSizePx}px`,
    "--compact-grid-label-weight": state.labelFontWeight,
    "--compact-grid-label-color": state.labelColor,
    "--compact-grid-sublabel-size": `${state.sublabelFontSizePx}px`,
    "--compact-grid-sublabel-color": state.sublabelColor,
  } as CSSProperties;
  return <><div
    className="grid h-auto w-full overflow-visible"
    style={style}
    data-testid="compact-action-grid"
    data-compact-action-contract={state.contractId}
    data-compact-action-component-id={state.componentId}
    data-compact-action-presentation={state.presentation}
    data-compact-action-columns={state.columns}
    data-compact-action-occupied-columns={occupiedColumns}
    data-compact-action-track-columns={trackColumns}
    data-compact-action-tile-sizing={state.tileSizing}
    data-compact-action-tile-size={state.tileSizePx}
    data-compact-action-width-mode={state.widthMode}
    data-compact-action-alignment={state.gridAlignment}
    data-compact-action-last-row-alignment={state.lastRowAlignment}
    data-compact-action-density={state.density}
    data-compact-action-overflow-warning={state.tileSizing === "fixed" && requiredRowWidthPx > 366 ? "true" : "false"}
  >
    {visibleTiles.map((tile, index) => <CompactActionTileView
      key={tile.componentId}
      tile={tile}
      state={state}
      editMode={editMode}
      expanded={lockedTileId === tile.componentId}
      gridColumnStart={compactActionGridTileColumn(state, index, visibleTiles.length)}
      onLocked={(trigger) => {
        lockedTriggerRef.current = trigger;
        setLockedTileId(tile.lockedBehavior?.mode === "message" || tile.lockedBehavior?.mode === "cta" ? tile.componentId : null);
      }}
    />)}
  </div>
  <AccessNoticeOverlay
    open={Boolean(activeNotice && activeLockedPolicy && (activeLockedPolicy.mode === "message" || activeLockedPolicy.mode === "cta"))}
    title={activeNotice?.title || "Access Required"}
    message={activeNotice?.message || "This content requires additional access."}
    cta={activeCta}
    onClose={closeAccessNotice}
    returnFocusRef={lockedTriggerRef}
  /></>;
}

function CompactActionTileView({ tile, state, editMode, expanded, gridColumnStart, onLocked }: {
  tile: CompactActionTile;
  state: CompactActionGridState;
  editMode: boolean;
  expanded: boolean;
  gridColumnStart?: number;
  onLocked: (trigger: HTMLElement) => void;
}) {
  const locked = tile.locked === true;
  const internalPageId = tile.actionType === "internal_page" && !locked ? tile.destinationRef : undefined;
  const href = !locked ? tileHref(tile) : undefined;
  const labelAlign = state.labelAlign === "left" ? "items-start text-left" : state.labelAlign === "right" ? "items-end text-right" : "items-center text-center";
  const pickSize = state.tileSizing === "fixed" ? state.tileSizePx : "100%";
  const neutralIconSize = state.tileSizing === "fixed" ? state.tileSizePx : "100%";
  const body = <>
    <span className="relative block overflow-visible" style={{ width: pickSize }}>
      {state.presentation === "everencore-love-and-theft-pick"
        ? <LoveAndTheftPickVisual iconAssetRef={locked ? "lucide:lock" : tile.iconAssetRef} insertConstruction={locked ? undefined : tile.insertConstruction} active={tile.active} compact={state.columns === 4} className="w-full" />
        : <span className={cn("mx-auto grid aspect-square place-items-center rounded-[30%] border text-white shadow-[inset_0_1px_0_rgba(255,255,255,.24),0_8px_18px_rgba(0,0,0,.34)]", tile.active ? "border-amber-200/65 bg-[linear-gradient(145deg,#d7ad58,#6f4519)]" : "border-white/18 bg-[linear-gradient(145deg,#263244,#080b10)]")} style={{ width: neutralIconSize }} aria-hidden><PremiumIcon icon={locked ? "lock" : tile.iconAssetRef.split(":").at(-1) || tile.iconAssetRef} sizePx={Math.max(18, Math.round(state.tileSizePx * .32))} /></span>}
      {tile.new ? <span className="absolute right-0 top-0 z-[2] rounded-full border border-[#f5d68c]/55 bg-[#26190c]/94 px-1.5 py-0.5 text-[7px] font-black tracking-[.12em] text-[#ffe8ac] shadow-md">NEW</span> : null}
      {locked ? <span className="absolute bottom-[6%] right-[4%] z-[2] grid h-5 w-5 place-items-center rounded-full border border-[#f5d68c]/45 bg-[#1b1209]/94 text-[#f5d68c] shadow"><LockKeyhole className="h-2.5 w-2.5" /></span> : null}
    </span>
    <span className={cn("mt-1 flex min-w-0 max-w-full flex-col leading-none", labelAlign)}>
      <span className="max-w-full text-balance" style={{ color: "var(--compact-grid-label-color)", fontFamily: "var(--compact-grid-label-font)", fontSize: "calc(var(--compact-grid-label-size) * var(--compact-grid-density))", fontWeight: "var(--compact-grid-label-weight)", lineHeight: 1.04 }}>{tile.label}</span>
      {tile.sublabel && state.columns < 4 ? <span className="mt-1 max-w-full text-balance uppercase tracking-[.12em]" style={{ color: "var(--compact-grid-sublabel-color)", fontSize: "calc(var(--compact-grid-sublabel-size) * var(--compact-grid-density))", lineHeight: 1.15 }}>{tile.sublabel}</span> : null}
    </span>
  </>;
  const shared = "group relative flex min-h-11 w-full min-w-0 flex-col items-center justify-start overflow-visible rounded-2xl px-1 py-1.5 no-underline transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d68c]";
  const attrs = {
    "data-testid": `compact-action-tile-${tile.componentId}`,
    "data-compact-tile-contract": tile.contractId,
    "data-component-id": tile.componentId,
    "data-action-id": tile.actionId,
    "data-analytics-id": tile.analyticsId,
    "data-action-type": tile.actionType,
    "data-destination-ref": tile.destinationRef,
    "data-internal-page-id": internalPageId,
    "data-tile-new": tile.new ? "true" : "false",
    "data-tile-locked": locked ? "true" : "false",
    "data-tile-active": tile.active ? "true" : "false",
  };
  const control = locked
    ? <button type="button" className={shared} onClick={(event) => { event.preventDefault(); if (!editMode) onLocked(event.currentTarget); }} aria-haspopup="dialog" aria-expanded={expanded} aria-label={`${tile.label} (locked)`} {...attrs}>{body}</button>
    : <a href={editMode ? undefined : href} className={shared} onClick={(event) => { if (editMode || (!href && !internalPageId)) event.preventDefault(); }} aria-label={tile.sublabel ? `${tile.label}: ${tile.sublabel}` : tile.label} {...attrs}>{body}</a>;
  const effectFamily = state.presentation === "everencore-love-and-theft-pick" ? "everencore-love-and-theft-pick" : "compact-neutral";
  return <div className="relative min-w-0 overflow-visible" style={{ gridColumnStart }} data-compact-action-tile-shell="true" data-grid-column={gridColumnStart}>
    <ActionPresentationEffects family={effectFamily} value={tile.presentationEffects ?? {}} active={!editMode}>{control}</ActionPresentationEffects>
  </div>;
}
