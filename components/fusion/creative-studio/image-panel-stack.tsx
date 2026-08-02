"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media/media-picker";
import { NestedPanelShell } from "@/components/fusion/creative-studio/nested-panel-shell";
import type { TapCardSection } from "@/lib/brand/tap-card";
import { sectionDisplayName } from "@/lib/fusion/creative-studio/history-labels";
import { cn } from "@/lib/utils";

export type ImagePanelStackProps = {
  selected: TapCardSection | null;
  onPatchSection: (id: string, patch: Partial<TapCardSection>, label?: string) => void;
  onClose?: () => void;
  /** Header / brand logo URL when no image section is selected */
  headerLogoUrl?: string;
  onPatchHeaderLogo?: (url: string) => void;
  showHeaderLogo?: boolean;
  onToggleHeaderLogo?: (on: boolean) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
};

function SliderRow({
  label,
  testId,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  testId: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-white/70">{label}</Label>
        <span className="font-mono text-[10px] text-white/45">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        disabled={disabled}
        data-testid={testId}
        className="w-full"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/**
 * Consolidated Image settings — one panel, selected-object title,
 * no empty nested Source / Fit / Accessibility / Advanced rooms.
 */
export function ImagePanelStack({
  selected,
  onPatchSection,
  onClose,
  headerLogoUrl = "",
  onPatchHeaderLogo,
  showHeaderLogo,
  onToggleHeaderLogo,
  mediaUploadReady = false,
  stockReady = false,
}: ImagePanelStackProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isImage =
    selected?.type === "image" ||
    selected?.type === "image_gallery" ||
    selected?.type === "logo_block" ||
    selected?.type === "hero" ||
    selected?.type === "special_offer" ||
    selected?.type === "coupon" ||
    selected?.type === "ticket" ||
    selected?.type === "announcement" ||
    selected?.type === "special_event";

  if (!isImage && !onPatchHeaderLogo) {
    return (
      <NestedPanelShell
        title="Image settings"
        breadcrumbs={["Image settings"]}
        depth={0}
        onClose={onClose}
        testId="image-panel-stack"
      >
        <p className="text-xs text-white/55" data-testid="image-panel-empty">
          Select an image, logo, or hero block on the Card — or enable the header logo below.
        </p>
        {onToggleHeaderLogo ? (
          <label className="mt-3 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showHeaderLogo === true}
              onChange={(e) => onToggleHeaderLogo(e.target.checked)}
              data-testid="image-panel-header-logo-toggle"
            />
            Logo above card
          </label>
        ) : null}
      </NestedPanelShell>
    );
  }

  const title = selected
    ? `${sectionDisplayName(selected)} · Image settings`
    : "Header logo · Image settings";
  const src =
    (selected && (selected.type === "image_gallery" ? selected.imageUrls?.[0] : selected.imageUrl || selected.logoUrl)) || headerLogoUrl || "";
  const hasMedia = Boolean(src);
  const objectFit = selected?.objectFit ?? "cover";
  const decorative = Boolean(selected?.decorative);

  function patchSelected(patch: Partial<TapCardSection>, label: string) {
    if (!selected) return;
    onPatchSection(selected.id, patch, label);
  }

  function setMediaUrl(url: string) {
    if (selected) {
      patchSelected(
        selected.type === "logo_block" ? { logoUrl: url } : selected.type === "image_gallery" ? { imageUrls: url ? [url, ...(selected.imageUrls || []).slice(1)] : (selected.imageUrls || []).slice(1) } : { imageUrl: url },
        url ? "Replaced image" : "Cleared image"
      );
    } else {
      onPatchHeaderLogo?.(url);
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard?.readText();
      if (text && /^https?:\/\//i.test(text.trim())) {
        setMediaUrl(text.trim());
        return;
      }
    } catch {
      /* fall through */
    }
    // File paste is handled by MediaPicker browse/upload; clipboard image needs File API permission.
  }

  return (
    <NestedPanelShell
      title={title}
      breadcrumbs={[title]}
      depth={0}
      onClose={onClose}
      testId="image-panel-stack"
    >
      <div className="space-y-4" data-testid="image-panel-consolidated">
        <p className="text-xs leading-relaxed text-white/55" data-testid="image-panel-context">
          {selected
            ? `Editing ${sectionDisplayName(selected)} on this Card.`
            : "Editing the logo shown above the Card."}
        </p>

        {!mediaUploadReady || !stockReady ? (
          <p
            className="rounded-md border border-[color:var(--studio-status-info)]/35 bg-[color:var(--studio-status-info)]/[0.06] px-2.5 py-2 text-[11px] text-white/70"
            data-testid="image-panel-readiness"
          >
            {!mediaUploadReady
              ? "Upload needs storage credentials. Browse Assets and Paste URL still work when available."
              : "Stock search needs provider credentials. Your uploads and Assets remain available."}
          </p>
        ) : null}

        <div className="space-y-2" data-testid="image-panel-source">
          <Label className="text-xs text-white/70">Media</Label>
          <MediaPicker
            value={String(src || "")}
            valueAssetId={selected?.mediaAssetId}
            label={
              selected?.type === "logo_block" || !selected
                ? "Brand logo"
                : "Card image"
            }
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            onChange={setMediaUrl}
            onAssetChange={(asset) => {
              if (!selected) return;
              patchSelected(asset ? {
                mediaAssetId: asset.mediaAssetId || asset.id,
                ...(selected.type === "image_gallery" ? { mediaAssetIds: [asset.mediaAssetId || asset.id, ...(selected.mediaAssetIds || []).slice(1)] } : {}),
                sourceMode: "LINKED",
                linkedObjectType: "ASSET",
                linkedObjectId: asset.mediaAssetId || asset.id,
                linkedObjectName: asset.label,
              } : {
                mediaAssetId: undefined,
                sourceMode: "LOCAL",
                linkedObjectType: undefined,
                linkedObjectId: undefined,
                linkedObjectName: undefined,
              }, asset ? "Selected Asset Studio media" : "Cleared Asset Studio media");
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              data-testid="image-panel-paste"
              onClick={() => void pasteFromClipboard()}
            >
              Paste
            </Button>
            {hasMedia ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  data-testid="image-panel-copy-link"
                  onClick={() => {
                    try {
                      void navigator.clipboard?.writeText(src);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Copy link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  data-testid="image-panel-clear"
                  onClick={() => setMediaUrl("")}
                >
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {selected ? (
          <>
            <div className="space-y-2" data-testid="image-panel-fit">
              <Label className="text-xs text-white/70">Fit</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["cover", "contain", "fill"] as const).map((fit) => (
                  <Button
                    key={fit}
                    type="button"
                    size="sm"
                    variant={objectFit === fit ? "default" : "outline"}
                    className="h-8 capitalize text-xs"
                    data-testid={`image-fit-${fit}`}
                    onClick={() =>
                      patchSelected({ objectFit: fit }, `Set image fit to ${fit}`)
                    }
                  >
                    {fit}
                  </Button>
                ))}
              </div>
              <SliderRow
                label="Scale"
                testId="image-logo-scale"
                min={40}
                max={160}
                value={Math.round((selected.logoScale ?? 1) * 100)}
                onChange={(v) =>
                  patchSelected({ logoScale: v / 100 }, "Changed image scale")
                }
              />
              <SliderRow
                label="Position X"
                testId="image-offset-x"
                min={-50}
                max={50}
                value={Math.round(selected.logoOffsetX ?? 0)}
                onChange={(v) =>
                  patchSelected({ logoOffsetX: v }, "Changed image position")
                }
              />
              <SliderRow
                label="Position Y"
                testId="image-offset-y"
                min={-50}
                max={50}
                value={Math.round(selected.logoOffsetY ?? 0)}
                onChange={(v) =>
                  patchSelected({ logoOffsetY: v }, "Changed image position")
                }
              />
              <SliderRow
                label="Opacity"
                testId="image-opacity"
                min={10}
                max={100}
                value={Math.round((selected.opacity ?? 1) * 100)}
                onChange={(v) =>
                  patchSelected({ opacity: v / 100 }, "Changed image opacity")
                }
              />
              <SliderRow
                label="Rotation"
                testId="image-rotation"
                min={-180}
                max={180}
                value={Math.round(selected.rotation ?? 0)}
                onChange={(v) =>
                  patchSelected({ rotation: v }, "Changed image rotation")
                }
              />
            </div>

            <div className="space-y-2" data-testid="image-panel-a11y">
              <Label className="text-xs text-white/70">Alt text</Label>
              <Input
                value={String(selected.altText || selected.label || "")}
                data-testid="image-panel-alt"
                disabled={decorative}
                onChange={(e) =>
                  patchSelected(
                    { altText: e.target.value, label: e.target.value },
                    "Changed image alt text"
                  )
                }
              />
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={decorative}
                  data-testid="image-panel-decorative"
                  onChange={(e) =>
                    patchSelected(
                      { decorative: e.target.checked },
                      e.target.checked
                        ? "Marked image decorative"
                        : "Marked image informative"
                    )
                  }
                />
                Decorative (hide from assistive tech)
              </label>
            </div>

            <div className="border-t border-white/10 pt-2">
              <button
                type="button"
                className="text-xs font-medium text-white/70 hover:text-white"
                data-testid="image-panel-advanced-toggle"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {advancedOpen ? "Hide advanced adjustments" : "Advanced adjustments"}
              </button>
              {advancedOpen ? (
                <div
                  className={cn("mt-2 space-y-2")}
                  data-testid="image-panel-advanced"
                >
                  <SliderRow
                    label="Brightness"
                    testId="image-brightness"
                    min={50}
                    max={150}
                    value={Math.round((selected.brightness ?? 1) * 100)}
                    onChange={(v) =>
                      patchSelected(
                        { brightness: v / 100 },
                        "Changed image brightness"
                      )
                    }
                  />
                  <SliderRow
                    label="Contrast"
                    testId="image-contrast"
                    min={50}
                    max={150}
                    value={Math.round((selected.contrast ?? 1) * 100)}
                    onChange={(v) =>
                      patchSelected(
                        { contrast: v / 100 },
                        "Changed image contrast"
                      )
                    }
                  />
                  <SliderRow
                    label="Saturation"
                    testId="image-saturation"
                    min={0}
                    max={200}
                    value={Math.round((selected.saturation ?? 1) * 100)}
                    onChange={(v) =>
                      patchSelected(
                        { saturation: v / 100 },
                        "Changed image saturation"
                      )
                    }
                  />
                  <SliderRow
                    label="Blur"
                    testId="image-blur"
                    min={0}
                    max={20}
                    value={Math.round(selected.blur ?? 0)}
                    onChange={(v) =>
                      patchSelected({ blur: v }, "Changed image blur")
                    }
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      data-testid="image-flip-x"
                      onClick={() =>
                        patchSelected(
                          { flipX: !selected.flipX },
                          selected.flipX ? "Unflipped image horizontally" : "Flipped image horizontally"
                        )
                      }
                    >
                      Flip horizontal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      data-testid="image-flip-y"
                      onClick={() =>
                        patchSelected(
                          { flipY: !selected.flipY },
                          selected.flipY ? "Unflipped image vertically" : "Flipped image vertically"
                        )
                      }
                    >
                      Flip vertical
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      data-testid="image-reset"
                      onClick={() =>
                        patchSelected(
                          {
                            logoScale: 1,
                            logoOffsetX: 0,
                            logoOffsetY: 0,
                            opacity: 1,
                            rotation: 0,
                            brightness: 1,
                            contrast: 1,
                            saturation: 1,
                            blur: 0,
                            flipX: false,
                            flipY: false,
                            objectFit: "cover",
                          },
                          "Reset image adjustments"
                        )
                      }
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {onToggleHeaderLogo ? (
          <label className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs">
            <input
              type="checkbox"
              checked={showHeaderLogo === true}
              onChange={(e) => onToggleHeaderLogo(e.target.checked)}
              data-testid="image-panel-header-logo-toggle"
            />
            Logo above card
          </label>
        ) : null}
      </div>
    </NestedPanelShell>
  );
}
