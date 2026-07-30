"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ImageIcon,
  Link2,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isFavoriteMedia,
  readFavoriteMedia,
  readRecentMedia,
  rememberRecentMedia,
  toggleFavoriteMedia,
  type MediaAssetCandidate,
  type MediaAssetSource,
  type MediaOrientation,
} from "@/lib/media/asset-browser";
import { cn } from "@/lib/utils";

type BrowserTab =
  | "studio"
  | "brand"
  | "recent"
  | "favorites"
  | "pexels"
  | "logo_dev"
  | "upload"
  | "url";

type ApiAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  source: string;
  width?: number | null;
  height?: number | null;
  providerId?: string | null;
  sourceUrl?: string | null;
  attributionName?: string | null;
  attributionUrl?: string | null;
  rights?: string | null;
};

type StockHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  providerId?: string;
  rights?: string;
  source: "pexels" | "unsplash";
};

type LogoHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  source: "logo_dev" | "wikimedia" | "favicon" | "duckduckgo" | "domain";
  domain?: string;
  sourceUrl?: string;
  providerId?: string;
  width?: number;
  height?: number;
  rights?: string;
};

const TABS: { id: BrowserTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "studio", label: "Studio", icon: ImageIcon },
  { id: "brand", label: "Brand", icon: Building2 },
  { id: "recent", label: "Recent", icon: ImageIcon },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "pexels", label: "Pexels", icon: Search },
  { id: "logo_dev", label: "Logo.dev", icon: Building2 },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "url", label: "Advanced URL", icon: Link2 },
];

function libraryCandidate(asset: ApiAsset): MediaAssetCandidate {
  const source: MediaAssetSource =
    asset.source === "logo_dev"
      ? "logo_dev"
      : asset.source === "stock"
        ? "studio"
        : asset.source === "upload"
          ? "upload"
          : "studio";
  return {
    id: asset.id,
    url: asset.url,
    thumbUrl: asset.url,
    label: asset.filename || "Studio asset",
    source,
    sourceLabel:
      asset.source === "logo_dev"
        ? "Logo.dev import"
        : asset.source === "stock"
          ? "Imported stock"
          : asset.source === "upload"
            ? "Upload"
            : "Studio",
    sourceUrl: asset.sourceUrl || undefined,
    providerId: asset.providerId || undefined,
    attributionName: asset.attributionName || undefined,
    attributionUrl: asset.attributionUrl || undefined,
    width: asset.width || undefined,
    height: asset.height || undefined,
    mimeType: asset.mimeType,
    rights: asset.rights || undefined,
    isBrandApproved: asset.source === "logo_dev",
  };
}

function stockCandidate(hit: StockHit): MediaAssetCandidate {
  return {
    id: hit.id,
    url: hit.url,
    thumbUrl: hit.thumb,
    label: hit.alt || "Pexels image",
    source: "pexels",
    sourceLabel: hit.source === "pexels" ? "Pexels" : "Unsplash",
    sourceUrl: hit.sourceUrl,
    providerId: hit.providerId,
    attributionName: hit.photographer,
    attributionUrl: hit.photographerUrl,
    width: hit.width,
    height: hit.height,
    mimeType: "image/jpeg",
    rights: hit.rights,
  };
}

function logoCandidate(hit: LogoHit): MediaAssetCandidate {
  return {
    id: hit.id,
    url: hit.url,
    thumbUrl: hit.thumb,
    label: hit.alt,
    source: hit.source === "logo_dev" ? "logo_dev" : "brand",
    sourceLabel: hit.source === "logo_dev" ? "Logo.dev" : hit.source,
    sourceUrl: hit.sourceUrl,
    providerId: hit.providerId || hit.domain,
    width: hit.width,
    height: hit.height,
    mimeType: "image/png",
    rights:
      hit.rights ||
      "External logo source. Trademark and usage rights remain with the brand owner.",
  };
}

export type SharedMediaAssetBrowserProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAssetCandidate) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  initialTab?: BrowserTab;
  title?: string;
  selectionKind?: "photo" | "logo" | "any";
};

