"use client";

/* eslint-disable @next/next/no-img-element -- catalog previews preserve canonical assets */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { StudioAuthoringVisualOption } from "@/lib/fusion/creative-studio/platform/authoring-contract";
import { sanitizeSvg } from "@/lib/fusion/creative-studio/icon-asset";
import { cn } from "@/lib/utils";
import { StudioTransientOverlay } from "./studio-transient-overlay";
import { studioCatalogBrowserEvent } from "@/lib/fusion/creative-studio/platform/catalog-browser";

function VisualPreview({ source, className }: { source?: string; className: string }) {
  if (!source) return null;
  const svg=source.trim().startsWith("<svg")?sanitizeSvg(source):null;
  return svg
    ? <span className={`${className} [&>svg]:h-full [&>svg]:w-full`} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
    : <img src={source} alt="" className={className} />;
}

function optionCategory(option: StudioAuthoringVisualOption): string | undefined {
  const value = option.metadata?.category;
  return typeof value === "string" && value ? value : undefined;
}

export function StudioTransientVisualBrowser({
  label,
  value,
  options,
  searchable = true,
  onSelect,
  adapterId = "curated-plugs:contextual",
  pathLabel,
}: {
  label: string;
  value?: string;
  options: readonly StudioAuthoringVisualOption[];
  searchable?: boolean;
  onSelect: (option: StudioAuthoringVisualOption) => void;
  adapterId?: string;
  pathLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.id === value);
  const nearby = options.filter((option) => option.id !== value && option.availability === "enabled").slice(0, 3);
  const categories = useMemo(() => Array.from(new Set(options.map(optionCategory).filter((item): item is string => Boolean(item)))), [options]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => (category === "All" || optionCategory(option) === category) && (!needle || `${option.label} ${option.description ?? ""} ${optionCategory(option) ?? ""}`.toLowerCase().includes(needle)));
  }, [category, options, query]);
  const close = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(studioCatalogBrowserEvent("close", adapterId));
  }, [adapterId]);
  const openBrowser = () => {
    window.dispatchEvent(studioCatalogBrowserEvent("open", adapterId));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => searchRef.current?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [close, open]);

  return <>
    <div className="grid grid-cols-4 gap-1.5" data-testid="studio-visual-browser-resting-state">
      <div className="col-span-1 min-w-0 rounded-xl border border-[#b8ff2c]/35 bg-[#b8ff2c]/7 p-1.5 text-center" aria-label={`Current ${label}: ${selected?.label ?? "none"}`}><span className="mx-auto grid h-8 w-8 place-items-center"><VisualPreview source={selected?.previewRef} className="h-8 w-8 object-contain" /></span><strong className="mt-1 block truncate text-[8px] text-[#e7ffc2]">{selected?.label ?? "Current"}</strong></div>
      {nearby.map((option) => <button key={option.id} type="button" onClick={() => onSelect(option)} className="min-w-0 rounded-xl border border-white/8 bg-white/[.035] p-1.5 text-center transition hover:border-[#8bdcff]/35 hover:bg-white/[.07]" title={option.label}><span className="mx-auto grid h-8 w-8 place-items-center"><VisualPreview source={option.previewRef} className="h-8 w-8 object-contain" /></span><strong className="mt-1 block truncate text-[8px] text-white/58">{option.label}</strong></button>)}
    </div>
    <button ref={triggerRef} type="button" onClick={openBrowser} className="mt-1.5 flex min-h-10 w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[.045] px-2 text-left transition hover:border-[#8bdcff]/30 hover:bg-white/[.07]" aria-haspopup="dialog" aria-expanded={open} data-testid="studio-visual-browser-trigger">
      <span className="min-w-0 flex-1"><strong className="block truncate text-[10px] text-white/72">Browse all {options.length} {label.toLowerCase()}</strong><span className="text-[8px] text-white/34">Search and compare the full compatible catalog</span></span>
      <span className="rounded-full bg-[#b8ff2c]/10 px-2 py-1 text-[8px] font-semibold text-[#d8ff82]">Browse all</span>
    </button>
    <StudioTransientOverlay open={open} onClose={close} ownerRef={triggerRef} kind="browser"><div className="fixed inset-0 z-[6200] flex items-end justify-center bg-black/58 p-0 backdrop-blur-[2px] md:items-center md:p-6" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }} data-testid="studio-visual-browser-overlay">
      <section role="dialog" aria-modal="true" aria-label={`Browse ${label}`} className="flex max-h-[82dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b111b] shadow-2xl md:rounded-3xl" data-testid="studio-visual-browser" data-catalog-adapter={adapterId}>
        <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-[8px] uppercase tracking-[.12em] text-[#8bdcff]/65">{pathLabel || `Card / ${label}`}</p><h3 className="text-sm font-semibold">{label}</h3><p className="text-[9px] text-white/38">{options.length} compatible choices</p></div><button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label={`Close ${label}`}><X className="h-4 w-4" /></button></header>
        {searchable ? <label className="mx-4 mt-3 flex h-11 items-center gap-2 rounded-xl bg-white/[.055] px-3 ring-1 ring-white/8 focus-within:ring-[#8bdcff]/50"><Search className="h-4 w-4 text-white/35" /><span className="sr-only">Search {label}</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/25" placeholder={`Search all ${label.toLowerCase()}`} /></label> : null}
        {categories.length > 1 ? <div className="mx-4 mt-3 flex gap-1 overflow-x-auto pb-1" aria-label={`${label} categories`}>{["All", ...categories].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={cn("min-h-8 shrink-0 rounded-full border border-white/8 px-2.5 text-[9px] text-white/45", category === item && "border-[#d7ad58]/45 bg-[#d7ad58]/10 text-[#f4deb0]")} data-testid={`visual-category-${item.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{item}</button>)}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" role="listbox" aria-label={label}>{visible.map((option) => <button key={option.id} type="button" role="option" aria-selected={value === option.id} disabled={option.availability !== "enabled"} title={option.disabledReason} onClick={() => { onSelect(option); close(); }} className={cn("relative min-h-24 rounded-xl border border-white/8 bg-white/[.04] p-2 text-center transition hover:border-[#8bdcff]/35 hover:bg-white/[.075] disabled:cursor-not-allowed disabled:opacity-30", value === option.id && "border-[#b8ff2c]/55 bg-[#b8ff2c]/8")}><span className="mx-auto grid h-14 w-14 place-items-center"><VisualPreview source={option.previewRef} className="h-14 w-14 object-contain" /></span><strong className="mt-1 block text-[9px] leading-3 text-white/72">{option.label}</strong>{value === option.id ? <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-[#b8ff2c]" /> : null}</button>)}</div>{!visible.length ? <p className="py-12 text-center text-xs text-white/42">No matching choices.</p> : null}</div>
      </section>
    </div></StudioTransientOverlay>
  </>;
}
