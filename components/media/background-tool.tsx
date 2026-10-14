"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eraser, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import type {
  BackgroundRefinementStroke,
  BackgroundTreatmentRecipe,
} from "@/lib/media/background-treatment";
import { cn } from "@/lib/utils";

type DurableAsset = {
  id: string;
  url: string;
  filename: string | null;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  source: string;
  provider?: string | null;
  parentAssetId?: string | null;
  renditionKind?: string | null;
  derivationRecipe?: unknown;
  approvalStatus?: "UNREVIEWED" | "APPROVED" | "REJECTED";
  defaultAltText?: string | null;
};

export type BackgroundToolProps = {
  open: boolean;
  asset: Pick<MediaAssetCandidate, "id" | "mediaAssetId" | "url" | "label">;
  onClose: () => void;
  onApply: (asset: MediaAssetCandidate) => void;
  onVariantCreated?: (asset: MediaAssetCandidate, original: MediaAssetCandidate) => void;
  placementBackgroundColor?: string;
  currentPageColor?: string;
  onPlacementBackgroundChange?: (color: string | undefined) => void;
  initialMode?: "auto" | "solid-color";
};

function toCandidate(asset: DurableAsset): MediaAssetCandidate {
  return {
    id: asset.id,
    mediaAssetId: asset.id,
    url: asset.url,
    thumbUrl: asset.url,
    label: asset.defaultAltText || asset.filename || "Studio asset",
    source: asset.source === "upload" ? "upload" : asset.source === "url" ? "url" : asset.source === "bg-remove" ? "bg-remove" : "studio",
    sourceLabel: asset.source === "bg-remove" ? "Background variant" : "Studio",
    mimeType: asset.mimeType,
    width: asset.width || undefined,
    height: asset.height || undefined,
    approvalStatus: asset.approvalStatus || "UNREVIEWED",
    parentAssetId: asset.parentAssetId || undefined,
    renditionKind: asset.renditionKind || undefined,
    derivationRecipe: asset.derivationRecipe,
  };
}

const initialRecipe: BackgroundTreatmentRecipe = {
  mode: "auto",
  tolerance: 36,
  featherPx: 1,
  edgeCleanup: 45,
  colorDecontamination: 55,
  transparencyThreshold: 8,
  strokes: [],
};

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-[11px] text-white/65">
      <span className="flex items-center justify-between gap-3">
        {label}<output className="font-mono text-white/45">{value}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="w-full"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function BackgroundTool(props: BackgroundToolProps) {
  if (!props.open) return null;
  return (
    <BackgroundToolInner
      key={`${props.asset.mediaAssetId || props.asset.id}:${props.initialMode || "auto"}`}
      {...props}
    />
  );
}

