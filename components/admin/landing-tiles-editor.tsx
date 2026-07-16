"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseCaseImageCards } from "@/components/marketing/use-case-image-cards";
import {
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateTile(id: string, patch: Partial<EditableTile>) {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function moveTile(id: string, dir: -1 | 1) {
    setTiles((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((t, i) => ({ ...t, sortOrder: i }));
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Landing tiles</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Edit the “Built for the physical world” cards. Change industry titles, Tap / Opens /
            Action / Captures copy, and images (browse, paste, drag & drop, URL, library, stock).
            Frame each photo with position, zoom, and panel width — then save to update the
            public landing page.
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

      <div className="space-y-4">
        {tiles.map((tile, index) => {
          const open = expandedId === tile.id;
          return (
            <div
              key={tile.id}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/50",
                !tile.enabled && "opacity-70"
              )}
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-3">
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
                  disabled={index === 0}
                  onClick={() => moveTile(tile.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === tiles.length - 1}
                  onClick={() => moveTile(tile.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
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
                  </div>

                  <div className="space-y-4">
                    <MediaPicker
                      label={`Tile image · ${tile.industry || "Untitled"}`}
                      value={tile.image}
                      onChange={(url) => updateTile(tile.id, { image: url })}
                      mediaUploadReady={mediaUploadReady}
                      stockReady={stockReady}
                    />

                    <div className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-4">
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

                    {/* Live single-tile preview */}
                    <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#0a1220] p-2">
                      <p className="mb-2 px-1 text-xs text-muted-foreground">Tile preview</p>
                      <UseCaseImageCards tiles={[tile]} />
                    </div>
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
              How enabled tiles will appear in “Built for the physical world”.
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
