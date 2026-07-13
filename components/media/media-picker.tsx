"use client";

import { useEffect, useRef, useState } from "react";
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

const MAX_INLINE_BYTES = 700_000;

export function MediaPicker({
  value = "",
  onChange,
  label = "Image",
  mediaUploadReady = false,
  stockReady = false,
  campaignId,
}: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDivElement>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState<StockHit[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    const res = await fetch(`/api/stock/search?q=${encodeURIComponent(stockQuery.trim())}`);
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.message ?? data.error ?? "Stock search failed");
      return;
    }
    setStockResults(data.results ?? []);
    setGalleryOpen(true);
    if (!(data.results ?? []).length) setMessage("No results — try another search.");
  }

  function closeGallery() {
    setGalleryOpen(false);
    setStockResults([]);
    setMessage(null);
  }

  async function uploadViaR2(file: File) {
    setLoading("upload");
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    if (campaignId) form.set("campaignId", campaignId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setLoading(null);
    if (!res.ok || !data.url) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    onChange?.(data.url);
    setLibrary((prev) => [
      { id: data.asset?.id ?? data.url, url: data.url, filename: file.name, source: "upload" },
      ...prev,
    ]);
    setMessage("Uploaded");
  }

  async function embedAsDataUrl(file: File) {
    if (file.size > MAX_INLINE_BYTES) {
      setMessage("Image too large for inline upload (max ~700KB). Configure R2 for larger files.");
      return;
    }
    setLoading("upload");
    setMessage(null);
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    onChange?.(dataUrl);
    setLoading(null);
    setMessage("Image embedded (works without R2 — use R2 for large files)");
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setMessage("Only images (or PDF) allowed");
      return;
    }
    if (mediaUploadReady) {
      await uploadViaR2(file);
      return;
    }
    await embedAsDataUrl(file);
  }

  async function chooseStock(hit: StockHit) {
    onChange?.(hit.url);
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

  function onPasteZone(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        void uploadFile(file);
        return;
      }
    }
    const text = e.clipboardData.getData("text");
    if (text && /^https?:\/\//i.test(text.trim())) {
      e.preventDefault();
      onChange?.(text.trim());
      setMessage("URL pasted");
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
            const text = e.clipboardData.getData("text");
            if (text && /^https?:\/\//i.test(text.trim())) {
              // let default paste work
              return;
            }
            onPasteZone(e);
          }}
          placeholder="Paste image URL (https://…)"
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.("")}>
            Clear
          </Button>
        )}
      </div>

      {value && (
        <div className="overflow-hidden rounded-lg border border-border/40">
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

      <div
        ref={pasteRef}
        className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 outline-none focus:border-primary"
        onPaste={onPasteZone}
        tabIndex={0}
        onClick={() => pasteRef.current?.focus()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            disabled={!!loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background py-3 text-sm font-medium hover:border-primary/40"
          >
            <Upload className="h-4 w-4" />
            {loading === "upload" ? "Uploading…" : "Browse files"}
          </button>
          <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/50 py-3 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            Click here & paste image / URL
          </div>
        </div>
        {!mediaUploadReady && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            R2 not configured — images under ~700KB embed directly. Add R2 for full-size uploads.
          </p>
        )}
      </div>

      {stockReady ? (
        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          <Label className="text-xs">Stock search (Pexels)</Label>
          <div className="flex gap-2">
            <Input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="e.g. cigar lounge, cocktail, storefront"
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
