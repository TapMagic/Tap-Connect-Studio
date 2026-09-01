"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { normalizeStudioPrecision, stepStudioPrecision, type StudioPrecisionDescriptor } from "@/lib/fusion/creative-studio/platform/live-adjustment";

export function StudioPrecisionControl({
  label,
  value,
  descriptor,
  onBegin,
  onPreview,
  onCommit,
  onCancel,
  testId,
}: {
  label: string;
  value: number;
  descriptor: StudioPrecisionDescriptor;
  onBegin?: () => void;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
  onCancel?: () => void;
  testId?: string;
}) {
  const [draft, setDraft] = useState(() => normalizeStudioPrecision(value, descriptor));
  const activeRef = useRef(false);
  useEffect(() => { if (!activeRef.current) setDraft(normalizeStudioPrecision(value, descriptor)); }, [value, descriptor]);
  const begin = () => { if (activeRef.current) return; activeRef.current = true; onBegin?.(); };
  const preview = (next: number) => { begin(); const normalized = normalizeStudioPrecision(next, descriptor); setDraft(normalized); onPreview(normalized); };
  const commit = () => { if (!activeRef.current) return; activeRef.current = false; onCommit(draft); };
  const cancel = () => { if (!activeRef.current) return; activeRef.current = false; setDraft(normalizeStudioPrecision(value, descriptor)); onCancel?.(); };
  const reset = () => { const next = normalizeStudioPrecision(descriptor.defaultValue ?? descriptor.min, descriptor); begin(); setDraft(next); onPreview(next); activeRef.current = false; onCommit(next); };
  return <div className="mt-3" data-testid={testId}>
    <div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-xs text-white/62">{label}</span><div className="flex items-center gap-1"><label className="flex h-8 items-center rounded-lg border border-white/10 bg-black/20 px-2"><span className="sr-only">{label} exact value</span><input type="number" min={descriptor.min} max={descriptor.max} step={descriptor.step} value={draft} onFocus={begin} onChange={(event) => preview(Number(event.target.value))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } if (event.key === "Escape") { event.preventDefault(); cancel(); event.currentTarget.blur(); } if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); preview(stepStudioPrecision(draft, event.key === "ArrowUp" ? 1 : -1, descriptor, event.shiftKey)); } }} className="w-12 bg-transparent text-right text-[11px] tabular-nums text-white outline-none" /><span className="ml-1 text-[9px] text-white/34">{descriptor.unit === "number" ? "" : descriptor.unit}</span></label>{descriptor.defaultValue != null ? <button type="button" onClick={reset} className="grid h-8 w-8 place-items-center rounded-lg text-white/38 hover:bg-white/7 hover:text-white" aria-label={`Reset ${label}`}><RotateCcw className="h-3.5 w-3.5" /></button> : null}</div></div>
    <input type="range" min={descriptor.min} max={descriptor.max} step={descriptor.step} value={draft} onPointerDown={begin} onChange={(event) => preview(Number(event.target.value))} onPointerUp={commit} onPointerCancel={cancel} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancel(); } }} className="w-full accent-[#b8ff2c]" aria-label={label} />
  </div>;
}
