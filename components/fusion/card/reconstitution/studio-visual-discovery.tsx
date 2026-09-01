"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StudioVisualChoice = {
  id: string;
  label: string;
  sourceLabel: string;
  preview: ReactNode;
  selected?: boolean;
};

export function StudioVisualDiscovery({
  label,
  query,
  onQueryChange,
  choices,
  onSelect,
  emptyMessage,
  compact = false,
  initialVisibleCount,
  children,
}: {
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  choices: readonly StudioVisualChoice[];
  onSelect: (id: string) => void;
  emptyMessage: string;
  compact?: boolean;
  initialVisibleCount?: number;
  children?: ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleChoices = initialVisibleCount && !showAll && !query.trim() ? choices.slice(0, initialVisibleCount) : choices;
  return <section className="space-y-3" aria-label={label} data-testid="studio-visual-discovery">
    <label className="flex h-10 items-center gap-2 rounded-xl bg-white/[.055] px-3 focus-within:ring-1 focus-within:ring-[#b8ff2c]/45"><Search className="h-4 w-4 text-white/35" /><span className="sr-only">Search {label}</span><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${label}`} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/28" /></label>
    {children}
    {choices.length ? <><div className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-3")}>{visibleChoices.map((choice) => <button key={choice.id} type="button" aria-pressed={choice.selected} aria-label={`${choice.label}${choice.sourceLabel ? ` · ${choice.sourceLabel}` : ""}`} title={choice.label} onClick={() => onSelect(choice.id)} className={cn("group overflow-hidden rounded-xl bg-white/[.045] text-center transition hover:-translate-y-0.5 hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ff2c]", compact ? "aspect-square min-h-[66px] p-1.5" : "min-h-[82px] p-2", choice.selected && "bg-[#b8ff2c]/10 ring-1 ring-[#b8ff2c]/55")} data-testid={`studio-visual-choice-${choice.id.replace(/[^a-z0-9_-]+/gi, "-")}`}><span className={cn("mx-auto grid place-items-center text-white", compact ? "h-9 w-9" : "h-8 w-8")}>{choice.preview}</span><strong className={cn("line-clamp-1 block font-medium", compact ? "mt-1 text-[8px]" : "mt-1.5 text-[9px]")}>{choice.label}</strong>{compact ? null : <span className="mt-0.5 block text-[8px] text-white/32">{choice.sourceLabel}</span>}</button>)}</div>{initialVisibleCount && !query.trim() && choices.length > initialVisibleCount ? <button type="button" onClick={() => setShowAll((value) => !value)} className="text-[10px] font-medium text-[#d8ff82] hover:underline">{showAll ? "Show recommended" : `View all ${choices.length}`}</button> : null}</> : <p className="rounded-xl bg-white/[.035] p-4 text-center text-[10px] leading-4 text-white/42">{emptyMessage}</p>}
  </section>;
}
