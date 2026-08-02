"use client";

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { CardUtilityKind, CardUtilityToggle, TapCardSection } from "@/lib/brand/tap-card";
import { composerBreadcrumb, composerWarnings } from "@/lib/fusion/card/composer-model";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

const UTILITY_OPTIONS: Array<{ kind: CardUtilityKind; label: string; reason: (model: CardEditorLiveModel) => string | null }> = [
  { kind: "call", label: "Call", reason: (model) => model.profile.phone ? null : "Add a phone number to make Call eligible." },
  { kind: "support", label: "Ask a question", reason: () => null },
  { kind: "keep", label: "Save this Card", reason: () => null },
  { kind: "map", label: "Directions", reason: (model) => model.profile.address ? null : "Add an address to make Directions eligible." },
  { kind: "vcard", label: "Save contact", reason: (model) => model.profile.displayName || model.profile.email || model.profile.phone ? null : "Add contact details first." },
  { kind: "book", label: "Book", reason: () => "Set a booking destination to make this eligible." },
  { kind: "shop", label: "Shop", reason: () => "Set a shop destination to make this eligible." },
];

export function CardComposerInspector({ model, onRequestTool }: { model: CardEditorLiveModel | null; onRequestTool?: (toolId: string) => void }) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const selectedElement = useMemo(() => {
    const id = model?.selectedCompositionNodeIds?.[0];
    return id ? model?.selected?.composition?.nodes.find((node) => node.id === id) ?? null : null;
  }, [model]);

  if (!model) return <p className="p-4 text-xs text-white/45">Loading inspector…</p>;
  const crumbs = composerBreadcrumb(model.selected, selectedElement);
  return (
    <div className="space-y-4 p-4 text-white" data-testid="card-contextual-inspector" data-selection-level={selectedElement ? "element" : model.selected ? "section" : "card"}>
      <nav className="flex flex-wrap gap-1 text-[10px] text-white/45" aria-label="Selection breadcrumb" data-testid="composer-selection-breadcrumb">
        {crumbs.map((crumb, index) => (
          <button
            key={`${crumb}-${index}`}
            type="button"
            className="rounded px-1 py-0.5 hover:bg-white/5 hover:text-white"
            onClick={() => {
              if (index === 0) model.setSelectedId(null);
              else if (index === 1) model.setSelectedCompositionNodeIds?.([]);
            }}
          >
            {index ? "› " : ""}{crumb}
          </button>
        ))}
      </nav>
      <div>
        <p className="text-[10px] uppercase tracking-[.16em] text-[#b8ff2c]">{selectedElement ? "Element" : model.selected ? "Section" : "Card"}</p>
        <h2 className="mt-1 text-base font-semibold">{selectedElement?.name || model.selected?.label || model.businessName}</h2>
      </div>

      {selectedElement && model.selected ? (
        <ElementInspector model={model} section={model.selected} element={selectedElement} />
      ) : model.selected ? (
        <SectionInspector model={model} section={model.selected} />
      ) : (
        <CardInspector model={model} />
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <button type="button" className="min-h-10 rounded-md border border-white/15 text-xs" onClick={() => setBrandOpen((open) => !open)} data-testid="composer-open-brand">Open Brand</button>
        <button type="button" className="min-h-10 rounded-md border border-white/15 text-xs" onClick={() => setAssetsOpen((open) => !open)} data-testid="composer-open-assets">Open Assets</button>
      </div>
      {brandOpen ? <BrandPanel model={model} section={model.selected} element={selectedElement} onRequestTool={onRequestTool} /> : null}
      {assetsOpen ? <AssetPanel model={model} section={model.selected} element={selectedElement} /> : null}
    </div>
  );
}

function CardInspector({ model }: { model: CardEditorLiveModel }) {
  return (
    <div className="space-y-4">
      <InspectorGroup title="Card document">
        <div className="grid gap-2">
          <button type="button" className="min-h-10 rounded border border-white/15 text-xs" data-testid="composer-replace-blank" onClick={() => model.onStartPoint?.("blank")}>Replace with blank Card</button>
          <button type="button" className="min-h-10 rounded border border-white/15 text-xs" data-testid="composer-clone-card" onClick={() => model.onStartPoint?.("clone")}>Clone Card</button>
        </div>
      </InspectorGroup>
      <InspectorGroup title="Card appearance">
        <ColorControl label="Background" value={model.config.surfaceColor} onChange={(value) => model.patchConfigColor("surfaceColor", value)} />
        <ColorControl label="Text" value={model.config.textColor} onChange={(value) => model.patchConfigColor("textColor", value)} />
        <RangeControl label="Page spacing" value={model.config.headerEnergy} min={0} max={100} onChange={(value) => model.patchConfig({ headerEnergy: value }, "Changed Card spacing", true)} />
        <p className="text-[10px] text-white/45">Brand defaults · global typography · Card radius and publication state remain in the saved Card document.</p>
      </InspectorGroup>
      <PersistentActions model={model} />
      <InspectorGroup title="Publication state">
        <p className="text-xs text-white/60">Mutable working draft · immutable published revisions · rollback history</p>
      </InspectorGroup>
    </div>
  );
}

function SectionInspector({ model, section }: { model: CardEditorLiveModel; section: TapCardSection }) {
  const patch = (next: Partial<TapCardSection>, label: string) => model.patchSection(section.id, next, label);
  const warnings = composerWarnings(section);
  return (
    <div className="space-y-4">
      <InspectorGroup title="Content / structure">
        <TextControl label="Name" value={section.label || ""} onChange={(value) => patch({ label: value }, "Renamed Section")} />
        <SelectControl label="Layout mode" value={section.surfaceLayout || "stack"} options={["stack", "row", "grid", "free"]} onChange={(value) => patch({ surfaceLayout: value as TapCardSection["surfaceLayout"] }, "Changed Section layout")} />
        <RangeControl label="Minimum height" value={section.surfaceMinHeightPx ?? 260} min={120} max={800} suffix="px" onChange={(value) => patch({ surfaceMinHeightPx: value }, "Resized Section height")} />
        <RangeControl label="Padding" value={section.surfacePaddingPx ?? 24} min={0} max={80} suffix="px" onChange={(value) => patch({ surfacePaddingPx: value }, "Changed Section padding")} />
        <RangeControl label="Element gap" value={section.surfaceGapPx ?? 12} min={0} max={64} suffix="px" onChange={(value) => patch({ surfaceGapPx: value }, "Changed Element spacing")} />
      </InspectorGroup>
      <InspectorGroup title="Appearance">
        <p className="text-[10px] text-white/45">{section.sourceMode === "BRAND" ? "From Brand" : "Custom on this Card"}</p>
        <ColorControl label="Background color" value={section.backgroundColor || "#171b24"} onChange={(value) => patch({ backgroundColor: value, sourceMode: "LOCAL" }, "Changed Section background")} />
        <MediaPicker value={section.backgroundImageUrl} valueAssetId={section.backgroundMediaAssetId} label="Section background image" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patch({ backgroundImageUrl: value }, "Changed Section background image")} onAssetChange={(asset) => patch({ backgroundMediaAssetId: asset?.id }, "Selected Section background Asset")} />
        <RangeControl label="Overlay opacity" value={Math.round((section.overlayOpacity ?? 0) * 100)} min={0} max={100} suffix="%" onChange={(value) => patch({ overlayOpacity: value / 100 }, "Changed background overlay")} />
        <div className="grid grid-cols-2 gap-2">
          <RangeControl label="Border" value={section.surfaceBorderWidthPx ?? 0} min={0} max={12} suffix="px" onChange={(value) => patch({ surfaceBorderWidthPx: value }, "Changed Section border")} />
          <RangeControl label="Radius" value={section.surfaceRadiusPx ?? 18} min={0} max={64} suffix="px" onChange={(value) => patch({ surfaceRadiusPx: value }, "Changed Section radius")} />
        </div>
        <SelectControl label="Shadow" value={section.surfaceShadow || "none"} options={["none", "soft", "medium", "strong"]} onChange={(value) => patch({ surfaceShadow: value as TapCardSection["surfaceShadow"] }, "Changed Section shadow")} />
        <RangeControl label="Overall opacity" value={section.opacity ?? 100} min={0} max={100} suffix="%" onChange={(value) => patch({ opacity: value }, "Changed Section opacity")} />
      </InspectorGroup>
      <InspectorGroup title="Behavior / responsive">
        <SelectControl label="Small screens" value={section.responsiveBehavior || "stack"} options={["stack", "scale", "hide_decorative"]} onChange={(value) => patch({ responsiveBehavior: value as TapCardSection["responsiveBehavior"] }, "Changed responsive behavior")} />
        <ObjectActions visible={section.enabled} locked={Boolean(section.locked)} onVisible={() => model.toggleSectionVisible(section.id)} onLocked={() => model.toggleSectionLocked(section.id)} onDuplicate={() => model.duplicateSection(section.id)} onDelete={() => model.deleteSection(section.id)} />
      </InspectorGroup>
      {warnings.length ? <Warnings warnings={warnings} /> : null}
    </div>
  );
}

