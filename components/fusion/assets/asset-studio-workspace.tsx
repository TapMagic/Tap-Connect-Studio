"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AssetsLibrary,
  type LibraryAsset,
} from "@/components/fusion/assets/assets-library";
import {
  AssetStudioCollectionsPanel,
  type SmartViewId,
} from "@/components/fusion/assets/asset-studio-collections-panel";

/**
 * Standalone Asset Studio — Media/Logos IA, smart views, Collections,
 * over the single MediaAsset source of truth.
 */
export function AssetStudioWorkspace({
  initialAssets,
  mediaUploadReady,
}: {
  initialAssets: LibraryAsset[];
  mediaUploadReady: boolean;
}) {
  const [area, setArea] = useState<"media" | "logos">("media");
  const [smartView, setSmartView] = useState<SmartViewId>("all");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionMemberIds, setCollectionMemberIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [urlImport, setUrlImport] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) {
      setCollectionMemberIds(new Set());
      return;
    }
    void fetch(`/api/media/collections/${collectionId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.mediaAssetIds)) {
          setCollectionMemberIds(new Set(data.mediaAssetIds));
        }
      })
      .catch(() => setCollectionMemberIds(new Set()));
  }, [collectionId]);

  const viewAssets = useMemo(() => {
    let list = initialAssets;
    if (area === "logos") {
      list = list.filter(
        (a) =>
          a.isBrandLogo ||
          a.source === "logo_dev" ||
          (a.filename ?? "").toLowerCase().includes("logo") ||
          a.mimeType.includes("svg")
      );
    }
    if (collectionId) {
      list = list.filter((a) => collectionMemberIds.has(a.id));
    } else {
      switch (smartView) {
        case "yours":
          list = list.filter((a) => a.source === "upload");
          break;
        case "brand":
          list = list.filter((a) => a.isBrandLogo || a.approvalStatus === "APPROVED");
          break;
        case "recent":
          list = list
            .filter((a) => a.recentAt)
            .slice()
            .sort((a, b) => (b.recentAt || "").localeCompare(a.recentAt || ""));
          break;
        case "favorites":
          list = list.filter((a) => a.isFavorite);
          break;
        case "unused":
          list = list.filter((a) => a.usedIn.length === 0);
          break;
        case "needs_approval":
          list = list.filter((a) => a.approvalStatus === "UNREVIEWED");
          break;
        case "needs_alt":
          list = list.filter(
            (a) => !(a as LibraryAsset & { defaultAltText?: string }).defaultAltText
          );
          break;
        case "rights_review":
          list = list.filter(
            (a) => !a.licenseCode || a.source === "url" || a.source === "logo_dev"
          );
          break;
        default:
          break;
      }
    }
    return list;
  }, [
    initialAssets,
    area,
    smartView,
    collectionId,
    collectionMemberIds,
  ]);

  const importUrl = useCallback(async () => {
    const url = urlImport.trim();
    if (!url) return;
    setImportMessage(null);
    const res = await fetch("/api/media/url/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportMessage(data.error || "URL import failed");
      return;
    }
    setImportMessage("Imported as a durable Asset. Refresh to see it in the grid.");
    setUrlImport("");
  }, [urlImport]);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const form = new FormData();
          form.append("file", file);
          void fetch("/api/media/upload", { method: "POST", body: form }).then(
            async (res) => {
              if (res.ok) {
                setImportMessage("Pasted image uploaded. Refresh to see it.");
              } else {
                setImportMessage(
                  "Clipboard upload needs storage credentials, or use Browse."
                );
              }
            }
          );
          e.preventDefault();
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div
      className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"
      data-testid="asset-studio-workspace"
    >
      <AssetStudioCollectionsPanel
        area={area}
        onAreaChange={setArea}
        smartView={smartView}
        onSmartViewChange={setSmartView}
        collectionId={collectionId}
        onCollectionChange={setCollectionId}
        selectedAssetIds={selectedAssetIds}
      />
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <label className="min-w-[14rem] flex-1">
            <span className="mb-1 block text-[11px] text-white/50">
              Import image URL (durable copy)
            </span>
            <input
              value={urlImport}
              onChange={(e) => setUrlImport(e.target.value)}
              placeholder="https://…"
              data-testid="asset-url-import"
              className="min-h-10 w-full rounded-lg border border-white/12 bg-black/30 px-3 text-sm text-white"
            />
          </label>
          <button
            type="button"
            data-testid="asset-url-import-submit"
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            onClick={() => void importUrl()}
          >
            Import URL
          </button>
          <p className="w-full text-[11px] text-white/45">
            Paste an image anywhere on this page to upload when storage is ready.
            Search stays independent of Collection navigation.
          </p>
          {importMessage ? (
            <p className="w-full text-xs text-white/70" data-testid="asset-import-message">
              {importMessage}
            </p>
          ) : null}
        </div>
        <AssetsLibrary
          initialAssets={viewAssets}
          mediaUploadReady={mediaUploadReady}
          onSelectionChange={setSelectedAssetIds}
        />
      </div>
    </div>
  );
}
