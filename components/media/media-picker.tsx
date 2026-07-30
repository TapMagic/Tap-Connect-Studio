"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Eraser, ImageIcon, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BgRemovePanel } from "@/components/media/bg-remove-panel";
import { SharedMediaAssetBrowser } from "@/components/media/shared-media-asset-browser";
import type { BgRemoveProvenance } from "@/lib/media/bg-remove";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";

interface MediaPickerProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  campaignId?: string;
}

type StockHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  source: string;
};

type LogoHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  source: string;
  domain?: string;
};

type LibraryAsset = {
  id: string;
  url: string;
  filename: string | null;
  source: string;
};

const MAX_INLINE_BYTES = 900_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function saveToLibrary(params: {
  url: string;
  filename?: string;
  mimeType?: string;
  source: "upload" | "stock" | "url" | "bg-remove";
  campaignId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "Library save failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Library save failed (network)" };
  }
}

export function MediaPicker({
  value = "",
  onChange,
  label = "Image",
  mediaUploadReady = false,
  stockReady = false,
  campaignId,
}: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const galleryCloseRef = useRef<HTMLButtonElement>(null);
  const galleryOpenerRef = useRef<Element | null>(null);
  const fileId = `media-file-${label.replace(/\s+/g, "-")}`;
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState<StockHit[]>([]);
  const [logoQuery, setLogoQuery] = useState("");
  const [logoResults, setLogoResults] = useState<LogoHit[]>([]);
  const [logoTheme, setLogoTheme] = useState<"auto" | "light" | "dark">("dark");
  const [logoGreyscale, setLogoGreyscale] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState<"stock" | "logo">("stock");
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [sessionAdds, setSessionAdds] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [bgRemoveOpen, setBgRemoveOpen] = useState(false);
  const [sharedBrowserOpen, setSharedBrowserOpen] = useState(false);
  const [originalBeforeCutout, setOriginalBeforeCutout] = useState<string | null>(null);

  const refreshLibrary = useCallback(() => {
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setLibrary(d.assets ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [value, refreshLibrary]);

  useEffect(() => {
    if (!galleryOpen) return;
    galleryOpenerRef.current = document.activeElement;
    const t = window.setTimeout(() => galleryCloseRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setGalleryOpen(false);
        setStockResults([]);
        setLogoResults([]);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (galleryOpenerRef.current instanceof HTMLElement) {
        galleryOpenerRef.current.focus();
      }
    };
  }, [galleryOpen]);

  const visibleLibrary = (() => {
    const byUrl = new Map<string, LibraryAsset>();
    for (const a of [...library, ...sessionAdds]) {
      if (a.url) byUrl.set(a.url, a);
    }
    if (value && !byUrl.has(value)) {
      byUrl.set(value, {
        id: "current",
        url: value,
        filename: "Current selection",
        source: "upload",
      });
    }
    return Array.from(byUrl.values());
  })();

  async function searchStock() {
    if (!stockQuery.trim()) return;
    setLoading("stock");
    setMessage(null);
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(stockQuery.trim())}`);
      const data = await res.json();
      setStockResults(data.results ?? []);
      setGalleryMode("stock");
      setGalleryOpen(true);
      if (!res.ok) {
        setMessage(data.message ?? data.error ?? "Stock search failed");
        return;
      }
      if (!(data.results ?? []).length) setMessage("No results — try another search.");
    } catch {
      setStockResults([]);
      setGalleryMode("stock");
      setGalleryOpen(true);
      setMessage("Stock search failed");
    } finally {
      setLoading(null);
    }
  }

  function closeGallery() {
    setGalleryOpen(false);
    setStockResults([]);
    setLogoResults([]);
  }

  async function searchLogos() {
    if (!logoQuery.trim()) return;
    setLoading("logo");
    setMessage(null);
    try {
      const params = new URLSearchParams({
        q: logoQuery.trim(),
        theme: logoTheme,
        greyscale: logoGreyscale ? "1" : "0",
      });
      const res = await fetch(`/api/logos/search?${params}`);
      const data = await res.json();
      setLogoResults(data.results ?? []);
      setGalleryMode("logo");
      setGalleryOpen(true);
      if (!res.ok) {
        setMessage(data.message ?? data.error ?? "Logo search failed");
        return;
      }
      if (!(data.results ?? []).length) {
        setMessage("No logos found — try a brand name or domain (e.g. Nike, starbucks.com).");
      } else if (data.logoDev) {
        setMessage(null);
      }
    } catch {
      setLogoResults([]);
      setGalleryMode("logo");
      setGalleryOpen(true);
      setMessage("Logo search failed");
    } finally {
      setLoading(null);
    }
  }

  const applyUrl = useCallback(
    (
      url: string,
      note?: string,
      meta?: { filename?: string; source?: "upload" | "stock" | "url" | "bg-remove" }
    ) => {
      onChange?.(url);
      if (note) setMessage(note);
      setSessionAdds((prev) => [
        {
          id: url,
          url,
          filename: meta?.filename ?? "Added image",
          source: meta?.source ?? "upload",
        },
        ...prev.filter((p) => p.url !== url),
      ]);
      setLibraryOpen(true);
      void saveToLibrary({
        url,
        filename: meta?.filename,
        mimeType: url.startsWith("data:") ? "image/png" : "image/jpeg",
        source: meta?.source ?? "upload",
        campaignId,
      }).then((result) => {
        if (!result.ok) {
          setMessage((prev) =>
            prev ? `${prev} · Library: ${result.error}` : result.error ?? "Library save failed"
          );
        }
        refreshLibrary();
      });
    },
    [onChange, campaignId, refreshLibrary]
  );

  async function embedAsDataUrl(file: File) {
    if (file.size > MAX_INLINE_BYTES) {
      setMessage(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — too large to embed (max ~900KB). Configure R2 for larger files, or compress the image.`
      );
      return false;
    }
    const dataUrl = await readFileAsDataUrl(file);
    applyUrl(dataUrl, "Image added to page & library", {
      filename: file.name,
      source: "upload",
    });
    return true;
  }

  async function uploadViaR2(file: File) {
    const form = new FormData();
    form.set("file", file);
    if (campaignId) form.set("campaignId", campaignId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? "Upload failed");
    }
    applyUrl(data.url, "Uploaded to library", { filename: file.name, source: "upload" });
  }

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setMessage("Only images (or PDF) allowed");
        return;
      }
      setLoading("upload");
      setMessage(null);
      try {
        if (mediaUploadReady) {
          try {
            await uploadViaR2(file);
            return;
          } catch (err) {
            const ok = await embedAsDataUrl(file);
            if (ok) {
              setMessage(
                `Cloud upload failed — image embedded instead. (${err instanceof Error ? err.message : "error"})`
              );
            }
            return;
          }
        }
        await embedAsDataUrl(file);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not add image");
      } finally {
        setLoading(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaUploadReady, campaignId, applyUrl]
  );

  async function chooseStock(hit: StockHit) {
    applyUrl(hit.url, "Stock image selected", { filename: hit.alt, source: "stock" });
    closeGallery();
  }

  async function chooseLogo(hit: LogoHit) {
    applyUrl(hit.url, "Logo added to library", { filename: hit.alt, source: "url" });
    closeGallery();
  }

  function handleClipboard(e: React.ClipboardEvent | ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (items) {
      const imageItem = Array.from(items).find((i) => i.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadFile(file);
          return;
        }
      }
    }
    const text = e.clipboardData?.getData("text")?.trim();
    if (text && /^https?:\/\//i.test(text)) {
      e.preventDefault();
      applyUrl(text, "URL pasted", { source: "url" });
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function applyBgRemove(derivedUrl: string, provenance: BgRemoveProvenance) {
    setOriginalBeforeCutout(provenance.originalUrl);
    applyUrl(derivedUrl, "Background removed — original preserved for restore", {
      filename: `cutout-${Date.now()}.png`,
      source: "bg-remove",
    });
  }

  function restoreOriginal(originalUrl: string) {
    setOriginalBeforeCutout(null);
    applyUrl(originalUrl, "Original image restored", { source: "upload" });
  }

  function chooseSharedAsset(asset: MediaAssetCandidate) {
    applyUrl(asset.url, `${asset.sourceLabel} asset inserted`, {
      filename: asset.label,
      source:
        asset.source === "pexels" || asset.source === "studio"
          ? "stock"
          : asset.source === "url"
            ? "url"
            : "upload",
    });
  }

  return (
    <div className="space-y-3" data-testid="media-picker">
      <Label className="text-xs">{label}</Label>

      <Button
        type="button"
        className="min-h-11 w-full"
        variant="outline"
        onClick={() => setSharedBrowserOpen(true)}
        data-testid="open-shared-media-browser"
      >
        <ImageIcon className="mr-2 h-4 w-4" />
        Browse media & assets
      </Button>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-h-40 w-full object-contain bg-[length:12px_12px] bg-[linear-gradient(45deg,#222_25%,transparent_25%),linear-gradient(-45deg,#222_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#222_75%),linear-gradient(-45deg,transparent_75%,#222_75%)] bg-[position:0_0,0_6px,6px_-6px,-6px_0]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute right-2 top-2 flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="bg-remove-open"
              onClick={() => setBgRemoveOpen(true)}
            >
              <Eraser className="mr-1 h-3.5 w-3.5" />
              Remove bg
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onChange?.("")}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear image
            </Button>
          </div>
        </div>
      ) : null}

      <SharedMediaAssetBrowser
        open={sharedBrowserOpen}
        onClose={() => setSharedBrowserOpen(false)}
        onSelect={chooseSharedAsset}
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
        selectionKind={label.toLowerCase().includes("logo") ? "logo" : "any"}
      />

      <input
        ref={fileRef}
        id={fileId}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.target.value = "";
        }}
      />

      <div
        ref={dropRef}
        className={`rounded-lg border border-dashed p-3 transition ${
          dragOver ? "border-primary bg-primary/10" : "border-primary/30 bg-primary/5"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onPaste={(e) => {
          handleClipboard(e);
        }}
        tabIndex={0}
        role="group"
        aria-label="Upload or paste image"
        data-testid="media-drop-zone"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label
            htmlFor={fileId}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/60 bg-background py-3 text-sm font-medium hover:border-primary/40"
          >
            <Upload className="h-4 w-4" />
            {loading === "upload" ? "Adding…" : "Browse files"}
          </label>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/80 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
            onClick={() => {
              dropRef.current?.focus();
              setMessage("Paste an image or URL now (⌘V / Ctrl+V) — drop zone focused");
            }}
            data-testid="media-paste-focus"
          >
            <ImageIcon className="h-4 w-4" />
            Paste image or URL
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Add logos & photos: browse, paste, or drag & drop
          {!mediaUploadReady
            ? " · Images under ~900KB embed without R2"
            : " · Saved to your library"}
        </p>
      </div>

      {stockReady ? (
        <div
          className="space-y-2 rounded-lg border border-border/50 p-3"
          data-testid="media-stock-panel"
        >
          <Label className="text-xs">Stock photos (Pexels / Unsplash)</Label>
          <div className="flex gap-2">
            <Input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Search stock…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchStock();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void searchStock()}
              disabled={!!loading}
            >
              {loading === "stock" ? "…" : "Search"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground" data-testid="media-stock-credentials-hint">
          Stock search disabled — set PEXELS_API_KEY / UNSPLASH_ACCESS_KEY for live stock.
        </p>
      )}

      <div className="space-y-2 rounded-lg border border-border/50 p-3">
        <Label className="text-xs">Brand logos</Label>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
            value={logoTheme}
            onChange={(e) => setLogoTheme(e.target.value as "auto" | "light" | "dark")}
            aria-label="Logo theme"
          >
            <option value="auto">Theme auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={logoGreyscale}
              onChange={(e) => setLogoGreyscale(e.target.checked)}
            />
            Greyscale
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            value={logoQuery}
            onChange={(e) => setLogoQuery(e.target.value)}
            placeholder="Brand or domain…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchLogos();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void searchLogos()}
            disabled={!!loading}
          >
            {loading === "logo" ? "…" : "Find"}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Image URL</Label>
        <Input
          value={value.startsWith("data:") ? "" : value}
          placeholder="https://…"
          aria-label="Image URL"
          data-testid="media-url-input"
          onChange={(e) => onChange?.(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">Applies live as you type — no separate Apply step.</p>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-left text-xs"
        onClick={() => {
          setLibraryOpen((o) => !o);
          refreshLibrary();
        }}
        data-testid="media-library-toggle"
      >
        <span>Library ({visibleLibrary.length})</span>
        <ChevronDown className={`h-4 w-4 transition ${libraryOpen ? "rotate-180" : ""}`} />
      </button>
      {libraryOpen ? (
        <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-border/40 p-2">
          {visibleLibrary.length === 0 ? (
            <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">No assets yet</p>
          ) : (
            visibleLibrary.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`overflow-hidden rounded border ${
                  a.url === value ? "border-primary" : "border-border/40"
                }`}
                onClick={() => onChange?.(a.url)}
                title={a.filename ?? a.url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))
          )}
        </div>
      ) : null}

      {message ? (
        <p className="text-xs text-muted-foreground" role="status" data-testid="media-picker-message">
          {message}
        </p>
      ) : null}

      {originalBeforeCutout ? (
        <p className="text-[10px] text-muted-foreground">
          Cutout active — use Remove bg → Restore original to undo non-destructively.
        </p>
      ) : null}

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={closeGallery}
          role="presentation"
          data-testid="media-gallery-overlay"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={galleryMode === "logo" ? "Logo gallery" : "Stock gallery"}
            data-testid="media-gallery-dialog"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="font-semibold">
                  {galleryMode === "logo" ? "Logo & icon results" : "Stock gallery"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {galleryMode === "logo"
                    ? `${logoResults.length} results — tap to add to library`
                    : `${stockResults.length} results — tap a photo to use it`}
                </p>
              </div>
              <Button
                ref={galleryCloseRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={closeGallery}
                data-testid="media-gallery-close"
              >
                <X className="mr-1 h-4 w-4" />
                Close
              </Button>
            </div>
            <div className="overflow-y-auto p-4">
              {galleryMode === "logo" ? (
                logoResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No results</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {logoResults.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        className="overflow-hidden rounded-xl border border-border/40 bg-muted/20 text-left transition hover:border-primary/60"
                        onClick={() => void chooseLogo(hit)}
                        title={hit.alt}
                      >
                        <div className="flex aspect-square items-center justify-center p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={hit.thumb}
                            alt={hit.alt}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                          {hit.alt}
                          {hit.domain ? ` · ${hit.domain}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              ) : stockResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No results</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {stockResults.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      className="overflow-hidden rounded-xl border border-border/40 bg-muted/20 text-left transition hover:border-primary/60"
                      onClick={() => void chooseStock(hit)}
                      title={hit.alt}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hit.thumb} alt={hit.alt} className="aspect-[4/3] w-full object-cover" />
                      <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                        {hit.photographer} · {hit.source}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {value ? (
        <BgRemovePanel
          open={bgRemoveOpen}
          imageUrl={originalBeforeCutout || value}
          onClose={() => setBgRemoveOpen(false)}
          onApply={applyBgRemove}
          onRestore={restoreOriginal}
          whereUsedBlobs={[
            { value, originalBeforeCutout },
            ...visibleLibrary.map((a) => ({ url: a.url, source: a.source, filename: a.filename })),
            ...sessionAdds.map((a) => ({ url: a.url, source: a.source })),
          ]}
        />
      ) : null}
    </div>
  );
}
