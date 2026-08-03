"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BadgeCheck, Brush, HelpCircle, Image as ImageIcon, Layers3,
  LayoutTemplate, Library, PanelLeft, Shapes, Type,
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { CardComposerLibrary } from "./card-composer-library";
import type { CardEditorLiveModel } from "./card-editor-live";
import {
  CARD_ELEMENT_LIBRARY,
  CARD_SURFACE_LIBRARY,
  ensureRootComposition,
  type CardElementKind,
  type CardSurfaceKind,
} from "@/lib/fusion/card/composer-model";
import { DEFAULT_GRADIENT, GRADIENT_PRESETS } from "@/lib/fusion/creative-studio/gradient";
import { SURFACE_PATTERN_CATALOG } from "@/lib/fusion/creative-studio/patterns";
import {
  BADGE_WORDING,
  ICON_LIBRARY,
  instantiateReusableComposition,
  saveReusableComposition,
} from "@/lib/fusion/creative-studio/card-creative-system";
import { cn } from "@/lib/utils";

export type CardCreativeTool = "templates" | "build" | "elements" | "text" | "brand" | "assets" | "backgrounds" | "reusable" | "layers" | "help";

const TOOLS: Array<{ id: CardCreativeTool; label: string; icon: typeof PanelLeft }> = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "build", label: "Build", icon: PanelLeft },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "text", label: "Text", icon: Type },
  { id: "brand", label: "Brand", icon: BadgeCheck },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "backgrounds", label: "Backgrounds", icon: Brush },
  { id: "reusable", label: "Reusable", icon: Library },
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "help", label: "Help", icon: HelpCircle },
];