function ElementInspector({ model, section, element }: { model: CardEditorLiveModel; section: TapCardSection; element: CreativeCompositionNode }) {
  const patch = (next: Partial<CreativeCompositionNode>, label: string) => {
    const composition = section.composition;
    if (!composition) return;
    model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.map((node) => node.id === element.id ? { ...node, ...next, props: { ...node.props, ...(next.props || {}) } } : node) } }, label);
  };
  const textKey = element.primitive === "button" ? "label" : "text";
  return (
    <div className="space-y-4">
      <InspectorGroup title="Content">
        {(element.primitive === "text" || element.primitive === "button") ? <TextControl label={element.primitive === "button" ? "Label" : "Text"} multiline value={String(element.props[textKey] || "")} onChange={(value) => patch({ props: { ...element.props, [textKey]: value } }, "Edited Element content")} /> : null}
        <p className="text-[10px] text-white/45">{element.props.sourceMode === "BRAND" ? "From Brand" : "Custom on this Card"}</p>
      </InspectorGroup>
      <InspectorGroup title="Typography / color">
        {element.primitive === "text" ? <>
          <TextControl label="Font family" value={String(element.props.fontFamily || "Inter, system-ui, sans-serif")} onChange={(value) => patch({ props: { ...element.props, fontFamily: value } }, "Changed font")} />
          <RangeControl label="Size" value={Number(element.props.fontSize || 18)} min={8} max={96} suffix="px" onChange={(value) => patch({ props: { ...element.props, fontSize: value } }, "Changed text size")} />
          <RangeControl label="Line height" value={Number(element.props.lineHeight || 1.2) * 10} min={8} max={24} onChange={(value) => patch({ props: { ...element.props, lineHeight: value / 10 } }, "Changed line height")} />
          <ColorControl label="Color" value={String(element.props.color || "#f8fafc")} onChange={(value) => patch({ props: { ...element.props, color: value, sourceMode: "LOCAL" } }, "Changed Element color")} />
          <SelectControl label="Alignment" value={String(element.props.align || "center")} options={["left", "center", "right", "justify"]} onChange={(value) => patch({ props: { ...element.props, align: value } }, "Changed text alignment")} />
        </> : null}
      </InspectorGroup>
      <InspectorGroup title="Size / position">
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="X %" value={Math.round(element.x * 100)} onChange={(value) => patch({ x: value / 100 }, "Moved Element")} />
          <NumberControl label="Y %" value={Math.round(element.y * 100)} onChange={(value) => patch({ y: value / 100 }, "Moved Element")} />
          <NumberControl label="Width %" value={Math.round(element.width * 100)} onChange={(value) => patch({ width: value / 100 }, "Resized Element")} />
          <NumberControl label="Height %" value={Math.round(element.height * 100)} onChange={(value) => patch({ height: value / 100 }, "Resized Element")} />
        </div>
        <RangeControl label="Opacity" value={Math.round(Number(element.props.opacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(value) => patch({ props: { ...element.props, opacity: value / 100 } }, "Changed Element opacity")} />
        {(element.primitive === "button" || element.primitive === "image") ? <TextControl label={element.primitive === "button" ? "Destination" : "Image URL"} value={String(element.props[element.primitive === "button" ? "href" : "src"] || "")} onChange={(value) => patch({ props: { ...element.props, [element.primitive === "button" ? "href" : "src"]: value } }, "Changed Element source")} /> : null}
      </InspectorGroup>
      <InspectorGroup title="Responsive / behavior">
        <SelectControl label="Width rule" value={String(element.props.responsiveWidth || "percentage")} options={["fixed", "percentage", "stretch"]} onChange={(value) => patch({ props: { ...element.props, responsiveWidth: value } }, "Changed Element responsive rule")} />
        <SelectControl label="Anchor" value={element.anchor || "top-left"} options={["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"]} onChange={(value) => patch({ anchor: value as CreativeCompositionNode["anchor"] }, "Changed Element anchor")} />
        <ObjectActions visible={element.visible !== false} locked={Boolean(element.locked)} onVisible={() => patch({ visible: element.visible === false }, "Changed Element visibility")} onLocked={() => patch({ locked: !element.locked }, "Changed Element lock")} onDuplicate={() => {
          const composition = section.composition!;
          model.patchSection(section.id, { composition: { ...composition, nodes: [...composition.nodes, { ...structuredClone(element), id: `${element.id}-copy-${Date.now()}`, x: Math.min(.9, element.x + .03), y: Math.min(.9, element.y + .03) }] } }, "Duplicated Element");
        }} onDelete={() => {
          const composition = section.composition!;
          model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.filter((node) => node.id !== element.id) } }, "Deleted Element");
          model.setSelectedCompositionNodeIds?.([]);
        }} />
      </InspectorGroup>
    </div>
  );
}

