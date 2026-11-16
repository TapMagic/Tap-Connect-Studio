"use client";

import { useEffect, useState } from "react";
import { uploadMediaFile } from "@/lib/media/upload-policy";

type Asset = {
  id: string;
  url: string;
  filename?: string;
  mimeType: string;
  approvalStatus?: string;
};
/** Uses the existing tenant library and upload endpoint, never an arbitrary source URL. */
export function MediaAssetSelect({
  kind,
  value,
  onChange,
  uploadReady,
}: {
  kind: "audio" | "video";
  value?: string;
  onChange: (asset: Asset | null) => void;
  uploadReady?: boolean;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(
      `/api/media?kind=${kind}&limit=100&query=${encodeURIComponent(query)}`,
      { signal: abort.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Media library could not be loaded.");
        const data = await response.json();
        setAssets(data.assets || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setMessage(error.message);
      });
    return () => abort.abort();
  }, [query, kind]);
  return (
    <div className="space-y-2" data-studio-keyboard-owner="media">
      <label className="block text-xs">
        Search {kind} library
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3"
        />
      </label>
      <label className="block text-xs">
        {kind === "audio" ? "Audio MediaAsset" : "Video MediaAsset"}
        <select
          aria-label={
            kind === "audio" ? "Audio MediaAsset" : "Video MediaAsset"
          }
          value={assets.some((asset) => asset.id === value) ? value : ""}
          onChange={(event) =>
            onChange(
              assets.find((asset) => asset.id === event.target.value) || null,
            )
          }
          className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-[#0b111b] px-2"
        >
          <option value="">
            {value ? "Selected asset (search to change)" : "Choose an asset"}
          </option>
          {assets
            .filter(
              (asset) =>
                asset.mimeType.startsWith(`${kind}/`) &&
                asset.approvalStatus !== "REJECTED",
            )
            .map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.filename || asset.id}
              </option>
            ))}
        </select>
      </label>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-10 text-xs text-white/60"
        >
          Remove selected {kind}
        </button>
      ) : null}
      <label className="block text-xs text-white/70">
        Upload {kind}
        <input
          type="file"
          disabled={busy || uploadReady === false}
          accept={
            kind === "audio"
              ? ".mp3,.wav,.aac,.m4a,.flac,.ogg,.opus,audio/*"
              : ".mp4,.webm,.mov,video/*"
          }
          className="mt-2 block w-full text-xs"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage("Uploading…");
            try {
              const result = await uploadMediaFile<Asset>(
                file,
                (progress) =>
                  setMessage(`${progress.phase} ${progress.percent}%`),
                kind,
              );
              setAssets((old) => [
                result.asset,
                ...old.filter((asset) => asset.id !== result.asset.id),
              ]);
              onChange(result.asset);
              setMessage("Uploaded to your media library.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Upload failed.",
              );
            } finally {
              setBusy(false);
              event.target.value = "";
            }
          }}
        />
      </label>
      <p role="status" className="text-xs text-white/60">
        {message}
      </p>
    </div>
  );
}
