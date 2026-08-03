"use client";

import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, Trash2, X } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { applyGlyphEffect, MATERIAL_PRESETS, MOTION_PRESETS } from "@/lib/fusion/creative-studio/card-creative-system";
import { FONT_CATALOG, fontCssStack } from "@/lib/fusion/creative-studio/fonts/catalog";
import { ensureFontLoaded } from "@/lib/fusion/creative-studio/fonts/load";
import { bringForward, bringToFront, duplicateNodes, sendBackward, sendToBack, type CreativeCompositionBlock, type CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

type Focus = "content" | "font" | "color" | "effects" | "animate" | "position" | null;

function SectionContextualToolbar({ model, onAdvanced }: { model: CardEditorLiveModel; onAdvanced: () => void }) {
  const sectionId = model.selectedObject?.type === "section" ? model.selectedObject.sectionId : null;
  const section = sectionId ? model.sorted.find((candidate) => candidate.id === sectionId) : null;
  if (!section) return null;
  return <div className="pointer-events-none absolute left-1/2 top-[9.5rem] z-[1550] -translate-x-1/2" data-testid="card-contextual-object-tools" data-contextual-object="section">
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-[#0b1019]/95 p-1.5 text-white shadow-2xl backdrop-blur">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#b8ff2c]">Section</span>
      <select aria-label="Section layout" value={section.surfaceLayout || "stack"} onChange={(event) => model.patchSection(section.id, { surfaceLayout: event.target.value as typeof section.surfaceLayout }, "Changed Section layout")} className="h-9 rounded border border-white/15 bg-[#0b1019] px-2 text-xs"><option value="stack">Stack</option><option value="row">Row</option><option value="grid">Grid</option><option value="free">Free</option></select>
      <label className="flex items-center gap-1 px-1 text-[10px]">Height<input aria-label="Section height" type="number" min={80} max={1800} value={section.surfaceMinHeightPx || 260} onChange={(event) => model.patchSection(section.id, { surfaceMinHeightPx: Number(event.target.value), surfaceHeightMode: "fixed" }, "Changed Section height")} className="h-9 w-20 rounded border border-white/15 bg-transparent px-2 text-xs" /></label>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => model.patchSection(section.id, { surfaceHeightMode: "auto", surfaceMinHeightPx: undefined }, "Fit Section to content")}>Fit content</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={onAdvanced}>Background</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => model.duplicateSection(section.id)}>Duplicate</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs text-red-200 hover:bg-white/10" onClick={() => model.deleteSection(section.id)}>Delete</button>
      <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" onClick={onAdvanced} aria-label="More Section controls"><MoreHorizontal className="h-4 w-4" /></button>
    </div>
  </div>;
}

