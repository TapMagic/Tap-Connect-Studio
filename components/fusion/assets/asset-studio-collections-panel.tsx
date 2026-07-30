"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderPlus,
  GripVertical,
  Pin,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionDto } from "@/lib/fusion/assets/collection-types";

export type SmartViewId =
  | "all"
  | "yours"
  | "brand"
  | "recent"
  | "favorites"
  | "unused"
  | "needs_approval"
  | "needs_alt"
  | "rights_review";

const SMART_VIEWS: { id: SmartViewId; label: string }[] = [
  { id: "all", label: "All media" },
  { id: "yours", label: "Your media" },
  { id: "brand", label: "Brand media" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "unused", label: "Unused" },
  { id: "needs_approval", label: "Needs approval" },
  { id: "needs_alt", label: "Needs alt text" },
  { id: "rights_review", label: "Rights need review" },
];

const LOGO_VIEWS: { id: SmartViewId; label: string }[] = [
  { id: "all", label: "Approved logos" },
  { id: "needs_approval", label: "Suggested logos" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
];

export function AssetStudioCollectionsPanel({
  area,
  onAreaChange,
  smartView,
  onSmartViewChange,
  collectionId,
  onCollectionChange,
  selectedAssetIds,
}: {
  area: "media" | "logos";
  onAreaChange: (area: "media" | "logos") => void;
  smartView: SmartViewId;
  onSmartViewChange: (view: SmartViewId) => void;
  collectionId: string | null;
  onCollectionChange: (id: string | null) => void;
  selectedAssetIds: string[];
}) {
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [newName, setNewName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/media/collections");
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.collections)) {
      setCollections(data.collections);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function create() {
    if (!newName.trim()) return;
    setError(null);
    const res = await fetch("/api/media/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not create Collection");
      return;
    }
    setNewName("");
    await reload();
  }

  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = collections.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setCollections((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return next.map((id, sortOrder) => ({
        ...map.get(id)!,
        sortOrder,
      }));
    });
    await fetch("/api/media/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", orderedIds: next }),
    });
  }

  async function addSelectedTo(collection: string) {
    if (selectedAssetIds.length === 0) return;
    await fetch(`/api/media/collections/${collection}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        mediaAssetIds: selectedAssetIds,
      }),
    });
    await reload();
  }

  async function removeCollection(id: string) {
    await fetch(`/api/media/collections/${id}`, { method: "DELETE" });
    if (collectionId === id) onCollectionChange(null);
    await reload();
  }

  const views = area === "logos" ? LOGO_VIEWS : SMART_VIEWS;

  return (
    <aside
      className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-3"
      data-testid="asset-studio-collections"
    >
      <div
        className="flex gap-1 rounded-lg border border-white/10 p-1"
        role="tablist"
        aria-label="Asset area"
      >
        {(
          [
            ["media", "Media"],
            ["logos", "Logos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={area === id}
            data-testid={`asset-area-${id}`}
            className={cn(
              "flex-1 rounded-md px-2 py-2 text-sm font-medium",
              area === id
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white"
            )}
            onClick={() => {
              onAreaChange(id);
              onCollectionChange(null);
              onSmartViewChange("all");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
          Smart views
        </p>
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            data-testid={`asset-smart-${view.id}`}
            className={cn(
              "flex w-full rounded-md px-2 py-2 text-left text-[13px]",
              !collectionId && smartView === view.id
                ? "bg-white/10 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => {
              onCollectionChange(null);
              onSmartViewChange(view.id);
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
          Collections
        </p>
        <ul className="space-y-1" data-testid="asset-collections-list">
          {collections.map((c) => (
            <li
              key={c.id}
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) void reorder(dragId, c.id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-1 py-1",
                collectionId === c.id
                  ? "border-white/30 bg-white/10"
                  : "border-transparent hover:bg-white/5"
              )}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-[13px] text-white/85"
                data-testid={`asset-collection-${c.id}`}
                onClick={() => onCollectionChange(c.id)}
              >
                {c.name}
                <span className="ml-1 text-[11px] text-white/40">{c.memberCount}</span>
              </button>
              {c.pinned ? (
                <Pin className="h-3 w-3 text-white/40" aria-hidden />
              ) : null}
              {selectedAssetIds.length > 0 ? (
                <button
                  type="button"
                  className="rounded px-1 text-[10px] text-primary hover:underline"
                  title="Add selected assets"
                  onClick={() => void addSelectedTo(c.id)}
                >
                  Add
                </button>
              ) : null}
              <button
                type="button"
                className="rounded p-1 text-white/35 hover:text-red-300"
                aria-label={`Remove ${c.name}`}
                onClick={() => void removeCollection(c.id)}
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New Collection"
            data-testid="asset-collection-name"
            className="min-h-9 flex-1 rounded-md border border-white/12 bg-black/30 px-2 text-xs text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
          />
          <button
            type="button"
            data-testid="asset-collection-create"
            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-white/15 px-2 text-xs text-white/80 hover:bg-white/5"
            onClick={() => void create()}
          >
            <FolderPlus className="h-3.5 w-3.5" aria-hidden />
            Create
          </button>
        </div>
        {error ? (
          <p className="text-[11px] text-red-300" data-testid="asset-collection-error">
            {error}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
