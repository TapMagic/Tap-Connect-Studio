"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Link2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";

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
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUploadReady && !stockReady) return;
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setLibrary(d.assets ?? []))
      .catch(() => undefined);
  }, [mediaUploadReady, stockReady, value]);

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
    if (!(data.results ?? []).length) setMessage("No results — try another search.");
  }

  async function uploadFile(file: File) {
    if (!mediaUploadReady) {
      setMessage("Upload requires R2 (and public URL) configured.");
      return;
    }
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
    setLibrary((prev) => [{ id: data.asset?.id ?? data.url, url: data.url, filename: file.name, source: "upload" }, ...prev]);
    setMessage("Uploaded");
  }

  async function chooseStock(hit: StockHit) {
    onChange?.(hit.url);
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

  function onPasteZone(e: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      e.preventDefault();
      void uploadFile(file);
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      <div className="flex gap-2">
        <Link2 className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Paste image URL"
        />
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

      {mediaUploadReady ? (
        <div
          className="rounded-lg border border-dashed border-border/60 p-3"
          onPaste={onPasteZone}
          tabIndex={0}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!!loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 py-3 text-sm hover:border-primary/40"
            >
              <Upload className="h-4 w-4" />
              {loading === "upload" ? "Uploading..." : "Browse files"}
            </button>
            <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border/60 py-3 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" /> Click here & paste image
            </div>
          </div>
        </div>
      ) : (
        <FeaturePlaceholder
          title="Browse & paste uploads"
          description="Upload from your computer or paste images. Requires Cloudflare R2 + public URL."
          envVars={[
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
            "R2_PUBLIC_URL",
          ]}
          signupUrl="https://dash.cloudflare.com"
          costNote="Stays $0 within free tier limits."
          comingSoon
        />
      )}

      {stockReady ? (
        <div className="space-y-2 rounded-lg border border-border/50 p-3">
          <Label className="text-xs">Stock search (Pexels{process.env.NEXT_PUBLIC_HAS_UNSPLASH ? " + Unsplash" : ""})</Label>
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
              {loading === "stock" ? "..." : "Search"}
            </Button>
            {stockResults.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStockResults([]);
                  setMessage(null);
                }}
              >
                Close
              </Button>
            )}
          </div>
          {stockResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stockResults.length} results — tap to use</p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStockResults([])}
                >
                  Clear results
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stockResults.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="overflow-hidden rounded border border-border/40 text-left hover:border-primary/50"
                    onClick={() => void chooseStock(hit)}
                    title={`${hit.alt} — ${hit.photographer} (${hit.source})`}
                  >
                    <img src={hit.thumb} alt={hit.alt} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <FeaturePlaceholder
          title="Stock image library"
          description="Search free photos from Pexels (and Unsplash when approved)."
          envVars={["PEXELS_API_KEY", "UNSPLASH_ACCESS_KEY"]}
          signupUrl="https://www.pexels.com/api"
          costNote="Free API — no storage cost."
          comingSoon
        />
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
                <img src={asset.url} alt={asset.filename ?? "asset"} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {message && <p className="text-xs text-primary">{message}</p>}
    </div>
  );
}
