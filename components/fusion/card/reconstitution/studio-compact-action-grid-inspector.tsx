"use client";

import { useMemo, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { standardButtonActions, type StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import {
  compactActionGridNodeProps,
  createCompactActionTile,
  readCompactActionGrid,
  type CompactActionGridState,
  type CompactActionTile,
} from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import type { ButtonInspectorSection } from "./studio-selection-toolbar";
import { StudioIconDiscovery } from "./studio-icon-discovery";
import { StudioInternalPagePicker } from "./studio-internal-page-picker";

const SECTIONS: Array<{ id: ButtonInspectorSection; label: string }> = [
  { id: "content", label: "Tiles" }, { id: "action", label: "Action" }, { id: "appearance", label: "Look" },
  { id: "layout", label: "Grid" }, { id: "accessibility", label: "State" }, { id: "advanced", label: "Identity" },
];

export function StudioCompactActionGridInspector({ model, node, section, onSectionChange, onClose }: {
  model: CardEditorLiveModel;
  node: CreativeCompositionNode;
  section: ButtonInspectorSection;
  onSectionChange: (section: ButtonInspectorSection) => void;
  onClose: () => void;
}) {
  const state = useMemo(() => readCompactActionGrid(node.props), [node.props]);
  const [selectedTileId, setSelectedTileId] = useState(state?.tiles[0]?.componentId || "");
  if (!state) return null;
  const selected = state.tiles.find((tile) => tile.componentId === selectedTileId) ?? state.tiles[0] ?? null;
  const commit = (next: CompactActionGridState, label: string) => model.patchSelection(model.selectionRef, { props: { ...node.props, ...compactActionGridNodeProps(next) } }, label);
  const updateTile = (patch: Partial<CompactActionTile>, label: string) => {
    if (!selected) return;
    commit({ ...state, tiles: state.tiles.map((tile) => tile.componentId === selected.componentId ? { ...tile, ...patch } : tile) }, label);
  };
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= state.tiles.length || from === to) return;
    const tiles = [...state.tiles];
    const [moved] = tiles.splice(from, 1);
    tiles.splice(to, 0, moved!);
    commit({ ...state, tiles }, "Reordered Compact Action Tiles");
  };
  return <aside className="absolute inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-[#0b111b]/98 text-white shadow-2xl backdrop-blur-xl xl:relative xl:inset-auto xl:z-10 xl:max-h-none xl:w-[310px] xl:shrink-0 xl:rounded-none" aria-label="Compact Action Grid Inspector" data-testid="studio-compact-action-grid-inspector">
    <header className="flex items-start gap-3 px-4 pb-2 pt-4"><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b8ff2c]">Selected Component</p><h2 className="mt-1 text-base font-semibold">Compact Action Grid</h2><p className="mt-1 text-[10px] text-white/38">One movable Grid; each Tile keeps its own icon, label, Action, destination, and state.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-white/55 hover:bg-white/8" aria-label="Close Compact Action Grid Inspector"><X className="h-4 w-4" /></button></header>
    <nav className="grid grid-cols-3 gap-1 px-2 py-2" aria-label="Compact Action Grid Inspector sections">{SECTIONS.map((item) => <button key={item.id} type="button" aria-pressed={section === item.id} onClick={() => onSectionChange(item.id)} className="min-h-9 rounded-xl px-2 text-[10px] text-white/48 hover:bg-white/6 aria-pressed:bg-white/9 aria-pressed:text-white">{item.label}</button>)}</nav>
    <div className="space-y-4 p-4">
      <TileStrip state={state} selectedTileId={selected?.componentId || ""} onSelect={setSelectedTileId} onReorder={reorder} />
      {section === "content" ? <ContentEditor state={state} selected={selected} commit={commit} updateTile={updateTile} onSelect={setSelectedTileId} /> : null}
      {section === "action" ? <ActionEditor model={model} selected={selected} updateTile={updateTile} /> : null}
      {section === "appearance" ? <AppearanceEditor state={state} commit={commit} selected={selected} updateTile={updateTile} /> : null}
      {section === "layout" ? <LayoutEditor state={state} commit={commit} /> : null}
      {section === "accessibility" ? <StateEditor model={model} selected={selected} updateTile={updateTile} /> : null}
      {section === "advanced" ? <IdentityEditor state={state} selected={selected} /> : null}
    </div>
  </aside>;
}