export function SharedMediaAssetBrowser({
  open,
  onClose,
  onSelect,
  mediaUploadReady = false,
  stockReady = false,
  initialTab = "studio",
  title = "Media & Asset Browser",
  selectionKind = "any",
}: SharedMediaAssetBrowserProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<BrowserTab>(initialTab);
  const [library, setLibrary] = useState<MediaAssetCandidate[]>([]);
  const [results, setResults] = useState<MediaAssetCandidate[]>([]);
  const [recent, setRecent] = useState<MediaAssetCandidate[]>([]);
  const [favorites, setFavorites] = useState<MediaAssetCandidate[]>([]);
  const [selected, setSelected] = useState<MediaAssetCandidate | null>(null);
  const [query, setQuery] = useState("");
  const [orientation, setOrientation] = useState<MediaOrientation>("all");
  const [color, setColor] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [logoTheme, setLogoTheme] = useState<"auto" | "light" | "dark">("auto");
  const [logoGreyscale, setLogoGreyscale] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    try {
      const response = await fetch("/api/media");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Asset library unavailable");
      setLibrary((data.assets || []).map(libraryCandidate));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Asset library unavailable");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setRecent(readRecentMedia());
    setFavorites(readFavoriteMedia());
    void loadLibrary();
    closeRef.current?.focus();
  }, [open, initialTab, loadLibrary]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible = useMemo(() => {
    const source =
      tab === "studio"
        ? library
        : tab === "brand"
          ? library.filter(
              (asset) => asset.source === "logo_dev" || asset.isBrandApproved
            )
          : tab === "recent"
            ? recent
            : tab === "favorites"
              ? favorites
              : results;
    const normalized = query.trim().toLowerCase();
    if (
      !normalized ||
      tab === "pexels" ||
      tab === "logo_dev" ||
      tab === "upload" ||
      tab === "url"
    ) {
      return source;
    }
    return source.filter((asset) =>
      `${asset.label} ${asset.sourceLabel} ${asset.attributionName || ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [favorites, library, query, recent, results, tab]);

  async function searchProvider(next = false) {
    const q = query.trim();
    if (q.length < 2) {
      setStatus("Enter at least two characters.");
      return;
    }
    const requestedPage = next ? page + 1 : 1;
    setBusy("search");
    setStatus(null);
    try {
      const params = new URLSearchParams({ q });
      let endpoint = "/api/logos/search";
      if (tab === "pexels") {
        endpoint = "/api/stock/search";
        params.set("page", String(requestedPage));
        if (orientation !== "all") params.set("orientation", orientation);
        if (color) params.set("color", color.replace(/^#/, ""));
      } else {
        params.set("theme", logoTheme);
        params.set("greyscale", logoGreyscale ? "1" : "0");
      }
      const response = await fetch(`${endpoint}?${params}`);
      const data = await response.json();
      const items =
        tab === "pexels"
          ? (data.results || []).map(stockCandidate)
          : (data.results || []).map(logoCandidate);
      if (!response.ok) {
        setResults([]);
        setStatus(data.message || data.error || "Provider unavailable");
        return;
      }
      setResults((current) => (next ? [...current, ...items] : items));
      setPage(requestedPage);
      setNextPage(data.nextPage ?? null);
      if (!items.length) setStatus("No results. Try another search.");
    } catch {
      setResults([]);
      setStatus("Provider unavailable. Retry or use another source.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(file: File) {
    if (!mediaUploadReady) {
      setStatus("Durable upload storage is not configured.");
      return;
    }
    setBusy("upload");
    setStatus(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("asLogo", selectionKind === "logo" ? "true" : "false");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.asset) throw new Error(data.error || "Upload failed");
      const candidate = libraryCandidate(data.asset);
      setLibrary((current) => [
        candidate,
        ...current.filter((item) => item.id !== candidate.id),
      ]);
      setSelected(candidate);
      setStatus("Upload ready to insert.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function insertSelection() {
    if (!selected) return;
    setBusy("insert");
    setStatus(null);
    let finalAsset = selected;
    if (
      mediaUploadReady &&
      (selected.source === "pexels" || selected.source === "logo_dev")
    ) {
      try {
        const response = await fetch("/api/media/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: selected.url,
            filename: selected.label,
            source: selected.source,
            providerId: selected.providerId,
            sourceUrl: selected.sourceUrl,
            attributionName: selected.attributionName,
            attributionUrl: selected.attributionUrl,
            rights: selected.rights,
            width: selected.width,
            height: selected.height,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.asset) {
          throw new Error(data.message || data.error || "Import failed");
        }
        finalAsset = {
          ...selected,
          id: data.asset.id,
          url: data.asset.url,
          thumbUrl: data.asset.url,
          source: selected.source === "logo_dev" ? "logo_dev" : "studio",
          sourceLabel: `${selected.sourceLabel} · imported`,
        };
        setLibrary((current) => [
          finalAsset,
          ...current.filter((item) => item.id !== finalAsset.id),
        ]);
      } catch (error) {
        setBusy(null);
        setStatus(
          `${error instanceof Error ? error.message : "Import failed"}. Nothing was inserted.`
        );
        return;
      }
    }
    rememberRecentMedia(finalAsset);
    onSelect(finalAsset);
    setBusy(null);
    onClose();
  }

  function addAdvancedUrl() {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
      setSelected({
        id: `url-${url}`,
        url,
        thumbUrl: url,
        label: parsed.hostname,
        source: "url",
        sourceLabel: "Advanced URL",
        sourceUrl: url,
        rights: "Linked URL. Availability and usage rights depend on the origin.",
      });
      setStatus("URL is ready to preview. It will remain externally hosted.");
    } catch {
      setStatus("Enter a valid HTTPS image URL.");
    }
  }

  if (!open) return null;

  const providerSearch = tab === "pexels" || tab === "logo_dev";
  const showGrid = !["upload", "url"].includes(tab);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      data-testid="shared-media-browser-overlay"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-media-browser-title"
        className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/15 bg-[#090d16] text-white shadow-2xl sm:h-[86vh] sm:rounded-2xl"
        data-testid="shared-media-browser"
      >
        <header className="flex min-h-14 items-center justify-between border-b border-white/10 px-4">
          <div>
            <h2 id="shared-media-browser-title" className="font-semibold">
              {title}
            </h2>
            <p className="text-[11px] text-white/45">
              Preview first. Provider media is imported before insertion when storage is available.
            </p>
          </div>
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close Media and Asset Browser"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2"
          role="tablist"
          aria-label="Media sources"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`media-source-${id}`}
              onClick={() => {
                setTab(id);
                setResults([]);
                setSelected(null);
                setStatus(null);
                if (id === "pexels" || id === "logo_dev") setQuery("");
              }}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                tab === id
                  ? "border-white/35 bg-white/10 text-white"
                  : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-1 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            {!["upload", "url"].includes(tab) ? (
              <div className="space-y-2 border-b border-white/10 p-3">
                <div className="flex gap-2">
                  <label className="relative flex-1">
                    <span className="sr-only">
                      {providerSearch ? `Search ${tab}` : "Filter assets"}
                    </span>
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && providerSearch) {
                          event.preventDefault();
                          void searchProvider(false);
                        }
                      }}
                      className="pl-9"
                      placeholder={
                        tab === "pexels"
                          ? "Search Pexels photos"
                          : tab === "logo_dev"
                            ? "Company or domain"
                            : "Filter this source"
                      }
                      data-testid="media-browser-search"
                    />
                  </label>
                  {providerSearch ? (
                    <Button
                      type="button"
                      onClick={() => void searchProvider(false)}
                      disabled={busy === "search" || (tab === "pexels" && !stockReady)}
                      data-testid="media-browser-search-submit"
                    >
                      {busy === "search" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-label="Searching" />
                      ) : (
                        "Search"
                      )}
                    </Button>
                  ) : null}
                </div>
                {tab === "pexels" ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={orientation}
                      onChange={(event) =>
                        setOrientation(event.target.value as MediaOrientation)
                      }
                      aria-label="Pexels orientation"
                      className="min-h-10 rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
                    >
                      <option value="all">Any orientation</option>
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                      <option value="square">Square</option>
                    </select>
                    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs">
                      Color
                      <input
                        type="color"
                        value={color || "#22c55e"}
                        onChange={(event) => setColor(event.target.value)}
                        aria-label="Pexels color filter"
                      />
                    </label>
                    {color ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setColor("")}>
                        Clear color
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {tab === "logo_dev" ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={logoTheme}
                      onChange={(event) =>
                        setLogoTheme(event.target.value as "auto" | "light" | "dark")
                      }
                      aria-label="Logo theme"
                      className="min-h-10 rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
                    >
                      <option value="auto">Automatic variant</option>
                      <option value="light">Light-background variant</option>
                      <option value="dark">Dark-background variant</option>
                    </select>
                    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs">
                      <input
                        type="checkbox"
                        checked={logoGreyscale}
                        onChange={(event) => setLogoGreyscale(event.target.checked)}
                      />
                      Greyscale
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "upload" ? (
              <div className="grid flex-1 place-items-center p-6">
                <div className="max-w-md space-y-4 text-center">
                  <Upload className="mx-auto h-9 w-9 text-white/50" aria-hidden />
                  <div>
                    <p className="font-medium">Upload to TapConnect media storage</p>
                    <p className="mt-1 text-xs text-white/50">
                      Images up to 8MB. The original remains reusable in Studio assets.
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadFile(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={!mediaUploadReady || busy === "upload"}
                  >
                    {busy === "upload" ? "Uploading…" : "Choose image"}
                  </Button>
                  {!mediaUploadReady ? (
                    <p className="text-xs text-amber-200" role="status">
                      Upload storage is unavailable. Configure R2 or choose an existing source.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "url" ? (
              <div className="grid flex-1 place-items-center p-6">
                <div className="w-full max-w-xl space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="font-medium">Advanced external URL</p>
                    <p className="text-xs text-white/50">
                      Use only when upload, Brand, Studio, Pexels, or Logo.dev is unsuitable.
                      External links can expire and rights remain your responsibility.
                    </p>
                  </div>
                  <Label htmlFor="advanced-media-url">HTTPS image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="advanced-media-url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://…"
                    />
                    <Button type="button" variant="outline" onClick={addAdvancedUrl}>
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {showGrid ? (
              <div
                className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4"
                role="listbox"
                aria-label={`${TABS.find((item) => item.id === tab)?.label} assets`}
              >
                {visible.map((asset) => {
                  const active = selected?.id === asset.id;
                  const favorite = isFavoriteMedia(asset);
                  return (
                    <div
                      key={`${asset.source}-${asset.id}`}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-white/[0.03]",
                        active ? "border-white/55 ring-2 ring-white/20" : "border-white/10"
                      )}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                        onClick={() => setSelected(asset)}
                        data-testid="media-browser-result"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.thumbUrl}
                          alt={asset.label}
                          loading="lazy"
                          className={cn(
                            "aspect-square w-full bg-[linear-gradient(45deg,#111_25%,transparent_25%),linear-gradient(-45deg,#111_25%,transparent_25%)] object-cover",
                            asset.source === "logo_dev" || asset.source === "brand"
                              ? "p-4 object-contain"
                              : ""
                          )}
                        />
                        <span className="block truncate px-2 pb-0.5 pt-2 text-xs">
                          {asset.label}
                        </span>
                        <span className="block truncate px-2 pb-2 text-[10px] text-white/45">
                          {asset.sourceLabel}
                          {asset.attributionName ? ` · ${asset.attributionName}` : ""}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${favorite ? "Remove" : "Add"} ${asset.label} ${
                          favorite ? "from" : "to"
                        } favorites`}
                        className="absolute right-2 top-2 grid min-h-9 min-w-9 place-items-center rounded-full border border-white/20 bg-black/65"
                        onClick={() => {
                          const next = toggleFavoriteMedia(asset);
                          setFavorites(next.favorites);
                        }}
                      >
                        <Heart
                          className={cn("h-4 w-4", favorite ? "fill-white" : "")}
                          aria-hidden
                        />
                      </button>
                      {asset.isBrandApproved ? (
                        <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[9px] font-semibold">
                          Brand-approved
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                {!visible.length ? (
                  <div className="col-span-full grid min-h-48 place-items-center text-center text-sm text-white/45">
                    {tab === "pexels" && !stockReady
                      ? "Pexels is unavailable. Upload or choose a Studio asset."
                      : providerSearch
                        ? "Search to browse provider results."
                        : "No assets in this source yet."}
                  </div>
                ) : null}
                {tab === "pexels" && nextPage ? (
                  <div className="col-span-full flex justify-center py-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void searchProvider(true)}
                      disabled={busy === "search"}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className="max-h-[42dvh] overflow-y-auto p-4 lg:max-h-none" aria-label="Selected media preview">
            {selected ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.url}
                    alt={selected.label}
                    className="aspect-[4/3] w-full object-contain"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[10px]">
                    Selected
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selected.label}</p>
                  <p className="text-xs text-white/50">{selected.sourceLabel}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <dt className="text-white/45">Dimensions</dt>
                  <dd>
                    {selected.width && selected.height
                      ? `${selected.width} × ${selected.height}`
                      : "Not reported"}
                  </dd>
                  <dt className="text-white/45">Type</dt>
                  <dd>{selected.mimeType || "Image"}</dd>
                  <dt className="text-white/45">Attribution</dt>
                  <dd>{selected.attributionName || "Not provided"}</dd>
                </dl>
                {selected.rights ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/55">
                    {selected.rights}
                  </p>
                ) : null}
                {selected.sourceUrl ? (
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 text-xs text-white/65 underline"
                  >
                    Original source <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  onClick={() => void insertSelection()}
                  disabled={busy === "insert"}
                  data-testid="media-browser-insert"
                >
                  {busy === "insert" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {mediaUploadReady &&
                      (selected.source === "pexels" || selected.source === "logo_dev")
                        ? "Import and insert"
                        : "Insert selected"}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center text-center text-sm text-white/45">
                Choose an asset to see a larger preview and source details.
              </div>
            )}
            {status ? (
              <p
                className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-white/65"
                role="status"
                data-testid="media-browser-status"
              >
                {status}
              </p>
            ) : null}
          </aside>
        </div>

        <footer className="flex min-h-12 items-center justify-between border-t border-white/10 px-3 text-[10px] text-white/40">
          <span>Provider media is never used until you choose Insert.</span>
          <span className="hidden items-center gap-2 sm:flex">
            <ChevronLeft className="h-3 w-3" />
            Source tabs
            <ChevronRight className="h-3 w-3" />
            Preview
          </span>
        </footer>
      </section>
    </div>,
    document.body
  );
}

