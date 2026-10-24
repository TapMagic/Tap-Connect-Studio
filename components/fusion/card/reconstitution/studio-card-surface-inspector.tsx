"use client";

import { Layers3, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { MediaPicker } from "@/components/media/media-picker";
import { GRADIENT_PRESETS } from "@/lib/fusion/creative-studio/gradient";
import { compositionBackgroundFromMaterialRecipe, type MaterialRecipe } from "@/lib/fusion/creative-studio/material-engine";
import { CARD_SURFACE_IMAGE_PRESENTATIONS, cardSurfaceImagePresentation, type CardSurfaceImagePresentation } from "@/lib/fusion/creative-studio/platform/card-surface-rendering";
import { readCardEdgeMode, setCardEdgeMode, STUDIO_EDGE_MODES, type StudioEdgeMode } from "@/lib/fusion/creative-studio/platform/edge-layout";
import { isCardSurfaceLayered, resizeLayeredPlane, setCardSurfaceCompositionMode } from "@/lib/fusion/creative-studio/platform/layered-region";
import { readCardSurfaceDensity, setCardSurfaceDensity, type StudioCompositionDensityMode } from "@/lib/fusion/creative-studio/platform/composition-density";
import type { BrandPreviewContext } from "@/lib/fusion/creative-studio/reconstitution/standard-button-catalog";
import { creativeFillToCompositionBackground } from "@/lib/fusion/creative-platform/composition-adapter";
import { photographyVisualPlane, solidVisualPlane } from "@/lib/fusion/creative-studio/visual-plane";
import { StudioColorControl } from "./studio-color-control";

import { StudioSurfaceMaterials } from "./studio-surface-materials";
import { StudioPrecisionControl } from "./studio-precision-control";

type Root = NonNullable<CardEditorLiveModel["config"]["rootComposition"]>;
type ImageBackground = NonNullable<NonNullable<Root["background"]>["image"]>;
type BackgroundMode = "none" | "solid" | "gradient" | "image";

const BACKGROUND_MODES: ReadonlyArray<{ id: BackgroundMode; label: string }> = [
  { id: "none", label: "Transparent" },
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
];

function Range({ label, value, min, max, step = 1, suffix = "%", onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="mt-3 block text-[9px] text-white/55">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-white/35">
          {value}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} className="mt-1.5 w-full accent-[#b8ff2c]" />
    </label>
  );
}

type RootTaskProps = { task: "surface" | "layout"; onTaskChange: (task: "surface" | "layout") => void };

export function StudioCardSurfaceInspector({ model, brand, onClose, task, onTaskChange }: { model: CardEditorLiveModel; brand: BrandPreviewContext; onClose: () => void } & RootTaskProps) {
  const root = model.config.rootComposition;
  if (!root) return null;
  return <CardSurfaceInspectorContent model={model} brand={brand} onClose={onClose} root={root} task={task} onTaskChange={onTaskChange} />;
}

