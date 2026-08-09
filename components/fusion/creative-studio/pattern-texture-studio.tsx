"use client";

import { useMemo, useState } from "react";
import { Heart, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SURFACE_PATTERN,
  SURFACE_PATTERN_CATALOG,
  surfacePatternStyle,
  type SurfacePatternKind,
  type SurfacePatternModel,
} from "@/lib/fusion/creative-studio/patterns";

const FAVORITES_KEY = "tapconnect.patterns.favorites.v1";

function initialFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function PatternTextureStudio({
  value,
  kind,
  onChange,
}: {
  value?: SurfacePatternModel | null;
  kind: SurfacePatternKind;
  onChange: (value: SurfacePatternModel, label: string) => void;
}) {
  const model = value || { ...DEFAULT_SURFACE_PATTERN, kind };
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          SURFACE_PATTERN_CATALOG.filter((item) => item.kind === kind).map(
            (item) => item.category
          )
        )
      ),
    ],
    [kind]
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SURFACE_PATTERN_CATALOG.filter(
      (item) =>
        item.kind === kind &&
        (category === "All" || item.category === category) &&
        (!q || `${item.label} ${item.category}`.toLowerCase().includes(q))
    ).sort(
      (left, right) =>
        Number(favorites.includes(right.id)) - Number(favorites.includes(left.id))
    );
  }, [category, favorites, kind, query]);

  function patch(patchValue: Partial<SurfacePatternModel>, label: string) {
    onChange({ ...model, ...patchValue, kind }, label);
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [id, ...favorites];
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Favorites are optional convenience state.
    }
  }

  return (
    <section className="space-y-4" data-testid={`${kind}-studio`}>
      <label className="relative block">
        <span className="sr-only">Search {kind}s</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${kind}s`}
          className="pl-9"
        />
      </label>
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        aria-label={`${kind} category`}
        className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
      >
        {categories.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        {visible.map((definition) => {
          const preview = {
            ...model,
            id: definition.id,
            kind: definition.kind,
          };
          const selected = model.id === definition.id;
          return (
            <div
              key={definition.id}
              className={`relative overflow-hidden rounded-lg border ${
                selected ? "border-white/45 ring-2 ring-white/15" : "border-white/10"
              }`}
            >
              <button
                type="button"
                className="block w-full text-left"
                data-testid={`surface-pattern-${definition.id}`}
                onClick={() =>
                  onChange(preview, `Applied ${definition.label} ${kind}`)
                }
                aria-pressed={selected}
              >
                <span className="block h-16" style={surfacePatternStyle(preview)} />
                <span className="block truncate px-2 py-1.5 text-[10px]">
                  {definition.label}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${favorites.includes(definition.id) ? "Remove" : "Add"} ${
                  definition.label
                } favorite`}
                onClick={() => toggleFavorite(definition.id)}
                className="absolute right-1 top-1 grid min-h-9 min-w-9 place-items-center rounded-full bg-black/65"
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    favorites.includes(definition.id) ? "fill-white" : ""
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-3">
        <Label className="text-xs">Scale {Math.round(model.scale * 100)}%</Label>
        <input
          type="range"
          min={25}
          max={300}
          value={Math.round(model.scale * 100)}
          className="w-full"
          onChange={(event) =>
            patch({ scale: Number(event.target.value) / 100 }, `Scaled ${kind}`)
          }
        />
        <Label className="text-xs">Rotation {Math.round(model.rotation)}°</Label>
        <input
          type="range"
          min={0}
          max={359}
          value={model.rotation}
          className="w-full"
          onChange={(event) =>
            patch({ rotation: Number(event.target.value) }, `Rotated ${kind}`)
          }
        />
        <Label className="text-xs">Opacity {Math.round(model.opacity * 100)}%</Label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(model.opacity * 100)}
          className="w-full"
          onChange={(event) =>
            patch({ opacity: Number(event.target.value) / 100 }, `Changed ${kind} opacity`)
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs">
            <span>Foreground</span>
            <Input
              type="color"
              value={model.foreground}
              onChange={(event) =>
                patch({ foreground: event.target.value }, `Changed ${kind} color`)
              }
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>Background</span>
            <Input
              type="color"
              value={model.background}
              onChange={(event) =>
                patch({ background: event.target.value }, `Changed ${kind} background`)
              }
            />
          </label>
        </div>
        <Label className="text-xs">Blend mode</Label>
        <select
          value={model.blendMode}
          onChange={(event) =>
            patch(
              {
                blendMode: event.target.value as SurfacePatternModel["blendMode"],
              },
              `Changed ${kind} blend mode`
            )
          }
          className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
        >
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft light</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...DEFAULT_SURFACE_PATTERN, kind }, `Reset ${kind} to Brand`)
          }
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset to Brand
        </Button>
      </div>
    </section>
  );
}

