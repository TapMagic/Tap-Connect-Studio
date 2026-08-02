"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, HelpCircle, Lock, Unlock } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { CARD_ELEMENT_LIBRARY, CARD_SURFACE_LIBRARY, type CardElementKind, type CardSurfaceKind } from "@/lib/fusion/card/composer-model";
import { cn } from "@/lib/utils";
import { autoScrollForPointer } from "@/lib/fusion/creative-studio/autoscroll";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

const MIME = "application/x-tap-card-composer";

export function CardComposerLibrary({ model }: { model: CardEditorLiveModel | null }) {
  const [query, setQuery] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const match = (label: string) => !query.trim() || label.toLowerCase().includes(query.toLowerCase());

  return (
    <div className="space-y-4" data-testid="card-composer-library" onDragOver={(event) => autoScrollForPointer(event.currentTarget, event.clientX, event.clientY)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">Build library</p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Sections and Elements"
          className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-white/35"
          aria-label="Search build library"
        />
      </div>
      {guideOpen ? (
        <section className="rounded-lg border border-[#b8ff2c]/20 bg-[#b8ff2c]/5 p-3" data-testid="composer-help-guide">
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="text-xs font-semibold text-white/85">One clear next step</h2><p className="mt-1 text-[10px] text-white/70">Build the essentials, then review the whole Card.</p></div>
            <button type="button" className="text-[10px] text-white/70" onClick={() => setGuideOpen(false)} aria-label="Dismiss build guide">Dismiss</button>
          </div>
          <div className="mt-3 grid gap-1.5">
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => model?.onAddSurface?.("identity")}>1. Add identity</button>
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => model?.onAddSurface?.("actions")}>2. Add a primary action</button>
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => { model?.setSelectedId(null); model?.setSelectedCompositionNodeIds?.([]); }}>3. Review Card</button>
          </div>
        </section>
      ) : (
        <button type="button" className="flex min-h-9 w-full items-center gap-2 rounded border border-white/10 px-2 text-xs text-white/65" onClick={() => setGuideOpen(true)} data-testid="composer-reopen-help"><HelpCircle className="h-3.5 w-3.5" />Help</button>
      )}
      <LibraryGroup title="Sections" testId="composer-section-library">
        {CARD_SURFACE_LIBRARY.filter((item) => match(item.label)).map((item) => (
          <LibraryButton
            key={item.kind}
            label={item.label}
            description={item.description}
            level="section"
            kind={item.kind}
            onAdd={() => model?.onAddSurface?.(item.kind as CardSurfaceKind)}
          />
        ))}
      </LibraryGroup>
      <LibraryGroup title="Elements" testId="composer-element-library">
        {CARD_ELEMENT_LIBRARY.filter((item) => match(item.label)).map((item) => (
          <LibraryButton
            key={item.kind}
            label={item.label}
            description={item.description}
            level="element"
            kind={item.kind}
            onAdd={() => model?.onAddElement?.(item.kind as CardElementKind, model.selected?.type === "surface" ? model.selected.id : undefined)}
          />
        ))}
      </LibraryGroup>
      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-white/75 hover:bg-white/5"
          aria-expanded={outlineOpen}
          onClick={() => setOutlineOpen((open) => !open)}
          data-testid="composer-outline-toggle"
        >
          <span>Outline / layers</span>
          {outlineOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {outlineOpen ? <ComposerOutline model={model} /> : null}
      </div>
    </div>
  );
}

function LibraryGroup({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section data-testid={testId}>
      <h2 className="mb-2 text-xs font-semibold text-white/85">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function LibraryButton({ label, description, level, kind, onAdd }: { label: string; description: string; level: "section" | "element"; kind: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(MIME, JSON.stringify({ level, kind }));
      }}
      onDrag={(event) => {
        if (event.clientX || event.clientY) autoScrollForPointer(event.currentTarget, event.clientX, event.clientY);
      }}
      onClick={onAdd}
      className="group flex min-h-11 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left hover:border-white/10 hover:bg-white/5"
      data-testid={`composer-add-${level}-${kind}`}
      title={description}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/25 group-hover:text-white/70" />
      <span className="min-w-0">
        <span className="block text-xs text-white/80">{label}</span>
        <span className="block truncate text-[10px] text-white/70">{description}</span>
      </span>
    </button>
  );
}

