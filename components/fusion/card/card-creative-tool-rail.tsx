"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowDown, ArrowUp, BadgeCheck, Bot, Brush, Compass, Copy, Eye, EyeOff, FolderKanban, HelpCircle, Image as ImageIcon, Layers3,
  LayoutTemplate, Library, Lock, MousePointer2, Palette, Pencil, Shapes, Sparkles, Ticket, BadgePercent, Trash2, Type, Unlock, Wrench,
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { CardComposerLibrary } from "./card-composer-library";
import { DEEP_LEFT_EDIT_PORTAL_ID, useDeepLeftEditorOptional } from "@/components/fusion/creative-studio/deep-left-editor-context";
import { deepLeftHeader } from "@/lib/fusion/creative-studio/deep-left-editor";
import type { CardEditorLiveModel } from "./card-editor-live";
import {
  CARD_ELEMENT_LIBRARY,
  SECTION_PRESET_LIBRARY,
  ensureRootComposition,
  type CardElementKind,
  type SectionPresetId,
} from "@/lib/fusion/card/composer-model";
import { DEFAULT_GRADIENT, GRADIENT_PRESETS } from "@/lib/fusion/creative-studio/gradient";
import { SURFACE_PATTERN_CATALOG } from "@/lib/fusion/creative-studio/patterns";
import {
  BADGE_WORDING,
  ICON_LIBRARY,
  instantiateReusableComposition,
  saveReusableComposition,
} from "@/lib/fusion/creative-studio/card-creative-system";
import { createIconAsset, iconAssetToNodeProps, nativeIconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import {
  STARTER_BADGE_COMPOSITIONS,
  STARTER_BADGE_SHAPES,
  STARTER_BUTTON_PRESETS,
  STARTER_CONTAINER_PRESETS,
  STARTER_COUPON_LAYOUTS,
  STARTER_DIVIDER_PRESETS,
  STARTER_FORM_PRESETS,
  STARTER_TEXT_COMBINATIONS,
  STARTER_TICKET_LAYOUTS,
  buttonPresetThumbnailStyle,
} from "@/lib/fusion/creative-studio/starter-preset-registry";
import { BADGE_SHAPE_DEFS, badgeShapePreviewStyle, badgeShapeProps } from "@/lib/fusion/creative-studio/badge-shape";
import {
  ICON_BROWSE_CATEGORIES,
  ICON_COLLECTION_BROWSE,
  pushIconRecent,
  readIconFavorites,
  readIconRecent,
} from "@/lib/fusion/creative-studio/icon-browse";
import {
  buildCouponContentComposition,
  couponSurfaceDefaults,
  couponThumbnailSignature,
  geometryFromStarter,
} from "@/lib/fusion/creative-studio/coupon-composition";
import { textDescendantsInScope } from "@/lib/fusion/creative-studio/group-authority";
import { cn } from "@/lib/utils";
import { buttonContent } from "@/lib/fusion/creative-studio/button-composition";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

export type CardCreativeTool = "templates" | "build" | "elements" | "icons" | "buttons" | "badges" | "text" | "coupons" | "tickets" | "brand" | "assets" | "backgrounds" | "projects" | "reusable" | "layers" | "ai" | "tools" | "help";

const TOOLS: Array<{ id: CardCreativeTool; label: string; icon: typeof LayoutTemplate }> = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "text", label: "Text", icon: Type },
  { id: "icons", label: "Icons", icon: Sparkles },
  { id: "buttons", label: "Buttons", icon: MousePointer2 },
  { id: "badges", label: "Badges", icon: BadgeCheck },
  { id: "coupons", label: "Coupons", icon: BadgePercent },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "backgrounds", label: "Background", icon: Brush },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "reusable", label: "Reusable", icon: Library },
  { id: "layers", label: "Layers", icon: Layers3 },
  { id: "ai", label: "AI Assist", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "help", label: "Help", icon: HelpCircle },
  // Build remains available as an optional guided checklist only — not a duplicate catalog.
  { id: "build", label: "Guide", icon: Compass },
];

