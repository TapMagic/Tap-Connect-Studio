"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowLeft, Box, ChevronRight, GripVertical, ImageIcon, Layers3, LockKeyhole, Minus, MousePointer2, Search, Sparkles, SquareStack, Type, X } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { StandardButtonPreview } from "./standard-button-preview";
import type { StudioDrawerEvent, StudioDrawerState } from "@/lib/fusion/creative-studio/reconstitution/drawer-controller";
import type { BrandPreviewContext } from "@/lib/fusion/creative-studio/reconstitution/standard-button-catalog";
import { discoverStandardButtons, standardButtonDiscoveryContext, standardButtonDiscoveryResources, type StandardButtonDiscoveryApplication } from "@/lib/fusion/creative-studio/reconstitution/standard-button-discovery";
import type { StudioDiscoveryResource } from "@/lib/fusion/creative-studio/platform/discovery";
import type { StudioRecentResource } from "@/lib/fusion/creative-studio/platform/activity";
import { findStudioButtonFamily, visibleStudioButtonFamilies, type StudioButtonFamilyCatalog, type StudioButtonFamilyDiscoveryEntry, type StudioButtonFamilyResource } from "@/lib/fusion/creative-studio/platform/button-family-discovery";
import type { StudioCatalogConsumerAdapter } from "@/lib/fusion/creative-studio/platform/catalog-browser";
import type { StudioWorkspaceComposition } from "@/lib/fusion/creative-studio/platform/adaptive-workspace";
import { cn } from "@/lib/utils";
import { curatedCompoundObjects } from "@/lib/fusion/creative-studio/platform/curated-compound-object";
import { compositionChildren, hasCompositionParentAuthority } from "@/lib/fusion/card/composition-parent-authority";

export type StandardButtonDiscoveryResource = StudioDiscoveryResource<StandardButtonDiscoveryApplication, Record<string, unknown>>;

export function StudioDiscoveryDrawer({ state, dispatch, model, brand, familyCatalog, recents, recentsState, onUseResource, catalogAdapter, workspaceComposition, onCompleteDiscovery }: {
  state: StudioDrawerState;
  dispatch: (event: StudioDrawerEvent) => void;
  model: CardEditorLiveModel | null;
  brand: BrandPreviewContext;
  familyCatalog: StudioButtonFamilyCatalog;
  recents: StudioRecentResource[];
  recentsState: "loading" | "ready" | "error";
  onUseResource: (resource: StandardButtonDiscoveryResource) => void;
  catalogAdapter: StudioCatalogConsumerAdapter;
  workspaceComposition: StudioWorkspaceComposition;
  onCompleteDiscovery: () => void;
}) {
  if (state.mode === "closed" || !state.activeRailId) return null;
  const path = state.path;
  const isButtonsHome = state.activeRailId === "add" && path.join("/") === "buttons";
  const presentationFamily = path[0] === "buttons" && (path[1] === "standard" || path[1] === "brand") ? path[1] : null;
  const governedFamily = path[0] === "buttons" && path[1] === "family" && path[2] ? findStudioButtonFamily(familyCatalog, path[2]) : null;
  const isSaved = path.join("/") === "buttons/saved";
  const title = state.activeRailId === "layers" ? "Outline" : governedFamily?.label ?? (presentationFamily === "brand" ? "Brand Buttons" : presentationFamily === "standard" ? "Standard Buttons" : isSaved ? "Saved Buttons" : isButtonsHome ? "Buttons" : "Add");

  return <aside className={cn("absolute inset-y-0 left-0 z-40 flex w-[min(390px,calc(100vw-20px))] flex-col bg-[#0b111b]/98 text-white shadow-[18px_0_50px_rgba(0,0,0,.32)] backdrop-blur-xl md:relative md:z-10 md:shrink-0", workspaceComposition === "discover" ? "md:w-[clamp(420px,46vw,760px)]" : workspaceComposition === "organize" ? "md:w-[320px]" : "md:w-[360px]")} aria-label={`${title} drawer`} data-testid="studio-discovery-drawer" data-drawer-mode={state.mode} data-workspace-composition={workspaceComposition} data-catalog-adapter={catalogAdapter.id}>
    <header className="flex min-h-14 items-center gap-2 px-3">
      {path.length ? <button type="button" onClick={() => dispatch({ type: "BACK" })} className="grid h-9 w-9 place-items-center rounded-full text-white/68 hover:bg-white/8 hover:text-white" aria-label="Back" data-testid="studio-drawer-back"><ArrowLeft className="h-4 w-4" /></button> : null}
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold tracking-tight">{title}</p>{path.length > 1 ? <p className="truncate text-[10px] text-white/38">Add / Buttons / {title}</p> : null}</div>
      <span hidden data-tapit-slot="discovery" aria-hidden>•••</span>
      <button type="button" onClick={() => dispatch({ type: "CLOSE" })} className="grid h-9 w-9 place-items-center rounded-full text-white/68 hover:bg-white/8 hover:text-white" aria-label="Close drawer" data-testid="studio-drawer-close"><X className="h-4 w-4" /></button>
    </header>
    <MotionSurface pathKey={`${state.activeRailId}:${path.join("/")}`} depth={path.length}>
      {state.activeRailId === "add" && path.length === 0 ? <AddHome dispatch={dispatch} model={model} /> : null}
      {isButtonsHome ? <ButtonDiscoveryHome state={state} dispatch={dispatch} brand={brand} familyCatalog={familyCatalog} recents={recents} recentsState={recentsState} onUseResource={onUseResource} /> : null}
      {presentationFamily ? <PresentationLibrary family={presentationFamily} state={state} dispatch={dispatch} brand={brand} onUseResource={onUseResource} /> : null}
      {governedFamily ? <GovernedFamilyView family={governedFamily} model={model} onCompleteDiscovery={onCompleteDiscovery} /> : null}
      {isSaved ? <SavedFamilyView /> : null}
      {state.activeRailId === "layers" ? <OutlineView model={model} /> : null}
    </MotionSurface>
  </aside>;
}

