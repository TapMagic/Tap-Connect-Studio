"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Check,
  ExternalLink,
  Heart,
  ImageIcon,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  MediaAssetCandidate,
  MediaAssetSource,
  MediaOrientation,
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

type ProviderState =
  | "checking"
  | "ready"
  | "fixture"
  | "not_configured"
  | "rate_limited"
  | "unavailable";

type ProviderStatus = {
  state: ProviderState;
  label:
    | "Checking…"
    | "Ready"
    | "Fixture mode"
    | "Not configured"
    | "Rate limited"
    | "Unavailable";
};

type ApiAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  source: string;
  provider?: string | null;
  providerAssetId?: string | null;
  width?: number | null;
  height?: number | null;
  sourcePageUrl?: string | null;
  creatorName?: string | null;
  creatorUrl?: string | null;
  licenseCode?: string | null;
  licenseUrl?: string | null;
  attributionText?: string | null;
  rightsNote?: string | null;
  approvalStatus?: "UNREVIEWED" | "APPROVED" | "REJECTED";
  defaultAltText?: string | null;
  isFavorite?: boolean;
  recent?: { lastUsedAt: string; useCount: number } | null;
};

type ProviderHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  providerId?: string;
  rights?: string;
  attributionText?: string;
  licenseUrl?: string;
  candidateToken: string;
  source: "pexels" | "logo_dev";
};

const TABS: { id: BrowserTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "studio", label: "Studio", icon: ImageIcon },
  { id: "brand", label: "Brand", icon: ShieldCheck },
  { id: "recent", label: "Recent", icon: ImageIcon },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "pexels", label: "Pexels", icon: Search },
  { id: "logo_dev", label: "Logo.dev", icon: Building2 },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "url", label: "Advanced URL", icon: Link2 },
];

function libraryCandidate(asset: ApiAsset): MediaAssetCandidate {
  const source: MediaAssetSource =
    asset.provider === "logo_dev"
      ? "logo_dev"
      : asset.source === "upload"
        ? "upload"
        : asset.source === "url"
          ? "url"
          : "studio";
  return {
    id: asset.id,
    mediaAssetId: asset.id,
    url: asset.url,
    thumbUrl: asset.url,
    label: asset.defaultAltText || asset.filename || "Studio asset",
    source,
    sourceLabel: asset.provider || (asset.source === "upload" ? "Upload" : "Studio"),
    sourceUrl: asset.sourcePageUrl || undefined,
    providerId: asset.providerAssetId || undefined,
    attributionName: asset.creatorName || undefined,
    attributionUrl: asset.creatorUrl || undefined,
    width: asset.width || undefined,
    height: asset.height || undefined,
    mimeType: asset.mimeType,
    rights: asset.rightsNote || undefined,
    licenseCode: asset.licenseCode || undefined,
    licenseUrl: asset.licenseUrl || undefined,
    attributionText: asset.attributionText || undefined,
    approvalStatus: asset.approvalStatus || "UNREVIEWED",
    isBrandApproved: asset.approvalStatus === "APPROVED",
    isFavorite: Boolean(asset.isFavorite),
    recentAt: asset.recent?.lastUsedAt,
  };
}

