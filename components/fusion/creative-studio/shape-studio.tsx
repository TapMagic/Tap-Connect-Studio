"use client";

import { FlipHorizontal2, FlipVertical2, Frame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { GradientStudio } from "@/components/fusion/creative-studio/gradient-studio";
import {
  DEFAULT_GRADIENT,
  type GradientModel,
} from "@/lib/fusion/creative-studio/gradient";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

const GEOMETRIES = [
  "rectangle",
  "rounded",
  "ellipse",
  "triangle",
  "polygon",
  "star",
  "arrow",
  "badge",
  "speech",
  "organic",
] as const;

export function ShapeStudio({
  node,
  onPatch,
  onConvertToFrame,
  mediaUploadReady,
  stockReady,
  brandColors,
}: {
  node: CreativeCompositionNode;
  onPatch: (patch: Partial<CreativeCompositionNode>, label: string) => void;
  onConvertToFrame: () => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  brandColors?: string[];
}) {
  const fillKind = String(node.props.fillKind || "solid") as
    | "solid"
    | "gradient"
    | "image";
  const patchProps = (props: Record<string, unknown>, label: string) =>
    onPatch({ props }, label);

  return (
    <div className="space-y-4" data-testid="shape-studio">
      <div>
        <Label className="text-xs">Shape</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GEOMETRIES.map((geometry) => (
            <button
              key={geometry}
              type="button"
              className={`min-h-11 rounded-lg border px-2 text-xs capitalize ${
                String(node.props.shape || "rounded") === geometry
                  ? "border-[#9cff57]/60 bg-[#9cff57]/10"
                  : "border-white/10"
              }`}
              onClick={() =>
                patchProps({ shape: geometry }, `Changed shape to ${geometry}`)
              }
            >
              {geometry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Fill</Label>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(["solid", "gradient", "image"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`min-h-10 rounded-lg border px-2 text-xs capitalize ${
                fillKind === kind ? "border-white/40 bg-white/10" : "border-white/10"
              }`}
              onClick={() => patchProps({ fillKind: kind }, `Changed shape fill to ${kind}`)}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>

      {fillKind === "solid" ? (
        <Input
          type="color"
          value={String(node.props.fill || "#22c55e")}
          data-testid="composition-shape-fill"
          onChange={(event) =>
            patchProps({ fill: event.target.value }, "Changed shape fill")
          }
        />
      ) : null}

      {fillKind === "gradient" ? (
        <GradientStudio
          value={(node.props.gradient as GradientModel | undefined) || DEFAULT_GRADIENT}
          brandColors={brandColors}
          onChange={(gradient, label) => patchProps({ gradient }, label)}
        />
      ) : null}

      {fillKind === "image" ? (
        <MediaPicker
          value={String(node.props.imageSrc || "")}
          valueAssetId={String(node.props.mediaAssetId || "") || undefined}
          label="Shape image fill"
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          onAssetChange={(asset) =>
            patchProps(
              {
                imageSrc: asset?.url || "",
                mediaAssetId: asset?.mediaAssetId,
              },
              "Changed shape image fill"
            )
          }
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs">
          <span>Stroke width</span>
          <Input
            type="number"
            min={0}
            max={48}
            value={Number(node.props.strokeWidth || 0)}
            onChange={(event) =>
              patchProps(
                { strokeWidth: Number(event.target.value) || 0 },
                "Changed shape stroke"
              )
            }
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Stroke color</span>
          <Input
            type="color"
            value={String(node.props.stroke || "#ffffff")}
            onChange={(event) =>
              patchProps({ stroke: event.target.value }, "Changed shape stroke color")
            }
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Corner radius</span>
          <Input
            type="number"
            min={0}
            max={500}
            value={Number(node.props.radius || 12)}
            onChange={(event) =>
              patchProps(
                { radius: Number(event.target.value) || 0 },
                "Changed shape radius"
              )
            }
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Blend mode</span>
          <select
            value={String(node.props.blendMode || "normal")}
            onChange={(event) =>
              patchProps({ blendMode: event.target.value }, "Changed shape blend mode")
            }
            className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="soft-light">Soft light</option>
          </select>
        </label>
      </div>

      {(
        [
          ["opacity", "Opacity", 0, 100, 100],
          ["shadow", "Shadow", 0, 48, 0],
          ["glow", "Glow", 0, 48, 0],
        ] as const
      ).map(([key, label, min, max, fallback]) => {
        const value =
          key === "opacity"
            ? Math.round(Number(node.props[key] ?? 1) * 100)
            : Number(node.props[key] ?? fallback);
        return (
          <label key={key} className="block space-y-1 text-xs">
            <span>
              {label} {value}
              {key === "opacity" ? "%" : "px"}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              className="w-full"
              onChange={(event) =>
                patchProps(
                  {
                    [key]:
                      key === "opacity"
                        ? Number(event.target.value) / 100
                        : Number(event.target.value),
                  },
                  `Changed shape ${label.toLowerCase()}`
                )
              }
            />
          </label>
        );
      })}

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs">
          <span>Width %</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={Math.round(node.width * 100)}
            onChange={(event) =>
              onPatch(
                { width: Math.max(0.01, Number(event.target.value) / 100) },
                "Set exact shape width"
              )
            }
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Height %</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={Math.round(node.height * 100)}
            onChange={(event) =>
              onPatch(
                { height: Math.max(0.01, Number(event.target.value) / 100) },
                "Set exact shape height"
              )
            }
          />
        </label>
      </div>

      <label className="block space-y-1 text-xs">
        <span>Rotation {Math.round(node.rotationDeg || 0)}°</span>
        <input
          type="range"
          min={-180}
          max={180}
          value={node.rotationDeg || 0}
          className="w-full"
          onChange={(event) =>
            onPatch(
              { rotationDeg: Number(event.target.value) },
              "Rotated shape"
            )
          }
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={node.props.flipX === true}
          onClick={() =>
            patchProps({ flipX: node.props.flipX !== true }, "Flipped shape horizontally")
          }
        >
          <FlipHorizontal2 className="mr-1 h-3.5 w-3.5" />
          Flip X
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={node.props.flipY === true}
          onClick={() =>
            patchProps({ flipY: node.props.flipY !== true }, "Flipped shape vertically")
          }
        >
          <FlipVertical2 className="mr-1 h-3.5 w-3.5" />
          Flip Y
        </Button>
        <label className="flex min-h-10 items-center gap-2 px-2 text-xs">
          <input
            type="checkbox"
            checked={node.props.aspectLocked === true}
            onChange={(event) =>
              patchProps(
                { aspectLocked: event.target.checked },
                event.target.checked ? "Locked shape aspect" : "Unlocked shape aspect"
              )
            }
          />
          Aspect lock
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <Button type="button" size="sm" variant="outline" onClick={onConvertToFrame}>
          <Frame className="mr-1 h-3.5 w-3.5" />
          Convert to frame
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onPatch(
              {
                rotationDeg: 0,
                props: {
                  shape: "rounded",
                  fillKind: "solid",
                  fill: "#22c55e",
                  opacity: 1,
                  stroke: "#ffffff",
                  strokeWidth: 0,
                  radius: 12,
                  shadow: 0,
                  glow: 0,
                  flipX: false,
                  flipY: false,
                  aspectLocked: false,
                  blendMode: "normal",
                },
              },
              "Reset shape"
            )
          }
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