function MotionSurface({ pathKey, depth, children }: { pathKey: string; depth: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const previousDepth = useRef(depth);
  useEffect(() => {
    const element = ref.current;
    const from = depth < previousDepth.current ? -12 : 12;
    previousDepth.current = depth;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate([{ opacity: 0.55, transform: `translateX(${from}px)` }, { opacity: 1, transform: "translateX(0)" }], { duration: 145, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [depth, pathKey]);
  return <div ref={ref} className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}

function AddHome({ dispatch, model }: { dispatch: (event: StudioDrawerEvent) => void; model: CardEditorLiveModel | null }) {
  const authority = hasCompositionParentAuthority(model?.config.rootComposition);
  const selected = model?.selectedCompositionNode;
  const parentId = authority && selected?.compositionKind === "container" ? selected.id : null;
  const targetLabel = parentId ? selected?.name || "selected Container" : "Card Surface";
  const addModule = (kind: "text" | "image" | "button" | "divider") => {
    if (kind === "button") {
      dispatch({ type: "NAVIGATE", path: ["buttons"] });
      return;
    }
    model?.onAddCompositionModule?.(kind, parentId);
  };
  return <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2">
    <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#b8ff2c]">Add to your Card</p>{authority ? <span className="rounded-full bg-white/6 px-2 py-1 text-[9px] text-white/45" data-testid="studio-add-target">Into {targetLabel}</span> : null}</div>
    {authority ? <>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.14em] text-white/45">Modules</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <AddTile label="Text" detail="Editable copy" icon={<Type />} onClick={() => addModule("text")} testId="studio-add-text" />
        <AddTile label="Image" detail="From Assets" icon={<ImageIcon />} onClick={() => addModule("image")} testId="studio-add-image" />
        <AddTile label="Button" detail="Choose a style" icon={<span className="text-[10px] font-black">CTA</span>} onClick={() => addModule("button")} testId="studio-add-buttons" />
        <AddTile label="Divider" detail="Visual separator" icon={<Minus />} onClick={() => addModule("divider")} testId="studio-add-divider" />
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.14em] text-white/45">Containers</p>
      <p className="mt-1 text-[11px] leading-4 text-white/38">Optional flow regions. Modules remain independently editable.</p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="studio-container-treatment-gallery">
        <TreatmentTile label="Transparent" treatment="transparent" onClick={() => model?.onAddCompositionContainer?.("transparent")} />
        <TreatmentTile label="Solid / Brand" treatment="solid" onClick={() => model?.onAddCompositionContainer?.("solid")} />
        <TreatmentTile label="Smoked Glass" treatment="smoked_glass" onClick={() => model?.onAddCompositionContainer?.("smoked_glass")} />
        <TreatmentTile label="Image-backed" treatment="image" onClick={() => model?.onAddCompositionContainer?.("image")} />
      </div>
    </> : <button type="button" onClick={() => dispatch({ type: "NAVIGATE", path: ["buttons"] })} className="group mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/[.055] p-4 text-left transition hover:bg-white/[.085]" data-testid="studio-add-buttons"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#d8ff82] to-[#7ee787] text-sm font-black text-[#07100a] shadow-[0_10px_28px_rgba(184,255,44,.15)]">CTA</span><span className="min-w-0 flex-1"><strong className="block text-sm">Buttons</strong><span className="mt-1 block text-xs leading-5 text-white/48">Standard, Brand, and governed Signature families</span></span><ChevronRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/70" /></button>}
    <p className="mt-5 text-xs leading-5 text-white/38">Only customer-ready jobs are interactive. Structural furniture stays owned by its recipe.</p>
  </div>;
}

function AddTile({ label, detail, icon, onClick, testId }: { label: string; detail: string; icon: ReactNode; onClick: () => void; testId: string }) { return <button type="button" onClick={onClick} className="group rounded-2xl bg-white/[.05] p-3 text-left transition hover:bg-white/[.085]" data-testid={testId}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b8ff2c]/12 text-[#d8ff82] [&_svg]:h-4 [&_svg]:w-4">{icon}</span><strong className="mt-3 block text-xs">{label}</strong><span className="mt-1 block text-[10px] text-white/38">{detail}</span></button>; }

function TreatmentTile({ label, treatment, onClick }: { label: string; treatment: "transparent" | "solid" | "smoked_glass" | "image"; onClick: () => void }) { const style = treatment === "transparent" ? "border border-dashed border-white/25 bg-transparent" : treatment === "solid" ? "bg-[#203322]" : treatment === "smoked_glass" ? "border border-white/20 bg-white/10 backdrop-blur" : "bg-[linear-gradient(135deg,#243d2b,#657b59,#17201a)]"; return <button type="button" onClick={onClick} className="rounded-2xl bg-white/[.04] p-2 text-left transition hover:bg-white/[.08]" data-testid={`studio-add-container-${treatment}`}><span className={cn("grid h-16 place-items-center rounded-xl", style)}><SquareStack className="h-5 w-5 text-white/72" /></span><strong className="mt-2 block px-1 text-[10px]">{label}</strong></button>; }

function ButtonDiscoveryHome({ state, dispatch, brand, familyCatalog, recents, recentsState, onUseResource }: { state: StudioDrawerState; dispatch: (event: StudioDrawerEvent) => void; brand: BrandPreviewContext; familyCatalog: StudioButtonFamilyCatalog; recents: StudioRecentResource[]; recentsState: "loading" | "ready" | "error"; onUseResource: (resource: StandardButtonDiscoveryResource) => void }) {
  const allResources = standardButtonDiscoveryResources(brand).filter((resource) => resource.governance.readiness === "ready");
  const recentPresets = recents.flatMap((recent) => { const resource = allResources.find((candidate) => candidate.ref.provider === recent.resource.provider && candidate.ref.resourceId === recent.resource.resourceId); return resource ? [resource] : []; });
  const query = state.query.trim().toLowerCase();
  const matchingResources = query ? allResources.filter((resource) => resource.search.text.toLowerCase().includes(query)) : [];
  const visibleFamilies = visibleStudioButtonFamilies(familyCatalog);
  const matchingFamilies = query ? visibleFamilies.filter((entry) => `${entry.label} ${entry.description}`.toLowerCase().includes(query)) : [];
  return <div className="flex min-h-0 flex-1 flex-col"><SearchField state={state} dispatch={dispatch} placeholder="Search Buttons and families" /><div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" data-testid="studio-button-family-home">
    {query ? <section className="pt-4"><SectionHeading label="Search results" />{matchingFamilies.length || matchingResources.length ? <div className="space-y-4">{matchingFamilies.length ? <div className="grid grid-cols-2 gap-2">{matchingFamilies.map((entry) => <FamilyCard key={entry.id} family={entry} onOpen={() => openFamily(entry, dispatch)} />)}</div> : null}{matchingResources.length ? <div className="grid grid-cols-2 gap-2">{matchingResources.map((resource) => <PresetCard key={resource.ref.resourceId} resource={resource} compact onUse={onUseResource} />)}</div> : null}</div> : <EmptyState title="No matching Buttons" detail="Try Call, Brand, Cabinet Noir, Arc Ember, or CTA." />}</section> : <>
      <section className="pt-4"><SectionHeading label="Recently Used" trailing={recentsState === "error" ? "Unavailable" : undefined} />{recentsState === "loading" ? <div className="h-20 animate-pulse rounded-2xl bg-white/5" aria-label="Loading Recently Used" /> : null}{recentsState === "ready" && recentPresets.length === 0 ? <p className="rounded-2xl bg-white/[.035] px-3 py-3 text-xs text-white/38">Buttons you place will appear here.</p> : null}{recentPresets.length ? <div className="flex gap-2 overflow-x-auto pb-1">{recentPresets.slice(0, 4).map((resource) => <div key={`recent-${resource.ref.resourceId}`} className="w-[152px] shrink-0"><PresetCard resource={resource} compact onUse={onUseResource} /></div>)}</div> : null}</section>
      <section className="mt-6"><SectionHeading label="Recommended for your Card" /><div className="grid grid-cols-2 gap-2">{allResources.slice(0, 3).map((resource) => <PresetCard key={resource.ref.resourceId} resource={resource} compact onUse={onUseResource} />)}</div></section>
      <section className="mt-6"><SectionHeading label="Families" /><div className="grid grid-cols-2 gap-2">{visibleFamilies.map((entry) => <FamilyCard key={entry.id} family={entry} onOpen={() => openFamily(entry, dispatch)} />)}</div></section>
    </>}
  </div></div>;
}

function openFamily(family: StudioButtonFamilyDiscoveryEntry, dispatch: (event: StudioDrawerEvent) => void) {
  if (family.id === "standard" || family.id === "brand") dispatch({ type: "NAVIGATE", path: ["buttons", family.id] });
  else if (family.id === "saved") dispatch({ type: "NAVIGATE", path: ["buttons", "saved"] });
  else dispatch({ type: "NAVIGATE", path: ["buttons", "family", family.id] });
}

function FamilyCard({ family, onOpen }: { family: StudioButtonFamilyDiscoveryEntry; onOpen: () => void }) {
  const status = family.readiness === "ready" ? "Ready" : family.readiness === "preview" ? "Preview" : family.readiness === "restricted" ? "Restricted" : "Empty";
  return <button type="button" onClick={onOpen} className="group min-h-[138px] overflow-hidden rounded-2xl bg-white/[.045] text-left transition hover:bg-white/[.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ff2c]" data-testid={`studio-button-family-${family.id}`}><span className="relative flex h-[78px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#151e2d] to-[#090e16]">{family.previewSrc ? <img src={family.previewSrc} alt={family.previewAlt || ""} className="h-full w-full object-contain p-2" /> : <span className={cn("grid h-12 w-12 place-items-center rounded-2xl text-xs font-black", family.id === "brand" ? "bg-[#b8ff2c] text-[#07100a]" : family.id === "saved" ? "bg-white/8 text-white/45" : "border border-white/12 text-white/72")}>{family.id === "brand" ? "BR" : family.id === "saved" ? "♡" : "CTA"}</span>}<span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] text-white/65 backdrop-blur">{status}</span></span><span className="block px-3 py-2.5"><strong className="block text-xs">{family.label}</strong><span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-white/42">{family.description}</span></span></button>;
}

function PresentationLibrary({ family, state, dispatch, brand, onUseResource }: { family: "standard" | "brand"; state: StudioDrawerState; dispatch: (event: StudioDrawerEvent) => void; brand: BrandPreviewContext; onUseResource: (resource: StandardButtonDiscoveryResource) => void }) {
  const visible = discoverStandardButtons(brand, standardButtonDiscoveryContext({ query: state.query })).resources.filter((resource) => family === "brand" ? resource.application.presetId === "brand-primary" : resource.application.presetId !== "brand-primary");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pathKey = `${state.activeRailId || "closed"}:${state.path.join("/")}`;
  useEffect(() => { if (scrollerRef.current) scrollerRef.current.scrollTop = state.scrollOffset; }, [pathKey, state.scrollOffset]);
  return <div className="flex min-h-0 flex-1 flex-col" data-testid="studio-standard-button-gallery">{state.placementMode === "apply" ? <div className="mx-3 mb-2 rounded-xl bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"><div className="flex items-center justify-between gap-2"><span>Choose a new presentation. Content and Action stay intact.</span><button type="button" onClick={() => dispatch({ type: "END_APPLY" })} className="font-semibold">Cancel</button></div></div> : null}<SearchField state={state} dispatch={dispatch} placeholder={`Search ${family === "brand" ? "Brand" : "Standard"} Buttons`} /><div ref={scrollerRef} onScroll={(event) => dispatch({ type: "SET_SCROLL", scrollOffset: event.currentTarget.scrollTop })} className="min-h-0 flex-1 overflow-y-auto px-3 pb-6"><section className="pt-4"><SectionHeading label={state.query ? "Results" : family === "brand" ? "Built from your Brand" : "Standard Button styles"} />{visible.length ? <div className="grid grid-cols-1 gap-2">{visible.map((resource) => <PresetCard key={resource.ref.resourceId} resource={resource} onUse={onUseResource} />)}</div> : <EmptyState title={`No matching ${family === "brand" ? "Brand" : "Standard"} Buttons`} detail="Try a user job such as primary, Call, or section CTA." />}</section><p className="mt-5 text-[10px] leading-4 text-white/35">Only presets that pass the visual catalog quality gate are shown. Two weaker concepts remain hidden.</p></div></div>;
}

function GovernedFamilyView({ family, model, onCompleteDiscovery }: { family: StudioButtonFamilyDiscoveryEntry; model: CardEditorLiveModel | null; onCompleteDiscovery: () => void }) {
  const insert = (resource: StudioButtonFamilyResource) => {
    if (resource.classification !== "assembly-starting-point" || !resource.recipeId) return;
    const layoutMode = resource.tags.includes("standalone") ? "standalone" : resource.tags.includes("twin-rail") ? "twin-rail" : "single-stack";
    const result = model?.onInsertCuratedAssembly?.(family.id, layoutMode);
    if (result && !result.ok) model?.notify?.(result.message);
    if (result?.ok) onCompleteDiscovery();
  };
  // Curated families are discovered as finished systems. Their certified
  // construction inventory remains available to the recipe/Inspector, but
  // is never presented as loose Host-placement content in the main catalog.
  const visibleSections = family.assembly?.supported
    ? family.sections
        .map((section) => ({ ...section, resources: section.resources.filter((resource) => resource.classification === "assembly-starting-point") }))
        .filter((section) => section.resources.length > 0)
    : family.sections;
  return <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" data-testid={`studio-governed-family-${family.id}`}><div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-white/[.075] to-white/[.02] p-4"><div className="flex items-center gap-3">{family.previewSrc ? <img src={family.previewSrc} alt={family.previewAlt || ""} className="h-20 w-28 object-contain" /> : null}<div><span className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b8ff2c]">Governed family</span><h3 className="mt-1 text-lg font-semibold">{family.label}</h3><p className="mt-1 text-xs leading-5 text-white/48">{family.description}</p></div></div>{!family.available ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-300/10 px-3 py-2 text-xs text-amber-100"><LockKeyhole className="h-4 w-4" />Visible for discovery; entitlement is required to select or publish.</div> : null}</div>{visibleSections.map((section) => <section key={section.id} className="mt-6 first:mt-0"><SectionHeading label={section.label} /><p className="mb-3 text-[10px] leading-4 text-white/38">{section.description}</p><div className="grid grid-cols-2 gap-2">{section.resources.map((resource) => <GovernedResourceCard key={resource.id} resource={resource} onUse={resource.classification === "assembly-starting-point" && resource.readiness === "ready" && family.available ? () => insert(resource) : undefined} />)}</div></section>)}{family.assembly?.supported ? <div className="mt-6 rounded-2xl bg-[#b8ff2c]/8 p-4" data-testid="studio-family-assembly-contract"><div className="flex items-center gap-2 text-[#d8ff82]"><Sparkles className="h-4 w-4" /><strong className="text-xs">{family.assembly.entryLabel}</strong></div><p className="mt-2 text-[11px] leading-5 text-white/52">{family.assembly.explanation}</p><p className="mt-2 text-[10px] text-white/35">Insert a finished layout, then select it and choose Edit Contents. Labels, Actions, order, count, and compatible plugs remain editable; certified furniture stays automatic.</p></div> : null}</div>;
}

function GovernedResourceCard({ resource, onUse }: { resource: StudioButtonFamilyResource; onUse?: () => void }) {
  const content = <><div className="relative flex h-24 items-center justify-center overflow-hidden bg-black/20">{resource.previewSrc ? <img src={resource.previewSrc} alt={resource.previewAlt || ""} className="h-full w-full object-contain p-2" /> : null}<span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[8px] capitalize text-white/70">{resource.classification.replaceAll("-", " ")}</span></div><div className="p-3"><strong className="block text-[11px]">{resource.label}</strong><p className="mt-1 text-[9px] leading-4 text-white/40">{resource.description}</p>{onUse ? <span className="mt-2 inline-flex rounded-full bg-[#b8ff2c] px-2.5 py-1 text-[9px] font-semibold text-[#07100a]">Insert assembly</span> : resource.readiness !== "ready" ? <span className="mt-2 inline-block text-[9px] font-semibold text-[#d8ff82]/70">{resource.readiness === "managed" ? "Recipe managed" : "Preview only"}</span> : null}</div></>;
  const className = "overflow-hidden rounded-2xl bg-white/[.045] text-left transition hover:bg-white/[.075]";
  const testId = `studio-governed-resource-${resource.id.replaceAll("/", "-")}`;
  return onUse ? <button type="button" onClick={onUse} className={className} data-testid={testId}>{content}</button> : <div className={className} data-testid={testId}>{content}</div>;
}

function SavedFamilyView() { return <div className="flex flex-1 items-center justify-center p-6" data-testid="studio-saved-button-empty"><EmptyState title="No saved Button styles yet" detail="Saved resources will appear here after the shared reuse lifecycle is enabled. Nothing is fabricated for this review." /></div>; }

function SearchField({ state, dispatch, placeholder }: { state: StudioDrawerState; dispatch: (event: StudioDrawerEvent) => void; placeholder: string }) { return <div className="px-3 pb-1"><label className="flex h-11 items-center gap-2 rounded-2xl bg-white/[.055] px-3 focus-within:bg-white/[.075] focus-within:ring-1 focus-within:ring-[#b8ff2c]/45"><Search className="h-4 w-4 text-white/35" /><span className="sr-only">{placeholder}</span><input value={state.query} onChange={(event) => dispatch({ type: "SET_QUERY", query: event.target.value })} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" data-testid="studio-button-search" /></label></div>; }
function SectionHeading({ label, trailing }: { label: string; trailing?: string }) { return <div className="mb-2.5 flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/48">{label}</h3>{trailing ? <span className="text-[9px] text-amber-300">{trailing}</span> : null}</div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl bg-white/[.035] p-5 text-center"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-white/40">{detail}</p></div>; }

function PresetCard({ resource, onUse, compact = false }: { resource: StandardButtonDiscoveryResource; onUse: (resource: StandardButtonDiscoveryResource) => void; compact?: boolean }) {
  const [dragEnabled, setDragEnabled] = useState(false);
  useEffect(() => { const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)"); const update = () => setDragEnabled(window.innerWidth >= 768 && finePointer.matches); update(); window.addEventListener("resize", update); finePointer.addEventListener("change", update); return () => { window.removeEventListener("resize", update); finePointer.removeEventListener("change", update); }; }, []);
  return <div role="button" tabIndex={0} draggable={dragEnabled} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-tapconnect-studio-resource", JSON.stringify(resource.ref)); }} onClick={() => onUse(resource)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onUse(resource); } }} className={cn("group overflow-hidden rounded-2xl bg-white/[.045] text-left transition hover:-translate-y-0.5 hover:bg-white/[.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ff2c]", compact && resource.application.presetId === "full-width-cta" && "order-last col-span-2")} data-testid={`standard-button-preset-${resource.application.presetId}`}><StandardButtonPreview props={resource.preview.payload} className={compact ? "min-h-[72px]" : "min-h-[96px]"} /><span className="block px-3 pb-3 pt-2"><strong className="block text-[11px]">{resource.label}</strong>{!compact ? <span className="mt-1 line-clamp-2 block text-[9px] leading-4 text-white/42">{resource.description}</span> : null}</span></div>;
}

function OutlineView({ model }: { model: CardEditorLiveModel | null }) {
  if (!model) return <div className="p-4"><div className="h-20 animate-pulse rounded-xl bg-white/6" aria-label="Loading Outline" /></div>;
  const rootNodes = model.config.rootComposition?.nodes ?? [];
  const rootCompounds = model.config.rootComposition ? curatedCompoundObjects(model.config.rootComposition) : [];
  const rootManaged = new Set(rootCompounds.flatMap((compound) => compound.memberNodeIds));
  const canonical = model.config.rootComposition && hasCompositionParentAuthority(model.config.rootComposition) ? model.config.rootComposition : null;
  const selectedId = model.selectedCompositionNode?.id ?? model.selectedObject?.id;
  const select = (nodeId: string) => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([nodeId]); };
  const drop = (event: DragEvent, parentId: string | null, index: number) => {
    const nodeId = event.dataTransfer.getData("application/x-tapconnect-composition-node");
    if (!nodeId || !canonical) return;
    event.preventDefault();
    event.stopPropagation();
    const node = canonical.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    if (node.compositionKind === "container" && parentId !== null) { model.notify?.("Containers stay directly on the Card."); return; }
    if (node.compositionKind === "module" && node.parentId !== parentId) model.onReparentCompositionModule?.(node.id, parentId, index);
    else model.onReorderCompositionNode?.(node.id, index);
  };
  return <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-5" data-testid="studio-outline-view">
    <div className="mb-2 flex items-center gap-2 border-b border-white/8 px-2 py-2.5"><Layers3 className="h-4 w-4 text-[#8bdcff]" /><div><p className="text-xs font-semibold">Card Surface</p><p className="text-[9px] text-white/38">Drag to reorder or place inside a panel</p></div></div>
    {canonical ? <LayerDropZone parentId={null} index={0} onDrop={drop} /> : null}
    {canonical ? compositionChildren(canonical, null).map((node, index) => <div key={node.id}>
      <LayerButton nodeId={node.id} label={humanLayerName(node.name, node.compositionKind, String(node.props.elementKind || node.primitive))} typeLabel={node.compositionKind === "container" ? "Panel" : humanTypeLabel(String(node.props.elementKind || node.primitive))} kind={node.compositionKind === "container" ? "container" : String(node.props.elementKind || node.primitive)} selected={selectedId === node.id} onClick={() => select(node.id)} />
      {node.compositionKind === "container" ? <div className="ml-4 border-l border-[#8bdcff]/20 pl-2" data-outline-parent={node.id} data-testid={`studio-outline-container-${node.id}`}>
        <LayerDropZone parentId={node.id} index={0} onDrop={drop} label="Drop into panel" />
        {compositionChildren(canonical, node.id).map((child, childIndex) => <div key={child.id}><LayerButton nodeId={child.id} label={humanLayerName(child.name, child.compositionKind, String(child.props.elementKind || child.primitive))} typeLabel={humanTypeLabel(String(child.props.elementKind || child.primitive))} kind={String(child.props.elementKind || child.primitive)} selected={selectedId === child.id} onClick={() => select(child.id)} /><LayerDropZone parentId={node.id} index={childIndex + 1} onDrop={drop} /></div>)}
      </div> : null}
      <LayerDropZone parentId={null} index={index + 1} onDrop={drop} />
    </div>) : <>{rootCompounds.map((compound) => <LegacyLayerButton key={compound.instanceId} label={compound.label} typeLabel={`${compound.memberNodeIds.length} actions`} selected={compound.memberNodeIds.includes(model.selectedObject?.id ?? "")} onClick={() => { model.setSelectedId(null); model.setSelectedCompositionNodeIds?.([compound.anchorNodeId]); }} />)}{rootNodes.filter((node) => !rootManaged.has(node.id)).map((node) => <LegacyLayerButton key={node.id} label={humanLayerName(node.name, node.compositionKind, String(node.props.elementKind || node.primitive))} typeLabel={humanTypeLabel(String(node.props.elementKind || node.primitive))} selected={model.selectedObject?.id === node.id} onClick={() => select(node.id)} />)}</>}
    {model.sorted.map((section) => {
      const assembly = section.composition?.signatureAssembly;
      if (assembly) {
        const selected = model.selected?.id === section.id;
        return <div key={section.id} className="mt-2 border-l border-[#b8ff2c]/18 pl-2"><LegacyLayerButton label={section.label || "Cabinet Noir"} typeLabel={`${assembly.input.actions.length} actions · Curated System`} selected={selected} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }} /></div>;
      }
      const compounds = section.composition ? curatedCompoundObjects(section.composition) : [];
      const managed = new Set(compounds.flatMap((compound) => compound.memberNodeIds));
      return <div key={section.id} className="mt-2 border-l border-white/10 pl-2"><button type="button" className="w-full rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-white/7" onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }}>{section.label || section.type}</button>{compounds.map((compound) => <LegacyLayerButton key={compound.instanceId} label="Cabinet Noir" typeLabel={`${section.composition?.signatureAssembly?.input.actions.length ?? 0} actions · Curated System`} selected={compound.memberNodeIds.includes(model.selectedObject?.id ?? "")} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([compound.anchorNodeId]); }} />)}{(section.composition?.nodes ?? []).filter((node) => !managed.has(node.id)).map((node) => <LegacyLayerButton key={node.id} label={humanLayerName(node.name, node.compositionKind, String(node.props.elementKind || node.primitive))} typeLabel={humanTypeLabel(String(node.props.elementKind || node.primitive))} selected={model.selectedObject?.id === node.id} onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([node.id]); }} />)}</div>;
    })}
  </div>;
}
function LayerButton({ nodeId, label, typeLabel, kind, selected, onClick }: { nodeId: string; label: string; typeLabel: string; kind: string; selected: boolean; onClick: () => void }) { const Icon = layerIcon(kind); return <button type="button" draggable aria-pressed={selected} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-tapconnect-composition-node", nodeId); }} onClick={onClick} className="group flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-2 text-left text-white/72 transition hover:border-white/8 hover:bg-white/6 aria-pressed:border-[#b8ff2c]/35 aria-pressed:bg-[#b8ff2c]/10 aria-pressed:text-[#efffd4]" data-testid={`studio-layer-${nodeId}`}><GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-white/22 group-hover:text-white/55" /><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#8bdcff]/8 text-[#a9e7ff]"><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] font-medium">{label}</strong><small className="block truncate text-[8px] uppercase tracking-[.08em] text-white/32">{typeLabel}</small></span></button>; }
function LegacyLayerButton({ label, typeLabel, selected, onClick }: { label: string; typeLabel: string; selected: boolean; onClick: () => void }) { return <button type="button" aria-pressed={selected} onClick={onClick} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-white/66 hover:bg-white/7 aria-pressed:bg-[#b8ff2c]/12 aria-pressed:text-[#e7ffc2]"><MousePointer2 className="h-3.5 w-3.5 text-white/28" /><span><strong className="block text-[11px] font-medium">{label}</strong><small className="text-[8px] uppercase tracking-[.08em] text-white/30">{typeLabel}</small></span></button>; }
function LayerDropZone({ parentId, index, onDrop, label }: { parentId: string | null; index: number; onDrop: (event: DragEvent, parentId: string | null, index: number) => void; label?: string }) { const [active, setActive] = useState(false); return <div className={cn("my-0.5 flex h-1.5 items-center justify-center rounded-full transition-all", active && "h-7 border border-dashed border-[#8bdcff]/65 bg-[#8bdcff]/10 text-[8px] text-[#c9efff]")} onDragEnter={(event) => { if (event.dataTransfer.types.includes("application/x-tapconnect-composition-node")) { event.preventDefault(); setActive(true); } }} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-tapconnect-composition-node")) event.preventDefault(); }} onDragLeave={() => setActive(false)} onDrop={(event) => { setActive(false); onDrop(event, parentId, index); }} data-testid={`studio-layer-drop-${parentId ?? "card"}-${index}`}>{active ? label || "Move here" : null}</div>; }
function humanLayerName(name: string | undefined, kind: string | undefined, primitive: string) { if (name && !/^container$/i.test(name)) return name.replace(/Content divider/i, "Divider").replace(/Primary action/i, "Primary Action"); if (kind === "container") return "Smoked Glass Panel"; if (primitive === "border" || primitive === "divider") return "Divider"; if (primitive === "image") return "Brand Image"; if (primitive === "text") return "Introduction"; if (primitive === "button") return "Action"; return "Module"; }
function humanTypeLabel(kind: string) { return kind === "curated-system" ? "Curated System" : kind === "border" || kind === "divider" ? "Divider" : kind === "image" ? "Image" : kind === "text" ? "Text" : kind === "button" ? "Button" : "Module"; }
function layerIcon(kind: string) { return kind === "container" ? Box : kind === "image" ? ImageIcon : kind === "text" ? Type : kind === "border" || kind === "divider" ? Minus : MousePointer2; }
