"use client";

import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import type { CardEditorLiveModel } from "./card-editor-live";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { capabilitiesForNode } from "@/lib/fusion/creative-studio/capabilities";

const fieldClass = "mt-1 h-10 w-full rounded-md border border-white/15 bg-[#090e18] px-2 text-sm text-white";

export function CardAdvancedSettingsOverlay({
  model,
  onClose,
}: {
  model: CardEditorLiveModel | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const node = useMemo(() => {
    if (!model || model.selectionRef.objectKind !== "element") return null;
    const section = model.selectionRef.parentId === "card-page"
      ? null
      : model.sorted.find((candidate) => candidate.id === model.selectionRef.parentId);
    return (section?.composition?.nodes ?? model.config.rootComposition?.nodes ?? []).find(
      (candidate) => candidate.id === model.selectionRef.objectId
    ) ?? null;
  }, [model]);
  if (!model) return null;

  const selection = model.selectionRef;
  const section = selection.objectKind === "section"
    ? model.sorted.find((candidate) => candidate.id === selection.objectId) ?? null
    : null;
  const targetName = node
    ? `${String(node.props.elementKind || node.primitive)}: ${node.name || String(node.props.label || node.props.text || "Selected object")}`
    : section
      ? `Section: ${section.label || section.type}`
      : "Card root";
  const patchNode = (patch: Partial<CreativeCompositionNode>, label: string) =>
    model.patchSelection(selection, patch, label);

  return (
    <div
      className="absolute inset-0 z-[1700] bg-black/25"
      data-testid="card-advanced-settings-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-advanced-settings-title"
        className="absolute left-[clamp(.75rem,22vw,22rem)] top-4 max-h-[calc(100%-2rem)] w-[min(28rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1019] p-4 text-white shadow-2xl"
        data-testid="card-advanced-settings"
        data-selection-document={selection.documentId}
        data-selection-page={selection.pageId}
        data-selection-object={selection.objectId}
        data-selection-generation={selection.selectionGeneration}
      >
        <header className="sticky top-0 z-10 -mx-1 mb-4 flex items-start justify-between gap-3 bg-[#0b1019]/95 px-1 pb-3 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b8ff2c]">More · Advanced</p>
            <h2 id="card-advanced-settings-title" className="mt-1 text-base font-semibold">{targetName}</h2>
            <p className="mt-1 text-[10px] text-white/50">Exact values use the current canonical selection. A stale target is rejected.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close Advanced settings" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </header>

        {node ? (
          <div className="space-y-5">
            <section>
              <h3 className="text-xs font-semibold">Transform</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberField label="X %" value={Math.round(node.x * 100)} onChange={(value) => patchNode({ x: value / 100 }, "Changed exact X position")} />
                <NumberField label="Y %" value={Math.round(node.y * 100)} onChange={(value) => patchNode({ y: value / 100 }, "Changed exact Y position")} />
                <NumberField label="Width %" value={Math.round(node.width * 100)} min={1} onChange={(value) => patchNode({ width: value / 100 }, "Changed exact width")} />
                <NumberField label="Height %" value={Math.round(node.height * 100)} min={1} onChange={(value) => patchNode({ height: value / 100 }, "Changed exact height")} />
                <NumberField label="Rotation" value={Math.round(node.rotationDeg || 0)} min={-360} max={360} onChange={(value) => patchNode({ rotationDeg: value }, "Changed exact rotation")} />
                <NumberField label="Layer" value={node.zIndex} min={0} onChange={(value) => patchNode({ zIndex: value }, "Changed exact layer")} />
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="min-h-10 flex-1 rounded-md border border-white/15 px-2 text-xs" onClick={() => patchNode({ rotationDeg: 0 }, "Reset rotation")}>Reset rotation</button>
                <button type="button" className="min-h-10 flex-1 rounded-md border border-white/15 px-2 text-xs" onClick={() => patchNode({ x: .1, y: .1 }, "Reset position")}>Reset position</button>
              </div>
            </section>
            <section>
              <h3 className="text-xs font-semibold">Technical accessibility</h3>
              <label className="mt-2 block text-[10px] text-white/65">Accessible label<input value={String(node.props.accessibleLabel || "")} onChange={(event) => patchNode({ props: { ...node.props, accessibleLabel: event.target.value } }, "Changed accessible label")} className={fieldClass} /></label>
              <label className="mt-2 block text-[10px] text-white/65">Tracking name<input value={String(node.props.trackingName || "")} onChange={(event) => patchNode({ props: { ...node.props, trackingName: event.target.value } }, "Changed tracking name")} className={fieldClass} /></label>
            </section>
            <section>
              <h3 className="text-xs font-semibold">Available capabilities</h3>
              <div className="mt-2 flex flex-wrap gap-1" data-testid="advanced-capability-list">{[...capabilitiesForNode(node)].map((capability) => <span key={capability} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/60">{capability.replaceAll("_", " ")}</span>)}</div>
            </section>
          </div>
        ) : section ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Width %" value={section.surfaceWidthPercent || 100} min={10} max={100} onChange={(value) => model.patchSelection(selection, { surfaceWidthPercent: value }, "Changed exact Section width")} />
              <NumberField label="Height px" value={section.surfaceExactHeightPx ?? section.surfaceMinHeightPx ?? 260} min={32} max={2400} onChange={(value) => model.patchSelection(selection, { surfaceExactHeightPx: value, surfaceHeightMode: "fixed" }, "Changed exact Section height")} />
              <NumberField label="Padding px" value={section.surfacePaddingPx ?? 24} min={0} max={240} onChange={(value) => model.patchSelection(selection, { surfacePaddingPx: value }, "Changed exact Section padding")} />
              <NumberField label="Gap px" value={section.surfaceGapPx ?? 12} min={0} max={240} onChange={(value) => model.patchSelection(selection, { surfaceGapPx: value }, "Changed exact Section gap")} />
              <NumberField label="Radius px" value={section.surfaceRadiusPx ?? 0} min={0} max={999} onChange={(value) => model.patchSelection(selection, { surfaceRadiusPx: value }, "Changed exact Section radius")} />
              <NumberField label="Opacity %" value={section.opacity ?? 100} min={0} max={100} onChange={(value) => model.patchSelection(selection, { opacity: value }, "Changed exact Section opacity")} />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">Select a Section or Element for exact settings. Card appearance remains in the Appearance drawer.</p>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  min = -1000,
  max = 1000,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return <label className="text-[10px] text-white/65">{label}<input aria-label={label} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className={fieldClass} /></label>;
}