function TileStrip({ state, selectedTileId, onSelect, onReorder }: { state: CompactActionGridState; selectedTileId: string; onSelect: (id: string) => void; onReorder: (from: number, to: number) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const drop = (event: DragEvent, index: number) => { event.preventDefault(); if (dragIndex != null) onReorder(dragIndex, index); setDragIndex(null); };
  return <div><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/38">Tile order</p><div className="flex gap-1 overflow-x-auto pb-1">{state.tiles.map((tile, index) => <button key={tile.componentId} type="button" draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, index)} onClick={() => onSelect(tile.componentId)} aria-pressed={tile.componentId === selectedTileId} className="min-h-10 shrink-0 rounded-xl border border-white/8 bg-white/[.035] px-2 text-[9px] text-white/55 aria-pressed:border-[#b8ff2c]/55 aria-pressed:bg-[#b8ff2c]/10 aria-pressed:text-white" data-testid={`compact-inspector-tile-${tile.componentId}`}>{index + 1}. {tile.label}</button>)}</div></div>;
}

function ContentEditor({ state, selected, commit, updateTile, onSelect }: { state: CompactActionGridState; selected: CompactActionTile | null; commit: (next: CompactActionGridState, label: string) => void; updateTile: (patch: Partial<CompactActionTile>, label: string) => void; onSelect: (id: string) => void }) {
  if (!selected) return <button type="button" onClick={() => { const tile = createCompactActionTile({ label: "New action" }); onSelect(tile.componentId); commit({ ...state, tiles: [tile] }, "Added first Compact Action Tile"); }} className={buttonClass}><Plus className="h-3.5 w-3.5" />Add first Tile</button>;
  const index = state.tiles.findIndex((tile) => tile.componentId === selected.componentId);
  return <div className="space-y-3">
    <Field label="Label"><input value={selected.label} onChange={(event) => updateTile({ label: event.target.value }, "Changed Compact Action Tile label")} className={fieldClass} data-testid="compact-tile-label" /></Field>
    <Field label="Optional sublabel"><input value={selected.sublabel || ""} onChange={(event) => updateTile({ sublabel: event.target.value || undefined }, "Changed Compact Action Tile sublabel")} className={fieldClass} data-testid="compact-tile-sublabel" /></Field>
    <div className="grid grid-cols-2 gap-2"><button type="button" disabled={index <= 0} onClick={() => { const tiles=[...state.tiles]; const [m]=tiles.splice(index,1); tiles.splice(index-1,0,m!); commit({...state,tiles},"Moved Compact Action Tile up"); }} className={buttonClass}><ArrowUp className="h-3.5 w-3.5" />Earlier</button><button type="button" disabled={index >= state.tiles.length - 1} onClick={() => { const tiles=[...state.tiles]; const [m]=tiles.splice(index,1); tiles.splice(index+1,0,m!); commit({...state,tiles},"Moved Compact Action Tile down"); }} className={buttonClass}><ArrowDown className="h-3.5 w-3.5" />Later</button></div>
    <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { const tile=createCompactActionTile({label:"New action",iconAssetRef:"lucide:star",destinationRef:"https://example.com"}); onSelect(tile.componentId); commit({...state,tiles:[...state.tiles,tile]},"Added Compact Action Tile"); }} className={buttonClass}><Plus className="h-3.5 w-3.5" />Add Tile</button><button type="button" disabled={state.tiles.length <= 1} onClick={() => { const tiles=state.tiles.filter((tile)=>tile.componentId!==selected.componentId); onSelect(tiles[Math.min(index,tiles.length-1)]?.componentId || ""); commit({...state,tiles},"Removed Compact Action Tile"); }} className={`${buttonClass} text-rose-200`}><Trash2 className="h-3.5 w-3.5" />Remove</button></div>
  </div>;
}

function ActionEditor({ model, selected, updateTile }: { model: CardEditorLiveModel; selected: CompactActionTile | null; updateTile: (patch: Partial<CompactActionTile>, label: string) => void }) {
  if (!selected) return null;
  const actions = standardButtonActions();
  const changeType = (actionType: StandardButtonActionIntent) => updateTile({ actionType, destinationRef: "" }, "Changed Compact Action Tile Action");
  return <div className="space-y-3"><Field label="Action"><select value={selected.actionType} onChange={(event) => changeType(event.target.value as StandardButtonActionIntent)} className={fieldClass}>{actions.map((action) => <option key={action.kind} value={action.kind}>{action.label}</option>)}</select></Field>
    {selected.actionType === "internal_page" ? <Field label="Destination Page"><StudioInternalPagePicker pages={model.experiencePages} value={selected.destinationRef} onChange={(pageId) => updateTile({ destinationRef: pageId }, "Changed Compact Action Tile Page destination")} testId="compact-tile-page-destination" /></Field> : <Field label="Destination"><input value={selected.destinationRef} onChange={(event) => updateTile({ destinationRef: event.target.value }, "Changed Compact Action Tile destination")} placeholder="Enter destination" className={fieldClass} data-testid="compact-tile-destination" /></Field>}
    <p className="text-[10px] leading-4 text-white/38">Tile identity stays stable when its Action, destination, label, or order changes.</p>
  </div>;
}

function AppearanceEditor({ state, commit, selected, updateTile }: { state: CompactActionGridState; commit: (next: CompactActionGridState, label: string) => void; selected: CompactActionTile | null; updateTile: (patch: Partial<CompactActionTile>, label: string) => void }) {
  return <div className="space-y-3"><Field label="Presentation"><select value={state.presentation} onChange={(event) => commit({ ...state, presentation: event.target.value === "neutral-icon" ? "neutral-icon" : "everencore-love-and-theft-pick" }, "Changed Compact Action Grid presentation")} className={fieldClass}><option value="everencore-love-and-theft-pick">Love & Theft mastered pick</option><option value="neutral-icon">Neutral icon tile</option></select></Field>
    {selected ? <><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/38">Selected Tile icon</p><StudioIconDiscovery currentIcon={selected.iconAssetRef} intentQuery={selected.actionType} onSelect={(asset) => updateTile({ iconAssetRef: asset.canonicalId }, `Changed ${selected.label} icon`)} /></> : null}
    <Field label="Label font"><input value={state.labelFontFamily} onChange={(event) => commit({ ...state, labelFontFamily: event.target.value }, "Changed Compact Action Grid typography")} className={fieldClass} /></Field>
    <div className="grid grid-cols-2 gap-2"><Field label="Label size"><input type="number" min={9} max={28} value={state.labelFontSizePx} onChange={(event) => commit({ ...state, labelFontSizePx: Number(event.target.value) }, "Changed Compact Action Grid label size")} className={fieldClass} /></Field><Field label="Weight"><input type="number" min={300} max={900} step={100} value={state.labelFontWeight} onChange={(event) => commit({ ...state, labelFontWeight: Number(event.target.value) }, "Changed Compact Action Grid label weight")} className={fieldClass} /></Field></div>
  </div>;
}

function LayoutEditor({ state, commit }: { state: CompactActionGridState; commit: (next: CompactActionGridState, label: string) => void }) {
  return <div className="space-y-3"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/38">Columns · never five</p><div className="grid grid-cols-3 gap-1">{([2,3,4] as const).map((columns) => <button key={columns} type="button" aria-pressed={state.columns===columns} onClick={() => commit({...state,columns},`Changed Compact Action Grid to ${columns} columns`)} className="min-h-10 rounded-xl bg-white/5 text-xs aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">{columns}</button>)}</div>
    <Field label="Density"><select value={state.density} onChange={(event) => commit({...state,density:event.target.value as CompactActionGridState["density"]},"Changed Compact Action Grid density")} className={fieldClass}><option value="compact">Compact</option><option value="standard">Standard</option><option value="roomy">Roomy</option></select></Field>
    <div className="grid grid-cols-2 gap-2"><Field label="Column gap"><input type="number" min={0} max={40} value={state.columnGapPx} onChange={(event) => commit({...state,columnGapPx:Number(event.target.value)},"Changed Compact Action Grid column gap")} className={fieldClass} /></Field><Field label="Row gap"><input type="number" min={0} max={48} value={state.rowGapPx} onChange={(event) => commit({...state,rowGapPx:Number(event.target.value)},"Changed Compact Action Grid row gap")} className={fieldClass} /></Field></div>
    <Field label="Label alignment"><select value={state.labelAlign} onChange={(event)=>commit({...state,labelAlign:event.target.value as CompactActionGridState["labelAlign"]},"Changed Compact Action Grid alignment")} className={fieldClass}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Field>
  </div>;
}

function StateEditor({ model, selected, updateTile }: { model: CardEditorLiveModel; selected: CompactActionTile | null; updateTile: (patch: Partial<CompactActionTile>, label: string) => void }) {
  if (!selected) return null;
  const behavior = selected.lockedBehavior || { mode: "message" as const, message: "This action requires additional access." };
  return <div className="space-y-3"><Toggle label="NEW badge" checked={Boolean(selected.new)} onChange={(newValue) => updateTile({ new: newValue }, "Changed Compact Action Tile NEW state")} /><Toggle label="Active state" checked={Boolean(selected.active)} onChange={(active) => updateTile({ active }, "Changed Compact Action Tile active state")} /><Toggle label="Locked" checked={Boolean(selected.locked)} onChange={(locked) => updateTile({ locked, lockedBehavior: locked ? behavior : selected.lockedBehavior }, "Changed Compact Action Tile lock state")} /><Toggle label="Hidden" checked={Boolean(selected.hidden)} onChange={(hidden) => updateTile({ hidden }, "Changed Compact Action Tile visibility")} />
    {selected.locked ? <><Field label="Locked behavior"><select value={behavior.mode} onChange={(event) => updateTile({ lockedBehavior: { ...behavior, mode: event.target.value as typeof behavior.mode } }, "Changed Compact Action Tile locked behavior")} className={fieldClass}><option value="none">No response</option><option value="hidden">Hidden</option><option value="message">Message</option><option value="cta">Message + CTA</option></select></Field>{behavior.mode === "message" || behavior.mode === "cta" ? <Field label="Locked message"><textarea value={behavior.message || ""} onChange={(event)=>updateTile({lockedBehavior:{...behavior,message:event.target.value}},"Changed Compact Action Tile locked message")} className={`${fieldClass} min-h-20 py-2`} /></Field> : null}{behavior.mode === "cta" ? <><Field label="CTA label"><input value={behavior.ctaLabel || ""} onChange={(event)=>updateTile({lockedBehavior:{...behavior,ctaLabel:event.target.value}},"Changed locked CTA label")} className={fieldClass} /></Field><Field label="CTA action"><select value={behavior.ctaDestinationType || "external"} onChange={(event) => updateTile({ lockedBehavior: { ...behavior, ctaDestinationType: event.target.value as "external" | "internal_page", ctaDestinationRef: "" } }, "Changed locked CTA Action")} className={fieldClass}><option value="external">Website</option><option value="internal_page">Internal Page</option></select></Field>{behavior.ctaDestinationType === "internal_page" ? <Field label="Destination Page"><StudioInternalPagePicker pages={model.experiencePages} value={behavior.ctaDestinationRef || ""} onChange={(pageId) => updateTile({ lockedBehavior: { ...behavior, ctaDestinationType: "internal_page", ctaDestinationRef: pageId } }, "Mapped locked CTA to Experience Page")} testId="compact-tile-locked-cta-page" /></Field> : <Field label="CTA destination"><input value={behavior.ctaDestinationRef || ""} onChange={(event)=>updateTile({lockedBehavior:{...behavior,ctaDestinationType:"external",ctaDestinationRef:event.target.value}},"Changed locked CTA destination")} className={fieldClass} /></Field>}</> : null}</> : null}
  </div>;
}

function IdentityEditor({ state, selected }: { state: CompactActionGridState; selected: CompactActionTile | null }) { return <div className="space-y-2 text-[10px] leading-4 text-white/48"><p><strong className="text-white/72">Grid component</strong><br />{state.componentId}</p><p><strong className="text-white/72">Grid analytics</strong><br />{state.analyticsId}</p>{selected ? <><p><strong className="text-white/72">Tile component</strong><br />{selected.componentId}</p><p><strong className="text-white/72">Action</strong><br />{selected.actionId}</p><p><strong className="text-white/72">Analytics</strong><br />{selected.analyticsId}</p></> : null}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[10px] font-medium text-white/62"><span className="mb-1 block">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 items-center justify-between rounded-xl bg-white/[.035] px-3 text-[10px]"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>; }
const fieldClass = "mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-white/[.045] px-3 text-xs text-white outline-none focus:border-[#b8ff2c]/55";
const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 text-xs hover:bg-white/[.075] disabled:opacity-35";