export function CardContextualObjectToolbar({ model, onAdvanced }: { model: CardEditorLiveModel | null; onAdvanced: () => void }) {
  const [focus, setFocus] = useState<Focus>(null);
  const [fontQuery, setFontQuery] = useState("");
  const selected = useMemo(() => {
    const id = model?.selectedObject?.type === "element" ? model.selectedObject.elementId : model?.selectedCompositionNodeIds?.[0];
    if (!id || !model) return null;
    const section = model.sorted.find((candidate) => candidate.composition?.nodes.some((node) => node.id === id)) ?? null;
    const block = section?.composition ?? model.config.rootComposition ?? null;
    const node = block?.nodes.find((candidate) => candidate.id === id) ?? null;
    return node && block ? { node, block, section } : null;
  }, [model]);

  if (!model) return null;
  if (!selected) return <SectionContextualToolbar model={model} onAdvanced={onAdvanced} />;
  const { node, block, section } = selected;
  const replace = (next: CreativeCompositionBlock, label: string) => {
    if (section) model.patchSection(section.id, { composition: next }, label);
    else model.patchConfig({ rootComposition: next }, label);
  };
  const patch = (next: Partial<CreativeCompositionNode>, label: string) => model.patchCompositionNode(node.id, next, label);
  const patchProps = (next: Record<string, unknown>, label: string) => patch({ props: { ...node.props, ...next } }, label);
  const duplicate = () => { const result = duplicateNodes(block.nodes, [node.id]); replace({ ...block, nodes: result.nodes }, "Duplicated Element"); model.setSelectedCompositionNodeIds?.(result.newIds); };
  const remove = () => { if (node.locked) return model.notify?.("Unlock this Element before deleting it."); replace({ ...block, nodes: block.nodes.filter((candidate) => candidate.id !== node.id) }, "Deleted Element"); model.setSelectedCompositionNodeIds?.([]); };
  const isText = node.primitive === "text";
  const open = (next: Exclude<Focus, null>) => setFocus((current) => current === next ? null : next);
  const colors = [model.config.textColor, model.config.accentColor, model.config.surfaceColor, "#ffffff", "#111827", "#f43f5e", "#22d3ee", "#b8ff2c"].filter(Boolean);
  const fonts = FONT_CATALOG.filter((font) => `${font.family} ${font.category}`.toLowerCase().includes(fontQuery.toLowerCase()));

  return <div className="pointer-events-none absolute left-1/2 top-[9.5rem] z-[1550] -translate-x-1/2" data-testid="card-contextual-object-tools">
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-[#0b1019]/95 p-1.5 text-white shadow-2xl backdrop-blur">
      {isText ? <>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("content")} data-testid="contextual-content">Content</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("font")} data-testid="contextual-font">{String(node.props.fontFamily || "Font").split(",")[0]}</button>
        <input aria-label="Font size" type="number" min={6} max={320} value={Number(node.props.fontSize || 18)} onChange={(event) => patchProps({ fontSize: Number(event.target.value) }, "Changed text size")} className="h-9 w-16 rounded border border-white/15 bg-transparent px-2 text-xs" data-testid="contextual-font-size" />
        <button type="button" aria-pressed={Number(node.props.fontWeight || 600) >= 700} className="h-9 w-9 rounded font-bold hover:bg-white/10" onClick={() => patchProps({ fontWeight: Number(node.props.fontWeight || 600) >= 700 ? 400 : 800 }, "Changed text weight")}>B</button>
        <button type="button" aria-pressed={node.props.italic === true} className="h-9 w-9 rounded italic hover:bg-white/10" onClick={() => patchProps({ italic: node.props.italic !== true }, "Changed text italic")}>I</button>
        <button type="button" aria-pressed={node.props.underline === true} className="h-9 w-9 rounded underline hover:bg-white/10" onClick={() => patchProps({ underline: node.props.underline !== true }, "Changed text underline")}>U</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("color")} data-testid="contextual-color">Color</button>
      </> : null}
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("effects")} data-testid="contextual-effects">Effects</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")} data-testid="contextual-animate">Animate</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("position")} data-testid="contextual-position">Position</button>
      <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" onClick={duplicate} aria-label="Duplicate"><Copy className="h-4 w-4" /></button>
      <button type="button" className="grid h-9 w-9 place-items-center rounded text-red-200 hover:bg-white/10" onClick={remove} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
      <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" onClick={onAdvanced} aria-label="More"><MoreHorizontal className="h-4 w-4" /></button>
    </div>
    {focus ? <section className="pointer-events-auto mx-auto mt-2 max-h-[min(32rem,60vh)] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-white/15 bg-[#0b1019] p-3 text-white shadow-2xl" data-testid={`contextual-${focus}-drawer`}>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold capitalize">{focus}</h2><button type="button" className="grid h-8 w-8 place-items-center rounded hover:bg-white/10" onClick={() => setFocus(null)} aria-label={`Close ${focus}`}><X className="h-4 w-4" /></button></div>
      {focus === "content" ? <label className="block text-xs text-white/70">Text<textarea autoFocus value={String(node.props.text || "")} onChange={(event) => patchProps({ text: event.target.value }, "Edited Element content")} className="mt-2 min-h-24 w-full resize-y rounded border border-white/15 bg-transparent p-3 text-sm text-white" data-testid="contextual-content-input" /></label> : null}
      {focus === "font" ? <><input value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} placeholder="Search 70+ fonts" className="mb-2 h-10 w-full rounded border border-white/15 bg-transparent px-3 text-xs" data-testid="contextual-font-search" /><div className="grid grid-cols-2 gap-1">{fonts.map((font) => <button key={font.id} type="button" className="min-h-12 rounded border border-white/10 px-2 text-left text-sm hover:border-[#b8ff2c]/50" style={{ fontFamily: fontCssStack(font) }} onPointerEnter={() => void ensureFontLoaded(font.id)} onFocus={() => void ensureFontLoaded(font.id)} onClick={() => { void ensureFontLoaded(font.id); patchProps({ fontFamily: fontCssStack(font) }, `Changed font to ${font.family}`); }}>{font.family}<span className="block text-[9px] opacity-55">{font.category}</span></button>)}</div></> : null}
      {focus === "color" ? <div className="space-y-3" data-color-role="glyph"><div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Current glyph color</p><span className="block h-8 rounded border border-white/15" style={{ background: String(node.props.color || "#ffffff") }} /></div><div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Document and Brand colors</p><div className="flex flex-wrap gap-2">{colors.map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Use ${color}`} aria-pressed={node.props.color === color} className="h-8 w-8 rounded-md border border-white/20 outline-none aria-pressed:ring-2 aria-pressed:ring-[#b8ff2c]" style={{ background: color }} onClick={() => patchProps({ color, sourceMode: "LOCAL" }, "Changed text color")} />)}</div></div><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-semibold uppercase tracking-wider text-white/45">Custom</span><input aria-label="Custom glyph color" type="color" value={String(node.props.color || "#ffffff")} onChange={(event) => patchProps({ color: event.target.value, sourceMode: "LOCAL" }, "Changed custom text color")} className="h-8 w-12 rounded border border-white/15 bg-transparent p-0.5" /></div><button type="button" className="min-h-9 w-full rounded border border-white/15 text-xs" onClick={() => patchProps({ color: model.config.textColor, gradientFill: undefined, sourceMode: "BRAND" }, "Reset glyph color to Brand")}>Reset to Brand text</button><p className="text-[10px] text-white/45">Text-box background is separate under More → Advanced.</p></div> : null}
      {focus === "effects" ? <div className="grid grid-cols-2 gap-2">{MATERIAL_PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={node.props.materialPreset === preset.id} className="min-h-14 rounded border border-white/15 bg-transparent px-2 text-xs hover:border-[#b8ff2c]/60" onClick={() => patch({ props: applyGlyphEffect(node.props, preset.id) }, `Applied ${preset.label}`)}><span className="mx-auto block rounded px-2 py-1 font-bold" style={{ background: preset.gradient, backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Tap</span><span>{preset.label}</span></button>)}<button type="button" className="col-span-2 min-h-10 rounded border border-white/15 text-xs" onClick={() => patch({ props: applyGlyphEffect(node.props, null) }, "Removed effects")}>Remove effects</button></div> : null}
      {focus === "animate" ? <div className="grid grid-cols-2 gap-2">{MOTION_PRESETS.map((preset) => <button key={preset.id} type="button" className="min-h-12 rounded border border-white/15 text-xs hover:border-[#b8ff2c]/50" onClick={() => patchProps({ motionPreset: preset.id }, `Changed animation to ${preset.label}`)}>{preset.label}</button>)}</div> : null}
      {focus === "position" ? <div className="grid grid-cols-2 gap-2 text-xs">{[["Forward", bringForward], ["Backward", sendBackward], ["To front", bringToFront], ["To back", sendToBack]] .map(([label, operation]) => <button key={String(label)} type="button" className="min-h-10 rounded border border-white/15" onClick={() => replace({ ...block, nodes: (operation as typeof bringForward)(block.nodes, node.id) }, `${label} Element`)}>{String(label)}</button>)}{(["x", "y", "width", "height"] as const).map((key) => <label key={key} className="capitalize">{key}<input type="number" step="1" value={Math.round(node[key] * 100)} onChange={(event) => patch({ [key]: Number(event.target.value) / 100 }, `Changed Element ${key}`)} className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2" /></label>)}<label className="col-span-2">Rotation<input type="number" value={Math.round(node.rotationDeg || 0)} onChange={(event) => patch({ rotationDeg: Number(event.target.value) }, "Rotated Element")} className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2" /></label></div> : null}
    </section> : null}
  </div>;
}