function PersistentActions({ model }: { model: CardEditorLiveModel }) {
  const current = model.config.utilityLayer?.utilities ?? [];
  const update = (kind: CardUtilityKind, patch: Partial<CardUtilityToggle>) => {
    const existing = current.find((item) => item.kind === kind) ?? { kind, enabled: false };
    const utilities = [...current.filter((item) => item.kind !== kind), { ...existing, ...patch, kind }]
      .map((item, order) => ({ ...item, order: item.order ?? order }));
    model.patchConfig({ utilityLayer: { enabled: true, presentation: model.config.utilityLayer?.presentation || "compact_row", utilities } }, `Changed ${kind} persistent action`);
  };
  return (
    <InspectorGroup title="Persistent Card actions">
      <div className="space-y-3" data-testid="persistent-card-actions">
        {UTILITY_OPTIONS.map((option, index) => {
          const toggle = current.find((item) => item.kind === option.kind);
          const reason = option.reason(model);
          return (
            <div key={option.kind} className="rounded-md border border-white/10 p-2" data-testid={`persistent-action-${option.kind}`}>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={toggle?.enabled === true} onChange={(event) => update(option.kind, { enabled: event.target.checked, order: toggle?.order ?? index })} />
                <span>{option.label}</span>
                <span className="ml-auto text-[9px] text-white/35">{toggle?.enabled ? (reason ? "Included · ineligible" : "Included · Preview on") : "Excluded · Preview off"}</span>
              </label>
              {toggle?.enabled ? <div className="mt-2 grid grid-cols-2 gap-2">
                <TextControl label="Label" value={toggle.label || option.label} onChange={(value) => update(option.kind, { label: value })} />
                <TextControl label="Icon" value={toggle.icon || option.kind} onChange={(value) => update(option.kind, { icon: value })} />
                <NumberControl label="Order" value={toggle.order ?? index} onChange={(value) => update(option.kind, { order: value })} />
                <SelectControl label="Style" value={toggle.style || "brand"} options={["brand", "soft", "outline", "solid"]} onChange={(value) => update(option.kind, { style: value as CardUtilityToggle["style"] })} />
                <div className="col-span-2"><TextControl label="Destination" value={toggle.destination || ""} onChange={(value) => update(option.kind, { destination: value })} /></div>
                <SelectControl label="Source" value={toggle.sourceMode || "BRAND"} options={["BRAND", "CUSTOM"]} onChange={(value) => update(option.kind, { sourceMode: value as CardUtilityToggle["sourceMode"] })} />
              </div> : null}
              {toggle?.enabled && reason ? <p className="mt-2 text-[10px] text-amber-200">{reason}</p> : null}
            </div>
          );
        })}
      </div>
    </InspectorGroup>
  );
}

