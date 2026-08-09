"use client";

import { MediaPicker } from "@/components/media/media-picker";
import { PatternTextureStudio } from "@/components/fusion/creative-studio/pattern-texture-studio";
import { GRADIENT_PRESETS } from "@/lib/fusion/creative-studio/gradient";
import {
  VISUAL_PLANE_LABELS,
  patternVisualPlane,
  photographyVisualPlane,
  repeatingMediaPatternPlane,
  type VisualPlane,
  type VisualPlaneTarget,
} from "@/lib/fusion/creative-studio/visual-plane";
import { surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";
import { cn } from "@/lib/utils";

const KIND_OPTIONS = [
  "none",
  "solid",
  "gradient",
  "image",
  "pattern",
  "texture",
] as const;

type VisualPlaneStudioProps = {
  target: VisualPlaneTarget;
  value: VisualPlane;
  onChange: (plane: VisualPlane, label: string) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  brandLogoUrl?: string;
  brandLogoAssetId?: string;
  solidSwatches?: string[];
  className?: string;
};

export function VisualPlaneStudio({
  target,
  value,
  onChange,
  mediaUploadReady,
  stockReady,
  brandLogoUrl,
  brandLogoAssetId,
  solidSwatches = ["#0b0f19", "#171b24", "#f8fafc", "#b8ff2c"],
  className,
}: VisualPlaneStudioProps) {
  const label = VISUAL_PLANE_LABELS[target];
  const kind = value.kind === "none" ? "none" : value.kind;
  const imageUrl =
    value.kind === "image" ? value.media.fallbackUrl : "";
  const imageAssetId =
    value.kind === "image" ? value.media.mediaAssetId : undefined;

  return (
    <div
      className={cn("space-y-3", className)}
      data-testid={`visual-plane-studio-${target}`}
      data-visual-plane-target={target}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            data-testid={`visual-plane-kind-${option}`}
            className="min-h-9 rounded border border-white/10 px-1 text-[10px] aria-pressed:border-[#b8ff2c]"
            onClick={() => {
              if (option === "none") {
                onChange({ kind: "none" }, `Cleared ${label}`);
                return;
              }
              if (option === "solid") {
                onChange(
                  { kind: "solid", color: solidSwatches[0] || "#0b0f19" },
                  `Set ${label} solid`
                );
                return;
              }
              if (option === "gradient") {
                const preset = GRADIENT_PRESETS[0];
                onChange(
                  {
                    kind: "gradient",
                    gradient: structuredClone(preset.gradient),
                  },
                  `Set ${label} gradient`
                );
                return;
              }
              if (option === "image") {
                onChange(
                  photographyVisualPlane({
                    url: imageUrl || "/tap-connect-logo.png",
                    mediaAssetId: imageAssetId,
                  }),
                  `Set ${label} photography`
                );
                return;
              }
              onChange(
                patternVisualPlane(
                  option === "texture" ? "linen" : "brick",
                  option,
                  {
                    background: solidSwatches[0] || "#0b0f19",
                    foreground: "#ffffff",
                  }
                ),
                `Set ${label} ${option}`
              );
            }}
          >
            {option === "none" ? "Clear" : option}
          </button>
        ))}
      </div>

      {value.kind === "solid" ? (
        <div className="grid grid-cols-4 gap-1">
          {solidSwatches.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Solid ${color}`}
              className="aspect-square rounded border border-white/15"
              style={{ background: color }}
              onClick={() =>
                onChange({ kind: "solid", color }, `Changed ${label} solid`)
              }
            />
          ))}
          <label className="col-span-4 text-[10px] text-white/65">
            Custom
            <input
              aria-label={`${label} solid color`}
              type="color"
              value={value.color.slice(0, 7)}
              onChange={(event) =>
                onChange(
                  { kind: "solid", color: event.target.value },
                  `Changed ${label} solid`
                )
              }
              className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent"
            />
          </label>
        </div>
      ) : null}

      {value.kind === "gradient" ? (
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PRESETS.slice(0, 8).map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="min-h-12 rounded border border-white/10 px-2 text-left text-[10px]"
              style={{
                background: `linear-gradient(${preset.gradient.angle}deg, ${preset.gradient.stops[0]?.color}, ${preset.gradient.stops[preset.gradient.stops.length - 1]?.color})`,
              }}
              onClick={() =>
                onChange(
                  {
                    kind: "gradient",
                    gradient: structuredClone(preset.gradient),
                  },
                  `Applied ${preset.label} to ${label}`
                )
              }
            >
              <span className="rounded bg-black/40 px-1 text-white">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {brandLogoUrl ? (
        <div className="grid grid-cols-2 gap-1" data-testid={`visual-plane-brand-actions-${target}`}>
          <button
            type="button"
            className="min-h-10 rounded border border-white/10 text-[10px]"
            data-testid={`visual-plane-brand-photo-${target}`}
            onClick={() =>
              onChange(
                photographyVisualPlane({
                  url: brandLogoUrl,
                  mediaAssetId: brandLogoAssetId,
                }),
                `Used Brand image as ${label}`
              )
            }
          >
            Use Brand as photo
          </button>
          <button
            type="button"
            className="min-h-10 rounded border border-[#b8ff2c]/40 text-[10px] text-[#b8ff2c]"
            data-testid={`visual-plane-use-as-pattern-${target}`}
            onClick={() =>
              onChange(
                repeatingMediaPatternPlane({
                  url: brandLogoUrl,
                  mediaAssetId: brandLogoAssetId,
                }),
                `Used Brand as repeating pattern on ${label}`
              )
            }
          >
            Use as Pattern
          </button>
        </div>
      ) : null}

      {value.kind === "image" || kind === "image" ? (
        <div className="space-y-2" data-testid={`visual-plane-media-${target}`}>
          <MediaPicker
            label={`${label} photography / media`}
            value={imageUrl}
            valueAssetId={imageAssetId}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            onChange={(url) => {
              if (!url) {
                onChange({ kind: "none" }, `Removed ${label} media`);
                return;
              }
              onChange(
                photographyVisualPlane({
                  url,
                  mediaAssetId: imageAssetId,
                  overlayOpacity:
                    value.kind === "image"
                      ? value.treatment.overlayOpacity
                      : 0.2,
                  tint:
                    value.kind === "image" ? value.treatment.tint : "#000000",
                }),
                `Changed ${label} photography`
              );
            }}
            onAssetChange={(asset) => {
              if (!asset) {
                onChange({ kind: "none" }, `Removed ${label} media`);
                return;
              }
              onChange(
                photographyVisualPlane({
                  url: asset.url,
                  mediaAssetId: asset.mediaAssetId || asset.id,
                }),
                `Imported durable media for ${label}`
              );
            }}
          />
          {value.kind === "image" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/65">
                Fit
                <select
                  aria-label={`${label} media fit`}
                  className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2 text-xs"
                  value={value.treatment.fit}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          fit: event.target.value as typeof value.treatment.fit,
                          repeat:
                            event.target.value === "contain" &&
                            value.treatment.repeat === "repeat"
                              ? "repeat"
                              : value.treatment.repeat === "repeat"
                                ? "repeat"
                                : "no-repeat",
                        },
                      },
                      `Changed ${label} media fit`
                    )
                  }
                >
                  <option value="cover">Cover / Fill</option>
                  <option value="contain">Contain / Fit</option>
                  <option value="fill">Stretch</option>
                </select>
              </label>
              <label className="text-[10px] text-white/65">
                Repeat
                <select
                  aria-label={`${label} media repeat`}
                  className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2 text-xs"
                  value={value.treatment.repeat}
                  data-testid={`visual-plane-repeat-${target}`}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          repeat: event.target
                            .value as typeof value.treatment.repeat,
                          fit:
                            event.target.value === "repeat"
                              ? "contain"
                              : value.treatment.fit,
                        },
                      },
                      event.target.value === "repeat"
                        ? `Set ${label} repeating pattern`
                        : `Changed ${label} media repeat`
                    )
                  }
                >
                  <option value="no-repeat">Photo (no tile)</option>
                  <option value="repeat">Tile / Pattern</option>
                  <option value="repeat-x">Tile horizontal</option>
                  <option value="repeat-y">Tile vertical</option>
                </select>
              </label>
              <label className="text-[10px] text-white/65">
                Focal X
                <input
                  aria-label={`${label} focal X`}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(value.treatment.focalPoint.x * 100)}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          focalPoint: {
                            ...value.treatment.focalPoint,
                            x: Number(event.target.value) / 100,
                          },
                        },
                      },
                      `Changed ${label} focal point`
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-[10px] text-white/65">
                Focal Y
                <input
                  aria-label={`${label} focal Y`}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(value.treatment.focalPoint.y * 100)}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          focalPoint: {
                            ...value.treatment.focalPoint,
                            y: Number(event.target.value) / 100,
                          },
                        },
                      },
                      `Changed ${label} focal point`
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-[10px] text-white/65">
                Overlay
                <input
                  aria-label={`${label} overlay color`}
                  type="color"
                  value={(value.treatment.tint || "#000000").slice(0, 7)}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          tint: event.target.value,
                          overlayOpacity: Math.max(
                            value.treatment.overlayOpacity,
                            0.15
                          ),
                        },
                      },
                      `Changed ${label} overlay`
                    )
                  }
                  className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent"
                />
              </label>
              <label className="text-[10px] text-white/65">
                Overlay strength
                <input
                  aria-label={`${label} overlay opacity`}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(value.treatment.overlayOpacity * 100)}
                  onChange={(event) =>
                    onChange(
                      {
                        ...value,
                        treatment: {
                          ...value.treatment,
                          overlayOpacity: Number(event.target.value) / 100,
                          tint: value.treatment.tint || "#000000",
                        },
                      },
                      `Changed ${label} overlay strength`
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>
              {value.treatment.repeat !== "no-repeat" ? (
                <label className="col-span-2 text-[10px] text-white/65">
                  Pattern scale
                  <input
                    aria-label={`${label} pattern scale`}
                    type="range"
                    min={10}
                    max={80}
                    value={Math.round(value.treatment.scale * 100)}
                    onChange={(event) =>
                      onChange(
                        {
                          ...value,
                          treatment: {
                            ...value.treatment,
                            scale: Number(event.target.value) / 100,
                          },
                        },
                        `Changed ${label} pattern scale`
                      )
                    }
                    className="mt-1 w-full"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
          {imageUrl ? (
            <button
              type="button"
              className="min-h-10 w-full rounded border border-[#b8ff2c]/40 text-[10px] text-[#b8ff2c]"
              data-testid={`visual-plane-selected-as-pattern-${target}`}
              onClick={() =>
                onChange(
                  repeatingMediaPatternPlane({
                    url: imageUrl,
                    mediaAssetId: imageAssetId,
                  }),
                  `Used selected media as repeating pattern on ${label}`
                )
              }
            >
              Use selected media as Pattern
            </button>
          ) : null}
        </div>
      ) : null}

      {value.kind === "pattern" || value.kind === "texture" ? (
        <div data-testid={`visual-plane-catalog-${target}`}>
          <PatternTextureStudio
            kind={value.kind}
            value={value.pattern}
            onChange={(pattern, changeLabel) =>
              onChange(
                value.kind === "texture"
                  ? { kind: "texture", pattern }
                  : { kind: "pattern", pattern },
                `${changeLabel} · ${label}`
              )
            }
          />
          <div
            className="mt-2 h-16 rounded border border-white/10"
            aria-hidden
            data-testid={`visual-plane-tile-preview-${target}`}
            style={surfacePatternStyle(value.pattern)}
          />
        </div>
      ) : null}

      {value.kind === "image" && value.treatment.repeat !== "no-repeat" ? (
        <div
          className="h-16 rounded border border-white/10"
          aria-hidden
          data-testid={`visual-plane-repeat-preview-${target}`}
          style={{
            backgroundImage: `url("${value.media.fallbackUrl.replace(/"/g, "%22")}")`,
            backgroundRepeat: value.treatment.repeat,
            backgroundSize: `${Math.round(value.treatment.scale * 100)}% auto`,
            opacity: value.treatment.opacity,
            backgroundColor: "#0b0f19",
          }}
        />
      ) : null}
    </div>
  );
}
