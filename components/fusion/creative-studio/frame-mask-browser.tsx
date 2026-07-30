"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Heart, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FRAME_MASK_CATALOG,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";

export function FrameMaskBrowser({
  value,
  onChange,
}: {
  value: FrameMaskId;
  onChange: (mask: FrameMaskId) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [resourceStatus, setResourceStatus] = useState<"DRAFT" | "APPROVED">(
    "DRAFT"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadLibrary = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/creative-resources?kind=MASK_FAVORITES",
        { cache: "no-store" }
      );
      const body = (await response.json()) as {
        resources?: {
          id: string;
          status: "DRAFT" | "APPROVED";
          currentRevision?: {
            payload?: {
              value?: { maskIds?: string[]; recentMaskIds?: string[] };
            };
          };
        }[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Mask library unavailable");
      const resource = body.resources?.[0];
      setResourceId(resource?.id || null);
      setResourceStatus(resource?.status || "DRAFT");
      setFavorites(resource?.currentRevision?.payload?.value?.maskIds || []);
      setRecent(resource?.currentRevision?.payload?.value?.recentMaskIds || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Mask library unavailable");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadLibrary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLibrary]);
  const categories = useMemo(
    () => [
      "All",
      "Favorites",
      "Recent",
      "Brand approved",
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
        category === "Brand approved" &&
        (resourceStatus !== "APPROVED" || !favorites.includes(mask.id))
      ) {
        return false;
      }
      if (
        !["All", "Favorites", "Recent", "Brand approved"].includes(category) &&
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
  }, [category, favorites, query, recent, resourceStatus]);

  async function persist(nextFavorites: string[], nextRecent: string[]) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        schemaVersion: 1,
        resourceKind: "MASK_FAVORITES",
        value: { maskIds: nextFavorites, recentMaskIds: nextRecent },
        metadata: { tags: ["personal"] },
      };
      const response = await fetch(
        resourceId
          ? `/api/creative-resources/${resourceId}/revisions`
          : "/api/creative-resources",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            resourceId
              ? { payload }
              : { kind: "MASK_FAVORITES", name: "My mask library", payload }
          ),
        }
      );
      const body = (await response.json()) as {
        resource?: { id: string };
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Mask library could not be saved");
      if (body.resource?.id) setResourceId(body.resource.id);
      setResourceStatus("DRAFT");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Mask library could not be saved"
      );
    } finally {
      setSaving(false);
    }
  }

  function apply(mask: FrameMaskId) {
    const nextRecent = [mask, ...recent.filter((id) => id !== mask)].slice(0, 12);
    setRecent(nextRecent);
    onChange(mask);
    void persist(favorites, nextRecent);
  }

  function toggleFavorite(mask: FrameMaskId) {
    const next = favorites.includes(mask)
      ? favorites.filter((id) => id !== mask)
      : [mask, ...favorites];
    setFavorites(next);
    void persist(next, recent);
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
        onKeyDown={(event) => {
          if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
            return;
          }
          const options = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              'button[role="option"]'
            )
          );
          const current = options.indexOf(document.activeElement as HTMLButtonElement);
          if (current < 0) return;
          event.preventDefault();
          const delta =
            event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowLeft"
                ? -1
                : event.key === "ArrowDown"
                  ? 2
                  : -2;
          options[(current + delta + options.length) % options.length]?.focus();
        }}
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
                {resourceStatus === "APPROVED" && favorites.includes(mask.id) ? (
                  <span className="flex items-center gap-1 text-[9px] text-[#b8ff2c]">
                    <Check className="h-2.5 w-2.5" />
                    Brand approved
                  </span>
                ) : mask.approvedByPlatform !== false ? (
                  <span className="text-[9px] text-white/40">Safe platform registry</span>
                ) : null}
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
      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => apply("rectangle")}
          data-testid="mask-reset"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset mask
        </Button>
        {resourceId && favorites.length > 0 && resourceStatus !== "APPROVED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSaving(true);
              void fetch(`/api/creative-resources/${resourceId}/approve`, {
                method: "POST",
              })
                .then(async (response) => {
                  if (!response.ok) {
                    const body = (await response.json()) as { error?: string };
                    throw new Error(body.error || "Brand approval failed");
                  }
                  setResourceStatus("APPROVED");
                })
                .catch((approvalError: unknown) =>
                  setError(
                    approvalError instanceof Error
                      ? approvalError.message
                      : "Brand approval failed"
                  )
                )
                .finally(() => setSaving(false));
            }}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Approve favorites for Brand
          </Button>
        ) : null}
        <span className="text-[10px] text-white/45" role={saving ? "status" : undefined}>
          {saving ? "Saving…" : "Saved to workspace"}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

