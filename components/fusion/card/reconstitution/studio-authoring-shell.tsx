"use client";

/* eslint-disable @next/next/no-img-element -- previews use certified exact assets and must not be transformed */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  GripVertical,
  LockKeyhole,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import type {
  StudioAuthoringCapabilityContract,
  StudioAuthoringCommand,
  StudioAuthoringControl,
  StudioAuthoringSelectionContext,
} from "@/lib/fusion/creative-studio/platform/authoring-contract";
import { createStudioAuthoringCommand } from "@/lib/fusion/creative-studio/platform/authoring-contract";
import { validateActionDestination, type StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import { cn } from "@/lib/utils";
import { StudioTransientVisualBrowser } from "./studio-transient-visual-browser";
import { StudioPrecisionControl } from "./studio-precision-control";
import { MediaPicker } from "@/components/media/media-picker";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import type { StudioSemanticResource, StudioVisualResourceCropSession } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { prepareStudioVisualResourceCandidate } from "@/lib/fusion/creative-studio/platform/visual-resource-fit-browser";
import { studioVisualResourceCompatibility, studioVisualResourceLegibilityGuidance } from "@/lib/fusion/creative-studio/platform/visual-resource-fit";
import { StudioVisualResourceCropEditor } from "@/components/fusion/creative-studio/studio-visual-resource-crop-editor";
import { StudioVisualResourceProjection } from "@/components/fusion/creative-studio/studio-visual-resource-projection";
import type { StudioTransientTaskLifecycle } from "@/lib/fusion/creative-studio/platform/adaptive-workspace";
import type { TapExperiencePage } from "@/lib/brand/tap-card";
import { StudioInternalPagePicker } from "./studio-internal-page-picker";

export function StudioAuthoringShell({
  capability,
  selection,
  onCommand,
  onPreviewCommand,
  onBeginLiveAdjustment,
  onCommitLiveAdjustment,
  onCancelLiveAdjustment,
  onSelectInternal,
  onSelectModule,
  onClose,
  transientTaskLifecycle,
  mediaUploadReady = false,
  stockReady = false,
  experiencePages = [],
}: {
  capability: StudioAuthoringCapabilityContract;
  selection: StudioAuthoringSelectionContext;
  onCommand: (command: StudioAuthoringCommand) => void;
  onPreviewCommand?: (command: StudioAuthoringCommand) => void;
  onBeginLiveAdjustment?: () => void;
  onCommitLiveAdjustment?: (label: string) => void;
  onCancelLiveAdjustment?: () => void;
  onSelectInternal: (id: string) => void;
  onSelectModule: () => void;
  onClose: () => void;
  transientTaskLifecycle?: StudioTransientTaskLifecycle;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  experiencePages?: readonly TapExperiencePage[];
}) {
  const [sheetSize, setSheetSize] = useState<"peek" | "partial" | "expanded">("partial");
  const groups = capability.groups.filter((group) => group.level === selection.level);
  const firstInternalId = capability.groups.find((group) => group.level === "module")?.controls.find((control) => control.type === "action-roster")?.items[0]?.id;
  const dispatch = (control: StudioAuthoringControl, payload: unknown, historyLabel: string) => {
    if (!control.commandId) return;
    onCommand(createStudioAuthoringCommand(capability, {
      commandId: control.commandId,
      target: selection,
      payload,
      historyLabel,
      provenance: "host",
    }));
  };
  const previewDispatch = (control: StudioAuthoringControl, payload: unknown, historyLabel: string) => {
    if (!control.commandId) return;
    (onPreviewCommand ?? onCommand)(createStudioAuthoringCommand(capability, { commandId: control.commandId, target: selection, payload, historyLabel, provenance: "host" }));
  };
  const cycleSheet = () => setSheetSize((current) => current === "peek" ? "partial" : current === "partial" ? "expanded" : "peek");
  const breadcrumb = selection.level === "module-internal"
    ? [...selection.parentPath.slice(0, -1), ...selection.parentPath.slice(-1), { id: selection.internalId || "internal", label: internalLabel(capability, selection.internalId), level: "module-internal" as const }]
    : selection.parentPath;

  return <aside
    className={cn(
      "absolute inset-x-0 bottom-0 z-40 flex overflow-hidden rounded-t-3xl bg-[#0b111b]/98 text-white shadow-[0_-24px_70px_rgba(0,0,0,.48)] ring-1 ring-white/8 backdrop-blur-xl xl:relative xl:inset-auto xl:z-10 xl:h-full xl:max-h-none xl:w-[300px] xl:shrink-0 xl:rounded-none xl:shadow-2xl xl:ring-0",
      sheetSize === "peek" && "max-h-[148px]",
      sheetSize === "partial" && "max-h-[58dvh]",
      sheetSize === "expanded" && "max-h-[88dvh]",
    )}
    aria-label="Contextual authoring"
    data-testid="studio-assembly-inspector"
    data-shared-authoring-shell="true"
    data-authoring-level={selection.level}
    data-sheet-size={sheetSize}
  >
    <div className="flex min-h-0 w-full flex-col" data-testid="studio-authoring-shell">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/18 xl:hidden" aria-hidden />
      <header className="flex shrink-0 items-start gap-2 border-b border-white/7 px-3 pb-3 pt-3">
        {selection.level === "module-internal" ? <button type="button" onClick={onSelectModule} className={roundButton} aria-label={`Back to ${selection.objectLabel}`}><ArrowLeft className="h-4 w-4" /></button> : <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#b8ff2c]/10 text-[#d8ff82]"><LockKeyhole className="h-4 w-4" /></span>}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#b8ff2c]">{selection.governance === "curated" ? "Curated System" : "Selected object"}</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold">{selection.level === "module-internal" ? internalLabel(capability, selection.internalId) : selection.objectLabel}</h2>
          <nav className="mt-1 flex min-w-0 items-center gap-0.5 overflow-hidden text-[9px] text-white/36" aria-label="Selection hierarchy" data-testid="studio-authoring-breadcrumb">
            {breadcrumb.map((item, index) => <span key={`${item.level}:${item.id}`} className="contents"><button type="button" disabled={index === breadcrumb.length - 1} onClick={item.level === "module" ? onSelectModule : undefined} className="max-w-[92px] truncate rounded px-0.5 disabled:text-white/52">{item.label}</button>{index < breadcrumb.length - 1 ? <ChevronRight className="h-2.5 w-2.5 shrink-0" /> : null}</span>)}
          </nav>
        </div>
        <button type="button" onClick={cycleSheet} className={cn(roundButton, "xl:hidden")} aria-label="Change panel height"><Maximize2 className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={onClose} className={roundButton} aria-label="Close authoring panel"><X className="h-4 w-4" /></button>
      </header>

      {selection.level === "module" && firstInternalId ? <div className="shrink-0 px-3 pt-3"><button type="button" onClick={() => onSelectInternal(firstInternalId)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a]" data-testid="studio-authoring-edit-contents">Edit Contents <ChevronRight className="h-4 w-4" /></button></div> : null}

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(24px,env(safe-area-inset-bottom))]", sheetSize === "peek" && "max-xl:hidden")}>
        {groups.map((group) => <section key={group.id} className="mt-3 rounded-xl border border-[#8bdcff]/10 bg-[#101824]/70 p-2.5" aria-labelledby={`studio-authoring-group-${group.id}`}><h3 id={`studio-authoring-group-${group.id}`} className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#a9e7ff]/70">{group.label}</h3><div className="mt-2 space-y-2.5">{group.controls.map((control) => <PurposeBuiltControl key={`${selection.internalId || "module"}:${control.id}:${control.type === "action-destination" ? control.actionType : ""}`} control={control} selection={selection} onDispatch={dispatch} onPreviewDispatch={previewDispatch} onBeginLiveAdjustment={onBeginLiveAdjustment} onCommitLiveAdjustment={onCommitLiveAdjustment} onCancelLiveAdjustment={onCancelLiveAdjustment} onSelectInternal={onSelectInternal} transientTaskLifecycle={transientTaskLifecycle} mediaUploadReady={mediaUploadReady} stockReady={stockReady} experiencePages={experiencePages} />)}</div></section>)}
      </div>
    </div>
  </aside>;
}

function PurposeBuiltControl({ control, selection, onDispatch, onPreviewDispatch, onBeginLiveAdjustment, onCommitLiveAdjustment, onCancelLiveAdjustment, onSelectInternal, transientTaskLifecycle, mediaUploadReady, stockReady, experiencePages }: {
  control: StudioAuthoringControl;
  selection: StudioAuthoringSelectionContext;
  onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void;
  onPreviewDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void;
  onBeginLiveAdjustment?: () => void;
  onCommitLiveAdjustment?: (label: string) => void;
  onCancelLiveAdjustment?: () => void;
  onSelectInternal: (id: string) => void;
  transientTaskLifecycle?: StudioTransientTaskLifecycle;
  mediaUploadReady: boolean;
  stockReady: boolean;
  experiencePages: readonly TapExperiencePage[];
}) {
  if (control.type === "visual-layout") return <ControlFrame control={control}><div className={cn("grid gap-1.5", control.options.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>{control.options.map((option) => <button key={option.id} type="button" disabled={option.availability !== "enabled"} aria-pressed={control.value === option.id} onClick={() => onDispatch(control, { controlId: control.id, value: option.id }, `Changed layout to ${option.label}`)} className={visualChoiceClass}><LayoutPreview layout={option.id} /><strong className="mt-1.5 block text-[9px]">{option.label}</strong><span className="mt-0.5 block text-[7px] leading-3 text-white/34">{option.description}</span>{control.value === option.id ? <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-[#b8ff2c]" /> : null}</button>)}</div></ControlFrame>;
  if (control.type === "count-stepper") {
    const currentIndex = control.options.indexOf(control.value);
    const previous = control.options[currentIndex - 1];
    const next = control.options[currentIndex + 1];
    return <ControlFrame control={control}><div className="flex h-11 items-center justify-between rounded-xl bg-white/[.045] px-2"><button type="button" disabled={previous == null} aria-label="Remove action" onClick={() => onDispatch(control, { controlId: control.id, value: previous }, "Removed action from Curated System")} className={roundButton}><Minus className="h-3.5 w-3.5" /></button><strong className="text-sm tabular-nums">{control.value}</strong><button type="button" disabled={next == null} aria-label="Add action" onClick={() => onDispatch(control, { controlId: control.id, value: next }, "Added action to Curated System")} className={cn(roundButton, "bg-[#b8ff2c] text-[#07100a] disabled:bg-white/5 disabled:text-white")}><Plus className="h-3.5 w-3.5" /></button></div></ControlFrame>;
  }
  if (control.type === "action-roster") return <ControlFrame control={control}><ActionRoster control={control} onDispatch={onDispatch} onSelectInternal={onSelectInternal} /></ControlFrame>;
  if (control.type === "text") return <TextControl control={control} selection={selection} onDispatch={onDispatch} onPreviewDispatch={onPreviewDispatch} onBegin={onBeginLiveAdjustment} onCommit={onCommitLiveAdjustment} onCancel={onCancelLiveAdjustment} />;
  if (control.type === "action-destination") return <DestinationControl control={control} selection={selection} onDispatch={onDispatch} experiencePages={experiencePages} />;
  if (control.type === "action-intent") return <ControlFrame control={control}><div className="grid grid-cols-2 gap-1.5">{control.options.map((option) => <button key={option.id} type="button" aria-pressed={control.value === option.id} onClick={() => onDispatch(control, { controlId: control.id, value: option.id, actionId: selection.internalId }, `Changed Action to ${option.label}`)} className={cn("min-h-10 rounded-xl bg-white/[.045] px-2 text-left text-[10px] text-white/62 transition hover:bg-white/[.08] aria-pressed:bg-[#b8ff2c]/12 aria-pressed:text-[#e7ffc2] aria-pressed:ring-1 aria-pressed:ring-[#b8ff2c]/45", option.availability !== "enabled" && "opacity-35")}><strong>{option.label}</strong><span className="mt-0.5 block text-[8px] text-white/30">{option.description}</span></button>)}</div></ControlFrame>;
  if (control.type === "segmented") return <ControlFrame control={control}><div className="grid grid-cols-3 gap-1">{control.options.map((option) => { const Icon = control.id === "alignment" ? option.id === "left" ? AlignLeft : option.id === "right" ? AlignRight : AlignCenter : null; return <button key={option.id} type="button" disabled={option.availability !== "enabled"} title={option.disabledReason} aria-label={option.label} aria-pressed={control.value === option.id} onClick={() => onDispatch(control, { controlId: control.id, value: option.id, actionId: selection.internalId }, `Changed ${control.label} to ${option.label}`)} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-white/[.045] text-[9px] text-white/52 transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-30 aria-pressed:bg-[#b8ff2c]/12 aria-pressed:text-[#e7ffc2] aria-pressed:ring-1 aria-pressed:ring-[#b8ff2c]/45">{Icon ? <Icon className="h-3.5 w-3.5" /> : <span style={{ fontSize: `${Math.min(Number(option.metadata?.phonePx || 12), 15)}px` }}>A</span>}{option.label}</button>; })}</div>{control.options.find((option) => option.id === control.value)?.metadata?.recommendedCharacterCount ? <p className="mt-1.5 text-[8px] text-white/30">Phone-safe guidance: up to {String(control.options.find((option) => option.id === control.value)?.metadata?.recommendedCharacterCount)} characters.</p> : null}</ControlFrame>;
  if (control.type === "precision") return <ControlFrame control={control}><StudioPrecisionControl label={control.label} value={control.value} descriptor={{ unit: control.unit, min: control.min, max: control.max, step: control.step, fineStep: control.fineStep, defaultValue: control.defaultValue }} onBegin={onBeginLiveAdjustment} onPreview={(value) => onPreviewDispatch(control, { controlId: control.id, value, actionId: selection.internalId }, `Changed ${control.label}`)} onCommit={(value) => onCommitLiveAdjustment ? onCommitLiveAdjustment(`Changed ${control.label}`) : onDispatch(control, { controlId: control.id, value, actionId: selection.internalId }, `Changed ${control.label}`)} onCancel={onCancelLiveAdjustment} testId={`studio-authoring-${control.id}`} />{control.guidance ? <p className="mt-1.5 text-[8px] text-white/30">{control.guidance}</p> : null}</ControlFrame>;
  if (control.type === "visual-grid") return <VisualGridControl control={control} selection={selection} onDispatch={onDispatch} />;
  if (control.type === "asset-slot") return <AssetSlotControl control={control} onDispatch={onDispatch} transientTaskLifecycle={transientTaskLifecycle} mediaUploadReady={mediaUploadReady} stockReady={stockReady} />;
  if (control.type === "appearance-status") return <ControlFrame control={control}><div className="space-y-1.5" data-testid="studio-assembly-appearance"><div className="contents" data-testid="studio-authoring-appearance">{control.roles.map((role) => <div key={role.id} className="flex items-center gap-2 rounded-xl bg-white/[.035] p-2"><span className="h-8 w-8 shrink-0 rounded-lg border border-white/10" style={{ background: role.preview }} aria-hidden /><span className="min-w-0 flex-1"><strong className="block text-[9px] text-white/68">{role.label}</strong><span className="block truncate text-[8px] text-white/34">{role.optionLabel}</span></span>{role.governed ? <LockKeyhole className="h-3.5 w-3.5 text-white/28" aria-label="Governed current state" /> : null}</div>)}</div></div></ControlFrame>;
  return <div className="rounded-xl bg-white/[.035] p-3" data-testid="studio-authoring-governance"><div className="flex items-center gap-2 text-[10px] font-semibold text-white/72"><LockKeyhole className="h-3.5 w-3.5 text-[#d8ff82]" />{control.label}</div><ul className="mt-2 space-y-1 text-[9px] leading-4 text-white/38">{control.statements.map((statement) => <li key={statement}>• {statement}</li>)}</ul></div>;
}

function candidateResource(asset: MediaAssetCandidate): StudioSemanticResource {
  return {
    src: asset.url,
    alt: asset.label || "Identity",
    assetId: asset.mediaAssetId || asset.id,
    source: asset.source,
    sourceLabel: asset.sourceLabel,
    sourceUrl: asset.sourceUrl,
    rights: asset.rights,
    licenseCode: asset.licenseCode,
    attributionText: asset.attributionText,
    visual: {
      intrinsicWidth: asset.width,
      intrinsicHeight: asset.height,
      fitMode: "visible-contain",
      crop: { zoom: 1, offsetX: 0, offsetY: 0 },
    },
    provenance: asset.source === "brand" ? "brand" : "host-selected",
  };
}

function AssetSlotControl({ control, onDispatch, transientTaskLifecycle, mediaUploadReady, stockReady }: {
  control: Extract<StudioAuthoringControl, { type: "asset-slot" }>;
  onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void;
  transientTaskLifecycle?: StudioTransientTaskLifecycle;
  mediaUploadReady: boolean;
  stockReady: boolean;
}) {
  const { slot } = control;
  const [altEdit, setAltEdit] = useState({ source: slot.value?.src, value: slot.value?.alt || "" });
  const [cropSession, setCropSession] = useState<StudioVisualResourceCropSession | null>(null);
  const [pickerOpenRequest, setPickerOpenRequest] = useState(0);
  const cropSessionSequence = useRef(0);
  const alt = altEdit.source === slot.value?.src ? altEdit.value : slot.value?.alt || "";
  const fitContract = slot.presentation.visualFit;
  const openCrop = async (resource: StudioSemanticResource, entry: "direct" | "catalog" = "direct") => {
    if (!fitContract) {
      onDispatch(control, { controlId: control.id, slotId: slot.id, resource }, `Changed ${slot.label}`);
      return;
    }
    transientTaskLifecycle?.enter("adjust-resource", entry === "catalog"
      ? { mode: "handoff", consumeBoundary: "catalog-close" }
      : { mode: "nested" });
    const sessionId = `${slot.id}-${++cropSessionSequence.current}`;
    const initialCrop = resource.visual?.crop ?? { zoom: 1, offsetX: 0, offsetY: 0 };
    setCropSession({
      sessionId,
      targetSlotId: slot.id,
      candidateAssetId: resource.assetId,
      candidateRenderSource: resource.src,
      candidateResource: resource,
      priorCommittedResource: slot.value,
      initialCrop,
      phase: "loading",
    });
    const prepared = await prepareStudioVisualResourceCandidate(resource.src);
    setCropSession((current) => {
      if (!current || current.sessionId !== sessionId) return current;
      if (!prepared.ok) return { ...current, phase: "error", error: prepared.error };
      return {
        ...current,
        phase: "ready",
        candidateResource: {
          ...resource,
          visual: { ...resource.visual, ...prepared.metadata, crop: initialCrop },
        },
      };
    });
  };
  const commitAlt = () => {
    if (!slot.value || !alt.trim() || alt.trim() === slot.value.alt) return;
    onDispatch(control, { controlId: control.id, slotId: slot.id, resource: { ...slot.value, alt: alt.trim() } }, `Edited ${slot.label} accessible name`);
  };
  return <ControlFrame control={control}>
    <div data-testid={`studio-authoring-resource-slot-${slot.id}`} data-slot-contract={slot.contractId}>
      <MediaPicker
        label={slot.semanticRole === "identity" ? "Identity logo" : slot.label}
        value={slot.value?.src || ""}
        valueAssetId={slot.value?.assetId}
        selectionLabel={slot.value?.sourceLabel || (slot.value?.source === "brand" ? "Brand asset" : undefined)}
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
        chooseLabel="Choose from Brand or Assets"
        replaceLabel="Replace"
        removeLabel="Remove"
        preview={slot.value && fitContract ? <div className="grid min-h-40 place-items-center bg-[#080c12] p-5"><StudioVisualResourceProjection resource={slot.value} contract={fitContract} className="h-28 w-28 ring-1 ring-white/15" /></div> : undefined}
        openRequestToken={pickerOpenRequest}
        onAssetChange={(asset) => {
          if (asset) void openCrop(candidateResource(asset), "catalog");
          else onDispatch(control, { controlId: control.id, slotId: slot.id, resource: undefined }, `Removed ${slot.label}`);
        }}
      />
      {slot.value && fitContract && slot.operations.includes("adjust") ? <button type="button" onClick={() => void openCrop(slot.value!)} className="mt-2 min-h-10 w-full rounded-lg border border-sky-300/20 bg-sky-300/7 px-3 text-[9px] font-semibold text-sky-100" data-testid={`studio-authoring-resource-slot-${slot.id}-adjust`}>Adjust circular crop</button> : null}
      {slot.value?.visual?.backingPlate ? <p className="mt-1.5 text-[8px] text-white/38" data-testid={`studio-authoring-resource-slot-${slot.id}-backing`}>Backing plate: {slot.value.visual.backingPlate.mode === "auto-contrast" ? "Auto Contrast" : slot.value.visual.backingPlate.mode}</p> : null}
      {slot.value ? <label className="mt-2 block text-[9px] text-white/52">Accessible name<input value={alt} onChange={(event) => setAltEdit({ source: slot.value?.src, value: event.target.value })} onBlur={commitAlt} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className={cn(fieldClass, "mt-1")} data-testid={`studio-authoring-resource-slot-${slot.id}-alt`} /></label> : null}
      {slot.defaultValue && slot.operations.includes("reset") && slot.value?.src !== slot.defaultValue.src ? <button type="button" onClick={() => onDispatch(control, { controlId: control.id, slotId: slot.id, resource: slot.defaultValue }, `Reset ${slot.label} to Brand default`)} className="mt-2 min-h-9 w-full rounded-lg border border-[#b8ff2c]/24 bg-[#b8ff2c]/7 px-3 text-[9px] font-semibold text-[#dfffaa]" data-testid={`studio-authoring-resource-slot-${slot.id}-reset`}>Use Brand default</button> : null}
      <p className="mt-2 text-[8px] leading-3 text-white/32">{slot.presentation.ownership === "governed" ? `${slot.presentation.fit} fit and placement are governed by the Curated recipe.` : "Placement is directly editable."}</p>
      {slot.value && fitContract ? (() => { const result = studioVisualResourceCompatibility(slot.value.visual, fitContract); return "warning" in result ? <p className="mt-1 text-[8px] leading-3 text-amber-200/72">{result.warning}</p> : !result.ok ? <p className="mt-1 text-[8px] leading-3 text-red-200/72">{result.reason}</p> : null; })() : null}
      {slot.value && fitContract ? (() => { const guidance = studioVisualResourceLegibilityGuidance(slot.value.visual); return guidance ? <p className="mt-1 text-[8px] leading-3 text-amber-200/72">{guidance}</p> : null; })() : null}
    </div>
    {fitContract ? <StudioVisualResourceCropEditor key={cropSession?.sessionId ?? "closed"} session={cropSession} contract={fitContract} onCancel={() => { setCropSession(null); transientTaskLifecycle?.exit("cancel"); }} onChooseAnother={() => { setCropSession(null); transientTaskLifecycle?.enter("browse-assets", { mode: "handoff", consumeBoundary: "catalog-open" }); setPickerOpenRequest((value) => value + 1); }} onApply={(resource) => { onDispatch(control, { controlId: control.id, slotId: slot.id, resource }, `Adjusted ${slot.label} crop`); setCropSession(null); transientTaskLifecycle?.exit("apply"); }} /> : null}
  </ControlFrame>;
}

function ControlFrame({ control, children }: { control: StudioAuthoringControl; children: ReactNode }) {
  return <div className="rounded-lg border border-white/6 bg-black/10 p-2"><div className="mb-1.5"><h4 className="text-[9px] font-medium text-white/72">{control.label}</h4>{control.description ? <p className="mt-0.5 text-[7px] leading-3 text-white/30">{control.description}</p> : null}</div>{children}</div>;
}

function TextControl({ control, selection, onDispatch, onPreviewDispatch, onBegin, onCommit, onCancel }: { control: Extract<StudioAuthoringControl, { type: "text" }>; selection: StudioAuthoringSelectionContext; onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void; onPreviewDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void; onBegin?: () => void; onCommit?: (label: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(control.value);
  const active = useRef(false);
  useEffect(() => { if (!active.current) setValue(control.value); }, [control.value]);
  const begin = () => { if (!active.current) { active.current = true; onBegin?.(); } };
  const commit = () => { if (!active.current) return; active.current = false; if (onCommit) onCommit(`Edited ${control.label}`); else if (value !== control.value) onDispatch(control, { controlId: control.id, value, actionId: selection.internalId }, `Edited ${control.label}`); };
  const cancel = () => { if (!active.current) return; active.current = false; setValue(control.value); onCancel?.(); };
  return <ControlFrame control={control}><input value={value} onFocus={begin} onChange={(event) => { begin(); const next = event.target.value; setValue(next); onPreviewDispatch(control, { controlId: control.id, value: next, actionId: selection.internalId }, `Edited ${control.label}`); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } else if (event.key === "Escape") { event.preventDefault(); cancel(); event.currentTarget.blur(); } }} inputMode={control.inputMode} placeholder={control.placeholder} maxLength={control.maxLength} className={fieldClass} data-testid={`studio-authoring-${control.id}`} />{control.guidance ? <p className="mt-1.5 text-[8px] text-white/30">{control.guidance}</p> : null}</ControlFrame>;
}

function DestinationControl({ control, selection, onDispatch, experiencePages }: { control: Extract<StudioAuthoringControl, { type: "action-destination" }>; selection: StudioAuthoringSelectionContext; onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void; experiencePages: readonly TapExperiencePage[] }) {
  const [value, setValue] = useState(control.value);
  const error = validateActionDestination(control.actionType as StandardButtonActionIntent, value);
  if (control.actionType === "internal_page") return <ControlFrame control={{ ...control, label: "Destination Page" }}><StudioInternalPagePicker pages={experiencePages} value={value} onChange={(next) => { setValue(next); if (next !== control.value) onDispatch(control, { controlId: control.id, value: next, actionId: selection.internalId }, "Mapped Curated action to Experience Page"); }} testId={`studio-authoring-${control.id}`} /></ControlFrame>;
  return <ControlFrame control={control}><input value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => { if (value !== control.value && !error) onDispatch(control, { controlId: control.id, value, actionId: selection.internalId }, `Edited ${control.label}`); }} inputMode={control.inputMode} placeholder={control.placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `studio-authoring-${control.id}-error` : undefined} className={fieldClass} data-testid={`studio-authoring-${control.id}`} />{error ? <p id={`studio-authoring-${control.id}-error`} className="mt-1.5 text-[9px] text-amber-200" role="status">{error}</p> : null}</ControlFrame>;
}

function ActionRoster({ control, onDispatch, onSelectInternal }: { control: Extract<StudioAuthoringControl, { type: "action-roster" }>; onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void; onSelectInternal: (id: string) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  return <div className="space-y-1">{control.items.map((item, index) => <div key={item.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex != null && dragIndex !== index) onDispatch(control, { controlId: control.id, from: dragIndex, to: index }, "Reordered Curated System actions"); setDragIndex(null); }} className="group flex items-center gap-1"><button type="button" onClick={() => onSelectInternal(item.id)} className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-transparent bg-white/[.035] px-1.5 text-left hover:border-[#8bdcff]/18 hover:bg-white/[.065]" data-testid={`studio-authoring-roster-${index}`}><GripVertical className="h-3 w-3 shrink-0 text-white/22" />{item.previewRef ? <img src={item.previewRef} alt="" className="h-6 w-6 shrink-0 object-contain" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-white/7 text-[8px]">{index + 1}</span>}<span className="min-w-0 flex-1"><strong className="block truncate text-[9px]">{item.label}</strong><span className="block truncate text-[7px] text-white/30">{item.secondary}</span></span><ChevronRight className="h-3 w-3 text-white/25" /></button><span className="flex flex-col opacity-45 transition group-hover:opacity-100"><button type="button" disabled={index === 0} onClick={() => onDispatch(control, { controlId: control.id, from: index, to: index - 1 }, "Reordered Curated System actions")} className={miniButton} aria-label={`Move ${item.label} up`}><ArrowUp className="h-3 w-3" /></button><button type="button" disabled={index === control.items.length - 1} onClick={() => onDispatch(control, { controlId: control.id, from: index, to: index + 1 }, "Reordered Curated System actions")} className={miniButton} aria-label={`Move ${item.label} down`}><ArrowDown className="h-3 w-3" /></button></span></div>)}</div>;
}

function VisualGridControl({ control, selection, onDispatch }: { control: Extract<StudioAuthoringControl, { type: "visual-grid" }>; selection: StudioAuthoringSelectionContext; onDispatch: (control: StudioAuthoringControl, payload: unknown, label: string) => void }) {
  return <ControlFrame control={control}><StudioTransientVisualBrowser label={control.label} value={control.value} options={control.options} searchable={control.searchable} adapterId={`curated-plugs:${selection.objectId}`} pathLabel={`${selection.objectLabel} / ${control.label}`} onSelect={(option) => onDispatch(control, {
    controlId: control.id,
    value: option.id,
    actionId: selection.internalId,
    // Appearance roles are semantic family state, not action-local visual choices.
    // Preserve the role declared by the adapter so the shared command path can
    // validate, persist, recompile, and project the selected material master.
    ...(typeof option.metadata?.roleId === "string" ? { roleId: option.metadata.roleId } : {}),
  }, `Changed visual choice to ${option.label}`)} /></ControlFrame>;
}

function LayoutPreview({ layout }: { layout: string }) {
  return <span className="mx-auto flex h-10 w-full max-w-20 items-center justify-center gap-1 rounded-lg bg-[#05070a] ring-1 ring-[#caa65b]/25" aria-hidden>{layout === "standalone" ? <i className="h-4 w-14 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /> : layout === "twin-rail" ? <><i className="h-8 w-1 rounded bg-[#b68e49]" /><span className="grid grid-cols-2 gap-1"><i className="h-3 w-6 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /><i className="h-3 w-6 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /><i className="h-3 w-6 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /><i className="h-3 w-6 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /></span><i className="h-8 w-1 rounded bg-[#b68e49]" /></> : <span className="grid gap-1"><i className="h-3 w-12 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /><i className="h-3 w-12 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /><i className="h-3 w-12 rounded-sm bg-[#211b13] ring-1 ring-[#caa65b]/55" /></span>}</span>;
}

function internalLabel(capability: StudioAuthoringCapabilityContract, id?: string) {
  const roster = capability.groups.flatMap((group) => group.controls).find((control) => control.type === "action-roster");
  const index = roster?.type === "action-roster" ? roster.items.findIndex((item) => item.id === id) : -1;
  if (index < 0 || roster?.type !== "action-roster") return "Action";
  const ordinal = `Action ${index + 1}`;
  const label = roster.items[index].label.trim();
  return !label || label.localeCompare(ordinal, undefined, { sensitivity: "accent" }) === 0 ? ordinal : `${ordinal} · ${label}`;
}

const roundButton = "grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-25";
const miniButton = "grid h-5 w-5 place-items-center rounded text-white/45 hover:bg-white/8 disabled:opacity-20";
const visualChoiceClass = "relative min-h-[84px] rounded-lg bg-white/[.04] p-1.5 text-center text-white/66 transition hover:bg-white/[.075] disabled:opacity-30 aria-pressed:bg-[#b8ff2c]/8 aria-pressed:text-white aria-pressed:ring-1 aria-pressed:ring-[#b8ff2c]/45";
const fieldClass = "h-10 w-full rounded-xl border-0 bg-white/[.055] px-3 text-xs text-white outline-none ring-1 ring-white/8 placeholder:text-white/25 focus:ring-[#b8ff2c]/55";
