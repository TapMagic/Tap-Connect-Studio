"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { TapExperiencePage } from "@/lib/brand/tap-card";
import { internalPageDestinationOptions, type InternalPageDestinationStatus } from "@/lib/fusion/card/internal-page-destination";

const GROUPS: ReadonlyArray<{ status: InternalPageDestinationStatus; label: string }> = [
  { status: "in-navigation", label: "In Navigation" },
  { status: "other-page", label: "Other Pages" },
  { status: "unavailable", label: "Unavailable Pages" },
];

export function StudioInternalPagePicker({ pages = [], value, onChange, testId = "studio-internal-page-picker" }: {
  pages?: readonly TapExperiencePage[];
  value: string;
  onChange: (pageId: string) => void;
  testId?: string;
}) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => internalPageDestinationOptions(pages, query), [pages, query]);
  const selectedStillPresent = options.some((option) => option.pageId === value);
  return <div className="space-y-2" data-testid={testId}>
    <label className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.045] px-3 focus-within:border-[#b8ff2c]/55">
      <Search className="h-3.5 w-3.5 text-white/35" aria-hidden />
      <span className="sr-only">Search Experience Pages</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Pages" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30" data-testid={`${testId}-search`} />
    </label>
    <select value={selectedStillPresent ? value : ""} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-xl border border-white/10 bg-[#111923] px-3 text-xs text-white outline-none focus:border-[#b8ff2c]/55" data-testid={`${testId}-select`}>
      <option value="">Choose a Page…</option>
      {GROUPS.map((group) => {
        const grouped = options.filter((option) => option.status === group.status);
        return grouped.length ? <optgroup key={group.status} label={group.label} data-testid={`${testId}-${group.status}`}>
          {grouped.map((option) => <option key={option.pageId} value={option.pageId} disabled={!option.selectable}>{option.title}{option.navLabel !== option.title ? ` · ${option.navLabel}` : ""}{option.status === "unavailable" ? " · unavailable to visitors" : option.detail.includes("Locked") ? " · locked experience" : ""}</option>)}
        </optgroup> : null;
      })}
    </select>
    <p className="text-[9px] leading-4 text-white/38">Pages hidden from bottom navigation remain valid destinations. Visitor-hidden Pages are unavailable.</p>
  </div>;
}