export function CardCreativeToolRail({ model, activeTool, drawerOpen: controlledDrawerOpen, onActiveToolChange, onDrawerOpenChange }: { model: CardEditorLiveModel | null; activeTool?: CardCreativeTool; drawerOpen?: boolean; onActiveToolChange?: (tool: CardCreativeTool) => void; onDrawerOpenChange?: (open: boolean) => void }) {
  const [localActive, setLocalActive] = useState<CardCreativeTool>(activeTool ?? "templates");
  const [query, setQuery] = useState("");
  const [localDrawerOpen, setLocalDrawerOpen] = useState(controlledDrawerOpen ?? true);
  const deepLeft = useDeepLeftEditorOptional();
  const active = activeTool ?? localActive;
  const drawerOpen = controlledDrawerOpen ?? localDrawerOpen;
  const editMode = deepLeft?.session.mode === "edit";
  const setActive = (tool: CardCreativeTool) => {
    deepLeft?.closeEdit();
    setLocalActive(tool);
    onActiveToolChange?.(tool);
  };
  const setDrawerOpen = (open: boolean | ((current: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(drawerOpen) : open;
    setLocalDrawerOpen(next);
    onDrawerOpenChange?.(next);
  };
  const activeDefinition = TOOLS.find((tool) => tool.id === active) ?? TOOLS[0]!;
  const Icon = activeDefinition.icon;
  return (
    <div className="flex h-full min-h-0 bg-[#070b14]" data-testid="card-creative-left-workspace">
      <nav className="w-[68px] shrink-0 overflow-y-auto border-r border-white/10 py-2" aria-label="Card creative tools" data-testid="card-creative-tool-rail">
        {TOOLS.map((tool) => {
          const ToolIcon = tool.icon;
          const selected = drawerOpen && !editMode && active === tool.id;
          return <button key={tool.id} type="button" aria-pressed={selected} aria-label={tool.label} data-testid={`card-creative-tool-${tool.id}`} className={cn("flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-1 text-[9px]", selected ? "bg-white/10 text-[#b8ff2c]" : "text-white/60 hover:bg-white/5 hover:text-white")} onClick={() => { setActive(tool.id); setDrawerOpen(true); }}><ToolIcon className="h-4 w-4" aria-hidden /><span>{tool.label}</span></button>;
        })}
      </nav>
      {(drawerOpen || editMode) ? <section className="min-w-0 flex-1 overflow-y-auto" aria-label={editMode ? "Deep left editor" : `${activeDefinition.label} drawer`} data-testid="card-creative-context-drawer" data-creative-tool={active} data-drawer-mode={editMode ? "edit" : "library"}>
        {editMode && deepLeft ? (
          <>
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[#090e18]/95 p-3 backdrop-blur" data-testid="deep-left-edit-header">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <button type="button" className="text-[10px] text-[#b8ff2c] hover:underline" data-testid="deep-left-back" onClick={() => deepLeft.goBack()}>← Back</button>
                  <h2 className="truncate text-xs font-semibold text-white">{deepLeftHeader(deepLeft.session) || "Editor"}</h2>
                  <p className="text-[9px] text-white/55">{deepLeft.session.targetLabel || "Selected object"} · {deepLeft.session.capabilityLabel || deepLeft.session.section}</p>
                </div>
                <button type="button" aria-label="Close editor" className="h-8 w-8 rounded text-white/60 hover:bg-white/5" onClick={() => deepLeft.closeEdit()}>×</button>
              </div>
            </header>
            <div className="min-h-[12rem] p-3" data-testid="deep-left-edit-drawer" id={DEEP_LEFT_EDIT_PORTAL_ID} />
          </>
        ) : (
          <>
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[#090e18]/95 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#b8ff2c]" /><h2 className="text-xs font-semibold text-white">{activeDefinition.label}</h2></div><button type="button" aria-label="Close creative drawer" className="h-8 w-8 rounded text-white/60 hover:bg-white/5" onClick={() => setDrawerOpen(false)}>×</button></div>
              {!(["build", "help"] as CardCreativeTool[]).includes(active) ? <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeDefinition.label.toLowerCase()}`} className="mt-2 h-9 w-full rounded border border-white/10 bg-black/20 px-2 text-xs text-white" /> : null}
              <p className="mt-1 text-[9px] text-white/55">Card › {activeDefinition.label}</p>
            </header>
            <div className="p-3"><CreativeDrawer tool={active} query={query} model={model} onSelectTool={(tool) => { setActive(tool); setDrawerOpen(true); }} /></div>
          </>
        )}
      </section> : null}
    </div>
  );
}

function CreativeDrawer({ tool, query, model, onSelectTool }: { tool: CardCreativeTool; query: string; model: CardEditorLiveModel | null; onSelectTool: (tool: CardCreativeTool) => void }) {
  const [targetSectionChoice, setTargetSectionChoice] = useState<string | null>(null);
  const selectedSectionId = model?.selected?.type === "surface" ? model.selected.id : null;
  const insertionTarget = selectedSectionId && targetSectionChoice === selectedSectionId ? "section" : "card";
  if (!model) return <p className="text-xs text-white/55">Loading Card tools…</p>;
  const matches = (value: string) => !query.trim() || value.toLowerCase().includes(query.toLowerCase());
  const targetSectionId = insertionTarget === "section" ? selectedSectionId : null;
  const add = (kind: CardElementKind, props?: Record<string, unknown>) => model.onAddElement?.(kind, targetSectionId, props);
  const targetChoice = selectedSectionId ? <InsertionTargetChoice value={insertionTarget} sectionName={model.selected?.label || "selected Section"} onChange={(value) => setTargetSectionChoice(value === "section" ? selectedSectionId : null)} /> : null;
  if (tool === "build") return <CardComposerLibrary model={model} />;
  if (tool === "templates") return <div className="space-y-2" data-testid="card-template-library">{([ ["blank", "Blank Card", "Start with an empty root canvas"], ["brand", "Brand starter", "Use available Brand defaults"], ["template", "Essential Card", "Identity and customer actions"], ["clone", "Clone current Card", "Editable independent copy"] ] as const).filter((item) => matches(item[1])).map(([id, label, description]) => <LibraryAction key={id} label={label} description={description} onClick={() => model.onStartPoint?.(id)} />)}<h3 className="pt-3 text-[10px] font-semibold uppercase text-white/45">Section presets</h3>{SECTION_PRESET_LIBRARY.filter((item) => matches(`${item.label} ${item.style}`)).map((item) => <LibraryAction key={item.id} label={item.label} description={`${item.description} · ${item.style}`} onClick={() => model.onAddSectionPreset?.(item.id as SectionPresetId)} />)}</div>;
  if (tool === "elements") return <div className="space-y-1" data-testid="card-elements-library">{targetChoice}{CARD_ELEMENT_LIBRARY.filter((item) => item.kind !== "badge" && !["text", "heading", "subheading", "business_name", "address", "hours", "terms"].includes(item.kind) && matches(item.label)).map((item) => <LibraryAction key={item.kind} label={item.label} description={item.kind === "image" ? "Open the shared visual media browser" : item.description} onClick={() => item.kind === "image" ? onSelectTool("assets") : item.kind === "icon" ? onSelectTool("icons") : add(item.kind as CardElementKind)} />)}<button type="button" className="min-h-12 w-full rounded border border-white/10 px-2 text-left text-xs" onClick={() => onSelectTool("badges")}>Badge<span className="block text-[9px] text-white/45">Open the authoritative Badge catalog</span></button><button type="button" className="min-h-12 w-full rounded border border-white/10 px-2 text-left text-xs" onClick={() => onSelectTool("icons")} data-testid="open-icon-library">Icon<span className="block text-[9px] text-white/45">Open the native Icon library — does not place Sparkles</span></button></div>;
  if (tool === "icons") return <IconLibraryDrawer model={model} add={add} matches={matches} targetChoice={targetChoice} />;
  if (tool === "buttons") return <div className="space-y-3">{targetChoice}<ButtonLibrary add={add} matches={matches} /></div>;
  if (tool === "badges") return <div className="space-y-3">{targetChoice}<BadgeLibrary add={add} matches={matches} /></div>;
  if (tool === "coupons") return <div className="space-y-3">{targetChoice}<CommerceComponentLibrary kind="coupon" model={model} add={add} matches={matches} /></div>;
  if (tool === "tickets") return <div className="space-y-3">{targetChoice}<CommerceComponentLibrary kind="ticket" model={model} add={add} matches={matches} /></div>;
  if (tool === "text") return <TextLibrary model={model} add={add} matches={matches} targetChoice={targetChoice} targetSectionId={targetSectionId} />;
  if (tool === "brand") return <BrandDrawer model={model} add={add} matches={matches} />;
  if (tool === "assets") return <div className="space-y-3" data-testid="card-assets-library">{targetChoice}<p className="text-[10px] text-white/55">All · Brand-approved · Recent · Favorites · Uploaded · Product · Campaign · Offers · Backgrounds · Icons · Logos</p><MediaPicker label="Add Image" value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => { if (url) add("image", { src: url, alt: "Card image", sourceMode: "ASSET" }); }} /><button type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" onClick={() => add("thumbnail", { src: "/tap-connect-logo.png", alt: "Product thumbnail", sourceMode: "ASSET" })}>Place product thumbnail</button><p className="text-[9px] text-white/40">Asset IDs and URL fallbacks remain on the canonical Element. Collections are views and do not duplicate files.</p></div>;
  if (tool === "backgrounds") return <BackgroundDrawer model={model} matches={matches} />;
  if (tool === "projects") return <ProjectsDrawer model={model} matches={matches} />;
  if (tool === "reusable") return <ReusableDrawer model={model} matches={matches} />;
  if (tool === "layers") return <LayersDrawer model={model} />;
  if (tool === "ai") return <AiAssistDrawer model={model} />;
  if (tool === "tools") return <QuickToolsDrawer model={model} add={add} />;
  return <div className="space-y-3 text-xs text-white/65" data-testid="card-creative-help"><p>The Card is the canvas. Add text, logos, media, icons, badges, and Buttons directly, or add a Section only when you want a shared surface or layout.</p><ol className="list-decimal space-y-2 pl-4"><li>Choose a tool and click an item to place it.</li><li>Select the object on canvas or in Layers.</li><li>Use its compact contextual toolbar and one focused drawer at a time. More → Advanced settings is optional.</li><li>Preview draft before Save and Publish.</li></ol><p>Keyboard: arrows nudge 1px; Shift+arrow nudges 10px; Shift-click selects multiple; Tab selects beneath in layer order.</p></div>;
}


function IconLibraryDrawer({ add, matches, targetChoice }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean; targetChoice: ReactNode }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "browse" | "collections">("browse");
  const [category, setCategory] = useState("recommended");
  const [collection, setCollection] = useState<string | null>(null);
  const [providerIcons, setProviderIcons] = useState<Array<{ collection: string; name: string; canonicalId: string; source: string; svg?: string }>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [recent, setRecent] = useState<string[]>(() => readIconRecent());
  const [favorites] = useState<string[]>(() => readIconFavorites());

  useEffect(() => {
    const controller = new AbortController();
    const q = query.trim();
    const timer = window.setTimeout(() => {
      if (mode === "search" && q.length < 2) {
        setStatus("idle");
        setProviderIcons([]);
        return;
      }
      let url = "";
      if (mode === "search") url = `/api/creative/icons?q=${encodeURIComponent(q)}`;
      else if (mode === "collections" && collection) url = `/api/creative/icons?collection=${encodeURIComponent(collection)}`;
      else if (mode === "browse" && category && !["recommended", "recent", "favorites"].includes(category)) {
        url = `/api/creative/icons?category=${encodeURIComponent(category)}`;
      } else {
        setStatus("idle");
        setProviderIcons([]);
        return;
      }
      setStatus("loading");
      void fetch(url, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`iconify ${response.status}`);
          return response.json() as Promise<{ icons?: Array<{ collection: string; name: string; canonicalId: string; source: string; svg?: string }>; fallback?: boolean }>;
        })
        .then((value) => {
          setProviderIcons(value.icons || []);
          setStatus(value.fallback ? "fallback" : "ready");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setProviderIcons([]);
          setStatus("fallback");
        });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, mode, category, collection]);

  const place = (props: Record<string, unknown>, id?: string) => {
    if (id) setRecent(pushIconRecent(id));
    add("icon", props);
  };

  const renderProviderGrid = (testId: string) => (
    <div className="grid grid-cols-3 gap-1" data-testid={testId}>
      {providerIcons.map((icon) => {
        const asset = icon.svg ? createIconAsset({ provider: "iconify", collection: icon.collection, iconName: icon.name, svg: icon.svg, source: icon.source }) : null;
        return (
          <button key={icon.canonicalId} type="button" disabled={!asset} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded border border-white/10 px-1 text-center text-[9px] hover:border-[#b8ff2c]/50 disabled:opacity-40" data-testid={`iconify-result-${icon.canonicalId}`} onClick={() => { if (!asset) return; place({ ...iconAssetToNodeProps(asset), accessibleLabel: icon.name, decorative: false }, icon.canonicalId); }}>
            {asset ? <span className="grid h-9 w-9 place-items-center text-white [&_svg]:h-7 [&_svg]:w-7" aria-hidden data-icon-svg="true" dangerouslySetInnerHTML={{ __html: asset.body }} /> : <span className="text-[8px] text-white/40">SVG unavailable</span>}
            <span className="line-clamp-2 px-0.5">{icon.name}</span>
            <span className="text-[8px] text-white/40">{icon.collection}</span>
          </button>
        );
      })}
      {status === "ready" && providerIcons.length === 0 ? <p className="col-span-3 text-[10px] text-white/45">No visual results.</p> : null}
      {status === "loading" ? <p className="col-span-3 text-[10px] text-white/45">Loading…</p> : null}
    </div>
  );

  return (
    <div className="space-y-3" data-testid="card-icon-library" data-shared-icon-picker="true">
      {targetChoice}
      <p className="text-[10px] text-white/55">One Icon library for root and nested targets. Search when you know the name; browse when you do not.</p>
      <div className="grid grid-cols-3 gap-1" data-testid="icon-library-modes">
        {([["browse", "Browse"], ["collections", "Collections"], ["search", "Search"]] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={mode === id} className="min-h-9 rounded border border-white/10 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      {mode === "search" ? (
        <>
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length >= 2) setStatus("loading"); }} placeholder="Search Lucide · Tabler · Phosphor · Remix · Material Symbols" className="h-10 w-full rounded border border-white/15 bg-black/20 px-3 text-xs" data-testid="icon-library-search" />
          <div className="flex flex-wrap gap-1">{["dog", "ticket", "crown", "phone", "gift", "map", "star", "heart"].map((term) => <button key={term} type="button" className="min-h-8 rounded border border-white/10 px-2 text-[10px]" onClick={() => { setQuery(term); setStatus("loading"); }}>{term}</button>)}</div>
          <p className="text-[9px] text-white/40" data-testid="icon-library-status">{status === "loading" ? "Searching Iconify…" : status === "fallback" ? "Provider unavailable — showing built-in fallback" : status === "ready" ? `${providerIcons.length} Iconify results` : "Type at least 2 characters"}</p>
          {query.trim().length >= 2 ? <>
            <h3 className="text-[10px] font-semibold uppercase text-white/45">Iconify results</h3>
            {renderProviderGrid("icon-library-iconify-results")}
          </> : null}
          {status === "fallback" ? <p className="text-[9px] text-amber-100" data-testid="icon-library-provider-error">Iconify provider unavailable.</p> : null}
        </>
      ) : null}
      {mode === "browse" ? (
        <>
          <div className="flex flex-wrap gap-1" data-testid="icon-browse-categories">
            {ICON_BROWSE_CATEGORIES.map((item) => (
              <button key={item.id} type="button" aria-pressed={category === item.id} className="min-h-8 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" data-testid={`icon-browse-category-${item.id}`} onClick={() => setCategory(item.id)}>{item.label}</button>
            ))}
          </div>
          {category === "recommended" ? (
            <div className="grid grid-cols-3 gap-1" data-testid="icon-library-recommended">
              {ICON_LIBRARY.filter((icon) => matches(`${icon.label} ${icon.category}`)).map((icon) => {
                const asset = nativeIconAsset(icon.id);
                return <button key={icon.id} type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border border-white/10 px-1 text-center text-[9px]" data-testid={`icon-recommended-${icon.id}`} onClick={() => { if (!asset) return; place({ ...iconAssetToNodeProps(asset), accessibleLabel: icon.label, decorative: false }, `native:${icon.id}`); }}>{asset ? <span className="grid h-8 w-8 place-items-center text-[#b8ff2c] [&_svg]:h-7 [&_svg]:w-7" aria-hidden data-icon-svg="true" dangerouslySetInnerHTML={{ __html: asset.body }} /> : null}{icon.label}</button>;
              })}
            </div>
          ) : category === "recent" ? (
            <div className="grid grid-cols-3 gap-1" data-testid="icon-browse-recent">{recent.length ? recent.map((id) => <span key={id} className="rounded border border-white/10 px-1 py-2 text-center text-[9px] text-white/70">{id}</span>) : <p className="col-span-3 text-[10px] text-white/45">No recent icons yet.</p>}</div>
          ) : category === "favorites" ? (
            <div className="grid grid-cols-3 gap-1" data-testid="icon-browse-favorites">{favorites.length ? favorites.map((id) => <span key={id} className="rounded border border-white/10 px-1 py-2 text-center text-[9px] text-white/70">{id}</span>) : <p className="col-span-3 text-[10px] text-white/45">No favorites yet.</p>}</div>
          ) : (
            <>
              <h3 className="text-[10px] font-semibold uppercase text-white/45">{ICON_BROWSE_CATEGORIES.find((item) => item.id === category)?.label || "Browse"}</h3>
              {renderProviderGrid("icon-browse-results")}
            </>
          )}
        </>
      ) : null}
      {mode === "collections" ? (
        <>
          <div className="flex flex-wrap gap-1" data-testid="icon-browse-collections">
            {ICON_COLLECTION_BROWSE.map((item) => (
              <button key={item.id} type="button" aria-pressed={collection === item.id} className="min-h-8 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" data-testid={`icon-collection-${item.id}`} onClick={() => setCollection(item.id)}>{item.label}</button>
            ))}
          </div>
          {collection ? renderProviderGrid("icon-collection-results") : <p className="text-[10px] text-white/45">Choose a collection to explore.</p>}
        </>
      ) : null}
    </div>
  );
}

function InsertionTargetChoice({ value, sectionName, onChange }: { value: "card" | "section"; sectionName: string; onChange: (value: "card" | "section") => void }) {
  return <fieldset className="mb-3 rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-2" data-testid="insertion-target-choice"><legend className="px-1 text-[9px] font-semibold uppercase tracking-wide text-[#b8ff2c]">Insert into</legend><div className="grid grid-cols-2 gap-1"><button type="button" aria-pressed={value === "card"} className="min-h-9 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => onChange("card")}>Add to Card</button><button type="button" aria-pressed={value === "section"} className="min-h-9 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => onChange("section")}>Add to {sectionName}</button></div></fieldset>;
}

function TextLibrary({ model, add, matches, targetChoice, targetSectionId }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean; targetChoice: ReactNode; targetSectionId: string | null }) {
  const [magicOpen, setMagicOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [operation, setOperation] = useState<"rewrite" | "shorten" | "expand" | "improve_clarity" | "change_tone" | "fix_grammar">("rewrite");
  const [proposals, setProposals] = useState<Array<{ targetId: string; original: string; proposed: string }>>([]);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicStatus, setMagicStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const nodes = model.selected?.composition?.nodes ?? model.config.rootComposition?.nodes ?? [];
  const selectedIds = model.selectedCompositionNodeIds ?? [];
  const textTargets = textDescendantsInScope(nodes, selectedIds.length ? selectedIds : [], { includeNestedComponentText: false });
  const propose = async () => {
    setMagicError(null);
    const targets = textTargets.length
      ? textTargets.map((node) => ({ id: node.id, text: String(node.props.text || ""), role: node.name || "Text" }))
      : prompt.trim()
        ? [{ id: "draft", text: prompt.trim(), role: "Draft" }]
        : [];
    if (!targets.length) {
      setMagicError("Select text or describe what the copy should say.");
      setMagicStatus("error");
      return;
    }
    setMagicStatus("loading");
    try {
      const response = await fetch("/api/creative/magic-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          coordinated: textTargets.length > 1,
          targets: targets.map((target) => ({
            ...target,
            text: target.id === "draft" ? target.text : (prompt.trim() ? `${prompt.trim()}\n\n${target.text}` : target.text),
          })),
        }),
      });
      const data = await response.json() as {
        ok?: boolean;
        message?: string;
        code?: string;
        proposals?: Array<{ targetId: string; original: string; proposed: string }>;
      };
      if (!response.ok || !data.ok) {
        setMagicError(data.message || "Magic Write is unavailable.");
        setMagicStatus("error");
        setProposals([]);
        return;
      }
      setProposals(data.proposals || []);
      setMagicStatus("ready");
    } catch {
      setMagicError("Magic Write request failed. Retry when the provider is available.");
      setMagicStatus("error");
      setProposals([]);
    }
  };
  const applyProposals = () => {
    if (!proposals.length) return;
    const composition = model.selected?.composition ?? model.config.rootComposition;
    if (!composition) return;
    const map = new Map(proposals.map((item) => [item.targetId, item.proposed]));
    if (map.has("draft")) {
      add("text", { text: map.get("draft"), fontSize: 18, fontWeight: 500, aiAuthored: true });
    } else {
      for (const proposal of proposals) {
        const node = composition.nodes.find((candidate) => candidate.id === proposal.targetId);
        if (!node) continue;
        model.patchCompositionNode(
          proposal.targetId,
          { props: { ...node.props, text: proposal.proposed, aiAuthored: true } },
          "Applied Magic Write"
        );
      }
    }
    setProposals([]);
    setMagicStatus("idle");
  };
  const insertCombination = (combination: (typeof STARTER_TEXT_COMBINATIONS)[number]) => {
    model.onAddObjects?.(combination.lines.map((line, index) => ({
      kind: "text",
      initialProps: {
        text: line.text,
        fontSize: line.fontSize,
        fontWeight: line.fontWeight,
        fontFamily: line.fontFamily,
        letterSpacingEm: line.letterSpacingEm,
        textAlign: "center",
        color: line.color,
        gradientFill: line.color ? undefined : combination.style,
        ...(combination.effects || {}),
        combinationId: combination.id,
        combinationOrder: index,
        yNudge: line.yOffset,
      },
    })), targetSectionId, `Added ${combination.label} Text combination`);
  };
  return (
    <div className="space-y-3" data-testid="card-text-library">
      {targetChoice}
      <input type="search" aria-label="Search fonts and combinations" placeholder="Search fonts and combinations" className="h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-xs" />
      <button type="button" className="min-h-11 w-full rounded-lg bg-[#b8ff2c] text-sm font-semibold text-black" onClick={() => add("text", { text: "Type here", fontSize: 20 })}>Add text box</button>
      <div className="grid grid-cols-3 gap-1">{([["heading", "Heading", 34, 800], ["subheading", "Subheading", 24, 700], ["text", "Body text", 17, 400]] as const).map(([kind, label, fontSize, fontWeight]) => <button key={label} type="button" className="min-h-10 rounded border border-white/10 px-1 text-[10px]" onClick={() => add(kind, { text: `Add ${label.toLowerCase()}`, fontSize, fontWeight })}>{label}</button>)}</div>
      <button type="button" className="min-h-11 w-full rounded-lg border border-white/15 text-sm font-semibold" data-testid="magic-write-open" onClick={() => { setMagicOpen((open) => !open); setProposals([]); setMagicError(null); setMagicStatus("idle"); }}>✦ Magic Write</button>
      {magicOpen ? (
        <section className="space-y-2 rounded-xl border border-[#b8ff2c]/30 bg-[#0b1019] p-3" data-testid="magic-write-panel">
          <p className="text-[10px] text-white/55" data-testid="magic-write-scope">{textTargets.length > 1 ? `${textTargets.length} text targets in selection` : textTargets.length === 1 ? "1 selected text target" : "No text selected — describe draft copy below"}</p>
          <div className="flex flex-wrap gap-1">
            {([["rewrite", "Rewrite"], ["shorten", "Shorten"], ["expand", "Expand"], ["improve_clarity", "Clarity"], ["change_tone", "Tone"], ["fix_grammar", "Grammar"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={operation === id} className="min-h-8 rounded border border-white/10 px-2 text-[10px] aria-pressed:border-[#b8ff2c]" onClick={() => setOperation(id)}>{label}</button>
            ))}
          </div>
          <label className="text-[10px] text-white/65">Direction / tone<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Present an offer for free fries with a $20 purchase" className="mt-1 min-h-20 w-full rounded border border-white/15 bg-black/20 p-2 text-xs" /></label>
          <button type="button" disabled={magicStatus === "loading"} className="min-h-10 w-full rounded bg-[#b8ff2c] text-xs font-semibold text-black disabled:opacity-40" data-testid="magic-write-submit" onClick={() => void propose()}>{magicStatus === "loading" ? "Writing…" : "Review result"}</button>
          {magicError ? <p className="rounded border border-amber-300/30 bg-amber-300/10 p-2 text-[10px] text-amber-100" data-testid="magic-write-error">{magicError}</p> : null}
          {proposals.length ? (
            <div className="space-y-2" data-testid="magic-write-result">
              {proposals.map((item) => (
                <div key={item.targetId} className="rounded border border-white/10 p-2" data-testid={`magic-write-proposal-${item.targetId}`}>
                  <p className="text-[9px] uppercase text-white/40">Original</p>
                  <p className="text-[11px] text-white/70">{item.original}</p>
                  <p className="mt-2 text-[9px] uppercase text-[#b8ff2c]">Proposed</p>
                  <textarea aria-label="Editable Magic Write result" value={item.proposed} onChange={(event) => setProposals((current) => current.map((row) => row.targetId === item.targetId ? { ...row, proposed: event.target.value } : row))} className="mt-1 min-h-20 w-full rounded border border-white/15 bg-black/20 p-2 text-xs" />
                </div>
              ))}
              <p className="text-[9px] text-amber-200">AI-authored starting point. Check offer facts and legal terms before publishing.</p>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black" data-testid="magic-write-apply" onClick={applyProposals}>Apply</button>
                <button type="button" className="min-h-9 rounded border border-white/15 text-xs" data-testid="magic-write-cancel" onClick={() => { setProposals([]); setMagicStatus("idle"); }}>Cancel</button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/55">Text combinations</h3><span className="text-[9px] text-white/35">Editable objects</span></div>
      <div className="grid grid-cols-2 gap-2" data-testid="text-combination-library">{STARTER_TEXT_COMBINATIONS.filter((item) => matches(item.label)).map((combination) => <button key={combination.id} type="button" className="min-h-24 rounded-xl border border-white/10 bg-white/[.03] p-2 text-center hover:border-[#b8ff2c]/50" data-testid={`text-combination-${combination.id}`} onClick={() => insertCombination(combination)}>{combination.lines.map((line) => <span key={line.text} className="block bg-clip-text text-transparent" style={{ backgroundImage: combination.style, fontSize: Math.max(10, line.fontSize / 2), fontWeight: line.fontWeight, fontFamily: line.fontFamily }}>{line.text}</span>)}<span className="mt-2 block text-[9px] text-white/50">{combination.label}</span><span className="block text-[8px] text-white/35">{combination.structure}</span></button>)}</div>
      <p className="text-[10px] text-white/45">Brand Text styles · Saved styles · Recent · Favorites</p>
    </div>
  );
}

function CommerceComponentLibrary({ kind, model, add, matches }: { kind: "coupon" | "ticket"; model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const starter = kind === "coupon" ? STARTER_COUPON_LAYOUTS : STARTER_TICKET_LAYOUTS;
  return (
    <div className="space-y-3" data-testid={`card-${kind}-library`}>
      <div className="rounded-lg border border-white/10 p-2">
        <p className="text-[10px] font-semibold">Create with AI</p>
        <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={`Create a ${kind === "coupon" ? "high-end percentage Coupon" : "playful child admission Ticket"}`} className="mt-2 min-h-16 w-full rounded border border-white/10 bg-black/20 p-2 text-[10px]" />
        <button type="button" disabled={!aiPrompt.trim()} className="mt-2 min-h-9 w-full rounded bg-[#b8ff2c] text-xs font-semibold text-black disabled:opacity-40" onClick={() => setProposal(kind === "coupon" ? { headline: "AI OFFER STARTING POINT", offerValue: "20% OFF", visualStyle: "high gloss", aiAuthored: true } : { title: "AI EVENT PASS", event: "Owner review required", visualStyle: "neon", aiAuthored: true })}>Preview proposal</button>
        {proposal ? <div className="mt-2 rounded border border-[#b8ff2c]/25 p-2" data-testid={`ai-${kind}-proposal`}><pre className="whitespace-pre-wrap text-[9px]">{JSON.stringify(proposal, null, 2)}</pre><div className="mt-2 grid grid-cols-2 gap-1"><button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black" onClick={() => { add(kind, { ...proposal, terms: "Draft terms — review before publishing.", ownerReviewRequired: true }); setProposal(null); }}>Insert editable</button><button type="button" className="min-h-9 rounded border border-white/10 text-xs" onClick={() => setProposal(null)}>Cancel</button></div></div> : null}
      </div>
      <MediaPicker label={`Use uploaded artwork as ${kind} surface`} value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => { if (url) add(kind, { artworkSrc: url, surfaceMode: "uploaded_artwork", ownerReviewRequired: true }); }} />
      <h3 className="text-[10px] font-semibold uppercase text-white/45">Starter layouts · structurally distinct</h3>
      <div className="grid grid-cols-2 gap-2">
        {starter.filter((preset) => matches(`${preset.label} ${preset.geometry}`)).map((preset) => {
          const geometry = kind === "coupon" ? geometryFromStarter(preset) : null;
          const thumb = geometry ? couponThumbnailSignature(geometry) : { regions: [preset.geometry], label: preset.label };
          const surface = geometry ? couponSurfaceDefaults(geometry) : {};
          return (
            <button
              key={preset.id}
              type="button"
              className="min-h-32 overflow-hidden rounded-xl border border-white/10 p-0 text-left text-[#17100a] hover:ring-2 hover:ring-[#b8ff2c]"
              data-testid={`${kind}-preset-${preset.id}`}
              data-layout-geometry={preset.geometry}
              data-thumbnail-regions={thumb.regions.join(",")}
              onClick={() => {
                if (kind === "coupon" && geometry) {
                  const content = buildCouponContentComposition(geometry, `coupon-${preset.id}`, preset.props);
                  add("coupon", {
                    ...surface,
                    ...preset.props,
                    contentComposition: content,
                    terms: String(preset.props.terms || "Draft terms — review before publishing."),
                    ownerReviewRequired: true,
                  });
                  return;
                }
                add(kind, { ...preset.props, terms: "Draft terms — review before publishing.", ownerReviewRequired: true });
              }}
            >
              <div className="relative h-20 w-full" style={{ background: String(surface.gradientFill || "linear-gradient(135deg,#fcd34d,#f97316,#f43f5e)") }} data-testid={`${kind}-thumb-${preset.id}`}>
                {geometry === "perforated_stub" ? (
                  <>
                    <div className="absolute inset-y-2 left-2 right-[38%] rounded bg-black/10 p-1"><span className="text-[8px] font-black">{String(preset.props.offerValue)}</span></div>
                    <div className="absolute inset-y-1 right-[34%] w-px border-l border-dashed border-black/50" data-coupon-perforation="true" />
                    <div className="absolute inset-y-2 right-2 w-[30%] rounded bg-white/50 p-1 text-[7px] font-mono">{String(preset.props.code)}<div className="mt-1 grid h-6 place-items-center bg-white text-[6px] font-black">QR</div></div>
                  </>
                ) : geometry === "split_image" ? (
                  <>
                    <div className="absolute inset-y-0 left-0 w-[42%] bg-black/25" data-coupon-split="image" />
                    <div className="absolute inset-y-0 right-0 w-[58%] p-1" data-coupon-split="content"><span className="text-[8px] font-black">{String(preset.props.offerValue)}</span></div>
                  </>
                ) : geometry === "qr_first" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1" data-coupon-qr-first="true"><div className="grid h-10 w-10 place-items-center bg-white text-[7px] font-black">QR</div><span className="text-[8px] font-black">{String(preset.props.offerValue)}</span></div>
                ) : (
                  <div className="flex h-full flex-col justify-between p-2"><span className="text-[8px] font-black uppercase tracking-widest">{kind}</span><strong className="text-sm leading-none">{String(preset.props.offerValue || preset.props.title || preset.label)}</strong><span className="font-mono text-[8px]">{String(preset.props.code || preset.props.ticketId || "")}</span></div>
                )}
              </div>
              <div className="bg-[#0b1019] p-2 text-white"><strong className="block text-[11px] leading-none">{preset.label}</strong><span className="mt-1 block text-[8px] text-white/55">{thumb.regions.join(" · ")}</span></div>
            </button>
          );
        })}
      </div>
      <p className="text-[9px] text-white/45">Starter layouts remain fully editable. No redemption, issuance, or validation runs here.</p>
    </div>
  );
}

function ButtonLibrary({ add, matches }: { add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  return (
    <div className="space-y-3" data-testid="card-button-library">
      <p className="text-[10px] text-white/55">Structure and action starters. Glass, Neon, Metallic, and Raised live under Appearance after insertion.</p>
      <div className="grid grid-cols-2 gap-2">
        {STARTER_BUTTON_PRESETS.filter((preset) => matches(preset.label)).map((preset) => {
          const props = preset.props as Record<string, unknown>;
          const thumb = buttonPresetThumbnailStyle(props);
          return (
            <button
              key={preset.id}
              type="button"
              className="group min-h-24 rounded-lg border border-white/10 p-2 text-left hover:border-[#b8ff2c]/50"
              data-testid={`button-preset-${preset.id}`}
              data-button-structure={preset.id}
              onClick={() => add("button", { ...props, accessibleLabel: String(props.label || preset.label), trackingName: `button-${preset.id}` })}
            >
              <span
                className="flex min-h-12 items-center justify-center px-2 text-center text-[10px] font-semibold"
                style={thumb}
                data-testid={`button-preset-thumb-${preset.id}`}
              >
                {String(props.label || preset.label) || "·"}
              </span>
              <span className="mt-2 block text-[10px] text-white/75">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BadgeLibrary({ add, matches }: { add: (kind: CardElementKind, props?: Record<string, unknown>) => void; matches: (value: string) => boolean }) {
  const [wording, setWording] = useState("SALE");
  const [shapeId, setShapeId] = useState<string>("pill");
  const place = (text = wording, props: Record<string, unknown> = {}) => {
    add("badge", {
      text,
      accessibleLabel: text,
      ...badgeShapeProps(shapeId as "pill"),
      fill: "#dc2626",
      color: "#ffffff",
      ...props,
    });
  };
  return (
    <div className="space-y-3" data-testid="polished-badge-library" data-badge-catalog="shapes">
      <label className="block text-[10px] text-white/55">Wording<input value={wording} onChange={(event) => setWording(event.target.value)} className="mt-1 h-10 w-full rounded border border-white/15 bg-black/20 px-3 text-xs" /></label>
      <button type="button" disabled={!wording.trim()} className="min-h-11 w-full rounded-lg bg-[#b8ff2c] text-sm font-semibold text-black disabled:opacity-40" onClick={() => place()}>Add editable Badge</button>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Shapes</h3>
      <div className="grid grid-cols-2 gap-2" data-testid="badge-shape-catalog">
        {STARTER_BADGE_SHAPES.filter((item) => matches(item.label)).map((item) => {
          const preview = badgeShapePreviewStyle(String(item.props.badgeShape), String(item.props.fill || "#94a3b8"));
          return (
            <button
              key={item.id}
              type="button"
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-white/10 p-2 text-[10px]"
              data-testid={`starter-badge-${item.id}`}
              data-badge-shape={String(item.props.badgeShape)}
              onClick={() => add("badge", { ...item.props, text: wording.trim() || String(item.props.text), accessibleLabel: wording.trim() || String(item.props.text) })}
            >
              <span aria-hidden style={{ ...preview, display: "block" }} />
              <span className="font-semibold text-white/85">{item.label}</span>
            </button>
          );
        })}
      </div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Useful starters</h3>
      <div className="grid grid-cols-2 gap-2" data-testid="badge-composition-catalog">
        {STARTER_BADGE_COMPOSITIONS.filter((item) => matches(item.label)).map((item) => {
          const preview = badgeShapePreviewStyle(String(item.props.badgeShape), String(item.props.fill || "#94a3b8"));
          return (
            <button
              key={item.id}
              type="button"
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 p-2 text-[10px]"
              data-testid={`starter-badge-composition-${item.id}`}
              onClick={() => add("badge", { ...item.props, accessibleLabel: String(item.props.text) })}
            >
              <span
                aria-hidden
                className="grid place-items-center px-2 text-[9px] font-bold"
                style={{ ...preview, color: String(item.props.color || "#fff"), width: 72, height: 32 }}
              >
                {String(item.props.text)}
              </span>
              <span className="font-semibold text-white/85">{item.label}</span>
            </button>
          );
        })}
      </div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Wording presets</h3>
      <div className="grid grid-cols-2 gap-1">{BADGE_WORDING.filter(matches).map((word) => <button key={word} type="button" className="min-h-9 rounded border border-white/10 text-[9px]" onClick={() => { setWording(word); place(word); }}>{word}</button>)}</div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Shape picker</h3>
      <div className="grid grid-cols-3 gap-2">
        {BADGE_SHAPE_DEFS.filter((def) => def.id !== "square" && matches(def.label)).map((def) => {
          const preview = badgeShapePreviewStyle(def.id, "#94a3b8");
          return (
            <button
              key={def.id}
              type="button"
              aria-pressed={shapeId === def.id}
              className="flex min-h-14 flex-col items-center justify-center gap-1 border border-white/10 px-1 text-[9px] aria-pressed:border-[#b8ff2c]"
              data-testid={`badge-library-shape-${def.id}`}
              onClick={() => setShapeId(def.id)}
            >
              <span aria-hidden style={{ ...preview, display: "block", width: 36, height: 22 }} />
              {def.label}
            </button>
          );
        })}
      </div>
      <p className="text-[9px] text-white/45">Gold, Glass, and Metal live under Appearance after insertion — not as insertion species.</p>
    </div>
  );
}

function ProjectsDrawer({ model, matches }: { model: CardEditorLiveModel; matches: (value: string) => boolean }) {
  return <div className="space-y-3" data-testid="card-projects-drawer"><p className="text-[10px] text-white/55">Creative documents and related editable variations. Assets remain in Assets.</p><div className="flex gap-1 text-[9px]"><span className="rounded-full border border-white/10 px-2 py-1">Tap Card</span><span className="rounded-full border border-white/10 px-2 py-1">Recent</span><span className="rounded-full border border-white/10 px-2 py-1">Variations</span></div>{model.documents.filter((document) => matches(document.name)).map((document) => <button type="button" key={document.id} aria-pressed={document.id === model.activeDocumentId} className="flex min-h-16 w-full items-center gap-2 rounded-lg border border-white/10 p-2 text-left aria-pressed:border-[#b8ff2c]" onClick={() => void model.openDocument(document.id)}><span className="grid h-12 w-10 shrink-0 place-items-center rounded bg-gradient-to-b from-slate-700 to-slate-950 text-[8px]">CARD</span><span className="min-w-0"><span className="block truncate text-xs">{document.name}</span><span className="text-[9px] text-white/45">{document.type === "MAIN_CARD" ? "Tap Card" : "Related variation"}</span></span></button>)}</div>;
}

function AiAssistDrawer({ model }: { model: CardEditorLiveModel }) {
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<{ selection: CardEditorLiveModel["selectionRef"]; patch: Record<string, unknown> } | null>(null);
  const selection = model.selectionRef;
  const scope = selection.objectKind === "root_surface" ? "Current Tap Card" : `${selection.objectKind.replaceAll("_", " ")} · ${selection.objectId}`;
  const propose = () => {
    if (selection.objectKind === "element") setProposal({ selection, patch: { props: { fill: "#b8860b", boxGlow: 14, glowColor: "#facc15" } } });
    else if (selection.objectKind === "section") setProposal({ selection, patch: { surfaceRadiusPx: 24, surfaceShadow: "soft", surfaceGapPx: 16 } });
    else setProposal({ selection, patch: {} });
  };
  return <div className="space-y-3" data-testid="card-ai-assist-drawer"><div className="rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-2"><p className="text-[9px] font-semibold uppercase text-[#b8ff2c]">Active scope</p><p className="mt-1 text-xs" data-testid="ai-active-scope">{scope}</p></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe a visual change" className="min-h-28 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-xs" /><button type="button" disabled={!prompt.trim()} className="min-h-10 w-full rounded bg-[#b8ff2c] px-2 text-xs font-semibold text-black disabled:opacity-40" onClick={propose}>Preview proposal</button>{proposal ? <section className="rounded-lg border border-white/10 p-3" data-testid="ai-proposal" data-proposal-object={proposal.selection.objectId}><h3 className="text-xs font-semibold">Proposed canonical changes</h3><p className="mt-1 text-[10px] text-white/55">Visual properties only. Action, destination, QR, Campaign, tracking, accessibility, data binding, consent, and publication are preserved.</p><pre className="mt-2 overflow-auto rounded bg-black/30 p-2 text-[9px]">{JSON.stringify(proposal.patch, null, 2)}</pre><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" className="min-h-10 rounded bg-[#b8ff2c] text-xs font-semibold text-black" onClick={() => { const proposalSelection = proposal.selection; if (proposalSelection.objectKind === "element" && proposal.patch.props) { const parent = proposalSelection.parentId === "card-page" ? null : model.sorted.find((section) => section.id === proposalSelection.parentId); const node = (parent?.composition?.nodes ?? model.config.rootComposition?.nodes ?? []).find((candidate) => candidate.id === proposalSelection.objectId); if (node) model.patchSelection(proposalSelection, { props: { ...node.props, ...(proposal.patch.props as Record<string, unknown>) } }, "Applied AI visual proposal"); } else model.patchSelection(proposalSelection, proposal.patch, "Applied AI visual proposal"); setProposal(null); }}>Apply</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={() => setProposal(null)}>Cancel</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={() => setProposal(null)}>Refine</button><button type="button" className="min-h-10 rounded border border-white/15 text-xs" onClick={model.onUndo} disabled={!model.canUndo}>Undo</button></div></section> : null}<p className="text-[9px] text-white/40">Development fixture proposes deterministic edits; no content is published and no customer message is sent.</p></div>;
}

function QuickToolsDrawer({ model, add }: { model: CardEditorLiveModel; add: (kind: CardElementKind, props?: Record<string, unknown>) => void }) {
  return <div className="space-y-2" data-testid="card-quick-tools"><p className="text-[10px] text-white/55">Compact commands use the same placement and mutation authority as the libraries.</p><div className="grid grid-cols-2 gap-2"><LibraryAction label="Select" description="Return to selection" onClick={() => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([]); }} /><LibraryAction label="Text" description="Place editable text" onClick={() => add("text", { text: "Type here" })} /><LibraryAction label="Quick Add Icon" description="Place default Sparkles Icon" onClick={() => add("icon", { icon: "sparkles", accessibleLabel: "Decorative icon", decorative: true })} /><LibraryAction label="Shape" description="Place a shape" onClick={() => add("decorative_graphic", { shape: "rectangle" })} /><LibraryAction label="QR" description="Place managed QR artwork" onClick={() => add("qr_image", { qrManagementState: "setup_required", accessibleLabel: "QR code setup required" })} /></div><div className="space-y-2 pt-2" data-testid="starter-component-quick-add"><h3 className="text-[10px] font-semibold uppercase text-white/45">Starter Forms</h3>{STARTER_FORM_PRESETS.map((preset) => <button key={preset.id} type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" data-testid={`starter-form-${preset.id}`} onClick={() => add("form", { ...preset.props, componentKind: "form", liveSubmission: false })}>{preset.label}</button>)}<h3 className="text-[10px] font-semibold uppercase text-white/45">Starter Containers</h3>{STARTER_CONTAINER_PRESETS.map((preset) => <button key={preset.id} type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" data-testid={`starter-container-${preset.id}`} onClick={() => add("composition", { ...preset.props, componentKind: "container", elementKind: "composition" })}>{preset.label}</button>)}<h3 className="text-[10px] font-semibold uppercase text-white/45">Starter Dividers</h3>{STARTER_DIVIDER_PRESETS.map((preset) => <button key={preset.id} type="button" className="min-h-10 w-full rounded border border-white/10 text-xs" data-testid={`starter-divider-${preset.id}`} onClick={() => add("divider", { ...preset.props })}>{preset.label}</button>)}</div><div className="space-y-1 pt-2"><button type="button" disabled className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Charts · data contract required</button><button type="button" disabled className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Captions · media required</button><button type="button" disabled={!model.mediaUploadReady} className="min-h-10 w-full rounded border border-white/10 text-xs opacity-50">Background removal · {model.mediaUploadReady ? "select an image" : "provider setup required"}</button></div></div>;
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

function LibraryAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={description}
      className="block min-h-12 w-full rounded border border-white/10 px-2 py-2 text-left hover:bg-white/5"
    >
      <span className="block text-xs text-white/80">{label}</span>
      <span className="block text-[9px] text-white/45" aria-hidden="true">{description}</span>
    </button>
  );
}
function LayersDrawer({ model }: { model: CardEditorLiveModel }) {
  const selectNode = (parentId: string | null, nodeId: string, additive: boolean) => {
    const sameParent = (parentId === null && !model.selected) || model.selected?.id === parentId;
    const current = sameParent ? model.selectedCompositionNodeIds ?? [] : [];
    model.setSelectedId(parentId);
    model.setSelectedCompositionNodeIds?.(
      additive
        ? (current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId])
        : [nodeId]
    );
  };
  const rootNodes = [...ensureRootComposition(model.config).nodes].sort((a, b) => b.zIndex - a.zIndex);
  const rootTopLevel = rootNodes.filter((node) => !node.props.containerId);
  return <div className="space-y-2" data-testid="card-layers-drawer">
    <p className="text-[9px] text-white/45">Authoritative object tree · topmost layer first · Shift-click for multi-select</p>
    <div className="rounded-md border border-white/10 p-1" data-layer-container="card-root">
      <LayerButton active={Boolean(model.explicitCardRootSelected)} label="Card root" onClick={() => { if (model.selectCardRoot) model.selectCardRoot(); else { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([]); } }} />
      {rootTopLevel.map((node) => <LayerObjectRow key={node.id} model={model} node={node} parentId={null} siblings={rootNodes} active={!model.selected && Boolean(model.selectedCompositionNodeIds?.includes(node.id))} onSelect={selectNode} />)}
    </div>
    {model.sorted.map((section) => <div key={section.id} className="rounded-md border border-white/10 p-1" data-layer-container={section.id}>
      <div className="flex items-center gap-1">
        <LayerButton active={model.selected?.id === section.id && !model.selectedCompositionNodeIds?.length} label={section.label || section.type} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }} />
        <LayerIconButton label={section.enabled === false ? "Show Section" : "Hide Section"} onClick={() => model.toggleSectionVisible(section.id)}>{section.enabled === false ? <EyeOff /> : <Eye />}</LayerIconButton>
        <LayerIconButton label={section.locked ? "Unlock Section" : "Lock Section"} onClick={() => model.toggleSectionLocked(section.id)}>{section.locked ? <Lock /> : <Unlock />}</LayerIconButton>
        <LayerIconButton label="Duplicate Section" onClick={() => model.duplicateSection(section.id)}><Copy /></LayerIconButton>
        <LayerIconButton label="Delete Section" onClick={() => model.deleteSection(section.id)} danger><Trash2 /></LayerIconButton>
      </div>
      {[...(section.composition?.nodes ?? [])].sort((a, b) => b.zIndex - a.zIndex).map((node) => <LayerObjectRow key={node.id} model={model} node={node} parentId={section.id} active={model.selected?.id === section.id && Boolean(model.selectedCompositionNodeIds?.includes(node.id))} onSelect={selectNode} />)}
    </div>)}
  </div>;
}

function LayerObjectRow({ model, node, parentId, siblings, active, onSelect }: { model: CardEditorLiveModel; node: CreativeCompositionNode; parentId: string | null; siblings?: CreativeCompositionNode[]; active: boolean; onSelect: (parentId: string | null, nodeId: string, additive: boolean) => void }) {
  const storedContent = node.props.contentComposition as { nodes?: CreativeCompositionNode[] } | undefined;
  const nested = node.primitive === "button" ? buttonContent(node.props, node.id).nodes : Array.isArray(storedContent?.nodes) ? storedContent.nodes : [];
  const containerChildren = (siblings || [])
    .filter((candidate) => String(candidate.props.containerId || "") === node.id)
    .sort((left, right) => right.zIndex - left.zIndex);
  const label = node.name || String(node.props.elementKind || node.primitive);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(label);
  const commitName = () => {
    const next = draftName.trim();
    if (next && next !== label) model.patchCompositionNode(node.id, { name: next }, `Renamed ${label}`);
    else setDraftName(label);
    setRenaming(false);
  };
  const enterContentAndSelectChild = (childId: string, childLabel: string, selectChildOnCanvas: boolean) => {
    onSelect(parentId, selectChildOnCanvas ? childId : node.id, false);
    model.patchCompositionNode(node.id, {
      props: {
        ...node.props,
        contentEditing: true,
        selectionMode: "content",
        activeButtonContentNodeId: childId,
        activeComponentContentNodeId: childId,
      },
    }, `Selected ${childLabel}`);
  };
  return <div className="ml-2" data-testid={`layer-object-${node.id}`} data-layer-object-id={node.id} data-layer-primitive={node.primitive} data-element-kind={String(node.props.elementKind || node.primitive)} data-component-kind={String(node.props.componentKind || "") || undefined}>
    <div className={cn("flex items-center gap-0.5 rounded", active ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/65 hover:bg-white/5")}>
      {renaming ? <input autoFocus aria-label={`Rename ${label}`} value={draftName} className="h-8 min-w-0 flex-1 rounded border border-[#b8ff2c]/50 bg-black/30 px-2 text-[10px]" onChange={(event) => setDraftName(event.target.value)} onBlur={commitName} onKeyDown={(event) => { if (event.key === "Enter") commitName(); if (event.key === "Escape") { setDraftName(label); setRenaming(false); } }} /> : <button type="button" data-testid={`layer-object-select-${node.id}`} aria-pressed={active} className="min-h-9 min-w-0 flex-1 truncate px-2 text-left text-[10px]" onDoubleClick={() => setRenaming(true)} onClick={(event) => onSelect(parentId, node.id, event.shiftKey || event.metaKey || event.ctrlKey)}>{label}</button>}
      <LayerIconButton label={node.visible === false ? `Show ${label}` : `Hide ${label}`} onClick={() => model.patchCompositionNode(node.id, { visible: node.visible === false }, `${node.visible === false ? "Showed" : "Hid"} ${label}`)}>{node.visible === false ? <EyeOff /> : <Eye />}</LayerIconButton>
      <LayerIconButton label={node.locked ? `Unlock ${label}` : `Lock ${label}`} onClick={() => model.patchCompositionNode(node.id, { locked: !node.locked }, `${node.locked ? "Unlocked" : "Locked"} ${label}`)}>{node.locked ? <Lock /> : <Unlock />}</LayerIconButton>
      <LayerIconButton label={`Rename ${label}`} onClick={() => setRenaming(true)}><Pencil /></LayerIconButton>
      <LayerIconButton label={`Move ${label} forward`} onClick={() => model.patchCompositionNode(node.id, { zIndex: node.zIndex + 1 }, `Moved ${label} forward`)}><ArrowUp /></LayerIconButton>
      <LayerIconButton label={`Move ${label} backward`} onClick={() => model.patchCompositionNode(node.id, { zIndex: Math.max(0, node.zIndex - 1) }, `Moved ${label} backward`)}><ArrowDown /></LayerIconButton>
      <LayerIconButton label={`Duplicate ${label}`} onClick={() => model.duplicateElements?.([node.id], parentId)}><Copy /></LayerIconButton>
      <LayerIconButton label={`Delete ${label}`} onClick={() => model.deleteElements?.([node.id], parentId)} danger><Trash2 /></LayerIconButton>
    </div>
    {containerChildren.length ? <div className="mb-1 ml-3 border-l border-white/10 pl-1" data-container-children={node.id}>{containerChildren.map((child) => {
      const childLabel = child.name || String(child.props.presetChildRole || child.props.elementKind || child.primitive);
      const childActive = !model.selected && Boolean(model.selectedCompositionNodeIds?.includes(child.id));
      return <button key={child.id} type="button" aria-pressed={childActive} className={cn("block min-h-7 w-full truncate rounded px-2 text-left text-[9px]", childActive ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/45 hover:bg-white/5 hover:text-white/75")} data-nested-object-id={child.id} onClick={() => enterContentAndSelectChild(child.id, childLabel, true)}>↳ {childLabel}</button>;
    })}</div> : null}
    {nested.length ? <div className="mb-1 ml-3 border-l border-white/10 pl-1" data-nested-composition={node.id}>{nested.map((child) => <button key={child.id} type="button" className="block min-h-7 w-full truncate rounded px-2 text-left text-[9px] text-white/45 hover:bg-white/5 hover:text-white/75" data-nested-object-id={child.id} onClick={() => enterContentAndSelectChild(child.id, String(child.name || child.props.buttonContentRole || child.props.componentContentRole || child.primitive), false)}>↳ {child.name || String(child.props.buttonContentRole || child.props.componentContentRole || child.primitive)}</button>)}</div> : null}
  </div>;
}

function LayerIconButton({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={cn("grid h-8 w-7 shrink-0 place-items-center rounded hover:bg-white/10 [&_svg]:h-3 [&_svg]:w-3", danger && "text-red-300")} onClick={(event) => { event.stopPropagation(); onClick(); }}>{children}</button>;
}

function LayerButton({ label, active, onClick }: { label: string; active: boolean; onClick: (additive: boolean) => void }) { return <button type="button" aria-pressed={active} className={cn("min-h-9 w-full truncate rounded px-2 text-left text-[10px]", active ? "bg-[#b8ff2c]/10 text-[#b8ff2c]" : "text-white/65 hover:bg-white/5")} onClick={(event) => onClick(event.shiftKey || event.metaKey || event.ctrlKey)}>{String(label)}</button>; }
