"use client";

import { useState, type CSSProperties } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { PremiumIcon } from "@/components/design/premium-icon";
import type { CompactActionGridState, CompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import {
  EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE,
  loveAndTheftMasteredPickSource,
} from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";
import { cn } from "@/lib/utils";

export function LoveAndTheftPickVisual({ iconAssetRef, active = false, compact = false, className }: {
  iconAssetRef: string;
  active?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const mastered = loveAndTheftMasteredPickSource(iconAssetRef);
  const fallbackIcon = iconAssetRef.includes(":") ? iconAssetRef.split(":").at(-1)! : iconAssetRef;
  return <span
    className={cn("relative block aspect-square overflow-visible", className)}
    data-love-and-theft-pick="true"
    data-mastered-pick={mastered ? "true" : "false"}
    data-pick-active={active ? "true" : "false"}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={mastered || EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full select-none object-contain"
      style={{ filter: active ? "brightness(1.13) saturate(1.08) drop-shadow(0 4px 8px rgba(0,0,0,.72))" : "brightness(.88) saturate(.84) drop-shadow(0 4px 7px rgba(0,0,0,.68))" }}
    />
    {!mastered ? <span
      className="absolute left-1/2 top-[43%] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[#27190b]"
      style={{ width: compact ? "32%" : "34%", height: compact ? "32%" : "34%", filter: "drop-shadow(0 1px 0 rgba(255,224,148,.42))" }}
      aria-hidden
    ><PremiumIcon icon={fallbackIcon} sizePx={compact ? 13 : 20} /></span> : null}
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
  const authoredDensityScale = state.density === "compact" ? .86 : state.density === "roomy" ? 1.12 : 1;
  // Four columns are a governed compact presentation, not browser zoom. The
  // optical type reduction keeps the longest admitted platform labels intact.
  const densityScale = authoredDensityScale * (state.columns === 4 ? .76 : 1);
  const visibleTiles = state.tiles.filter((tile) => !tile.hidden && tile.lockedBehavior?.mode !== "hidden");
  const style = {
    gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`,
    columnGap: state.columnGapPx,
    rowGap: state.rowGapPx,
    "--compact-grid-density": densityScale,
    "--compact-grid-label-font": state.labelFontFamily,
    "--compact-grid-label-size": `${state.labelFontSizePx}px`,
    "--compact-grid-label-weight": state.labelFontWeight,
    "--compact-grid-label-color": state.labelColor,
    "--compact-grid-sublabel-size": `${state.sublabelFontSizePx}px`,
    "--compact-grid-sublabel-color": state.sublabelColor,
  } as CSSProperties;
  return <div
    className="grid h-auto min-h-full w-full overflow-visible"
    style={style}
    data-testid="compact-action-grid"
    data-compact-action-contract={state.contractId}
    data-compact-action-component-id={state.componentId}
    data-compact-action-presentation={state.presentation}
    data-compact-action-columns={state.columns}
    data-compact-action-density={state.density}
  >
    {visibleTiles.map((tile) => <CompactActionTileView
      key={tile.componentId}
      tile={tile}
      state={state}
      editMode={editMode}
      expanded={lockedTileId === tile.componentId}
      onLocked={() => setLockedTileId((current) => current === tile.componentId ? null : tile.componentId)}
    />)}
  </div>;
}

function CompactActionTileView({ tile, state, editMode, expanded, onLocked }: {
  tile: CompactActionTile;
  state: CompactActionGridState;
  editMode: boolean;
  expanded: boolean;
  onLocked: () => void;
}) {
  const locked = tile.locked === true;
  const internalPageId = tile.actionType === "internal_page" && !locked ? tile.destinationRef : undefined;
  const href = !locked ? tileHref(tile) : undefined;
  const labelAlign = state.labelAlign === "left" ? "items-start text-left" : state.labelAlign === "right" ? "items-end text-right" : "items-center text-center";
  const pickSize = state.columns === 2 ? "clamp(76px,26vw,114px)" : state.columns === 3 ? "clamp(64px,20vw,92px)" : "clamp(52px,16vw,74px)";
  const neutralIconSize = state.columns === 4 ? 42 : state.columns === 3 ? 52 : 62;
  const body = <>
    <span className="relative block overflow-visible" style={{ width: pickSize, maxWidth: "100%" }}>
      {state.presentation === "everencore-love-and-theft-pick"
        ? <LoveAndTheftPickVisual iconAssetRef={locked ? "lucide:lock" : tile.iconAssetRef} active={tile.active} compact={state.columns === 4} className="w-full" />
        : <span className={cn("mx-auto grid aspect-square place-items-center rounded-[30%] border text-white shadow-[inset_0_1px_0_rgba(255,255,255,.24),0_8px_18px_rgba(0,0,0,.34)]", tile.active ? "border-amber-200/65 bg-[linear-gradient(145deg,#d7ad58,#6f4519)]" : "border-white/18 bg-[linear-gradient(145deg,#263244,#080b10)]")} style={{ width: neutralIconSize }} aria-hidden><PremiumIcon icon={locked ? "lock" : tile.iconAssetRef.split(":").at(-1) || tile.iconAssetRef} sizePx={state.columns === 4 ? 20 : 24} /></span>}
      {tile.new ? <span className="absolute right-0 top-0 z-[2] rounded-full border border-[#f5d68c]/55 bg-[#26190c]/94 px-1.5 py-0.5 text-[7px] font-black tracking-[.12em] text-[#ffe8ac] shadow-md">NEW</span> : null}
      {locked ? <span className="absolute bottom-[6%] right-[4%] z-[2] grid h-5 w-5 place-items-center rounded-full border border-[#f5d68c]/45 bg-[#1b1209]/94 text-[#f5d68c] shadow"><LockKeyhole className="h-2.5 w-2.5" /></span> : null}
    </span>
    <span className={cn("mt-1 flex min-w-0 max-w-full flex-col leading-none", labelAlign)}>
      <span className="max-w-full text-balance" style={{ color: "var(--compact-grid-label-color)", fontFamily: "var(--compact-grid-label-font)", fontSize: "calc(var(--compact-grid-label-size) * var(--compact-grid-density))", fontWeight: "var(--compact-grid-label-weight)", lineHeight: 1.04 }}>{tile.label}</span>
      {tile.sublabel && state.columns < 4 ? <span className="mt-1 max-w-full text-balance uppercase tracking-[.12em]" style={{ color: "var(--compact-grid-sublabel-color)", fontSize: "calc(var(--compact-grid-sublabel-size) * var(--compact-grid-density))", lineHeight: 1.15 }}>{tile.sublabel}</span> : null}
    </span>
  </>;
  const shared = "group relative flex min-h-11 min-w-0 flex-col items-center justify-start overflow-visible rounded-2xl px-1 py-1.5 no-underline transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d68c]";
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
    ? <button type="button" className={shared} onClick={(event) => { event.preventDefault(); if (!editMode) onLocked(); }} aria-expanded={expanded} aria-label={`${tile.label} (locked)`} {...attrs}>{body}</button>
    : <a href={editMode ? undefined : href} className={shared} onClick={(event) => { if (editMode || (!href && !internalPageId)) event.preventDefault(); }} aria-label={tile.sublabel ? `${tile.label}: ${tile.sublabel}` : tile.label} {...attrs}>{body}</a>;
  const policy = tile.lockedBehavior;
  return <div className="relative min-w-0 overflow-visible" data-compact-action-tile-shell="true">
    {control}
    {expanded && policy && (policy.mode === "message" || policy.mode === "cta") ? <div className="relative z-10 mx-auto mt-1 w-[min(180px,calc(100vw-28px))] rounded-xl border border-[#d7ad58]/35 bg-[#100c08]/96 p-2 text-center text-[9px] leading-4 text-[#f4e5c3] shadow-2xl" role="status" data-testid={`compact-locked-message-${tile.componentId}`}>
      <Sparkles className="mx-auto mb-1 h-3 w-3 text-[#d7ad58]" aria-hidden />
      {policy.message || "This action requires additional access."}
      {policy.mode === "cta" && policy.ctaLabel ? policy.ctaDestinationType === "internal_page"
        ? <button type="button" className="mt-2 min-h-8 rounded-full bg-[#d7ad58] px-3 font-semibold text-[#1b1209]" data-internal-page-id={policy.ctaDestinationRef}>{policy.ctaLabel}</button>
        : <a className="mt-2 inline-flex min-h-8 items-center rounded-full bg-[#d7ad58] px-3 font-semibold text-[#1b1209]" href={policy.ctaDestinationRef}>{policy.ctaLabel}</a>
        : null}
    </div> : null}
  </div>;
}
