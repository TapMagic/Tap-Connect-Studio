"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TapitContextOperation = {
  id: string;
  label: string;
  description: string;
  onSelect: () => void;
};

export function StudioTapitAffordance({ context, operations, align = "right" }: {
  context: string;
  operations: readonly TapitContextOperation[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  if (!operations.length) return null;
  return <div className="relative" data-testid={`studio-tapit-${context}`}>
    <button type="button" aria-label={`Ask tApIt about ${context}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="group flex h-9 items-center gap-2 rounded-full bg-white/[.055] px-2.5 text-[10px] text-white/62 transition hover:bg-white/[.09] hover:text-white">
      <span className="relative block h-4 w-6" aria-hidden>
        <i className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-[#b8ff2c] shadow-[0_0_10px_rgba(184,255,44,.45)]" />
        <i className="absolute left-[7px] top-0 h-2.5 w-2.5 rounded-full bg-cyan-300/90" />
        <i className="absolute left-[14px] top-1.5 h-2.5 w-2.5 rounded-full bg-violet-400/90" />
      </span>
      <span>tApIt</span>
    </button>
    {open ? <div className={cn("absolute top-[calc(100%+8px)] z-[2100] w-64 rounded-2xl bg-[#111925]/98 p-2 shadow-[0_18px_55px_rgba(0,0,0,.52)] ring-1 ring-white/8 backdrop-blur-xl", align === "right" ? "right-0" : "left-0")}>
      <div className="flex items-center justify-between px-2 pb-1 pt-1"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#d8ff82]">Contextual help</p><button type="button" onClick={() => setOpen(false)} aria-label="Close tApIt" className="grid h-7 w-7 place-items-center rounded-full text-white/45 hover:bg-white/8 hover:text-white"><X className="h-3.5 w-3.5" /></button></div>
      {operations.map((operation) => <button key={operation.id} type="button" className="mt-1 w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/[.065]" onClick={() => { operation.onSelect(); setOpen(false); }}><strong className="block text-[11px] text-white/88">{operation.label}</strong><span className="mt-0.5 block text-[9px] leading-4 text-white/42">{operation.description}</span></button>)}
    </div> : null}
  </div>;
}
