"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Link2, Upload, X } from "lucide-react";
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

export function MediaPicker({
  value = "",
  onChange,
  label = "Image",
  mediaUploadReady = false,
  stockReady = false,
  campaignId,
}: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState<StockHit[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setLibrary(d.assets ?? []))
      .catch(() => undefined);
  }, [value]);

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
  }

  const applyUrl = useCallback(
    (url: string, note?: string) => {
      onChange?.(url);
      if (note) setMessage(note);
    },
    [onChange]
  );

  async function embedAsDataUrl(file: File) {
    if (file.size > MAX_INLINE_BYTES) {
      setMessage(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — too large to embed (max ~900KB). Configure R2 for larger files, or compress the image.`
      );
      return false;
    }
    const dataUrl = await readFileAsDataUrl(file);
    applyUrl(dataUrl, "Image added");
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
    applyUrl(data.url, "Uploaded");
    setLibrary((prev) => [
      { id: data.asset?.id ?? data.url, url: data.url, filename: file.name, source: "upload" },
      ...prev,
    ]);
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
            // Always fall back so Browse/Paste never dead-ends
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
    applyUrl(hit.url, "Stock image selected");
    closeGallery();
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: hit.url,
        filename: hit.alt,
        mimeType: "image/jpeg",
        source: "stock",
        campaignId,
      }),
    }).catch(() => undefined);
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
      applyUrl(text, "URL pasted");
      return true;
    }
    return false;
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text");
    if (uri && /^https?:\/\//i.test(uri.trim())) applyUrl(uri.trim(), "URL dropped");
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
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.("")}>
            Clear
          </Button>
        )}
      </div>

      {value && (
        <div className="overflow-hidden rounded-lg border border-border/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="max-h-32 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Native label+input is the most reliable Browse across browsers */}
      <input
        ref={fileRef}
        id={`media-file-${label.replace(/\s+/g, "-")}`}
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
            htmlFor={`media-file-${label.replace(/\s+/g, "-")}`}
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
              // Focus this drop zone so paste lands here
              (document.activeElement as HTMLElement)?.blur?.();
            }}
            onPaste={(e) => handleClipboard(e)}
          >
            <ImageIcon className="h-4 w-4" />
            Paste image or URL
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Browse opens your files · Paste works in the URL field or here · Drag & drop also works
          {!mediaUploadReady
            ? " · Images under ~900KB embed without R2"
            : " · Cloud storage on; embeds as backup if upload fails"}
        </p>
      </div>

      {stockReady ? (
        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          <Label className="text-xs">Stock search (Pexels)</Label>
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
          Stock search needs <code className="text-primary">PEXELS_API_KEY</code>
        </p>
      )}

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
            aria-label="Stock gallery"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="font-semibold">Stock gallery</p>
                <p className="text-xs text-muted-foreground">
                  {stockResults.length} results — tap a photo to use it
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={closeGallery}>
                <X className="mr-1 h-4 w-4" />
                Close
              </Button>
            </div>
            <div className="overflow-y-auto p-4">
              {stockResults.length === 0 ? (
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

      {library.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Your media library</Label>
          <div className="grid grid-cols-4 gap-2">
            {library.slice(0, 12).map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="overflow-hidden rounded border border-border/40 hover:border-primary/50"
                onClick={() => onChange?.(asset.url)}
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
        </div>
      )}

      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
