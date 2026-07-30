"use client";

import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FRAME_MASK_CATALOG,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";

const FAVORITES_KEY = "tapconnect.masks.favorites.v1";
const RECENT_KEY = "tapconnect.masks.recent.v1";

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Optional convenience state.
  }
}

export function FrameMaskBrowser({
  value,
  onChange,
}: {
  value: FrameMaskId;
  onChange: (mask: FrameMaskId) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>(() =>
    readIds(FAVORITES_KEY)
  );
  const [recent, setRecent] = useState<string[]>(() => readIds(RECENT_KEY));
  const categories = useMemo(
    () => [
      "All",
      "Favorites",
      "Recent",
      ...Array.from(
        new Set(FRAME_MASK_CATALOG.map((mask) => mask.category || "Basic"))
      ),
    ],
    []
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FRAME_MASK_CATALOG.filter((mask) => {
      if (category === "Favorites" && !favorites.includes(mask.id)) return false;
      if (category === "Recent" && !recent.includes(mask.id)) return false;
      if (
        !["All", "Favorites", "Recent"].includes(category) &&
        (mask.category || "Basic") !== category
      ) {
        return false;
      }
      return (
        !q ||
        `${mask.label} ${mask.category || "Basic"}`.toLowerCase().includes(q)
      );
    }).sort((left, right) => {
      const recentDelta = recent.indexOf(left.id) - recent.indexOf(right.id);
      if (recent.includes(left.id) && recent.includes(right.id)) return recentDelta;
      if (recent.includes(left.id)) return -1;
      if (recent.includes(right.id)) return 1;
      return left.label.localeCompare(right.label);
    });
  }, [category, favorites, query, recent]);

  function apply(mask: FrameMaskId) {
    const nextRecent = [mask, ...recent.filter((id) => id !== mask)].slice(0, 12);
    setRecent(nextRecent);
    writeIds(RECENT_KEY, nextRecent);
    onChange(mask);
  }

  function toggleFavorite(mask: FrameMaskId) {
    const next = favorites.includes(mask)
      ? favorites.filter((id) => id !== mask)
      : [mask, ...favorites];
    setFavorites(next);
    writeIds(FAVORITES_KEY, next);
  }

  return (
    <div className="space-y-3" data-testid="frame-mask-browser">
      <label className="relative block">
        <span className="sr-only">Search frame masks</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search masks"
          className="pl-9"
          data-testid="mask-search"
        />
      </label>
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        aria-label="Mask category"
        className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
        data-testid="mask-category"
      >
        {categories.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <div
        className="grid grid-cols-2 gap-2"
        role="listbox"
        aria-label="Frame masks"
      >
        {visible.map((mask) => {
          const selected = value === mask.id;
          const favorite = favorites.includes(mask.id);
          return (
            <div
              key={mask.id}
              className={`relative overflow-hidden rounded-lg border ${
                selected ? "border-white/50 bg-white/10" : "border-white/10"
              }`}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className="flex min-h-24 w-full flex-col items-center justify-center gap-1 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                onClick={() => apply(mask.id)}
                data-testid={`composition-mask-${mask.id}`}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="h-14 w-14"
                  aria-hidden
                  focusable="false"
                >
                  <path
                    d={mask.path}
                    fill={selected ? "#ffffff" : "#94a3b8"}
                  />
                </svg>
                <span className="text-[10px]">{mask.label}</span>
                <span className="text-[9px] text-white/40">
                  {mask.category || "Basic"}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${favorite ? "Remove" : "Add"} ${mask.label} favorite`}
                className="absolute right-1 top-1 grid min-h-9 min-w-9 place-items-center rounded-full bg-black/65"
                onClick={() => toggleFavorite(mask.id)}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${favorite ? "fill-white" : ""}`}
                  aria-hidden
                />
              </button>
            </div>
          );
        })}
      </div>
      {!visible.length ? (
        <p className="py-6 text-center text-xs text-white/45">
          No masks match this search.
        </p>
      ) : null}
    </div>
  );
}

