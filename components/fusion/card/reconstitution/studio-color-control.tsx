"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isStudioHex, normalizeStudioHex, STUDIO_COLOR_AUTHORITY, STUDIO_SEMANTIC_DOCUMENT_COLORS, studioColorPalette, type StudioColorProvenance } from "@/lib/fusion/creative-studio/platform/color-authority";

export function StudioColorControl({ label, value, source = "custom", brandColors = [], documentColors = STUDIO_SEMANTIC_DOCUMENT_COLORS, onChange, resetValue, resetLabel = "Reset" }: {
  label: string;
  value: string;
  source?: StudioColorProvenance;
  brandColors?: readonly string[];
  documentColors?: readonly string[];
  onChange: (value: string, source: StudioColorProvenance) => void;
  resetValue?: string;
  resetLabel?: string;
}) {
  const canonical = normalizeStudioHex(value);
  const [editing, setEditing] = useState<{ base: string; value: string } | null>(null);
  const draft = editing?.base === canonical ? editing.value : canonical;
  const commit = () => {
    if (!isStudioHex(draft)) { setEditing(null); return; }
    onChange(normalizeStudioHex(draft), "custom");
    setEditing(null);
  };
  const brands = studioColorPalette(brandColors);
  const documents = studioColorPalette(documentColors);
  return <section className="rounded-xl border border-white/8 bg-white/[.035] p-2.5" data-color-authority={STUDIO_COLOR_AUTHORITY} data-color-source={source}>
    <div className="flex items-center gap-2"><label className="grid h-9 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-white/14" style={{ background: canonical }}><span className="sr-only">Choose {label}</span><input type="color" value={canonical} onChange={(event) => onChange(normalizeStudioHex(event.currentTarget.value), "custom")} className="h-14 w-14 cursor-pointer opacity-0" /></label><label className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[.1em] text-white/52">{label}<input value={draft} onChange={(event) => setEditing({ base: canonical, value: event.currentTarget.value })} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }} aria-invalid={!isStudioHex(draft)} className={cn("mt-1 h-9 w-full rounded-lg border bg-black/20 px-2 font-mono text-[11px] font-normal tracking-normal text-white outline-none", isStudioHex(draft) ? "border-white/12 focus:border-[#8bdcff]/55" : "border-rose-300/60")} /></label></div>
    <p className="mt-1.5 text-[8px] uppercase tracking-[.12em] text-white/30">Source · {source}</p>
    {brands.length ? <Palette label="Brand" colors={brands} onPick={(color) => onChange(color, "brand")} /> : null}
    {documents.length ? <Palette label="Document" colors={documents} onPick={(color) => onChange(color, "document")} /> : null}
    {resetValue ? <button type="button" onClick={() => onChange(normalizeStudioHex(resetValue), "default")} className="mt-2 flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[9px] font-semibold text-[#d8ff82] hover:bg-[#b8ff2c]/8"><RotateCcw className="h-3 w-3" />{resetLabel}</button> : null}
  </section>;
}

function Palette({ label, colors, onPick }: { label: string; colors: readonly string[]; onPick: (color: string) => void }) {
  return <div className="mt-2 flex items-center gap-1.5"><span className="w-14 text-[8px] uppercase tracking-[.1em] text-white/32">{label}</span>{colors.map((color) => <button key={color} type="button" onClick={() => onPick(color)} className="h-7 w-7 rounded-full border border-white/18 shadow-inner" style={{ background: color }} aria-label={`Use ${label} color ${color}`} />)}</div>;
}
