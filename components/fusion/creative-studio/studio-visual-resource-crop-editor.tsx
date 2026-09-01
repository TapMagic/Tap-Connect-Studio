"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { StudioSemanticResource, StudioVisualResourceBackingMode, StudioVisualResourceCrop, StudioVisualResourceCropSession, StudioVisualResourceFitContract } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { clampStudioVisualResourceCrop, resolveStudioVisualResourceBackingPlate, studioVisualResourceLegibilityGuidance } from "@/lib/fusion/creative-studio/platform/visual-resource-fit";
import { StudioVisualResourceProjection } from "./studio-visual-resource-projection";

type Crop = StudioVisualResourceCrop;
const initialCrop: Crop = { zoom: 1, offsetX: 0, offsetY: 0 };

export function StudioVisualResourceCropEditor({ session, contract, onApply, onCancel, onChooseAnother }: {
  session: StudioVisualResourceCropSession | null;
  contract: StudioVisualResourceFitContract;
  onApply: (resource: StudioSemanticResource) => void;
  onCancel: () => void;
  onChooseAnother: () => void;
}) {
  const [crop, setCrop] = useState<Crop>(session?.initialCrop ?? initialCrop);
  const [backingMode, setBackingMode] = useState<StudioVisualResourceBackingMode>(session?.candidateResource.visual?.backingPlate?.mode ?? contract.backingPlate.defaultMode);
  const [paintState, setPaintState] = useState<"loading" | "ready" | "error">("loading");
  const [dragging, setDragging] = useState(false);
  const dragCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!session) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, session]);
  useEffect(() => () => dragCleanup.current?.(), []);
  if (!session || typeof document === "undefined") return null;
  const resource = session.candidateResource;
  const governCrop = (next: Crop) => clampStudioVisualResourceCrop({
    crop: next,
    intrinsicWidth: resource.visual?.intrinsicWidth || 1,
    intrinsicHeight: resource.visual?.intrinsicHeight || 1,
    visibleBounds: resource.visual?.visibleBounds,
    contract,
  });
  const governedCrop = governCrop(crop);
  const backingPlate = resolveStudioVisualResourceBackingPlate({ metadata: resource.visual, contract, requestedMode: backingMode });
  const legibilityGuidance = studioVisualResourceLegibilityGuidance(resource.visual);
  const previewResource = { ...resource, visual: { ...resource.visual, crop: governedCrop, treatment: {
    contractId: contract.contractId,
    maskShape: contract.maskShape,
    fitPolicy: contract.fitPolicy,
    safeInset: contract.safeInset,
    preserveAspectRatio: contract.preserveAspectRatio,
    rendererMapping: contract.rendererMapping,
  }, backingPlate } };
  const ready = session.phase === "ready" && paintState === "ready";
  const failed = session.phase === "error" || paintState === "error";
  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    event.preventDefault();
    dragCleanup.current?.();
    const pointerId = event.pointerId;
    const start = { x: event.clientX, y: event.clientY, crop: governedCrop };
    const rect = event.currentTarget.getBoundingClientRect();
    setDragging(true);
    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      pointerEvent.preventDefault();
      setCrop(governCrop({
        ...start.crop,
        offsetX: start.crop.offsetX + (pointerEvent.clientX - start.x) / rect.width,
        offsetY: start.crop.offsetY + (pointerEvent.clientY - start.y) / rect.height,
      }));
    };
    const stop = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      dragCleanup.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    dragCleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  };
  return createPortal(<div className="fixed inset-0 z-[220] grid place-items-end bg-black/78 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Adjust identity crop" data-testid="studio-resource-crop-editor">
    <section className="w-full max-w-md rounded-t-[28px] border border-white/12 bg-[#0b111c] p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
      <header className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-white">Fit identity</h2><p className="mt-1 text-xs leading-5 text-white/48">Drag to position. Zoom without changing the original Asset.</p></div><button type="button" onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-full bg-white/6 text-white/65 hover:bg-white/10" aria-label="Cancel identity crop"><X className="h-4 w-4" /></button></header>
      <div className="mx-auto mt-4 aspect-square w-[min(72vw,300px)] overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#111827_25%,#172033_25%,#172033_50%,#111827_50%,#111827_75%,#172033_75%)] bg-[length:18px_18px]">
        <div
          className={`relative h-full w-full touch-none overflow-hidden ${ready ? dragging ? "cursor-grabbing" : "cursor-grab" : "cursor-default"}`}
          onPointerDown={beginDrag}
          data-dragging={dragging ? "true" : "false"}
          data-testid="studio-resource-crop-drag-surface"
        >
          <StudioVisualResourceProjection resource={previewResource} contract={contract} className="absolute inset-[8%] h-[84%] w-[84%] ring-2 ring-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.58)]" onAssetLoad={() => setPaintState("ready")} onAssetError={() => setPaintState("error")} />
          <span className="pointer-events-none absolute inset-[8%] rounded-full ring-1 ring-[#b8ff2c]/65" aria-hidden />
          {!failed && !ready ? <div className="absolute inset-0 z-30 grid place-items-center bg-[#080d16]/88 text-center" role="status" data-testid="studio-resource-crop-loading"><div><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#b8ff2c]" /><p className="mt-3 text-sm font-semibold text-white">Loading identity Asset…</p><p className="mt-1 text-xs text-white/45">Preparing the exact selected artwork.</p></div></div> : null}
          {failed ? <div className="absolute inset-0 z-30 grid place-items-center bg-[#080d16]/95 px-8 text-center" role="alert" data-testid="studio-resource-crop-error"><div><TriangleAlert className="mx-auto h-7 w-7 text-amber-300" /><p className="mt-3 text-sm font-semibold text-white">This Asset could not be displayed</p><p className="mt-1 text-xs leading-5 text-white/48">{session.error || "The selected artwork could not be decoded. Your current identity is unchanged."}</p><button type="button" onClick={onChooseAnother} className="mt-4 min-h-10 rounded-xl border border-[#b8ff2c]/35 bg-[#b8ff2c]/10 px-4 text-xs font-semibold text-[#dcffaa]">Choose another Asset</button></div></div> : null}
        </div>
      </div>
      <div className="mt-5"><div className="flex items-center justify-between text-xs font-medium text-white/72"><span>Zoom</span><span className="tabular-nums text-white/42">{Math.round(governedCrop.zoom * 100)}%</span></div><div className="mt-2 grid grid-cols-[40px_1fr_40px] items-center gap-2"><button type="button" disabled={!ready} onClick={() => setCrop(governCrop({ ...governedCrop, zoom: governedCrop.zoom - .05 }))} className="grid h-10 place-items-center rounded-full bg-white/6 text-lg text-white/72 disabled:opacity-30" aria-label="Zoom out">−</button><input disabled={!ready} aria-label="Identity zoom" type="range" min={contract.scale.min} max={contract.scale.max} step={contract.scale.step} value={governedCrop.zoom} onChange={(event) => setCrop(governCrop({ ...governedCrop, zoom: Number(event.target.value) }))} className="w-full accent-[#b8ff2c] disabled:opacity-30" data-testid="studio-resource-crop-zoom" /><button type="button" disabled={!ready} onClick={() => setCrop(governCrop({ ...governedCrop, zoom: governedCrop.zoom + .05 }))} className="grid h-10 place-items-center rounded-full bg-white/6 text-lg text-white/72 disabled:opacity-30" aria-label="Zoom in">+</button></div></div>
      {contract.backingPlate.capability === "governed-choice" ? <div className="mt-5" data-testid="studio-resource-backing-plate"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-white/72">Backing plate</span><span className="text-[10px] text-white/38">Inside the slot</span></div><div className="mt-2 grid grid-cols-4 gap-2">{contract.backingPlate.allowedModes.map((mode) => {
        const labels: Record<StudioVisualResourceBackingMode, string> = { transparent: "None", light: "Light", dark: "Dark", brand: "Brand", custom: "Custom", "auto-contrast": "Auto" };
        const swatch = mode === "light" ? contract.backingPlate.lightColor : mode === "dark" ? contract.backingPlate.darkColor : mode === "brand" ? contract.backingPlate.brandColor : mode === "auto-contrast" ? backingPlate.resolvedColor : "transparent";
        return <button key={mode} type="button" disabled={!ready} aria-pressed={backingMode === mode} onClick={() => setBackingMode(mode)} className="min-h-12 rounded-xl border border-white/10 bg-white/[.035] px-2 py-1.5 text-[10px] font-semibold text-white/58 transition disabled:opacity-30 aria-pressed:border-[#b8ff2c]/55 aria-pressed:bg-[#b8ff2c]/10 aria-pressed:text-[#e8ffc5]" data-testid={`studio-resource-backing-${mode}`}><span className="mx-auto mb-1 block h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: swatch }} aria-hidden />{labels[mode]}</button>;
      })}</div>{legibilityGuidance ? <p className="mt-2 rounded-lg border border-amber-200/12 bg-amber-200/5 px-2.5 py-2 text-[10px] leading-4 text-amber-100/72" role="status" data-testid="studio-resource-legibility-guidance">{legibilityGuidance}</p> : null}{backingMode === "auto-contrast" ? <p className="mt-1.5 text-[9px] text-white/38" data-testid="studio-resource-auto-contrast-result">Auto Contrast resolves to {backingPlate.resolvedColor === "transparent" ? "Transparent" : backingPlate.resolvedColor === contract.backingPlate.lightColor ? "Light" : "Dark"} without altering the Asset.</p> : null}</div> : null}
      <div className="mt-5 grid grid-cols-[auto_1fr_1fr] gap-2"><button type="button" disabled={!ready} onClick={() => setCrop({ zoom: contract.scale.value, offsetX: 0, offsetY: 0 })} className="grid min-h-11 place-items-center rounded-xl border border-white/10 px-3 text-white/58 hover:bg-white/6 disabled:opacity-30" aria-label="Reset crop"><RotateCcw className="h-4 w-4" /></button><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white/70 hover:bg-white/6">Cancel</button><button type="button" disabled={!ready} onClick={() => onApply(previewResource)} className="min-h-11 rounded-xl bg-[#b8ff2c] px-4 text-sm font-bold text-[#07100a] shadow-[0_0_24px_rgba(184,255,44,.18)] disabled:cursor-not-allowed disabled:opacity-35" data-testid="studio-resource-crop-apply">Apply</button></div>
    </section>
  </div>, document.body);
}