function providerCandidate(hit: ProviderHit): MediaAssetCandidate {
  return {
    id: hit.id,
    url: hit.url,
    thumbUrl: hit.thumb,
    label: hit.alt,
    source: hit.source,
    sourceLabel: hit.source === "pexels" ? "Pexels" : "Logo.dev",
    sourceUrl: hit.sourceUrl,
    providerId: hit.providerId,
    attributionName: hit.photographer,
    attributionUrl: hit.photographerUrl,
    width: hit.width,
    height: hit.height,
    mimeType: hit.source === "pexels" ? "image/jpeg" : "image/png",
    rights: hit.rights,
    licenseUrl: hit.licenseUrl,
    attributionText: hit.attributionText,
    approvalStatus: "UNREVIEWED",
    candidateToken: hit.candidateToken,
    importKind: "provider",
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
}: SharedMediaAssetBrowserProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<BrowserTab>(initialTab);
  const [library, setLibrary] = useState<MediaAssetCandidate[]>([]);
  const [results, setResults] = useState<MediaAssetCandidate[]>([]);
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
  const [providerStatus, setProviderStatus] = useState<{
    pexels: ProviderStatus;
    logo_dev: ProviderStatus;
  }>({
    pexels: { state: "checking", label: "Checking…" },
    logo_dev: { state: "checking", label: "Checking…" },
  });

  const loadLibrary = useCallback(async () => {
    const response = await fetch("/api/media");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Asset library unavailable");
    setLibrary((data.assets || []).map(libraryCandidate));
  }, []);

  const loadProviderStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/media/providers/status");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Provider status unavailable");
      setProviderStatus(data.providers);
    } catch (error) {
      setProviderStatus({
        pexels: { state: "unavailable", label: "Unavailable" },
        logo_dev: { state: "unavailable", label: "Unavailable" },
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      setTab(initialTab);
      setResults([]);
      setSelected(null);
      setQuery("");
      setStatus(null);
      closeRef.current?.focus();
      void Promise.all([loadLibrary(), loadProviderStatus()]).catch((error) =>
        setStatus(error instanceof Error ? error.message : "Asset library unavailable")
      );
    }, 0);
    return () => {
      window.clearTimeout(timer);
      openerRef.current?.focus();
    };
  }, [open, initialTab, loadLibrary, loadProviderStatus]);

  function selectTab(id: BrowserTab) {
    setTab(id);
    setResults([]);
    setSelected(null);
    setStatus(null);
    if (id === "pexels" || id === "logo_dev") setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const visible = useMemo(() => {
    const source =
      tab === "studio"
        ? library
        : tab === "brand"
          ? library.filter((asset) => asset.approvalStatus === "APPROVED")
          : tab === "recent"
            ? library
                .filter((asset) => asset.recentAt)
                .sort((a, b) => String(b.recentAt).localeCompare(String(a.recentAt)))
            : tab === "favorites"
              ? library.filter((asset) => asset.isFavorite)
              : results;
    const normalized = query.trim().toLowerCase();
    if (!normalized || tab === "pexels" || tab === "logo_dev") return source;
    return source.filter((asset) =>
      `${asset.label} ${asset.sourceLabel} ${asset.attributionName || ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [library, query, results, tab]);

  async function searchProvider(loadMore = false) {
    const q = query.trim();
    if (q.length < 2) {
      setStatus("Enter at least two characters, then retry.");
      return;
    }
    const requestedPage = loadMore ? page + 1 : 1;
    setBusy("search");
    setStatus(null);
    try {
      const params = new URLSearchParams({ q });
      const endpoint = tab === "pexels" ? "/api/stock/search" : "/api/logos/search";
      if (tab === "pexels") {
        params.set("page", String(requestedPage));
        if (orientation !== "all") params.set("orientation", orientation);
        if (color) params.set("color", color.replace(/^#/, ""));
      } else {
        params.set("theme", logoTheme);
        params.set("greyscale", logoGreyscale ? "1" : "0");
      }
      const response = await fetch(`${endpoint}?${params}`);
      const data = await response.json();
      if (!response.ok) {
        setResults([]);
        const provider = tab === "pexels" ? "pexels" : "logo_dev";
        const nextStatus: ProviderStatus =
          data.code === "not_configured"
            ? { state: "not_configured", label: "Not configured" }
            : data.code === "rate_limited"
              ? { state: "rate_limited", label: "Rate limited" }
              : { state: "unavailable", label: "Unavailable" };
        setProviderStatus((current) => ({ ...current, [provider]: nextStatus }));
        setStatus(
          `${data.message || data.error || "Provider unavailable"} Upload an image or retry this source.`
        );
        return;
      }
      const items = (data.results || []).map(providerCandidate);
      setResults((current) => (loadMore ? [...current, ...items] : items));
      setPage(requestedPage);
      setNextPage(data.nextPage ?? null);
      if (!items.length) setStatus("No results were returned. Try a broader search.");
    } catch {
      setResults([]);
      setStatus("The provider could not be reached. Retry or use Upload or Studio.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadFile(file: File) {
    setBusy("upload");
    setStatus(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.asset) throw new Error(data.error || "Upload failed");
      const candidate = libraryCandidate(data.asset);
      setLibrary((current) => [candidate, ...current.filter((item) => item.id !== candidate.id)]);
      setSelected(candidate);
      setStatus("Upload stored in Studio and ready to insert.");
    } catch (error) {
      setStatus(`${error instanceof Error ? error.message : "Upload failed"} Nothing was inserted.`);
    } finally {
      setBusy(null);
    }
  }

  async function probeAdvancedUrl() {
    setBusy("url");
    setStatus(null);
    try {
      const response = await fetch("/api/media/url/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "URL probe failed");
      setSelected({
        id: `external-${data.candidateToken.slice(-12)}`,
        url: data.previewUrl,
        thumbUrl: data.previewUrl,
        label: new URL(data.previewUrl).hostname,
        source: "url",
        sourceLabel: "Advanced URL · verified",
        sourceUrl: data.previewUrl,
        mimeType: data.mimeType,
        rights: data.rights,
        approvalStatus: "UNREVIEWED",
        candidateToken: data.candidateToken,
        importKind: "external_url",
      });
      setStatus("URL passed safety checks. Insert imports a durable TapConnect copy.");
    } catch (error) {
      setSelected(null);
      setStatus(`${error instanceof Error ? error.message : "URL probe failed"} Check the URL and retry.`);
    } finally {
      setBusy(null);
    }
  }

  async function toggleFavorite(asset: MediaAssetCandidate) {
    if (!asset.mediaAssetId) {
      setStatus("Import this provider result before adding it to durable Favorites.");
      return;
    }
    const favorite = !asset.isFavorite;
    const response = await fetch(`/api/media/${asset.mediaAssetId}/favorite`, {
      method: favorite ? "PUT" : "DELETE",
    });
    if (!response.ok) {
      setStatus("Favorite could not be updated. Retry.");
      return;
    }
    setLibrary((current) =>
      current.map((item) => (item.id === asset.id ? { ...item, isFavorite: favorite } : item))
    );
    setSelected((current) =>
      current?.id === asset.id ? { ...current, isFavorite: favorite } : current
    );
  }

  async function approveSelected() {
    if (!selected?.mediaAssetId) return;
    setBusy("approve");
    const response = await fetch(`/api/media/${selected.mediaAssetId}/approve`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Approval failed.");
      setBusy(null);
      return;
    }
    const approved = libraryCandidate({ ...data.asset, isFavorite: selected.isFavorite });
    setLibrary((current) =>
      current.map((item) => (item.id === approved.id ? approved : item))
    );
    setSelected(approved);
    setStatus("Approved for Brand use. Choosing a primary logo remains a separate action.");
    setBusy(null);
  }

  async function insertSelection() {
    if (!selected) return;
    setBusy("insert");
    setStatus(null);
    try {
      let finalAsset = selected;
      if (selected.candidateToken) {
        if (!mediaUploadReady) throw new Error("Durable media storage is unavailable");
        const endpoint =
          selected.importKind === "external_url"
            ? "/api/media/url/import"
            : "/api/media/import";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateToken: selected.candidateToken }),
        });
        const data = await response.json();
        if (!response.ok || !data.asset) throw new Error(data.error || "Import failed");
        finalAsset = libraryCandidate(data.asset);
      }
      if (!finalAsset.mediaAssetId) throw new Error("Stored media asset identity is missing");
      const usedResponse = await fetch(`/api/media/${finalAsset.mediaAssetId}/used`, {
        method: "POST",
      });
      if (!usedResponse.ok) throw new Error("Recent activity could not be recorded");
      finalAsset = { ...finalAsset, recentAt: new Date().toISOString() };
      setLibrary((current) => [
        finalAsset,
        ...current.filter((item) => item.id !== finalAsset.id),
      ]);
      onSelect(finalAsset);
      onClose();
    } catch (error) {
      setStatus(`${error instanceof Error ? error.message : "Import failed"} Nothing was inserted.`);
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;
  const providerSearch = tab === "pexels" || tab === "logo_dev";
  const showGrid = !["upload", "url"].includes(tab);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      data-testid="shared-media-browser-overlay"
    >
      <section
        ref={dialogRef}
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
              Provider and URL media are imported before selection. Brand approval is explicit.
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

        <div className="border-b border-white/10 p-2 sm:hidden">
          <Label htmlFor="media-source-select" className="sr-only">
            Media source
          </Label>
          <select
            id="media-source-select"
            value={tab}
            onChange={(event) => selectTab(event.target.value as BrowserTab)}
            className="min-h-11 w-full rounded-lg border border-white/20 bg-[#090d16] px-3 text-sm text-white"
            data-testid="media-source-select"
          >
            {TABS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
                {id === "pexels" || id === "logo_dev"
                  ? ` — ${providerStatus[id].label}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div
          className="hidden shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2 sm:flex"
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
              onClick={() => selectTab(id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                tab === id
                  ? "border-white/35 bg-white/10 text-white"
                  : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
              {id === "pexels" || id === "logo_dev" ? (
                <span
                  className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] text-white/60"
                  data-testid={`provider-status-${id}`}
                >
                  {providerStatus[id].label}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-1 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            {showGrid ? (
              <div className="space-y-2 border-b border-white/10 p-3">
                {providerSearch ? (
                  <div
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                    data-testid={`provider-readiness-${tab}`}
                  >
                    <span>{tab === "pexels" ? "Pexels" : "Logo.dev"} availability</span>
                    <span className="font-medium text-white">
                      {providerStatus[tab === "pexels" ? "pexels" : "logo_dev"].label}
                    </span>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <label className="relative flex-1">
                    <span className="sr-only">{providerSearch ? `Search ${tab}` : "Filter assets"}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && providerSearch) {
                          event.preventDefault();
                          void searchProvider();
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
                      onClick={() => void searchProvider()}
                      disabled={busy === "search" || (tab === "pexels" && !stockReady)}
                      data-testid="media-browser-search-submit"
                    >
                      {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                  ) : null}
                </div>
                {tab === "pexels" ? (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={orientation}
                      onChange={(event) => setOrientation(event.target.value as MediaOrientation)}
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
                  <Upload className="mx-auto h-9 w-9 text-white/50" />
                  <p className="font-medium">Upload to TapConnect media storage</p>
                  <p className="text-xs text-white/50">PNG, JPEG, WebP, or GIF up to 8MB.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
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
                      Upload storage is unavailable. Configure R2 or choose a Studio asset.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "url" ? (
              <div className="grid flex-1 place-items-center p-6">
                <div className="w-full max-w-xl space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-medium">Advanced URL import</p>
                  <p className="text-xs text-white/50">
                    TapConnect checks the host, redirects, MIME, and size, then imports a durable copy.
                  </p>
                  <Label htmlFor="advanced-media-url">HTTPS image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="advanced-media-url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://…"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void probeAdvancedUrl()}
                      disabled={busy === "url"}
                    >
                      Check
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
                            "aspect-square w-full bg-black/30 object-cover",
                            asset.source === "logo_dev" ? "p-4 object-contain" : ""
                          )}
                        />
                        <span className="block truncate px-2 pb-0.5 pt-2 text-xs">{asset.label}</span>
                        <span className="block truncate px-2 pb-2 text-[10px] text-white/45">
                          {asset.sourceLabel}
                          {asset.attributionName ? ` · ${asset.attributionName}` : ""}
                        </span>
                      </button>
                      {asset.mediaAssetId ? (
                        <button
                          type="button"
                          aria-label={`${asset.isFavorite ? "Remove" : "Add"} ${asset.label} ${
                            asset.isFavorite ? "from" : "to"
                          } favorites`}
                          className="absolute right-2 top-2 grid min-h-9 min-w-9 place-items-center rounded-full border border-white/20 bg-black/65"
                          onClick={() => void toggleFavorite(asset)}
                        >
                          <Heart
                            className={cn("h-4 w-4", asset.isFavorite ? "fill-white" : "")}
                          />
                        </button>
                      ) : null}
                      {asset.approvalStatus === "APPROVED" ? (
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
                      ? "Pexels is not configured. Upload or choose a Studio asset."
                      : providerSearch
                        ? "Search to browse provider results."
                        : "No assets in this source yet."}
                  </div>
                ) : null}
                {tab === "pexels" && nextPage ? (
                  <div className="col-span-full flex justify-center">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.url}
                  alt={selected.label}
                  className="aspect-[4/3] w-full rounded-xl border border-white/10 bg-black/30 object-contain"
                />
                <div>
                  <p className="font-medium">{selected.label}</p>
                  <p className="text-xs text-white/50">{selected.sourceLabel}</p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-white/45">Dimensions</dt>
                  <dd>
                    {selected.width && selected.height
                      ? `${selected.width} × ${selected.height}`
                      : "Not reported"}
                  </dd>
                  <dt className="text-white/45">Approval</dt>
                  <dd>{selected.approvalStatus || "UNREVIEWED"}</dd>
                  <dt className="text-white/45">License</dt>
                  <dd>{selected.licenseCode || "Not asserted"}</dd>
                  <dt className="text-white/45">Attribution</dt>
                  <dd>{selected.attributionText || selected.attributionName || "Not provided"}</dd>
                </dl>
                {selected.rights ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/55">
                    {selected.rights}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {selected.sourceUrl ? (
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1 text-xs text-white/65 underline"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                  {selected.licenseUrl ? (
                    <a
                      href={selected.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1 text-xs text-white/65 underline"
                    >
                      License <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                {selected.mediaAssetId && selected.approvalStatus === "UNREVIEWED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void approveSelected()}
                    disabled={busy === "approve"}
                  >
                    Approve for Brand
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  onClick={() => void insertSelection()}
                  disabled={busy === "insert"}
                  data-testid="media-browser-insert"
                >
                  {busy === "insert" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {selected.candidateToken ? "Import and insert" : "Insert selected"}
                </Button>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center text-center text-sm text-white/45">
                Choose an asset to inspect provenance, rights, and approval.
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
      </section>
    </div>,
    document.body
  );
}
