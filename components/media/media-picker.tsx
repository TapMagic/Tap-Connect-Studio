"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SharedMediaAssetBrowser } from "@/components/media/shared-media-asset-browser";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";

interface MediaPickerProps {
  value?: string;
  valueAssetId?: string;
  onChange?: (url: string) => void;
  onAssetChange?: (asset: MediaAssetCandidate | null) => void;
  label?: string;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  campaignId?: string;
}

export function MediaPicker({
  value = "",
  valueAssetId,
  onChange,
  onAssetChange,
  label = "Image",
  mediaUploadReady = false,
  stockReady = false,
}: MediaPickerProps) {
  const [browserOpen, setBrowserOpen] = useState(false);

  function chooseAsset(asset: MediaAssetCandidate) {
    onChange?.(asset.url);
    onAssetChange?.(asset);
  }

  function clearAsset() {
    onChange?.("");
    onAssetChange?.(null);
  }

  return (
    <div className="space-y-3" data-testid="media-picker">
      <Label className="text-xs">{label}</Label>
      {value ? (
        <div className="overflow-hidden rounded-lg border border-border/50 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} selection`}
            className="max-h-40 w-full object-contain"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/50 p-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {valueAssetId ? `Studio asset ${valueAssetId}` : "Legacy URL selection"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBrowserOpen(true)}
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearAsset}
                aria-label={`Clear ${label}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="min-h-11 w-full"
          variant="outline"
          onClick={() => setBrowserOpen(true)}
          data-testid="open-shared-media-browser"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Browse media & assets
        </Button>
      )}

      <p className="text-[11px] text-muted-foreground">
        Upload, Studio, Brand, Recent, Favorites, Pexels, Logo.dev, and Advanced URL all use the
        shared browser.
      </p>

      <SharedMediaAssetBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={chooseAsset}
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
        selectionKind={label.toLowerCase().includes("logo") ? "logo" : "any"}
      />
    </div>
  );
}
