"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, Lock, Unlock } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { CARD_ELEMENT_LIBRARY, CARD_SURFACE_LIBRARY, type CardElementKind, type CardSurfaceKind } from "@/lib/fusion/card/composer-model";
import { cn } from "@/lib/utils";

const MIME = "application/x-tap-card-composer";

export function CardComposerLibrary({ model }: { model: CardEditorLiveModel | null }) {
  const [query, setQuery] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const match = (label: string) => !query.trim() || label.toLowerCase().includes(query.toLowerCase());

  return (
    <div className="space-y-4" data-testid="card-composer-library">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/45">Build library</p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Sections and Elements"
          className="mt-2 h-9 w-full rounded-md border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-white/35"
          aria-label="Search build library"
        />
      </div>
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
      onClick={onAdd}
      className="group flex min-h-11 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left hover:border-white/10 hover:bg-white/5"
      data-testid={`composer-add-${level}-${kind}`}
      title={description}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/25 group-hover:text-white/55" />
      <span className="min-w-0">
        <span className="block text-xs text-white/80">{label}</span>
        <span className="block truncate text-[10px] text-white/35">{description}</span>
      </span>
    </button>
  );
}

function ComposerOutline({ model }: { model: CardEditorLiveModel | null }) {
  if (!model) return <p className="p-2 text-xs text-white/40">Loading layers…</p>;
  return (
    <div className="mt-2 space-y-1" data-testid="composer-nested-outline" role="tree" aria-label="Card layers">
      <button type="button" className="min-h-9 w-full rounded px-2 text-left text-xs text-white/70" onClick={() => model.setSelectedId(null)} role="treeitem" aria-selected={!model.selected}>
        Card
      </button>
      {model.sorted.map((section) => (
        <div key={section.id} className="rounded-md border border-white/5 bg-black/10" role="treeitem" aria-expanded aria-selected={model.selected?.id === section.id && !model.selectedCompositionNodeIds?.length}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn("min-h-9 min-w-0 flex-1 truncate px-2 text-left text-xs", model.selected?.id === section.id ? "text-[#b8ff2c]" : "text-white/70")}
              onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([]); }}
              data-testid={`outline-section-${section.id}`}
            >
              {section.label || section.type}
            </button>
            <button type="button" className="p-1 text-white/45" aria-label={section.enabled ? "Hide Section" : "Show Section"} onClick={() => model.toggleSectionVisible(section.id)}>
              {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button type="button" className="p-1 text-white/45" aria-label={section.locked ? "Unlock Section" : "Lock Section"} onClick={() => model.toggleSectionLocked(section.id)}>
              {section.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
          </div>
          {(section.composition?.nodes ?? []).map((node) => (
            <button
              key={node.id}
              type="button"
              role="treeitem"
              aria-selected={Boolean(model.selectedCompositionNodeIds?.includes(node.id))}
              className={cn("flex min-h-8 w-full items-center gap-2 border-t border-white/5 pl-5 pr-2 text-left text-[11px]", model.selectedCompositionNodeIds?.includes(node.id) ? "text-[#b8ff2c]" : "text-white/55")}
              onClick={() => { model.setSelectedId(section.id); model.setSelectedCompositionNodeIds?.([node.id]); }}
              data-testid={`outline-element-${node.id}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              {node.name || String(node.props.elementKind || node.primitive)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