function CardSurfaceInspectorContent({ model, brand, onClose, root, task, onTaskChange }: { model: CardEditorLiveModel; brand: BrandPreviewContext; onClose: () => void; root: Root } & RootTaskProps) {
  const actualMode: BackgroundMode = root.background?.kind === "image" ? "image" : root.background?.kind === "gradient" ? "gradient" : root.background?.kind === "solid" ? "solid" : "none";
  const [pendingImage, setPendingImage] = useState(false);
  const backgroundMode = pendingImage ? "image" : actualMode;
  const backgroundImage = root.background?.kind === "image" ? root.background.image : undefined;
  const lastImage = useRef<ImageBackground | undefined>(backgroundImage);
  useEffect(() => {
    if (backgroundImage) lastImage.current = backgroundImage;
  }, [backgroundImage]);

  const authored = root.background?.kind === "solid" && /^#[0-9a-f]{6}$/i.test(String(root.background.value || "")) ? String(root.background.value) : null;
  const brandColor = brand.backgroundColor || model.config.surfaceColor || "#0b0f19";
  const value = authored || brandColor;
  const source = root.background?.source || (authored ? "local" : "brand");
  const density = readCardSurfaceDensity(root);

  const patchRoot = (nextRoot: Root, label: string, batch = false) => model.patchConfig({ rootComposition: nextRoot }, label, batch);
  const patchImage = (patch: Partial<ImageBackground>, label: string) => {
    if (!backgroundImage || root.background?.kind !== "image") return;
    patchRoot(
      {
        ...root,
        background: {
          ...root.background,
          image: { ...backgroundImage, ...patch },
        },
      },
      label,
      true,
    );
  };
  const patchImageBackground = (patch: Partial<NonNullable<Root["background"]>>, label: string) => {
    if (root.background?.kind !== "image") return;
    patchRoot({ ...root, background: { ...root.background, ...patch } }, label, true);
  };
  const applyColor = (color: string, nextSource: "brand" | "local", label: string) => {
    setPendingImage(false);
    patchRoot(
      {
        ...root,
        background: {
          kind: "solid",
          value: color,
          opacity: 1,
          source: nextSource,
        },
      },
      label,
    );
  };
  const applyImage = (
    asset: {
      url: string;
      mediaAssetId?: string;
      id: string;
      label?: string;
    } | null,
  ) => {
    setPendingImage(!asset);
    if (!asset) {
      patchRoot({ ...root, background: { kind: "none" } }, "Removed Card Surface image");
      return;
    }
    const canonical = creativeFillToCompositionBackground(
      photographyVisualPlane({
        url: asset.url,
        mediaAssetId: asset.mediaAssetId || asset.id,
      }),
    );
    if (!canonical || canonical.kind !== "image" || !canonical.image) return;
    patchRoot(
      {
        ...root,
        background: {
          kind: "image",
          source: "local",
          opacity: 1,
          saturation: 1,
          brightness: 1,
          contrast: 1,
          image: {
            ...canonical.image,
            presentationMode: "cover_page",
            brightness: 1,
            contrast: 1,
            overlayColor: "#000000",
            overlayOpacity: 0.22,
            alt: asset.label || "",
          },
        },
      },
      "Selected Card / Background image",
    );
  };
  const applyMode = (mode: BackgroundMode) => {
    if (mode === "image") {
      setPendingImage(true);
      const remembered = lastImage.current;
      if (remembered) {
        patchRoot(
          {
            ...root,
            background: {
              kind: "image",
              source: "local",
              opacity: 1,
              saturation: 1,
              brightness: 1,
              contrast: 1,
              image: remembered,
            },
          },
          "Changed Card / Background to Image",
        );
        setPendingImage(false);
      }
      return;
    }
    setPendingImage(false);
    if (mode === "none") {
      patchRoot({ ...root, background: { kind: "none" } }, "Changed Card / Background to Transparent");
      return;
    }
    if (mode === "solid") {
      patchRoot(
        {
          ...root,
          background: creativeFillToCompositionBackground(solidVisualPlane(value)),
        },
        "Changed Card / Background to Solid",
      );
      return;
    }
    patchRoot(
      {
        ...root,
        background: creativeFillToCompositionBackground({
          kind: "gradient",
          gradient: structuredClone(GRADIENT_PRESETS[0]!.gradient),
        }),
      },
      "Changed Card / Background to Gradient",
    );
  };
  const applyImagePresentation = (mode: CardSurfaceImagePresentation) => {
    if (!backgroundImage) return;
    const image: ImageBackground = {
      ...backgroundImage,
      presentationMode: mode,
      fit: mode === "ambient_extend" || mode === "tile" ? "contain" : "cover",
      repeat: mode === "tile" ? "repeat" : "no-repeat",
      scale: mode === "tile" && backgroundImage.scale === 1 ? 0.28 : backgroundImage.scale,
    };
    const withImage: Root = {
      ...root,
      background: { ...root.background!, image },
    };
    const nextRoot = mode === "viewport_immersive" ? setCardEdgeMode(withImage, "full_bleed") : withImage;
    const label = CARD_SURFACE_IMAGE_PRESENTATIONS.find((item) => item.id === mode)?.label || mode;
    patchRoot(nextRoot, `Changed image background to ${label}`);
  };
  const applyEdge = (mode: StudioEdgeMode) => patchRoot(setCardEdgeMode(root, mode), `Changed Card Surface edge to ${mode.replace("_", " ")}`);
  const applyMaterial = (recipe: MaterialRecipe) => {
    setPendingImage(false);
    patchRoot(
      {
        ...root,
        background: compositionBackgroundFromMaterialRecipe(recipe),
      },
      `Applied ${recipe.label} Card Surface`,
    );
  };

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[2100] flex max-h-[62dvh] flex-col rounded-t-3xl border-t border-white/8 bg-[#0b111b]/98 text-white shadow-[0_-18px_50px_rgba(0,0,0,.36)] backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[min(360px,calc(100vw-12px))] md:rounded-none md:border-l md:border-t-0" data-testid="studio-card-surface-inspector">
      <header className="flex min-h-14 items-center gap-2 border-b border-white/8 px-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/45">Experience › Root Surface</p>
          <h2 className="mt-0.5 text-sm font-semibold">Root Surface</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label="Close Inspector">
          <X className="h-4 w-4" />
        </button>
      </header>
      <nav aria-label="Root Surface tasks" className="grid shrink-0 grid-cols-2 gap-1 border-b border-white/8 p-2">{(["surface", "layout"] as const).map(value => <button type="button" key={value} aria-pressed={task === value} onClick={() => onTaskChange(value)} className="min-h-11 rounded-xl text-xs capitalize text-white/65 aria-pressed:bg-[#b8ff2c]/15 aria-pressed:text-[#d8ff82]">{value}</button>)}</nav>
      <div key={task} className="min-h-0 flex-1 overflow-y-auto p-4">
        {task === "surface" ? <>
        <section data-card-surface-authority="root-composition" data-testid="studio-card-background-modes">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a9e7ff]/70">Background</p>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {BACKGROUND_MODES.map((option) => (
              <button key={option.id} type="button" aria-pressed={backgroundMode === option.id} onClick={() => applyMode(option.id)} className="min-h-11 rounded-xl bg-white/5 px-1 text-[9px] aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]" data-testid={`studio-card-background-${option.id}`}>
                {option.label}
              </button>
            ))}
          </div>

          {backgroundMode === "image" ? (
            <div className="mt-4 rounded-2xl border border-[#8bdcff]/12 bg-[#101824]/70 p-3" data-testid="studio-card-background-image-picker">
              <MediaPicker label="Background Asset" chooseLabel="Choose Asset" replaceLabel="Replace image" removeLabel="Remove" value={backgroundImage?.src || ""} valueAssetId={backgroundImage?.mediaAssetId} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onAssetChange={applyImage} />
              {!backgroundImage ? <p className="mt-2 text-[9px] text-white/45">Choose an uploaded Asset. Nothing is added until an image is selected.</p> : null}
            </div>
          ) : null}

          {backgroundMode === "solid" ? (
            <div className="mt-4" data-testid="studio-card-surface-color">
              <StudioColorControl label="Base color" value={value} source={source === "brand" ? "brand" : "custom"} brandColors={[brand.primaryColor, brand.secondaryColor, brand.accentColor, brand.backgroundColor].filter((candidate): candidate is string => Boolean(candidate))} resetValue={brandColor} resetLabel="Reset to Brand background" onChange={(color, nextSource) => applyColor(color, nextSource === "brand" || nextSource === "default" ? "brand" : "local", nextSource === "default" ? "Reset Card Surface to Brand" : "Changed Card Surface base color")} />
            </div>
          ) : null}

          {backgroundMode === "gradient" ? (
            <div className="mt-4 grid grid-cols-2 gap-2" data-testid="studio-card-background-gradients">
              {GRADIENT_PRESETS.slice(0, 6).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    patchRoot(
                      {
                        ...root,
                        background: creativeFillToCompositionBackground({
                          kind: "gradient",
                          gradient: structuredClone(preset.gradient),
                        }),
                      },
                      `Applied ${preset.label} Card background`,
                    )
                  }
                  className="min-h-12 rounded-xl border border-white/10 px-2 text-left text-[9px]"
                  style={{
                    background: `linear-gradient(${preset.gradient.angle}deg,${preset.gradient.stops.map((stop) => `${stop.color} ${stop.position}%`).join(",")})`,
                  }}
                >
                  <span className="rounded bg-black/55 px-1.5 py-0.5">{preset.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>


        <section className="mt-5">
          <div className="flex items-center gap-3 rounded-2xl bg-white/4 p-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              style={{
                background: backgroundImage ? `linear-gradient(#0005,#0005),url(${backgroundImage.src}) center/cover` : value,
              }}
            >
              <Layers3 className="h-4 w-4 drop-shadow" />
            </span>
            <div>
              <p className="text-xs font-semibold">{backgroundImage ? "Image background" : backgroundMode === "none" ? "Transparent background" : backgroundMode === "gradient" ? "Gradient background" : "Solid base"}</p>
              <p className="text-[9px] text-white/40">Root-level · behind every Module and Container</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-[#a9e7ff]/70">Surface materials</p>
          <StudioSurfaceMaterials selected={root.background?.materialPreset} onApply={applyMaterial} />
        </section>

        {!backgroundImage && root.background && root.background.kind !== "none" ? <StudioPrecisionControl label="Surface opacity" value={Math.round((root.background.opacity ?? 1) * 100)} descriptor={{ unit: "%", min: 0, max: 100, step: 1, defaultValue: 100 }} onBegin={model.beginLiveAdjustment} onPreview={opacity => model.previewCompositionBlock?.({ ...root, background: { ...root.background!, opacity: opacity / 100 } })} onCommit={() => model.commitLiveAdjustment?.("Changed Root Surface opacity")} onCancel={model.cancelLiveAdjustment} /> : null}
        {backgroundImage ? (
          <section className="mt-6 rounded-2xl border border-[#8bdcff]/12 bg-[#101824]/70 p-3" data-testid="studio-card-image-controls">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a9e7ff]/70">Image presentation</p>
            <p className="mt-1 text-[9px] leading-4 text-white/42">Cover modes never repeat. Tile repeats only when explicitly selected.</p>
            <div className="mt-3 grid grid-cols-1 gap-1">
              {CARD_SURFACE_IMAGE_PRESENTATIONS.map((option) => (
                <button key={option.id} type="button" aria-pressed={cardSurfaceImagePresentation(root.background) === option.id} onClick={() => applyImagePresentation(option.id)} className="min-h-12 rounded-xl bg-white/5 px-3 text-left aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]" data-testid={`studio-card-image-presentation-${option.id}`}>
                  <span className="block text-[10px] font-semibold">{option.label}</span>
                  <span className="block text-[8px] opacity-65">{option.description}</span>
                </button>
              ))}
            </div>
            <Range label="Zoom / scale" value={Math.round(backgroundImage.scale * 100)} min={50} max={250} onChange={(next) => patchImage({ scale: next / 100 }, "Changed Card Surface image scale")} />
            <Range label="Horizontal focal position" value={Math.round(backgroundImage.focalX * 100)} min={0} max={100} onChange={(next) => patchImage({ focalX: next / 100 }, "Changed Card Surface focal X")} />
            <Range label="Vertical focal position" value={Math.round(backgroundImage.focalY * 100)} min={0} max={100} onChange={(next) => patchImage({ focalY: next / 100 }, "Changed Card Surface focal Y")} />
            <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.14em] text-white/42">Non-destructive treatment</p>
            <Range label="Brightness" value={Math.round(backgroundImage.brightness * 100)} min={25} max={200} onChange={(next) => patchImage({ brightness: next / 100 }, "Changed Card Surface brightness")} />
            <Range label="Contrast" value={Math.round(backgroundImage.contrast * 100)} min={25} max={200} onChange={(next) => patchImage({ contrast: next / 100 }, "Changed Card Surface contrast")} />
            <Range label="Saturation" value={Math.round((root.background?.saturation ?? 1) * 100)} min={0} max={200} onChange={(next) => patchImageBackground({ saturation: next / 100 }, "Changed Card Surface saturation")} />
            <label className="mt-3 block text-[9px] text-white/55">
              Tint / veil color
              <input type="color" value={backgroundImage.overlayColor || "#000000"} onChange={(event) => patchImage({ overlayColor: event.currentTarget.value }, "Changed Card Surface tint")} className="mt-1.5 h-9 w-full rounded-lg border-0 bg-transparent" />
            </label>
            <Range label="Veil strength" value={Math.round((backgroundImage.overlayOpacity || 0) * 100)} min={0} max={90} onChange={(next) => patchImage({ overlayOpacity: next / 100 }, "Changed Card Surface veil")} />
            <Range label="Image opacity" value={Math.round((root.background?.opacity ?? 1) * 100)} min={10} max={100} onChange={(next) => patchImageBackground({ opacity: next / 100 }, "Changed Card Surface image opacity")} />
          </section>
        ) : null}

        </> : <>
        <section className="mt-5 rounded-2xl border border-[#b8ff2c]/14 bg-[#b8ff2c]/[.035] p-3" data-testid="studio-card-edge-controls">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#d8ff82]/75">Visual bleed</p>
          <p className="mt-1 text-[9px] leading-4 text-white/48">The background can reach device glass while content keeps its own safe area.</p>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {STUDIO_EDGE_MODES.map((option) => (
              <button key={option.id} type="button" aria-pressed={readCardEdgeMode(root) === option.id} onClick={() => applyEdge(option.id)} className="min-h-12 rounded-xl bg-white/5 px-1 text-[9px] aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 border-t border-white/8 pt-4" data-testid="studio-card-composition-mode">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#a9e7ff]/70">Composition</p>
          <p className="mt-1 text-[9px] leading-4 text-white/48">Flow is the default. Layered enables bounded overlap directly on Card Surface.</p>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {(["flow", "layered"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={(isCardSurfaceLayered(root) ? "layered" : "flow") === mode} onClick={() => patchRoot(setCardSurfaceCompositionMode(root, mode), `Changed Card Surface composition to ${mode}`)} className="min-h-10 rounded-xl bg-white/5 text-[10px] capitalize aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.12em] text-white/42">Density</p>
          <div className="mt-2 grid grid-cols-4 gap-1" data-testid="studio-card-density">
            {(["dense", "standard", "airy", "custom"] as StudioCompositionDensityMode[]).map((mode) => (
              <button key={mode} type="button" aria-pressed={density.mode === mode} onClick={() => patchRoot(setCardSurfaceDensity(root, mode), `Changed Card Surface density to ${mode}`)} className="min-h-9 rounded-lg bg-white/5 px-1 text-[8px] capitalize aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">
                {mode}
              </button>
            ))}
          </div>
          {density.mode === "custom" ? (
            <>
              <Range
                label={isCardSurfaceLayered(root) ? "Snap rhythm / row gap" : "Row gap"}
                value={density.rowGapPx}
                min={0}
                max={64}
                suffix="px"
                onChange={(next) =>
                  patchRoot(
                    setCardSurfaceDensity(root, "custom", next, {
                      rowGapPx: next,
                    }),
                    "Changed Card Surface row gap",
                  )
                }
              />
              <Range
                label="Column gap"
                value={density.columnGapPx}
                min={0}
                max={64}
                suffix="px"
                onChange={(next) =>
                  patchRoot(
                    setCardSurfaceDensity(root, "custom", density.gapPx, {
                      columnGapPx: next,
                    }),
                    "Changed Card Surface column gap",
                  )
                }
              />
              <Range
                label="Internal group gap"
                value={density.internalGroupGapPx}
                min={0}
                max={64}
                suffix="px"
                onChange={(next) =>
                  patchRoot(
                    setCardSurfaceDensity(root, "custom", density.gapPx, {
                      internalGroupGapPx: next,
                    }),
                    "Changed Card Surface internal group gap",
                  )
                }
              />
            </>
          ) : (
            <p className="mt-2 text-[9px] text-white/35">{isCardSurfaceLayered(root) ? `${Math.round(density.snapGrid * 100)}% placement rhythm` : `${density.rowGapPx}px row gap · ${density.columnGapPx}px column gap`}</p>
          )}
          {isCardSurfaceLayered(root) ? (
            <div className="mt-3 space-y-3">
              <label className="block text-[9px] text-white/55">
                Layered coordinate plane · px (children keep their size)
                <input
                  type="number"
                  min={240}
                  max={1600}
                  step={10}
                  value={root.compositionMode?.layeredHeightPx ?? 620}
                  onFocus={() => model.beginLiveAdjustment?.()}
                  onChange={(event) => {
                    const requested = Number(event.target.value);
                    const next = resizeLayeredPlane(root, requested);
                    if (next.compositionMode?.layeredHeightPx !== requested) model.notify?.(`Plane constrained to ${next.compositionMode?.layeredHeightPx}px by content or the existing 240–1600px range. Move content or enable authored overflow to reduce the plane further.`);
                    model.previewCompositionBlock?.(next);
                  }}
                  onBlur={() => model.commitLiveAdjustment?.("Changed Card layered coordinate plane")}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === "Escape") { model.cancelLiveAdjustment?.(); event.currentTarget.blur(); }
                    else if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="mt-1.5 h-10 w-full rounded-lg bg-white/5 px-3"
                />
              </label>
              <label className="flex min-h-10 items-center justify-between rounded-xl bg-white/4 px-3 text-[9px]"><span><strong className="block font-medium">Allow authored overflow</strong><small className="text-white/35">Off constrains children to Card Surface bounds.</small></span><input type="checkbox" checked={root.compositionMode?.bounds === "allow-overflow"} onChange={(event) => patchRoot({ ...root, compositionMode: { ...root.compositionMode!, bounds: event.target.checked ? "allow-overflow" : "constrain" } }, `Changed Card layered bounds to ${event.target.checked ? "allow overflow" : "constrain"}`)} /></label>
            </div>
          ) : null}
        </section>
        </>}
      </div>
    </aside>
  );
}