function BackgroundToolInner({
  asset,
  onClose,
  onApply,
  onVariantCreated,
  placementBackgroundColor,
  currentPageColor = "#111827",
  onPlacementBackgroundChange,
  initialMode = "auto",
}: BackgroundToolProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawingRef = useRef<BackgroundRefinementStroke | null>(null);
  const [recipe, setRecipe] = useState<BackgroundTreatmentRecipe>(() => ({
    ...initialRecipe,
    mode: initialMode,
    targetColor: initialMode === "solid-color" ? "#ffffff" : undefined,
  }));
  const [original, setOriginal] = useState<MediaAssetCandidate | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAssetCandidate | null>(null);
  const [previewMode, setPreviewMode] = useState<"checker" | "light" | "dark" | "page" | "color">("checker");
  const [previewColor, setPreviewColor] = useState(placementBackgroundColor || "#cbd5e1");
  const [advanced, setAdvanced] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineIntent, setRefineIntent] = useState<"keep" | "remove">("keep");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const mediaAssetId = asset.mediaAssetId || asset.id;
    void fetch(`/api/media/background?mediaAssetId=${encodeURIComponent(mediaAssetId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Asset background details unavailable");
        setOriginal(toCandidate(data.original));
        if (data.asset?.derivationRecipe) {
          setRecipe({ ...initialRecipe, ...(data.asset.derivationRecipe as Partial<BackgroundTreatmentRecipe>) });
        }
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Asset details unavailable"));
  }, [asset.id, asset.mediaAssetId]);

  const shown = previewAsset || asset;
  const backgroundStyle = previewMode === "light"
    ? { backgroundColor: "#ffffff" }
    : previewMode === "dark"
      ? { backgroundColor: "#111827" }
      : previewMode === "page"
        ? { backgroundColor: currentPageColor }
        : previewMode === "color"
          ? { backgroundColor: previewColor }
          : undefined;

  function patchRecipe(patch: Partial<BackgroundTreatmentRecipe>) {
    setRecipe((current) => ({ ...current, ...patch }));
    setPreviewAsset(null);
  }

  async function createVariant(flatten = false) {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/media/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaAssetId: asset.mediaAssetId || asset.id,
          recipe: { ...recipe, replacementColor: flatten ? previewColor : undefined },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Background cleanup failed");
      const variant = toCandidate(data.asset);
      const root = toCandidate(data.original);
      setPreviewAsset(variant);
      setOriginal(root);
      onVariantCreated?.(variant, root);
      setStatus(data.cached ? "Reused the matching saved variant." : "Saved a reusable derived variant in Assets.");
      return variant;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Background cleanup failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function pointerPoint(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function beginStroke(event: React.PointerEvent<HTMLDivElement>) {
    if (!refining) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = { intent: refineIntent, radius: 0.04, points: [pointerPoint(event)] };
  }

  function continueStroke(event: React.PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current || !refining) return;
    drawingRef.current.points.push(pointerPoint(event));
  }

  function endStroke() {
    const stroke = drawingRef.current;
    drawingRef.current = null;
    if (!stroke) return;
    patchRecipe({ strokes: [...recipe.strokes, stroke] });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="background-tool"
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a0e18] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p id={titleId} className="font-semibold text-white">Background</p>
            <p className="mt-0.5 text-xs text-white/50">Non-destructive · the original Asset is always preserved</p>
          </div>
          <Button ref={closeRef} type="button" size="sm" variant="outline" onClick={onClose}>
            <X className="mr-1 h-4 w-4" /> Close
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
          <div className="space-y-3 border-b border-white/10 p-4 md:border-b-0 md:border-r">
            <div
              className={cn(
                "relative flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-white/10 p-4",
                previewMode === "checker" && "bg-[length:18px_18px] bg-[linear-gradient(45deg,#303746_25%,transparent_25%),linear-gradient(-45deg,#303746_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#303746_75%),linear-gradient(-45deg,transparent_75%,#303746_75%)] bg-[position:0_0,0_9px,9px_-9px,-9px_0]",
              )}
              style={backgroundStyle}
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              data-testid="background-preview"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown.url} alt="Background treatment preview" className="max-h-[420px] max-w-full select-none object-contain" draggable={false} />
              {refining ? (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
                  Paint {refineIntent === "keep" ? "Keep" : "Remove"}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Background preview">
              {(["checker", "light", "dark", "page", "color"] as const).map((mode) => (
                <Button key={mode} type="button" size="sm" variant={previewMode === mode ? "default" : "outline"} className="h-8 capitalize text-xs" onClick={() => setPreviewMode(mode)}>
                  {mode === "page" ? "Current page" : mode === "color" ? "Replace preview" : mode}
                </Button>
              ))}
              {previewMode === "color" ? (
                <input type="color" value={previewColor} aria-label="Replacement background color" className="h-8 w-10 rounded border border-white/15 bg-transparent" onChange={(event) => setPreviewColor(event.target.value)} />
              ) : null}
            </div>
            {onPlacementBackgroundChange && previewMode === "color" ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onPlacementBackgroundChange(previewColor)}>
                Use as placement background
              </Button>
            ) : null}
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={recipe.mode === "auto" ? "default" : "outline"} onClick={() => patchRecipe({ mode: "auto", targetColor: undefined })} data-testid="remove-background-mode">
                <Sparkles className="mr-1.5 h-4 w-4" /> Remove background
              </Button>
              <Button type="button" variant={recipe.mode === "solid-color" ? "default" : "outline"} onClick={() => patchRecipe({ mode: "solid-color", targetColor: recipe.targetColor || "#ffffff" })} data-testid="remove-color-mode">
                <Eraser className="mr-1.5 h-4 w-4" /> Remove color
              </Button>
            </div>

            {recipe.mode === "solid-color" ? (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-2 text-xs text-white/70">
                Solid color to remove
                <input type="color" value={recipe.targetColor || "#ffffff"} onChange={(event) => patchRecipe({ targetColor: event.target.value })} data-testid="background-color-picker" />
              </label>
            ) : null}

            <Slider label="Tolerance" value={recipe.tolerance} min={0} max={100} onChange={(tolerance) => patchRecipe({ tolerance })} />
            <Slider label="Feather" value={recipe.featherPx} min={0} max={24} step={0.5} onChange={(featherPx) => patchRecipe({ featherPx })} />

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={refining ? "default" : "outline"} onClick={() => setRefining((value) => !value)} data-testid="background-refine">
                Refine
              </Button>
              {refining ? (
                <>
                  <Button type="button" size="sm" variant={refineIntent === "keep" ? "default" : "outline"} onClick={() => setRefineIntent("keep")}>Keep</Button>
                  <Button type="button" size="sm" variant={refineIntent === "remove" ? "default" : "outline"} onClick={() => setRefineIntent("remove")}>Remove</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={!recipe.strokes.length} onClick={() => patchRecipe({ strokes: recipe.strokes.slice(0, -1) })}>Undo stroke</Button>
                </>
              ) : null}
            </div>

            <button type="button" className="text-xs text-white/55 underline underline-offset-2" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced}>
              {advanced ? "Hide" : "More"} edge controls
            </button>
            {advanced ? (
              <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3" data-testid="background-advanced">
                <Slider label="Edge cleanup" value={recipe.edgeCleanup} min={0} max={100} onChange={(edgeCleanup) => patchRecipe({ edgeCleanup })} />
                <Slider label="Color decontamination / fringe cleanup" value={recipe.colorDecontamination} min={0} max={100} onChange={(colorDecontamination) => patchRecipe({ colorDecontamination })} />
                <Slider label="Transparency threshold" value={recipe.transparencyThreshold} min={0} max={255} onChange={(transparencyThreshold) => patchRecipe({ transparencyThreshold })} />
              </div>
            ) : null}

            {status ? <p className="text-xs text-[#c9efff]" role="status">{status}</p> : null}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <Button type="button" className="w-full" disabled={busy} onClick={() => void createVariant(false)} data-testid="background-create-variant">
                {busy ? "Creating…" : "Preview & save transparent variant"}
              </Button>
              <Button type="button" className="w-full" variant="outline" disabled={!previewAsset || busy} onClick={() => previewAsset && onApply(previewAsset)} data-testid="background-apply-variant">
                Apply this variant
              </Button>
              {previewMode === "color" ? (
                <Button type="button" className="w-full" variant="outline" disabled={busy} onClick={() => void createVariant(true)}>
                  Save flattened color copy
                </Button>
              ) : null}
              <Button type="button" className="w-full" variant="ghost" disabled={!original} onClick={() => original && onApply(original)} data-testid="background-reset-original">
                <RotateCcw className="mr-1.5 h-4 w-4" /> Reset to original
              </Button>
            </div>
            <p className="text-[10px] leading-relaxed text-white/40">
              Transparent variants are grouped under the original and cached by recipe. Checker, page, and replacement colors are previews; only “Save flattened color copy” bakes a color into new bytes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