export function CardCreativeToolRail({ model, activeTool, drawerOpen: controlledDrawerOpen, onActiveToolChange, onDrawerOpenChange }: { model: CardEditorLiveModel | null; activeTool?: CardCreativeTool; drawerOpen?: boolean; onActiveToolChange?: (tool: CardCreativeTool) => void; onDrawerOpenChange?: (open: boolean) => void }) {
  const [localActive, setLocalActive] = useState<CardCreativeTool>("build");
  const [query, setQuery] = useState("");
  const [localDrawerOpen, setLocalDrawerOpen] = useState(true);
  const active = activeTool ?? localActive;
  const drawerOpen = controlledDrawerOpen ?? localDrawerOpen;
  const setActive = (tool: CardCreativeTool) => { setLocalActive(tool); onActiveToolChange?.(tool); };
  const setDrawerOpen = (open: boolean | ((current: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(drawerOpen) : open;
    setLocalDrawerOpen(next);
    onDrawerOpenChange?.(next);
  };
  const activeDefinition = TOOLS.find((tool) => tool.id === active)!;
  const Icon = activeDefinition.icon;
  return (
    <div className="flex h-full min-h-0 bg-[#070b14]" data-testid="card-creative-left-workspace">
      <nav className="w-[68px] shrink-0 overflow-y-auto border-r border-white/10 py-2" aria-label="Card creative tools" data-testid="card-creative-tool-rail">
        {TOOLS.map((tool) => {
          const ToolIcon = tool.icon;
          const selected = drawerOpen && active === tool.id;
          return <button key={tool.id} type="button" aria-pressed={selected} aria-label={tool.label} data-testid={`card-creative-tool-${tool.id}`} className={cn("flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-1 text-[9px]", selected ? "bg-white/10 text-[#b8ff2c]" : "text-white/60 hover:bg-white/5 hover:text-white")} onClick={() => { setActive(tool.id); setDrawerOpen(true); }}><ToolIcon className="h-4 w-4" aria-hidden /><span>{tool.label}</span></button>;
        })}
      </nav>
      {drawerOpen ? <section className="min-w-0 flex-1 overflow-y-auto" aria-label={`${activeDefinition.label} drawer`} data-testid="card-creative-context-drawer" data-creative-tool={active}>
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[#090e18]/95 p-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#b8ff2c]" /><h2 className="text-xs font-semibold text-white">{activeDefinition.label}</h2></div><button type="button" aria-label="Close creative drawer" className="h-8 w-8 rounded text-white/60 hover:bg-white/5" onClick={() => setDrawerOpen(false)}>×</button></div>
          {!(["build", "help"] as CardCreativeTool[]).includes(active) ? <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeDefinition.label.toLowerCase()}`} className="mt-2 h-9 w-full rounded border border-white/10 bg-black/20 px-2 text-xs text-white" /> : null}
          <p className="mt-1 text-[9px] text-white/55">Card › {activeDefinition.label}</p>
        </header>
        <div className="p-3"><CreativeDrawer tool={active} query={query} model={model} /></div>
      </section> : null}
    </div>
  );
}

function CreativeDrawer({ tool, query, model }: { tool: CardCreativeTool; query: string; model: CardEditorLiveModel | null }) {
  if (!model) return <p className="text-xs text-white/55">Loading Card tools…</p>;
  const matches = (value: string) => !query.trim() || value.toLowerCase().includes(query.toLowerCase());
  const targetSectionId = model.selected?.type === "surface" ? model.selected.id : undefined;
  const add = (kind: CardElementKind, props?: Record<string, unknown>) => model.onAddElement?.(kind, targetSectionId, props);
  if (tool === "build") return <CardComposerLibrary model={model} />;
  if (tool === "templates") return <div className="space-y-2" data-testid="card-template-library">{([ ["blank", "Blank Card", "Start with an empty root canvas"], ["brand", "Brand starter", "Use available Brand defaults"], ["template", "Essential Card", "Identity and customer actions"], ["clone", "Clone current Card", "Editable independent copy"] ] as const).filter((item) => matches(item[1])).map(([id, label, description]) => <LibraryAction key={id} label={label} description={description} onClick={() => model.onStartPoint?.(id)} />)}<h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Section templates</h3>{CARD_SURFACE_LIBRARY.filter((item) => matches(item.label)).map((item) => <LibraryAction key={item.kind} label={item.label} description={item.description} onClick={() => model.onAddSurface?.(item.kind as CardSurfaceKind)} />)}</div>;
  if (tool === "elements") return <div className="space-y-1" data-testid="card-elements-library">{CARD_ELEMENT_LIBRARY.filter((item) => !["text", "heading", "subheading", "business_name", "address", "hours", "terms"].includes(item.kind) && matches(item.label)).map((item) => <LibraryAction key={item.kind} label={item.label} description={item.description} onClick={() => add(item.kind as CardElementKind)} />)}<h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Badges</h3><div className="grid grid-cols-2 gap-1" data-testid="card-badge-library">{BADGE_WORDING.filter(matches).map((word) => <button key={word} type="button" className="min-h-10 rounded-full border border-white/15 bg-red-500 px-2 text-[9px] font-black text-white" onClick={() => add("badge", { text: word, accessibleLabel: word })}>{word}</button>)}</div><h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Icons</h3><div className="grid grid-cols-2 gap-1">{ICON_LIBRARY.filter((icon) => matches(`${icon.label} ${icon.category}`)).map((icon) => <button key={icon.id} type="button" className="min-h-12 rounded border border-white/10 px-2 text-left text-[10px] text-white/75" onClick={() => add("icon", { icon: icon.id, accessibleLabel: icon.label, decorative: false })}>✦ {icon.label}<span className="block text-[8px] text-white/40">{icon.category}</span></button>)}</div></div>;
  if (tool === "text") return <div className="space-y-2" data-testid="card-text-library">{([ ["heading", "Add heading", { text: "Your headline", fontSize: 34, fontWeight: 800 }], ["subheading", "Add subheading", { text: "Supporting message", fontSize: 24, fontWeight: 700 }], ["text", "Add body text", { text: "Type your message", fontSize: 17, fontWeight: 400 }], ["text", "Curved text", { text: "CURVED HEADLINE", textCurve: "arch_up", fontSize: 26, fontWeight: 800 }], ["text", "Metallic text", { text: "METALLIC", gradientFill: "linear-gradient(120deg,#737b84,#f8fafc 45%,#8b949e)", materialPreset: "brushed_silver", fontSize: 28, fontWeight: 800 }] ] as const).filter((item) => matches(item[1])).map(([kind, label, props]) => <LibraryAction key={label} label={label} description="Editable text placed without a visible container" onClick={() => add(kind, props)} />)}<p className="pt-2 text-[10px] text-white/50">Select text to open the visual font picker, typography, curve, outline, shadow, glow, material, and motion controls.</p></div>;
  if (tool === "brand") return <BrandDrawer model={model} add={add} matches={matches} />;
  if (tool === "assets") return <div className="space-y-3" data-testid="card-assets-library"><p className="text-[10px] text-white/55">All · Brand-approved · Recent · Favorites · Uploaded · Product · Campaign · Offers · Backgrounds · Icons · Logos</p><MediaPicker label="Place Asset on Card" value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => { if (url) add("image", { src: url, alt: "Card image", sourceMode: "ASSET" }); }} /><button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => add("thumbnail", { src: "/tap-connect-logo.png", alt: "Product thumbnail", sourceMode: "ASSET" })}>Place product thumbnail</button><p className="text-[9px] text-white/40">Asset IDs and URL fallbacks remain on the canonical Element. Collections are views and do not duplicate files.</p></div>;
  if (tool === "backgrounds") return <BackgroundDrawer model={model} matches={matches} />;
  if (tool === "reusable") return <ReusableDrawer model={model} matches={matches} />;
  if (tool === "layers") return <div className="space-y-1" data-testid="card-layers-drawer"><LayerButton active={!model.selected} label="Card root" onClick={() => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([]); }} />{[...(model.config.rootComposition?.nodes ?? [])].sort((a, b) => b.zIndex - a.zIndex).map((node) => <LayerButton key={node.id} active={!model.selected && Boolean(model.selectedCompositionNodeIds?.includes(node.id))} label={`↳ ${node.name || node.props.elementKind || node.primitive}`} onClick={(additive) => { model.setSelectedId(null); const current = !model.selected ? model.selectedCompositionNodeIds ?? [] : []; model.setSelectedCompositionNodeIds?.(additive ? (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]) : [node.id]); }} />)}{model.sorted.map((section) => <div key={section.id}><LayerButton active={model.selected?.id === section.id && !model.selectedCompositionNodeIds?.length} label={section.label || section.type} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }} />{[...(section.composition?.nodes ?? [])].sort((a, b) => b.zIndex - a.zIndex).map((node) => <LayerButton key={node.id} active={Boolean(model.selectedCompositionNodeIds?.includes(node.id))} label={`↳ ${node.name || node.props.elementKind || node.primitive}`} onClick={(additive) => { const current = model.selected?.id === section.id ? model.selectedCompositionNodeIds ?? [] : []; model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.(additive ? (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]) : [node.id]); }} />)}</div>)}</div>;
  return <div className="space-y-3 text-xs text-white/65" data-testid="card-creative-help"><p>The Card is the canvas. Add text, logos, media, icons, badges, and Buttons directly, or add a Section only when you want a shared surface or layout.</p><ol className="list-decimal space-y-2 pl-4"><li>Choose a tool and click an item to place it.</li><li>Select the object on canvas or in Layers.</li><li>Use its compact contextual toolbar and one focused drawer at a time. More → Advanced settings is optional.</li><li>Preview draft before Save and Publish.</li></ol><p>Keyboard: arrows nudge 1px; Shift+arrow nudges 10px; Shift-click selects multiple; Tab selects beneath in layer order.</p></div>;
}

function BrandDrawer({ model, add, matches }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const logo = model.strInherited("logoUrl") || model.logoUrl || "/tap-connect-logo.png";
  const colors = [model.config.accentColor, model.config.surfaceColor, model.config.textColor, model.config.neonColor].filter(Boolean) as string[];
  return <div className="space-y-3" data-testid="card-brand-drawer"><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Logos</h3>{matches("Primary logo") ? <button type="button" className="mt-2 w-full rounded border border-white/10 bg-white p-3" onClick={() => add("logo", { src: logo, alt: `${model.businessName} logo`, sourceMode: "BRAND", brandResourceId: "brand-primary-logo" })}><Image unoptimized src={logo} width={180} height={56} alt="Primary logo preview" className="mx-auto h-14 max-w-full object-contain" /></button> : null}<div className="mt-1 grid grid-cols-2 gap-1"><button type="button" className="min-h-10 rounded border border-white/10 text-[10px]" onClick={() => add("secondary_logo", { src: logo, alt: "Alternate logo", sourceMode: "BRAND", brandResourceId: "brand-alternate-logo" })}>Alternate logo</button><button type="button" className="min-h-10 rounded border border-white/10 text-[10px]" onClick={() => add("secondary_logo", { src: logo, alt: "Sponsor logo", sourceMode: "BRAND", brandResourceId: "brand-sponsor-logo" })}>Sponsor logo</button></div></section><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Colors</h3><div className="mt-2 grid grid-cols-4 gap-1">{colors.map((color, index) => <button key={`${color}-${index}`} type="button" className="aspect-square rounded border border-white/20" style={{ background: color }} aria-label={`Apply Brand color ${color}`} onClick={() => model.patchConfigColor("accentColor", color)} />)}</div></section><section><h3 className="text-[10px] font-semibold uppercase text-white/45">Fonts</h3><button type="button" className="mt-2 min-h-12 w-full rounded border border-white/10 px-2 text-left text-sm" style={{ fontFamily: model.strInherited("bodyFont") }} onClick={() => add("text", { text: "Brand text", fontFamily: model.strInherited("bodyFont") || "Inter, system-ui, sans-serif", sourceMode: "BRAND" })}>{model.strInherited("bodyFont") || "Brand body font"}</button></section><p className="text-[9px] text-white/45">Choose one resource without applying the entire Brand Kit. Local Custom values remain until Reset to Brand.</p></div>;
}

function BackgroundDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  const root = ensureRootComposition(model.config);
  const setBackground = (background: typeof root.background, label: string) => model.patchConfig({ rootComposition: { ...root, background } }, label);
  const setImageBackground = (src: string) => {
    if (!src) return;
    setBackground({ kind: "image", image: { src, fallbackUrl: src, fit: "cover", focalX: .5, focalY: .5, scale: 1, repeat: "no-repeat", blur: 0, brightness: 1, contrast: 1, overlayColor: "#000000", overlayOpacity: .2, blendMode: "normal", decorative: true } }, "Changed Card root image background");
  };
  return <div className="space-y-3" data-testid="card-background-library"><h3 className="text-[10px] font-semibold uppercase text-white/45">Solid</h3><div className="grid grid-cols-4 gap-1">{[model.config.surfaceColor, model.config.accentColor, "#020617", "#f8fafc"].map((color) => <button key={color} type="button" className="aspect-square rounded border border-white/15" style={{ background: color }} aria-label={`Background ${color}`} onClick={() => setBackground({ kind: "solid", value: color }, "Changed Card root solid background")} />)}</div><h3 className="text-[10px] font-semibold uppercase text-white/45">Gradients</h3>{GRADIENT_PRESETS.filter((preset) => matches(preset.label)).map((preset) => <LibraryAction key={preset.id} label={preset.label} description="Editable gradient" onClick={() => setBackground({ kind: "gradient", gradient: structuredClone(preset.gradient) }, `Applied ${preset.label} gradient`)} />)}<h3 className="text-[10px] font-semibold uppercase text-white/45">Image</h3><MediaPicker label="Choose background image" value={root.background?.kind === "image" ? root.background.image?.src || "" : ""} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={setImageBackground} /><button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => setImageBackground(model.strInherited("logoUrl") || model.logoUrl || "/tap-connect-logo.png")}>Use primary Brand image as background</button><h3 className="text-[10px] font-semibold uppercase text-white/45">Patterns and textures</h3>{SURFACE_PATTERN_CATALOG.filter((pattern) => matches(`${pattern.label} ${pattern.category}`)).slice(0, 12).map((pattern) => <LibraryAction key={pattern.id} label={pattern.label} description={pattern.category} onClick={() => setBackground({ kind: pattern.kind, pattern: { version: 1, id: pattern.id, kind: pattern.kind, scale: 1, rotation: 45, opacity: .18, foreground: model.config.accentColor, background: model.config.surfaceColor, blendMode: "normal" } }, `Applied ${pattern.label} ${pattern.kind}`)} />)}<button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => setBackground({ kind: "none" }, "Removed Card root background")}>Transparent</button><button type="button" className="sr-only" onClick={() => setBackground({ kind: "gradient", gradient: structuredClone(DEFAULT_GRADIENT) }, "Applied default gradient")}>Default gradient</button></div>;
}

function ReusableDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  const [name, setName] = useState("Free Fries Tonight");
  const resources = model.config.reusableCompositions ?? [];
  const selectedComposition = model.selected?.composition ?? model.config.rootComposition;
  const selectedIds = model.selectedCompositionNodeIds ?? [];
  const canSave = Boolean(selectedComposition?.nodes.length);
  const save = () => {
    if (!selectedComposition) return;
    const nodes = selectedIds.length ? selectedComposition.nodes.filter((node) => selectedIds.includes(node.id)) : selectedComposition.nodes;
    const resource = saveReusableComposition({ block: { ...selectedComposition, nodes: structuredClone(nodes) }, name });
    model.patchConfig({ reusableCompositions: [...resources, resource] }, `Saved reusable composition ${resource.label}`);
  };
  const place = (resource: (typeof resources)[number]) => {
    const instance = instantiateReusableComposition(resource);
    const root = ensureRootComposition(model.config);
    const maxZ = root.nodes.reduce((value, node) => Math.max(value, node.zIndex), 0);
    const nodes = instance.nodes.map((node, index) => ({ ...node, id: `${node.id}-${instance.id}`, groupId: instance.id, x: Math.min(.88, node.x + .03), y: Math.min(.88, node.y + .03), zIndex: maxZ + index + 1, props: { ...node.props, compositionResourceId: resource.id, compositionInstanceId: instance.id } }));
    model.patchConfig({ rootComposition: { ...root, nodes: [...root.nodes, ...nodes] } }, `Placed reusable composition ${resource.label}`);
  };
  return <div className="space-y-3" data-testid="reusable-composition-library"><div className="rounded border border-white/10 p-2"><label className="text-[10px] text-white/60">Composition name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-9 w-full rounded border border-white/10 bg-black/20 px-2 text-xs" /></label><button type="button" disabled={!canSave} className="mt-2 min-h-10 w-full rounded bg-[#b8ff2c] px-2 text-xs font-semibold text-[#07100a] disabled:opacity-40" onClick={save}>Save selection as reusable composition</button><p className="mt-1 text-[9px] text-white/40">No flattening: canonical Elements, background, styles, and motion are preserved.</p></div>{resources.filter((resource) => matches(resource.label)).map((resource) => <div key={resource.id} className="rounded border border-white/10 p-2" data-testid="reusable-composition-resource"><p className="text-xs font-semibold">{resource.label}</p><p className="text-[9px] text-white/45">{resource.nodes.length} editable Elements · revision {resource.resourceRef?.revisionId}</p><button type="button" className="mt-2 min-h-9 w-full rounded border border-white/10 text-[10px]" onClick={() => place(resource)}>Place independent instance</button></div>)}{resources.length === 0 ? <p className="text-xs text-white/45">Select one or more Elements, then save the first reusable composition.</p> : null}</div>;
}

function LibraryAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="block min-h-12 w-full rounded border border-white/10 px-2 py-2 text-left hover:bg-white/5"><span className="block text-xs text-white/80">{label}</span><span className="block text-[9px] text-white/45">{description}</span></button>; }
function LayerButton({ label, active, onClick }: { label: string; active: boolean; onClick: (additive: boolean) => void }) { return <button type="button" aria-pressed={active} className={cn("min-h-9 w-full truncate rounded px-2 text-left text-[10px]", active ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/65 hover:bg-white/5")} onClick={(event) => onClick(event.shiftKey || event.metaKey || event.ctrlKey)}>{String(label)}</button>; }
