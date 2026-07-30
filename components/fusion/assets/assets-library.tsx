"use client";

/**
 * Assets library — the Assets workspace's product surface.
 * Library grid with previews · search + source filter · truthful source/rights
 * state per asset · reuse ("used in") · drag/drop upload with provider honesty.
 * Uses the existing MediaAsset model + existing /api/media + /api/upload only.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  ImageIcon,
  Link2,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";

export type AssetSource = "upload" | "stock" | "url" | "bg-remove" | string;

export type LibraryAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  sizeBytes: number;
  source: AssetSource;
  provider: string | null;
  sourcePageUrl: string | null;
  creatorName: string | null;
  creatorUrl: string | null;
  licenseCode: string | null;
  licenseUrl: string | null;
  attributionText: string | null;
  rightsNote: string | null;
  approvalStatus: "UNREVIEWED" | "APPROVED" | "REJECTED";
  isFavorite: boolean;
  recentAt: string | null;
  createdAt: string;
  /** Where this asset is currently used (Card / Campaign / Brand logo). */
  usedIn: {
    label: string;
    href: string;
    detail?: string;
    developerPath?: string;
  }[];
  isBrandLogo: boolean;
};

type SourceFilter = "all" | "upload" | "stock" | "generated" | "url";

/** Truthful source/rights descriptor — never claim rights we cannot back. */
function sourceMeta(source: AssetSource): {
  label: string;
  rights: string;
  token: string;
} {
  switch (source) {
    case "upload":
      return {
        label: "Uploaded",
        rights: "You supplied this file — you are responsible for its rights.",
        token: "var(--studio-status-ok)",
      };
    case "stock":
    case "pexels":
      return {
        label: "Pexels",
        rights: "Imported under the recorded Pexels provenance and license.",
        token: "var(--studio-status-info)",
      };
    case "logo_dev":
      return {
        label: "Logo.dev",
        rights: "Discovery source only; trademark rights remain with the brand owner.",
        token: "var(--studio-status-warn)",
      };
    case "bg-remove":
      return {
        label: "Generated",
        rights: "Derived by background removal from a source you provided.",
        token: "var(--studio-status-neutral)",
      };
    case "url":
      return {
        label: "URL import",
        rights: "Durable imported copy; origin rights remain unverified.",
        token: "var(--studio-status-warn)",
      };
    default:
      return {
        label: source,
        rights: "Source rights unverified.",
        token: "var(--studio-status-neutral)",
      };
  }
}

function matchesFilter(source: AssetSource, filter: SourceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "generated") return source === "bg-remove";
  if (filter === "stock") return source === "stock" || source === "pexels";
  return source === filter;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SourceIcon({ source }: { source: AssetSource }) {
  if (source === "stock" || source === "pexels") {
    return <Sparkles className="h-3 w-3" aria-hidden />;
  }
  if (source === "url") return <Link2 className="h-3 w-3" aria-hidden />;
  return <ImageIcon className="h-3 w-3" aria-hidden />;
}

