"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { GradientStudio } from "@/components/fusion/creative-studio/gradient-studio";
import { DEFAULT_GRADIENT } from "@/lib/fusion/creative-studio/gradient";
import {
  DEFAULT_IMAGE_TREATMENT,
  type CreativeFlowSection,
} from "@/lib/fusion/creative-platform/model";

export function CreativeFlowSectionEditor({
  value,
  onChange,
  mediaUploadReady,
  stockReady,
  brandColors = [],
}: {
  value: Partial<CreativeFlowSection> & Record<string, unknown>;
  onChange: (value: Record<string, unknown>, label: string) => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  brandColors?: string[];
}) {
  const image =
    value.image && typeof value.image === "object"
      ? (value.image as { mediaAssetId?: string; fallbackUrl?: string })
      : {};
  const background =
    value.background && typeof value.background === "object"
      ? (value.background as CreativeFlowSection["background"])
      : ({ kind: "solid", color: "#0b0f19" } as const);
  const patch = (next: Record<string, unknown>, label: string) =>
    onChange({ ...value, ...next }, label);

  return (
    <section className="space-y-4" data-testid="creative-flow-section-editor">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["image_left", "Image left"],
            ["image_right", "Image right"],
            ["image_top", "Image top"],
            ["image_bottom", "Image bottom"],
            ["square_wrap", "Square wrap"],
          ] as const
        ).map(([layout, label]) => (
          <button
            key={layout}
            type="button"
            className={`min-h-11 rounded-lg border px-2 text-xs ${
              value.layout === layout
                ? "border-[#9cff57]/60 bg-[#9cff57]/10"
                : "border-white/10"
            }`}
            onClick={() => patch({ layout }, `Changed flow layout to ${label}`)}
          >
            {label}
          </button>
        ))}
      </div>

      <MediaPicker
        value={image.fallbackUrl || ""}
        valueAssetId={image.mediaAssetId}
        label="Structured section image"
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
        onAssetChange={(asset) =>
          patch(
            {
              image: {
                mediaAssetId: asset?.mediaAssetId || "",
                fallbackUrl: asset?.url || "",
              },
              imageTreatment: {
                ...DEFAULT_IMAGE_TREATMENT,
                altText: "",
              },
            },
            "Selected structured section image"
          )
        }
      />

      <label className="space-y-1 text-xs">
        <span>Heading</span>
        <Input
          value={String(value.heading || "")}
          onChange={(event) => patch({ heading: event.target.value }, "Edited flow heading")}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span>Body</span>
        <textarea
          value={String(value.body || "")}
          onChange={(event) => patch({ body: event.target.value }, "Edited flow body")}
          className="min-h-28 w-full rounded-lg border border-white/15 bg-black/20 p-3"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs">
          <span>Gutter {Number(value.gutterPx || 24)}px</span>
          <input
            type="range"
            min={0}
            max={120}
            value={Number(value.gutterPx || 24)}
            className="w-full"
            onChange={(event) =>
              patch({ gutterPx: Number(event.target.value) }, "Changed flow gutter")
            }
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Image width {Number(value.imageWidthPercent || 45)}%</span>
          <input
            type="range"
            min={20}
            max={80}
            value={Number(value.imageWidthPercent || 45)}
            className="w-full"
            onChange={(event) =>
              patch(
                { imageWidthPercent: Number(event.target.value) },
                "Changed flow image width"
              )
            }
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs">
          <span>Alignment</span>
          <select
            value={String(value.alignment || "center")}
            onChange={(event) =>
              patch({ alignment: event.target.value }, "Changed flow alignment")
            }
            className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span>Mobile stack</span>
          <select
            value={String(value.mobileStack || "image_first")}
            onChange={(event) =>
              patch({ mobileStack: event.target.value }, "Changed mobile stack order")
            }
            className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
          >
            <option value="image_first">Image first</option>
            <option value="text_first">Text first</option>
          </select>
        </label>
      </div>

      <div>
        <Label className="text-xs">Background</Label>
        <div className="mt-2 flex gap-2">
          {(["none", "solid", "gradient"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`min-h-10 flex-1 rounded-lg border px-2 text-xs capitalize ${
                background.kind === kind ? "border-white/40 bg-white/10" : "border-white/10"
              }`}
              onClick={() =>
                patch(
                  {
                    background:
                      kind === "none"
                        ? { kind: "none" }
                        : kind === "solid"
                          ? { kind: "solid", color: "#0b0f19" }
                          : { kind: "gradient", gradient: DEFAULT_GRADIENT },
                  },
                  `Changed flow background to ${kind}`
                )
              }
            >
              {kind}
            </button>
          ))}
        </div>
      </div>
      {background.kind === "solid" ? (
        <Input
          type="color"
          value={background.color}
          onChange={(event) =>
            patch(
              { background: { kind: "solid", color: event.target.value } },
              "Changed flow background color"
            )
          }
        />
      ) : null}
      {background.kind === "gradient" ? (
        <GradientStudio
          value={background.gradient}
          brandColors={brandColors}
          onChange={(gradient, label) =>
            patch({ background: { kind: "gradient", gradient } }, label)
          }
        />
      ) : null}
      <p className="text-[11px] text-white/45">
        Square wrap uses a stable rectangular image column. Tight contour wrapping is
        intentionally unavailable.
      </p>
    </section>
  );
}
