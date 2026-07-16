"use client";

import { useState } from "react";
import { Eye, EyeOff, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseCaseImageCards } from "@/components/marketing/use-case-image-cards";
import {
  DEFAULT_GLOW_COLOR,
  defaultImageFraming,
  type LandingUseCaseTile,
} from "@/lib/marketing/use-case-types";
import { cn } from "@/lib/utils";

type EditableTile = LandingUseCaseTile;

function newBlankTile(sortOrder: number): EditableTile {
  return {
    id: `new-${crypto.randomUUID()}`,
    industry: "",
    image: "",
    imageAlt: "",
    tap: "",
    opens: "",
    action: "",
    captures: "",
    ...defaultImageFraming(),
    sortOrder,
    enabled: true,
  };
}

export function LandingTilesEditor({
  initialTiles,
  mediaUploadReady,
  stockReady,
}: {
  initialTiles: LandingUseCaseTile[];
  mediaUploadReady: boolean;
  stockReady: boolean;
}) {
  const [tiles, setTiles] = useState<EditableTile[]>(initialTiles);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialTiles[0]?.id ?? null
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateTile(id: string, patch: Partial<EditableTile>) {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function reorderTiles(fromId: string, toId: string) {
    if (fromId === toId) return;
    setTiles((prev) => {
      const from = prev.findIndex((t) => t.id === fromId);
      const to = prev.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((t, i) => ({ ...t, sortOrder: i }));
    });
  }

  function removeTile(id: string) {
    setTiles((prev) => {
      const next = prev.filter((t) => t.id !== id).map((t, i) => ({ ...t, sortOrder: i }));
      if (expandedId === id) setExpandedId(next[0]?.id ?? null);
      return next;
    });
  }

  function addBlank() {
    const tile = newBlankTile(tiles.length);
    setTiles((prev) => [...prev, tile]);
    setExpandedId(tile.id);
  }

  async function saveAll() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/landing-use-cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiles: tiles.map((t, i) => ({
            ...t,
            industry: t.industry.trim() || "Untitled",
            glowColor: t.glowColor || DEFAULT_GLOW_COLOR,
            sortOrder: i,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setTiles(data.tiles);
      setMessage("Saved — landing page will show these tiles.");
      if (expandedId?.startsWith("new-") || expandedId?.startsWith("static-")) {
        setExpandedId(data.tiles[0]?.id ?? null);
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const previewTiles = tiles.filter((t) => t.enabled && t.industry.trim());
  const editing = tiles.find((t) => t.id === expandedId);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Landing tiles</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Edit the “Built for the physical world” cards. Drag the grip handle to reorder. Change
            copy, images (browse, paste, drag & drop, URL, library, stock), framing, and glow
            color — then save to update the public landing page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={addBlank}>
            <Plus className="mr-2 h-4 w-4" />
            Add blank tile
          </Button>
          <Button type="button" onClick={saveAll} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save tiles"}
          </Button>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {tiles.map((tile, index) => {
          const open = expandedId === tile.id;
          return (
            <div
              key={tile.id}
              draggable
              onDragStart={() => setDragId(tile.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) reorderTiles(dragId, tile.id);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/50",
                !tile.enabled && "opacity-70",
                dragId === tile.id && "opacity-50 ring-2 ring-primary/40"
              )}
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-3 sm:px-4">
                <span
                  className="inline-flex cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-5 w-5" />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpandedId(open ? null : tile.id)}
                >
                  <span className="font-medium text-[var(--lp-gold-bright,#c9a227)]">
                    {tile.industry.trim() || "Untitled tile"}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">#{index + 1}</span>
                </button>
                <span
                  className="hidden size-3 rounded-full sm:inline-block"
                  style={{ background: tile.glowColor || DEFAULT_GLOW_COLOR }}
                  title="Glow color"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => updateTile(tile.id, { enabled: !tile.enabled })}
                  title={tile.enabled ? "Hide on landing" : "Show on landing"}
                >
                  {tile.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeTile(tile.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {open ? (
                <div className="grid gap-6 p-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`industry-${tile.id}`}>Industry title (gold)</Label>
                      <Input
                        id={`industry-${tile.id}`}
                        value={tile.industry}
                        onChange={(e) => updateTile(tile.id, { industry: e.target.value })}
                        placeholder="e.g. Boutiques"
                      />
                    </div>
                    {(
                      [
                        ["tap", "Tap", "Shelf tags & fitting-room signs"],
                        ["opens", "Opens", "New arrivals, VIP offers…"],
                        ["action", "Action", "VIP signup / claim promo"],
                        ["captures", "Captures", "Email list + offer claims"],
                      ] as const
                    ).map(([key, label, placeholder]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`${key}-${tile.id}`}>{label}</Label>
                        <Textarea
                          id={`${key}-${tile.id}`}
                          value={tile[key]}
                          rows={2}
                          placeholder={placeholder}
                          onChange={(e) => updateTile(tile.id, { [key]: e.target.value })}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor={`alt-${tile.id}`}>Image alt text</Label>
                      <Input
                        id={`alt-${tile.id}`}
                        value={tile.imageAlt}
                        onChange={(e) => updateTile(tile.id, { imageAlt: e.target.value })}
                        placeholder="Short description of the photo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`glow-${tile.id}`}>Outside glow border</Label>
                      <div className="flex items-center gap-3">
                        <input
                          id={`glow-${tile.id}`}
                          type="color"
                          value={
                            /^#[0-9a-fA-F]{6}$/.test(tile.glowColor)
                              ? tile.glowColor
                              : DEFAULT_GLOW_COLOR
                          }
                          onChange={(e) => updateTile(tile.id, { glowColor: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                        />
                        <Input
                          value={tile.glowColor || DEFAULT_GLOW_COLOR}
                          onChange={(e) => updateTile(tile.id, { glowColor: e.target.value })}
                          placeholder="#3b82f6"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <MediaPicker
                      label={`Tile image · ${tile.industry || "Untitled"}`}
                      value={tile.image}
                      onChange={(url) => updateTile(tile.id, { image: url })}
                      mediaUploadReady={mediaUploadReady}
                      stockReady={stockReady}
                    />

                    <div className="space-y-4 rounded-xl border border-border/50 bg-background/40 p-4">
                      <p className="text-sm font-medium">Image framing</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Fit</Label>
                          <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
                            value={tile.imageFit}
                            onChange={(e) =>
                              updateTile(tile.id, {
                                imageFit: e.target.value === "contain" ? "contain" : "cover",
                              })
                            }
                          >
                            <option value="cover">Cover (crop to fill)</option>
                            <option value="contain">Contain (show full)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Panel width · {tile.imagePanelPercent}%</Label>
                          <input
                            type="range"
                            min={20}
                            max={55}
                            value={tile.imagePanelPercent}
                            onChange={(e) =>
                              updateTile(tile.id, {
                                imagePanelPercent: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Position X · {tile.imagePositionX}%</Label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={tile.imagePositionX}
                            onChange={(e) =>
                              updateTile(tile.id, {
                                imagePositionX: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Position Y · {tile.imagePositionY}%</Label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={tile.imagePositionY}
                            onChange={(e) =>
                              updateTile(tile.id, {
                                imagePositionY: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Zoom · {tile.imageScale.toFixed(2)}×</Label>
                          <input
                            type="range"
                            min={50}
                            max={300}
                            value={Math.round(tile.imageScale * 100)}
                            onChange={(e) =>
                              updateTile(tile.id, {
                                imageScale: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {editing?.id === tile.id ? (
                      <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#0a1220] p-3 sm:p-4">
                        <p className="mb-3 px-1 text-xs text-muted-foreground">Tile preview</p>
                        <UseCaseImageCards tiles={[tile]} layout="single" />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-[#050b14] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">Landing preview</h3>
            <p className="text-xs text-slate-400">
              How enabled tiles will appear in “Built for the physical world” (equal height rows).
            </p>
          </div>
          <Button type="button" onClick={saveAll} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save tiles"}
          </Button>
        </div>
        {previewTiles.length === 0 ? (
          <p className="text-sm text-slate-400">No enabled tiles with a title yet.</p>
        ) : (
          <UseCaseImageCards tiles={previewTiles} />
        )}
      </div>
    </div>
  );
}