export function AssetsLibrary({
  initialAssets,
  mediaUploadReady,
}: {
  initialAssets: LibraryAsset[];
  mediaUploadReady: boolean;
}) {
  const [assets, setAssets] = useState<LibraryAsset[]>(initialAssets);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<LibraryAsset | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c = { all: assets.length, upload: 0, stock: 0, generated: 0, url: 0 };
    for (const a of assets) {
      if (a.source === "upload") c.upload += 1;
      else if (a.source === "stock" || a.source === "pexels") c.stock += 1;
      else if (a.source === "bg-remove") c.generated += 1;
      else if (a.source === "url") c.url += 1;
    }
    return c;
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (!matchesFilter(a.source, filter)) return false;
      if (!q) return true;
      return (
        (a.filename ?? "").toLowerCase().includes(q) ||
        a.url.toLowerCase().includes(q) ||
        a.usedIn.some((u) => u.label.toLowerCase().includes(q))
      );
    });
  }, [assets, query, filter]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!mediaUploadReady) {
        setUploadError(
          "Upload storage (Cloudflare R2) is not configured — drag/drop is disabled until it is set up."
        );
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/media/upload", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.asset) {
            setUploadError(
              (data && (data.error as string)) ||
                "Upload failed — the provider did not accept this file."
            );
            continue;
          }
          const a = data.asset as {
            id: string;
            url: string;
            filename: string | null;
            mimeType: string;
            sizeBytes: number;
            source: string;
            createdAt: string;
          };
          setAssets((prev) => [
            {
              id: a.id,
              url: a.url,
              filename: a.filename,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes ?? 0,
              source: a.source ?? "upload",
              provider: null,
              sourcePageUrl: null,
              creatorName: null,
              creatorUrl: null,
              licenseCode: "OWNER_SUPPLIED",
              licenseUrl: null,
              attributionText: null,
              rightsNote: "Owner supplied this asset and is responsible for usage rights.",
              approvalStatus: "UNREVIEWED",
              isFavorite: false,
              recentAt: null,
              createdAt: a.createdAt ?? new Date().toISOString(),
              usedIn: [],
              isBrandLogo: false,
            },
            ...prev.filter((p) => p.id !== a.id),
          ]);
        }
      } catch {
        setUploadError("Upload failed — network or provider error.");
      } finally {
        setUploading(false);
      }
    },
    [mediaUploadReady]
  );

  const filterTabs: { id: SourceFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "upload", label: "Uploaded", count: counts.upload },
    { id: "stock", label: "Stock", count: counts.stock },
    { id: "generated", label: "Generated", count: counts.generated },
    { id: "url", label: "Linked", count: counts.url },
  ];

  return (
    <section className="space-y-5" data-testid="assets-library">
      {/* Toolbar: search + source filter + upload */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by source">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              data-testid={`assets-filter-${tab.id}`}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                filter === tab.id
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/12 text-white/55 hover:border-white/25 hover:text-white/80"
              )}
            >
              {tab.label}
              <span className="text-white/40">{tab.count}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-1 lg:max-w-xs">
          <span className="sr-only">Search assets</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename or where it's used"
            data-testid="assets-search"
            className="min-h-10 w-full rounded-lg border border-white/12 bg-white/[0.03] pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus-visible:border-white/40 focus-visible:outline-none"
          />
        </label>
      </div>

      {/* Drag/drop upload zone — honest about provider state */}
      <div
        data-testid="assets-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          if (mediaUploadReady) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
          dragging ? "border-white/50 bg-white/[0.05]" : "border-white/15 bg-white/[0.02]",
          !mediaUploadReady && "opacity-80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="sr-only"
          aria-label="Upload asset files"
          data-testid="assets-upload-input"
          disabled={!mediaUploadReady || uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Upload className="mx-auto h-5 w-5 text-white/45" aria-hidden />
        {mediaUploadReady ? (
          <>
            <p className="mt-2 text-sm text-white/70">
              Drag files here, or{" "}
              <button
                type="button"
                className="font-medium text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                data-testid="assets-upload-browse"
              >
                browse
              </button>
              {uploading ? " · uploading…" : ""}
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              PNG, JPEG, WebP, or GIF up to 8MB. Files land in your library and can be reused across the Card
              and campaigns.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/60" data-testid="assets-upload-disabled">
              Upload storage is not configured
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              Cloudflare R2 credentials are required before drag/drop upload works. Stock search and
              linked media remain available inside builders.
            </p>
          </>
        )}
        {uploadError ? (
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--studio-status-critical)" }}
            role="alert"
            data-testid="assets-upload-error"
          >
            {uploadError}
          </p>
        ) : null}
      </div>

      {/* Library grid */}
      {filtered.length === 0 ? (
        assets.length === 0 ? (
          <TruthfulEmptyStatePanel
            testId="assets-library-empty"
            state={{
              id: "empty_assets",
              title: "Your media library is empty",
              whatMissing: "No uploaded, stock, or generated media has been saved yet.",
              whyEmpty:
                "Assets are saved when you upload here or pick media inside the Card and Campaign builders.",
              isNormal: true,
              normalNote: "Normal for a new workspace — Brand Kit stays the source of truth for identity.",
              actionLabel: "Open the Card editor to add media",
              actionHref: "/dashboard/card/edit",
            }}
          />
        ) : (
          <div
            className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center"
            data-testid="assets-filter-empty"
            role="status"
          >
            <p className="text-sm text-white/70">No assets match this filter or search</p>
            <button
              type="button"
              className="mt-2 text-xs text-white/50 underline underline-offset-2"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          data-testid="assets-grid"
        >
          {filtered.map((asset) => {
            const meta = sourceMeta(asset.source);
            const isImage = asset.mimeType.startsWith("image/");
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
                  data-testid={`asset-card-${asset.id}`}
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] text-left transition-colors hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-black/30">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.url}
                        alt={asset.filename ?? "Asset preview"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/30">
                        <FileText className="h-8 w-8" aria-hidden />
                      </div>
                    )}
                    <span
                      className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide backdrop-blur"
                      style={{
                        color: meta.token,
                        borderColor: `color-mix(in oklch, ${meta.token} 45%, transparent)`,
                        backgroundColor: "rgba(0,0,0,0.55)",
                      }}
                    >
                      <SourceIcon source={asset.source} />
                      {meta.label}
                    </span>
                    {asset.usedIn.length > 0 ? (
                      <span
                        className="absolute right-1.5 top-1.5 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium"
                        style={{
                          color: "var(--studio-status-info)",
                          borderColor:
                            "color-mix(in oklch, var(--studio-status-info) 45%, transparent)",
                          backgroundColor: "rgba(0,0,0,0.55)",
                        }}
                        title={`Used in ${asset.usedIn.length} place(s)`}
                      >
                        Used ×{asset.usedIn.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 px-2.5 py-2">
                    <p className="truncate text-xs text-white/80">
                      {asset.filename ?? "Untitled"}
                      {asset.isBrandLogo ? " · Brand logo" : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/40">{formatBytes(asset.sizeBytes)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Detail drawer */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Asset details"
          data-testid="asset-detail-drawer"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-sm overflow-y-auto border-l border-white/12 bg-[#0a0e18] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Asset details</h3>
              <button
                type="button"
                aria-label="Close"
                data-testid="asset-detail-close"
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {selected.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.url}
                  alt={selected.filename ?? "Asset preview"}
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-white/30">
                  <FileText className="h-10 w-10" aria-hidden />
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-white/40">Filename</dt>
                <dd className="mt-0.5 break-words text-white/80">
                  {selected.filename ?? "Untitled"}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Source & rights</dt>
                <dd className="mt-1">
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      color: sourceMeta(selected.source).token,
                      borderColor: `color-mix(in oklch, ${sourceMeta(selected.source).token} 45%, transparent)`,
                    }}
                  >
                    <SourceIcon source={selected.source} />
                    {sourceMeta(selected.source).label}
                  </span>
                  <p className="mt-1.5 text-white/55">
                    {selected.rightsNote || sourceMeta(selected.source).rights}
                  </p>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-white/40">Provider</dt>
                  <dd className="mt-0.5 text-white/70">{selected.provider || "None"}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Approval</dt>
                  <dd className="mt-0.5 text-white/70">{selected.approvalStatus}</dd>
                </div>
              </div>
              <div>
                <dt className="text-white/40">Creator / attribution</dt>
                <dd className="mt-0.5 text-white/70">
                  {selected.attributionText || selected.creatorName || "Not provided"}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-white/40">License</dt>
                  <dd className="mt-0.5 text-white/70">{selected.licenseCode || "Not asserted"}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Activity</dt>
                  <dd className="mt-0.5 text-white/70">
                    {selected.isFavorite ? "Favorite" : "Not favorite"}
                    {selected.recentAt ? " · Recent" : ""}
                  </dd>
                </div>
              </div>
              {selected.sourcePageUrl || selected.licenseUrl ? (
                <div className="flex flex-wrap gap-3">
                  {selected.sourcePageUrl ? (
                    <a
                      href={selected.sourcePageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/75 underline"
                    >
                      Original source
                    </a>
                  ) : null}
                  {selected.licenseUrl ? (
                    <a
                      href={selected.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/75 underline"
                    >
                      License
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-white/40">Type</dt>
                  <dd className="mt-0.5 text-white/70">{selected.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Size</dt>
                  <dd className="mt-0.5 text-white/70">{formatBytes(selected.sizeBytes)}</dd>
                </div>
              </div>
              <div>
                <dt className="text-white/40">Used in</dt>
                <dd className="mt-1">
                  {selected.usedIn.length === 0 ? (
                    <p className="text-white/45" data-testid="asset-unused">
                      Not used anywhere yet. Safe to remove, or reuse it on your Card.
                    </p>
                  ) : (
                    <ul className="space-y-1" data-testid="asset-used-in">
                      {selected.usedIn.map((u, i) => (
                        <li key={`${u.href}-${i}`}>
                          <Link
                            href={u.href}
                            className="text-white/75 hover:text-white hover:underline"
                          >
                            {u.label}
                          </Link>
                          {u.detail ? (
                            <span className="ml-1 text-white/40">· {u.detail}</span>
                          ) : null}
                          {u.developerPath ? (
                            <details className="mt-1 text-[10px] text-white/35">
                              <summary className="cursor-pointer">Developer details</summary>
                              <code className="mt-1 block break-all">{u.developerPath}</code>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">URL</dt>
                <dd className="mt-0.5 break-all font-mono text-[10px] text-white/50">
                  {selected.url}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}
