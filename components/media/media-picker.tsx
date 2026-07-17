"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ImageIcon, Link2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  source: "upload" | "stock" | "url";
  campaignId?: string;
}) {
  try {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // non-blocking
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

  const refreshLibrary = useCallback(() => {
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setLibrary(d.assets ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [value, refreshLibrary]);

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
      if (!res.ok) {
        setMessage(data.message ?? data.error ?? "Stock search failed");
        return;
      }
      setStockResults(data.results ?? []);
      setGalleryMode("stock");
      setGalleryOpen(true);
      if (!(data.results ?? []).length) setMessage("No results — try another search.");
    } catch {
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
      if (!res.ok) {
        setMessage(data.message ?? data.error ?? "Logo search failed");
        return;
      }
      setLogoResults(data.results ?? []);
      setGalleryMode("logo");
      setGalleryOpen(true);
      if (!(data.results ?? []).length) {
        setMessage("No logos found — try a brand name or domain (e.g. Nike, starbucks.com).");
      } else if (data.logoDev) {
        setMessage(null);
      }
    } catch {
      setMessage("Logo search failed");
    } finally {
      setLoading(null);
    }
  }

  const applyUrl = useCallback(
    (url: string, note?: string, meta?: { filename?: string; source?: "upload" | "stock" | "url" }) => {
      onChange?.(url);
      if (note) setMessage(note);
      setSessionAdds((prev) => [
        { id: url, url, filename: meta?.filename ?? "Added image", source: meta?.source ?? "upload" },
        ...prev.filter((p) => p.url !== url),
      ]);
      setLibraryOpen(true);
      void saveToLibrary({
        url,
        filename: meta?.filename,
        mimeType: url.startsWith("data:") ? "image/png" : "image/jpeg",
        source: meta?.source ?? "upload",
        campaignId,
      }).then(() => refreshLibrary());
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
          return true;
        }
      }
    }
    const text = e.clipboardData?.getData("text")?.trim() ?? "";
    if (text && /^https?:\/\//i.test(text)) {
      e.preventDefault();
      applyUrl(text, "URL pasted into library", { source: "url" });
      return true;
    }
    return false;
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
      return;
    }
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text");
    if (uri && /^https?:\/\//i.test(uri.trim())) {
      applyUrl(uri.trim(), "URL dropped into library", { source: "url" });
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      <div className="flex gap-2">
        <Link2 className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={value.startsWith("data:") ? "[embedded image]" : value}
          onChange={(e) => {
            if (e.target.value === "[embedded image]") return;
            onChange?.(e.target.value);
          }}
          onPaste={(e) => {
            handleClipboard(e);
          }}
          placeholder="Paste https://… image URL here"
        />
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onChange?.("")}
            title="Remove this image"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>

      {value && (
        <div className="relative overflow-hidden rounded-lg border border-border/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="max-h-32 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => onChange?.("")}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear image
          </Button>
        </div>
      )}

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
              setMessage("Paste an image or URL now (⌘V / Ctrl+V)");
            }}
            onPaste={(e) => handleClipboard(e)}
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
        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          <Label className="text-xs">Stock photos (Pexels / Unsplash)</Label>
          <div className="flex gap-2">
            <Input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="e.g. salon, wedding, landscaping"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchStock();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => void searchStock()} disabled={!!loading}>
              {loading === "stock" ? "…" : "Search"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Stock search needs <code className="text-primary">PEXELS_API_KEY</code> or{" "}
          <code className="text-primary">UNSPLASH_ACCESS_KEY</code>
        </p>
      )}

      <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Label className="text-xs">Web logo / icon search</Label>
        <p className="text-[10px] text-muted-foreground">
          Brand name or domain — powered by Logo.dev when configured. Tap a result to save it to
          your library.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-2 text-xs"
            value={logoTheme}
            onChange={(e) => setLogoTheme(e.target.value as "auto" | "light" | "dark")}
            aria-label="Logo theme"
          >
            <option value="auto">Theme: auto</option>
            <option value="dark">Theme: dark bg</option>
            <option value="light">Theme: light bg</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
            placeholder="e.g. Nike, starbucks.com"
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

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={closeGallery}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={galleryMode === "logo" ? "Logo gallery" : "Stock gallery"}
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
              <Button type="button" variant="outline" size="sm" onClick={closeGallery}>
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
                      className="overflow-hidden rounded-xl border border-border/40 text-left transition hover:border-primary/60"
                      onClick={() => void chooseStock(hit)}
                      title={`${hit.alt} — ${hit.photographer}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hit.thumb} alt={hit.alt} className="aspect-square w-full object-cover" />
                      <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                        {hit.photographer}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border/40">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium"
          onClick={() => setLibraryOpen((o) => !o)}
        >
          <span>
            Media library
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({visibleLibrary.length} saved)
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition ${libraryOpen ? "rotate-180" : ""}`}
          />
        </button>
        {libraryOpen && (
          <div className="border-t border-border/40 px-3 pb-3 pt-2">
            {visibleLibrary.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No saved images yet. Upload, paste, stock search, or web logo search above.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {visibleLibrary.slice(0, 16).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`overflow-hidden rounded border transition hover:border-primary/50 ${
                      asset.url === value ? "border-primary ring-1 ring-primary/40" : "border-border/40"
                    }`}
                    onClick={() => {
                      applyUrl(asset.url, "Selected from library", {
                        filename: asset.filename ?? undefined,
                        source: (asset.source as "upload" | "stock" | "url") || "url",
                      });
                    }}
                    title={asset.filename ?? "asset"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.filename ?? "asset"}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
