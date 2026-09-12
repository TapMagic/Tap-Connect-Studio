"use client";

import { Layers3, X } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { BrandPreviewContext } from "@/lib/fusion/creative-studio/reconstitution/standard-button-catalog";

export function StudioCardSurfaceInspector({ model, brand, onClose }: { model: CardEditorLiveModel; brand: BrandPreviewContext; onClose: () => void }) {
  const root = model.config.rootComposition;
  if (!root) return null;
  const authored = root.background?.kind === "solid" && /^#[0-9a-f]{6}$/i.test(String(root.background.value || "")) ? String(root.background.value) : null;
  const brandColor = brand.backgroundColor || model.config.surfaceColor || "#0b0f19";
  const value = authored || brandColor;
  const source = root.background?.source || (authored ? "local" : "brand");
  const apply = (color: string, nextSource: "brand" | "local", label: string) => model.patchConfig({ rootComposition: { ...root, background: { kind: "solid", value: color, opacity: 1, source: nextSource } } }, label);
  return <aside className="absolute inset-x-0 bottom-0 z-[2100] flex max-h-[62dvh] flex-col rounded-t-3xl border-t border-white/8 bg-[#0b111b]/98 text-white shadow-[0_-18px_50px_rgba(0,0,0,.36)] backdrop-blur-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[min(360px,calc(100vw-12px))] md:rounded-none md:border-l md:border-t-0" data-testid="studio-card-surface-inspector">
    <header className="flex min-h-14 items-center gap-2 border-b border-white/8 px-4"><div className="min-w-0 flex-1"><p className="text-xs text-white/45">Card › Card Surface</p><h2 className="mt-0.5 text-sm font-semibold">Refine Card Surface</h2></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label="Close Inspector"><X className="h-4 w-4" /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-4"><section data-card-surface-authority="root-composition"><div className="flex items-center gap-3 rounded-2xl bg-white/4 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10" style={{ background: value }}><Layers3 className="h-4 w-4 drop-shadow" /></span><div><p className="text-xs font-semibold">Solid base</p><p className="text-[9px] text-white/40">{source === "brand" ? "From Brand" : "Custom on this Card"}</p></div></div><label className="mt-4 block text-[10px] text-white/55">Base color<input type="color" value={value} onChange={(event) => apply(event.currentTarget.value, "local", "Changed Card Surface base color")} className="mt-2 h-11 w-full cursor-pointer rounded-xl border-0 bg-transparent" data-testid="studio-card-surface-color" /></label>{source === "local" ? <button type="button" onClick={() => apply(brandColor, "brand", "Reset Card Surface to Brand")} className="mt-2 min-h-9 rounded-lg border border-[#b8ff2c]/30 px-3 text-[10px] font-semibold text-[#d8ff82]">Reset to Brand background</button> : null}</section><section className="mt-6 border-t border-white/8 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/42">Surface & Materials</p><p className="mt-2 text-[10px] leading-5 text-white/38">This is the intentional destination for Card-wide backgrounds. Rich Materials, images, and gradients remain deferred to the next accepted slice.</p></section></div>
  </aside>;
}