function ComposerOutline({ model }: { model: CardEditorLiveModel | null }) {
  const [dragId, setDragId] = useState<string | null>(null);
  if (!model) return <p className="p-2 text-xs text-white/70">Loading layers…</p>;
  return (
    <div className="mt-2 space-y-1" data-testid="composer-nested-outline" role="tree" aria-label="Card layers" onDragOver={(event) => autoScrollForPointer(event.currentTarget, event.clientX, event.clientY)}>
      <button type="button" className="min-h-9 w-full rounded px-2 text-left text-xs text-white/70" onClick={() => model.setSelectedId(null)} role="treeitem" aria-selected={!model.selected}>
        Card
      </button>
      {model.sorted.map((section, index) => (
        <div key={section.id} className={cn("rounded-md border border-white/5 bg-black/10", dragId === section.id && "opacity-50")} role="treeitem" aria-expanded aria-selected={model.selected?.id === section.id && !model.selectedCompositionNodeIds?.length}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
          onDrop={(event) => { event.preventDefault(); if (dragId && dragId !== section.id) model.reorderSections(dragId, section.id); setDragId(null); }}>
          <div className="flex items-center gap-1">
            <button type="button" draggable className="grid min-h-9 w-7 place-items-center text-white/70" aria-label={`Reorder ${section.label || "Section"}`} onDragStart={() => setDragId(section.id)} onDrag={(event) => { if (event.clientX || event.clientY) autoScrollForPointer(event.currentTarget, event.clientX, event.clientY); }} onDragEnd={() => setDragId(null)} onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); model.moveSectionBy(section.id, event.key === "ArrowUp" ? -1 : 1); }
              if (event.key === "Home") { event.preventDefault(); model.moveSectionTo(section.id, "top"); }
              if (event.key === "End") { event.preventDefault(); model.moveSectionTo(section.id, "bottom"); }
            }} data-testid={`outline-reorder-${section.id}`}><GripVertical className="h-3.5 w-3.5" /></button>
            <button
              type="button"
              className={cn("min-h-9 min-w-0 flex-1 truncate px-2 text-left text-xs", model.selected?.id === section.id ? "text-[#b8ff2c]" : "text-white/70")}
              onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }}
              data-testid={`outline-section-${section.id}`}
            >
              {section.label || section.type}
            </button>
            <button type="button" className="p-1 text-white/70" aria-label={section.enabled ? "Hide Section" : "Show Section"} onClick={() => model.toggleSectionVisible(section.id)}>
              {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className="p-1 text-white/70" aria-label={section.locked ? "Unlock Section" : "Lock Section"} onClick={() => model.toggleSectionLocked(section.id)}>
              {section.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className="p-1 text-white/70 disabled:opacity-20" aria-label="Move Section up" disabled={index === 0} onClick={() => model.moveSectionBy(section.id, -1)}>↑</button>
            <button type="button" className="p-1 text-white/70 disabled:opacity-20" aria-label="Move Section down" disabled={index === model.sorted.length - 1} onClick={() => model.moveSectionBy(section.id, 1)}>↓</button>
          </div>
          {[...(section.composition?.nodes ?? [])].sort((left, right) => right.zIndex - left.zIndex).map((node) => {
            const selected = Boolean(model.selectedCompositionNodeIds?.includes(node.id));
            const patchNodes = (nodes: CreativeCompositionNode[], label: string) => model.patchSection(section.id, { composition: { ...section.composition!, nodes } }, label);
            return <div key={node.id} role="treeitem" aria-selected={selected} className={cn("flex min-h-9 items-center border-t border-white/5 pl-5 pr-1 text-[11px]", selected ? "text-[#b8ff2c]" : "text-white/70")} data-testid={`outline-element-${node.id}`}>
              <button type="button" className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left" onClick={(event) => {
                model.setSelectedId(section.id);
                const current = model.selected?.id === section.id ? model.selectedCompositionNodeIds || [] : [];
                model.setSelectedCompositionNodeIds?.(event.shiftKey ? (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]) : [node.id]);
              }}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" /><span className="truncate">{node.name || String(node.props.elementKind || node.primitive)}</span></button>
              <button type="button" className="grid h-8 w-7 place-items-center" aria-label={node.visible === false ? `Show ${node.name}` : `Hide ${node.name}`} onClick={() => patchNodes(section.composition!.nodes.map((item) => item.id === node.id ? { ...item, visible: item.visible === false } : item), "Changed Element visibility")}>{node.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>
              <button type="button" className="grid h-8 w-7 place-items-center" aria-label={node.locked ? `Unlock ${node.name}` : `Lock ${node.name}`} onClick={() => patchNodes(section.composition!.nodes.map((item) => item.id === node.id ? { ...item, locked: !item.locked } : item), "Changed Element lock")}>{node.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}</button>
              <button type="button" className="grid h-8 w-7 place-items-center text-red-300" aria-label={`Delete ${node.name}`} onClick={() => {
                if (node.locked) { model.notify?.("This Element is locked. Unlock it before deleting it."); return; }
                patchNodes(section.composition!.nodes.filter((item) => item.id !== node.id), "Deleted Element through Outline");
                model.setSelectedCompositionNodeIds?.((model.selectedCompositionNodeIds || []).filter((id) => id !== node.id));
              }}>×</button>
            </div>;
          })}
        </div>
      ))}
    </div>
  );
}