function BrandPanel({ model, section, element, onRequestTool }: { model: CardEditorLiveModel; section: TapCardSection | null; element: CreativeCompositionNode | null; onRequestTool?: (toolId: string) => void }) {
  return <div className="rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-3" data-testid="composer-brand-panel">
    <p className="text-xs font-semibold">Brand resources</p>
    <p className="mt-1 text-[10px] text-white/50">Relevant fonts, palettes, logos and button styles. Applying Brand changes only the selected object.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {section ? <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs" onClick={() => model.patchSection(section.id, { sourceMode: "BRAND", backgroundColor: model.config.accentColor }, "Applied Brand palette to Section")}>Use Brand palette</button> : null}
      {section && element ? <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs" onClick={() => {
        const composition = section.composition!;
        model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.map((node) => node.id === element.id ? { ...node, props: { ...node.props, sourceMode: "BRAND", color: model.config.accentColor, src: String(node.props.elementKind) === "logo" ? model.logoUrl || node.props.src : node.props.src } } : node) } }, "Applied Brand resource to Element");
      }}>Use relevant Brand resource</button> : null}
      <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs" onClick={() => onRequestTool?.("appearance")}>More Brand settings</button>
    </div>
  </div>;
}

function AssetPanel({ model, section, element }: { model: CardEditorLiveModel; section: TapCardSection | null; element: CreativeCompositionNode | null }) {
  if (!section) return <p className="rounded border border-white/10 p-3 text-xs text-white/50" data-testid="composer-asset-panel">Select a Section or media Element to use Assets.</p>;
  if (element?.primitive === "image") return <div className="rounded-lg border border-white/10 p-3" data-testid="composer-asset-panel"><MediaPicker value={String(element.props.src || "")} label="Image Element asset" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => {
    const composition = section.composition!;
    model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.map((node) => node.id === element.id ? { ...node, props: { ...node.props, src: value } } : node) } }, "Selected Element Asset");
  }} /></div>;
  return <div className="rounded-lg border border-white/10 p-3" data-testid="composer-asset-panel"><MediaPicker value={section.backgroundImageUrl} label="Section background asset" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => model.patchSection(section.id, { backgroundImageUrl: value }, "Selected Section Asset")} /></div>;
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) { return <section className="space-y-3 rounded-lg border border-white/10 bg-white/[.025] p-3"><h3 className="text-xs font-semibold text-white/85">{title}</h3>{children}</section>; }
function TextControl({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) { const C = multiline ? "textarea" : "input"; return <label className="block text-[10px] text-white/50"><span>{label}</span><C className="mt-1 min-h-9 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="flex items-center justify-between gap-2 text-[10px] text-white/50"><span>{label}</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="h-8 w-14 rounded border border-white/10 bg-transparent" /></label>; }
function RangeControl({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) { return <label className="block text-[10px] text-white/50"><span className="flex justify-between"><span>{label}</span><span>{Math.round(value)}{suffix}</span></span><input className="mt-1 w-full accent-[#b8ff2c]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function NumberControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-[10px] text-white/50"><span>{label}</span><input className="mt-1 h-8 w-full rounded border border-white/10 bg-black/20 px-2 text-xs text-white" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[10px] text-white/50"><span>{label}</span><select className="mt-1 h-9 w-full rounded border border-white/10 bg-[#0b1019] px-2 text-xs text-white" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
function ObjectActions({ visible, locked, onVisible, onLocked, onDuplicate, onDelete }: { visible: boolean; locked: boolean; onVisible: () => void; onLocked: () => void; onDuplicate: () => void; onDelete: () => void }) { return <div className="grid grid-cols-4 gap-1"><IconButton label={visible ? "Hide" : "Show"} onClick={onVisible}>{visible ? <Eye /> : <EyeOff />}</IconButton><IconButton label={locked ? "Unlock" : "Lock"} onClick={onLocked}>{locked ? <Unlock /> : <Lock />}</IconButton><IconButton label="Duplicate" onClick={onDuplicate}><Copy /></IconButton><IconButton label="Delete" onClick={onDelete}><Trash2 /></IconButton></div>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactElement }) { return <button type="button" className="flex min-h-11 flex-col items-center justify-center gap-1 rounded border border-white/10 text-[9px] text-white/55 hover:bg-white/5" onClick={onClick} title={label}>{children && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{children}</span>}{label}</button>; }
function Warnings({ warnings }: { warnings: string[] }) { return <div className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-3" role="status" data-testid="composer-responsive-warnings"><p className="text-xs font-semibold text-amber-100">Responsive checks</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-amber-100/75">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>; }
