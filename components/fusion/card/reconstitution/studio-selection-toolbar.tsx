"use client";

import { ArrowDown, ArrowLeftRight, ArrowUp, Copy, Ellipsis, Move, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

export type ButtonInspectorSection = "content" | "action" | "appearance" | "layout" | "accessibility" | "advanced";
export type ButtonPositionCommand = "center-x" | "center-y" | "backward" | "forward";

export function StudioSelectionToolbar({ onOpenSection, onApplyPresentation, onDuplicate, onDelete, onPosition }: {
  onOpenSection: (section: ButtonInspectorSection) => void;
  onApplyPresentation: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPosition: (command: ButtonPositionCommand) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  return <div className="relative z-30 flex max-w-full items-center gap-0.5 rounded-2xl bg-[#0b111b]/88 p-1.5 text-white shadow-[0_14px_45px_rgba(0,0,0,.32)] backdrop-blur-xl" role="toolbar" aria-label="Selected Button commands" data-testid="studio-selection-toolbar">
    <ToolbarButton label="Edit" icon={Pencil} onClick={() => onOpenSection("content")} testId="studio-toolbar-edit" />
    <ToolbarButton label="Change style" icon={RefreshCw} onClick={onApplyPresentation} testId="studio-toolbar-apply" />
    <ToolbarButton label="Position" icon={Move} onClick={() => { setPositionOpen((value) => !value); setMoreOpen(false); }} testId="studio-toolbar-position" />
    <ToolbarButton label="Duplicate" icon={Copy} onClick={onDuplicate} testId="studio-toolbar-duplicate" />
    <button type="button" onClick={() => { setMoreOpen((value) => !value); setPositionOpen(false); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/65 hover:bg-white/8 hover:text-white" aria-label="More Button commands" data-testid="studio-toolbar-more"><Ellipsis className="h-4 w-4" /></button>
    <span hidden data-tapit-slot="selection" aria-hidden>•••</span>
    {positionOpen ? <div className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-60 -translate-x-1/2 rounded-2xl bg-[#0b111b]/98 p-2 shadow-2xl backdrop-blur-xl" data-testid="studio-position-menu">
      <p className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[.14em] text-white/38">Position</p>
      <div className="grid grid-cols-2 gap-1"><PositionButton label="Center across" icon={ArrowLeftRight} onClick={() => { onPosition("center-x"); setPositionOpen(false); }} /><PositionButton label="Center down" icon={ArrowDown} onClick={() => { onPosition("center-y"); setPositionOpen(false); }} /><PositionButton label="Send backward" icon={ArrowDown} onClick={() => { onPosition("backward"); setPositionOpen(false); }} /><PositionButton label="Bring forward" icon={ArrowUp} onClick={() => { onPosition("forward"); setPositionOpen(false); }} /></div>
      <button type="button" onClick={() => { onOpenSection("layout"); setPositionOpen(false); }} className="mt-1 min-h-9 w-full rounded-xl px-3 text-left text-xs text-[#d8ff82] hover:bg-white/7">Exact layout…</button>
    </div> : null}
    {moreOpen ? <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 rounded-2xl bg-[#0b111b]/98 p-1.5 shadow-2xl backdrop-blur-xl" data-testid="studio-toolbar-more-menu"><button type="button" onClick={() => { onDelete(); setMoreOpen(false); }} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs text-red-300 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" />Delete Button</button></div> : null}
  </div>;
}

function ToolbarButton({ label, icon: Icon, onClick, testId }: { label: string; icon: typeof Pencil; onClick: () => void; testId: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] text-white/68 hover:bg-white/8 hover:text-white" data-testid={testId}><Icon className="h-3.5 w-3.5" /><span className="hidden lg:inline">{label}</span></button>;
}
function PositionButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Move; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] text-white/62 hover:bg-white/8 hover:text-white"><Icon className="h-3.5 w-3.5" />{label}</button>; }
