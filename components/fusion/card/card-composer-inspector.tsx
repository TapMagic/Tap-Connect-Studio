"use client";

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Lock, Search, Star, Trash2, Unlock } from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { CardUtilityKind, CardUtilityToggle, TapCardSection } from "@/lib/brand/tap-card";
import { composerBreadcrumb, composerWarnings } from "@/lib/fusion/card/composer-model";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { alignNodes, bringForward, bringToFront, distributeNodes, sendBackward, sendToBack } from "@/lib/fusion/creative-studio/composition";
import { BUTTON_PRESENTATIONS, MAP_DISPLAY_MODES, buildMapHref, type ButtonActionType, type ButtonPresentation, type MapDisplayMode, type MapOpenApp, type MapSourceMode } from "@/lib/fusion/card/designer-elements";

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
    const id = model?.selectedObject?.type === "element" ? model.selectedObject.elementId : model?.selectedCompositionNodeIds?.[0];
    return id ? model?.selected?.composition?.nodes.find((node) => node.id === id) ?? null : null;
  }, [model]);

  if (!model) return <p className="p-4 text-xs text-white/70">Loading inspector…</p>;
  const crumbs = composerBreadcrumb(model.selected, selectedElement);
  return (
    <div className="space-y-4 p-4 text-white" data-testid="card-contextual-inspector" data-selection-level={selectedElement ? "element" : model.selected ? "section" : "card"}>
      <nav className="flex flex-wrap gap-1 text-[10px] text-white/70" aria-label="Selection breadcrumb" data-testid="composer-selection-breadcrumb">
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
      <InspectorGroup title="Card">
        <p className="text-xs text-white/75">{model.businessName}</p>
        <p className="text-[10px] text-white/70">Status: {model.config.lifecycleStatus || "active"} · Working draft</p>
        <div className="grid gap-2">
          <button type="button" className="min-h-10 rounded border border-white/15 text-xs" data-testid="composer-replace-blank" onClick={() => model.onStartPoint?.("blank")}>Replace with blank Card</button>
          <button type="button" className="min-h-10 rounded border border-white/15 text-xs" data-testid="composer-clone-card" onClick={() => model.onStartPoint?.("clone")}>Clone Card</button>
        </div>
      </InspectorGroup>
      <InspectorGroup title="Canvas">
        <ColorControl label="Background" value={model.config.surfaceColor} onChange={(value) => model.patchConfigColor("surfaceColor", value)} />
        <ColorControl label="Text" value={model.config.textColor} onChange={(value) => model.patchConfigColor("textColor", value)} />
        <RangeControl label="Page spacing" value={model.config.headerEnergy} min={0} max={100} onChange={(value) => model.patchConfig({ headerEnergy: value }, "Changed Card spacing", true)} />
        <RangeControl label="Surface opacity" value={model.config.surfaceOpacity ?? 100} min={35} max={100} suffix="%" onChange={(value) => model.patchConfig({ surfaceOpacity: value }, "Changed Card opacity")} />
      </InspectorGroup>
      <InspectorGroup title="Global style">
        <ColorControl label="Brand accent" value={model.config.accentColor} onChange={(value) => model.patchConfigColor("accentColor", value)} />
        <SelectControl label="Default button shape" value={model.config.defaultShape} options={["pill", "rounded", "square"]} onChange={(value) => model.patchConfig({ defaultShape: value as typeof model.config.defaultShape }, "Changed default button style")} />
        <p className="text-[10px] text-white/70">Brand defaults, typography defaults, base colors and default Section style apply across this Card.</p>
      </InspectorGroup>
      <PersistentActions model={model} />
      <InspectorGroup title="Responsive">
        <p className="text-xs text-white/60">Phone · tablet · desktop defaults use the saved responsive rules on each Section and Element.</p>
      </InspectorGroup>
      <InspectorGroup title="Publication">
        <p className="text-xs text-white/60">Mutable working draft · immutable published revisions · rollback history</p>
      </InspectorGroup>
    </div>
  );
}

function SectionInspector({ model, section }: { model: CardEditorLiveModel; section: TapCardSection }) {
  const patch = (next: Partial<TapCardSection>, label: string) => model.patchSection(section.id, next, label);
  const warnings = composerWarnings(section);
  const fitHeight = () => {
    const padding = section.surfacePaddingPx ?? 24;
    const coordinateHeight = section.surfaceCoordinateHeightPx ?? Math.max(80, (section.surfaceMinHeightPx ?? 260) - padding * 2);
    const bottom = (section.composition?.nodes ?? []).reduce((max, node) => Math.max(max, (node.y + node.height) * coordinateHeight), 0);
    patch({ surfaceMinHeightPx: Math.max(120, Math.ceil(bottom + padding * 2)), surfaceHeightMode: "auto" }, "Fit Section to content");
  };
  return (
    <div className="space-y-4">
      <InspectorGroup title="Section · Layout">
        <TextControl label="Name" value={section.label || ""} onChange={(value) => patch({ label: value }, "Renamed Section")} />
        <SelectControl label="Layout mode" value={section.surfaceLayout || "stack"} options={["stack", "row", "grid", "free"]} onChange={(value) => patch({ surfaceLayout: value as TapCardSection["surfaceLayout"] }, "Changed Section layout")} />
        <div className="grid grid-cols-2 gap-2">
          <SelectControl label="Alignment" value={section.surfaceAlign || "stretch"} options={["start", "center", "end", "stretch"]} onChange={(value) => patch({ surfaceAlign: value as TapCardSection["surfaceAlign"] }, "Changed Section alignment")} />
          <SelectControl label="Distribution" value={section.surfaceDistribute || "start"} options={["start", "center", "end", "between", "around"]} onChange={(value) => patch({ surfaceDistribute: value as TapCardSection["surfaceDistribute"] }, "Changed Section distribution")} />
        </div>
        <SelectControl label="Height behavior" value={section.surfaceHeightMode || "fixed"} options={["auto", "fixed"]} onChange={(value) => patch({ surfaceHeightMode: value as TapCardSection["surfaceHeightMode"] }, "Changed Section height behavior")} />
        <NumberControl label="Exact minimum height (px)" value={section.surfaceMinHeightPx ?? 260} onChange={(value) => patch({ surfaceMinHeightPx: Math.max(120, value), surfaceHeightMode: "fixed" }, "Resized Section height")} />
        <div className="grid grid-cols-3 gap-1">
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={fitHeight}>Fit content</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => patch({ surfaceMinHeightPx: (section.surfaceMinHeightPx ?? 260) + 24 }, "Added space below")}>+ below</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => patch({ surfaceMinHeightPx: (section.surfaceMinHeightPx ?? 260) + 24, surfacePaddingPx: (section.surfacePaddingPx ?? 24) + 12 }, "Added space above")}>+ above</button>
        </div>
        <RangeControl label="Padding" value={section.surfacePaddingPx ?? 24} min={0} max={80} suffix="px" onChange={(value) => patch({ surfacePaddingPx: value }, "Changed Section padding")} />
        <RangeControl label="Element gap" value={section.surfaceGapPx ?? 12} min={0} max={64} suffix="px" onChange={(value) => patch({ surfaceGapPx: value }, "Changed Element spacing")} />
      </InspectorGroup>
      <InspectorGroup title="Background · Surface">
        <p className="text-[10px] text-white/70">{section.sourceMode === "BRAND" ? "From Brand" : "Custom on this Card"}</p>
        <ColorControl label="Background color" value={section.backgroundColor || "#171b24"} onChange={(value) => patch({ backgroundColor: value, sourceMode: "LOCAL" }, "Changed Section background")} />
        <MediaPicker value={section.backgroundImageUrl} valueAssetId={section.backgroundMediaAssetId} label="Section background image" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patch({ backgroundImageUrl: value }, "Changed Section background image")} onAssetChange={(asset) => patch({ backgroundMediaAssetId: asset?.id }, "Selected Section background Asset")} />
        <SelectControl label="Background fit" value={section.backgroundFit || "cover"} options={["cover", "contain", "fill"]} onChange={(value) => patch({ backgroundFit: value as TapCardSection["backgroundFit"] }, "Changed Section background fit")} />
        <TextControl label="Background position" value={section.backgroundPosition || "50% 50%"} onChange={(value) => patch({ backgroundPosition: value }, "Changed Section background position")} />
        <ColorControl label="Overlay color" value={section.overlayColor || "#000000"} onChange={(value) => patch({ overlayColor: value }, "Changed background overlay color")} />
        <RangeControl label="Overlay opacity" value={Math.round((section.overlayOpacity ?? 0) * 100)} min={0} max={100} suffix="%" onChange={(value) => patch({ overlayOpacity: value / 100 }, "Changed background overlay")} />
        <div className="grid grid-cols-2 gap-2">
          <RangeControl label="Border" value={section.surfaceBorderWidthPx ?? 0} min={0} max={12} suffix="px" onChange={(value) => patch({ surfaceBorderWidthPx: value }, "Changed Section border")} />
          <RangeControl label="Radius" value={section.surfaceRadiusPx ?? 18} min={0} max={64} suffix="px" onChange={(value) => patch({ surfaceRadiusPx: value }, "Changed Section radius")} />
        </div>
        <SelectControl label="Shadow" value={section.surfaceShadow || "none"} options={["none", "soft", "medium", "strong"]} onChange={(value) => patch({ surfaceShadow: value as TapCardSection["surfaceShadow"] }, "Changed Section shadow")} />
        <RangeControl label="Overall opacity" value={section.opacity ?? 100} min={0} max={100} suffix="%" onChange={(value) => patch({ opacity: value }, "Changed Section opacity")} />
      </InspectorGroup>
      <InspectorGroup title="Responsive · Behavior">
        <SelectControl label="Small screens" value={section.responsiveBehavior || "stack"} options={["stack", "scale", "hide_decorative"]} onChange={(value) => patch({ responsiveBehavior: value as TapCardSection["responsiveBehavior"] }, "Changed responsive behavior")} />
        <ObjectActions visible={section.enabled} locked={Boolean(section.locked)} onVisible={() => model.toggleSectionVisible(section.id)} onLocked={() => model.toggleSectionLocked(section.id)} onDuplicate={() => model.duplicateSection(section.id)} onDelete={() => model.deleteSection(section.id)} />
      </InspectorGroup>
      {warnings.length ? <Warnings warnings={warnings} /> : null}
    </div>
  );
}

function ElementInspector({ model, section, element }: { model: CardEditorLiveModel; section: TapCardSection; element: CreativeCompositionNode }) {
  const selectionIds = model.selectedCompositionNodeIds?.length ? model.selectedCompositionNodeIds : [element.id];
  const selectedNodes = section.composition?.nodes.filter((node) => selectionIds.includes(node.id)) ?? [element];
  const patch = (next: Partial<CreativeCompositionNode>, label: string) => {
    const composition = section.composition;
    if (!composition) return;
    model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.map((node) => node.id === element.id ? { ...node, ...next, props: { ...node.props, ...(next.props || {}) } } : node) } }, label);
  };
  const replaceNodes = (nodes: CreativeCompositionNode[], label: string) => {
    const composition = section.composition;
    if (composition) model.patchSection(section.id, { composition: { ...composition, nodes } }, label);
  };
  const patchProps = (props: Record<string, unknown>, label: string) => patch({ props: { ...element.props, ...props } }, label);
  const textKey = element.primitive === "button" ? "label" : "text";
  const kind = String(element.props.elementKind || element.primitive);
  const isButton = element.primitive === "button";
  const isMap = kind === "map";
  return (
    <div className="space-y-4">
      {selectedNodes.length > 1 ? <div className="rounded-lg border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-3 text-xs" data-testid="composer-multi-selection">{selectedNodes.length} Elements selected</div> : null}
      {isMap ? <MapInspector model={model} element={element} patchProps={patchProps} /> : null}
      {isButton ? <ButtonInspector model={model} element={element} patch={patch} patchProps={patchProps} /> : null}
      <InspectorGroup title="Content">
        {(element.primitive === "text" || (element.primitive === "button" && !isButton)) ? <TextControl label={element.primitive === "button" ? "Label" : "Text"} multiline value={String(element.props[textKey] || "")} onChange={(value) => patchProps({ [textKey]: value }, "Edited Element content")} /> : null}
        <p className="text-[10px] text-white/70">{element.props.sourceMode === "BRAND" ? "From Brand" : "Custom on this Card"}</p>
      </InspectorGroup>
      <InspectorGroup title={element.primitive === "image" ? "Crop & fit" : element.primitive === "button" ? "Typography" : "Typography / color"}>
        {(element.primitive === "text" || element.primitive === "button") ? <>
          <VisualFontPicker value={String(element.props.fontFamily || "Inter, system-ui, sans-serif")} brandFont={model.strInherited("bodyFont")} onChange={(value) => patchProps({ fontFamily: value }, "Changed font")} />
          <RangeControl label="Weight" value={Number(element.props.fontWeight || 600)} min={100} max={900} onChange={(value) => patch({ props: { ...element.props, fontWeight: value } }, "Changed font weight")} />
          <RangeControl label="Size" value={Number(element.props.fontSize || 18)} min={8} max={96} suffix="px" onChange={(value) => patch({ props: { ...element.props, fontSize: value } }, "Changed text size")} />
          <RangeControl label="Line height" value={Number(element.props.lineHeight || 1.2) * 10} min={8} max={24} onChange={(value) => patch({ props: { ...element.props, lineHeight: value / 10 } }, "Changed line height")} />
          <RangeControl label="Letter spacing" value={Number(element.props.letterSpacingEm || 0) * 100} min={-10} max={50} onChange={(value) => patch({ props: { ...element.props, letterSpacingEm: value / 100 } }, "Changed letter spacing")} />
          <ColorControl label="Text color" value={String(element.props[element.primitive === "button" ? "textColor" : "color"] || "#f8fafc")} onChange={(value) => patch({ props: { ...element.props, [element.primitive === "button" ? "textColor" : "color"]: value, sourceMode: "LOCAL" } }, "Changed Element color")} />
          <SelectControl label="Alignment" value={String(element.props.align || "center")} options={["left", "center", "right", "justify"]} onChange={(value) => patch({ props: { ...element.props, align: value } }, "Changed text alignment")} />
          <SelectControl label="Text transform" value={String(element.props.textTransform || "none")} options={["none", "uppercase", "lowercase", "capitalize"]} onChange={(value) => patch({ props: { ...element.props, textTransform: value } }, "Changed text transform")} />
        </> : null}
        {element.primitive === "image" ? <>
          <SelectControl label="Fit" value={String(element.props.fit || "cover")} options={["cover", "contain", "fill", "none"]} onChange={(value) => patch({ props: { ...element.props, fit: value } }, "Changed image fit")} />
          <RangeControl label="Focal point X" value={Number(element.props.focalX ?? .5) * 100} min={0} max={100} suffix="%" onChange={(value) => patch({ props: { ...element.props, focalX: value / 100 } }, "Changed image focal point")} />
          <RangeControl label="Focal point Y" value={Number(element.props.focalY ?? .5) * 100} min={0} max={100} suffix="%" onChange={(value) => patch({ props: { ...element.props, focalY: value / 100 } }, "Changed image focal point")} />
          <label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={element.props.aspectLocked !== false} onChange={(event) => patch({ props: { ...element.props, aspectLocked: event.target.checked } }, "Changed image aspect lock")} />Maintain aspect ratio</label>
        </> : null}
      </InspectorGroup>
      <InspectorGroup title="Size / position">
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="X %" value={Math.round(element.x * 100)} onChange={(value) => patch({ x: value / 100 }, "Moved Element")} />
          <NumberControl label="Y %" value={Math.round(element.y * 100)} onChange={(value) => patch({ y: value / 100 }, "Moved Element")} />
          <NumberControl label="Width %" value={Math.round(element.width * 100)} onChange={(value) => patch({ width: value / 100 }, "Resized Element")} />
          <NumberControl label="Height %" value={Math.round(element.height * 100)} onChange={(value) => patch({ height: value / 100 }, "Resized Element")} />
        </div>
        <NumberControl label="Rotation °" value={Math.round(element.rotationDeg || 0)} onChange={(value) => patch({ rotationDeg: value }, "Rotated Element")} />
        {(element.primitive === "button" || element.primitive === "image") ? <TextControl label={element.primitive === "button" ? "Destination" : "Image URL"} value={String(element.props[element.primitive === "button" ? "href" : "src"] || "")} onChange={(value) => patch({ props: { ...element.props, [element.primitive === "button" ? "href" : "src"]: value } }, "Changed Element source")} /> : null}
      </InspectorGroup>
      <InspectorGroup title="Alignment · layers">
        <div className="grid grid-cols-3 gap-1" data-testid="composer-alignment-controls">
          {(["left", "center", "right", "top", "middle", "bottom"] as const).map((mode) => <button key={mode} type="button" className="min-h-9 rounded border border-white/10 text-[10px] capitalize disabled:opacity-35" disabled={selectedNodes.length < 2} onClick={() => replaceNodes(alignNodes(section.composition!.nodes, selectionIds, mode), `Aligned Elements ${mode}`)}>{mode === "middle" ? "Center V" : mode}</button>)}
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px] disabled:opacity-35" disabled={selectedNodes.length < 3} onClick={() => replaceNodes(distributeNodes(section.composition!.nodes, selectionIds, "horizontal"), "Distributed Elements horizontally")}>Distribute H</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px] disabled:opacity-35" disabled={selectedNodes.length < 3} onClick={() => replaceNodes(distributeNodes(section.composition!.nodes, selectionIds, "vertical"), "Distributed Elements vertically")}>Distribute V</button>
        </div>
        {section.surfaceLayout === "free" && selectedNodes.length === 1 ? <div className="grid grid-cols-2 gap-1" data-testid="composer-layer-controls">
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => replaceNodes(bringForward(section.composition!.nodes, element.id), "Brought Element forward")}>Bring forward</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => replaceNodes(sendBackward(section.composition!.nodes, element.id), "Sent Element backward")}>Send backward</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => replaceNodes(bringToFront(section.composition!.nodes, element.id), "Brought Element to front")}>Bring to front</button>
          <button type="button" className="min-h-9 rounded border border-white/10 text-[10px]" onClick={() => replaceNodes(sendToBack(section.composition!.nodes, element.id), "Sent Element to back")}>Send to back</button>
        </div> : null}
      </InspectorGroup>
      <InspectorGroup title={element.primitive === "button" ? "Shape & fill" : element.primitive === "image" ? "Frame" : "Appearance"}>
        {element.primitive === "button" ? <ColorControl label="Fill" value={String(element.props.fill || "#22c55e")} onChange={(value) => patch({ props: { ...element.props, fill: value, sourceMode: "LOCAL" } }, "Changed button fill")} /> : null}
        <RangeControl label="Padding" value={Number(element.props.padding || 0)} min={0} max={48} suffix="px" onChange={(value) => patch({ props: { ...element.props, padding: value } }, "Changed Element padding")} />
        <RangeControl label="Border" value={Number(element.props.borderWidth || 0)} min={0} max={12} suffix="px" onChange={(value) => patch({ props: { ...element.props, borderWidth: value } }, "Changed Element border")} />
        <RangeControl label="Radius" value={Number(element.props.radius || 0)} min={0} max={64} suffix="px" onChange={(value) => patch({ props: { ...element.props, radius: value } }, "Changed Element radius")} />
        <RangeControl label="Opacity" value={Math.round(Number(element.props.opacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(value) => patch({ props: { ...element.props, opacity: value / 100 } }, "Changed Element opacity")} />
        {element.primitive === "image" ? <><TextControl label="Alt text" value={String(element.props.alt || "")} onChange={(value) => patch({ props: { ...element.props, alt: value } }, "Changed image alt text")} /><label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={element.props.decorative === true} onChange={(event) => patch({ props: { ...element.props, decorative: event.target.checked } }, "Changed image accessibility")} />Decorative image</label></> : null}
      </InspectorGroup>
      <InspectorGroup title="Responsive / behavior">
        <SelectControl label="Width rule" value={String(element.props.responsiveWidth || "percentage")} options={["fixed", "percentage", "stretch"]} onChange={(value) => patch({ props: { ...element.props, responsiveWidth: value } }, "Changed Element responsive rule")} />
        <SelectControl label="Anchor" value={element.anchor || "top-left"} options={["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"]} onChange={(value) => patch({ anchor: value as CreativeCompositionNode["anchor"] }, "Changed Element anchor")} />
        <ObjectActions visible={element.visible !== false} locked={Boolean(element.locked)} onVisible={() => patch({ visible: element.visible === false }, "Changed Element visibility")} onLocked={() => patch({ locked: !element.locked }, "Changed Element lock")} onDuplicate={() => {
          const composition = section.composition!;
          model.patchSection(section.id, { composition: { ...composition, nodes: [...composition.nodes, { ...structuredClone(element), id: `${element.id}-copy-${Date.now()}`, x: Math.min(.9, element.x + .03), y: Math.min(.9, element.y + .03) }] } }, "Duplicated Element");
        }} onDelete={() => {
          if (element.locked) {
            model.notify?.("This Element is locked. Unlock it before deleting it.");
            return;
          }
          const composition = section.composition!;
          model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.filter((node) => !selectionIds.includes(node.id) || node.locked) } }, selectionIds.length > 1 ? "Deleted selected Elements" : "Deleted Element");
          model.setSelectedCompositionNodeIds?.([]);
        }} />
      </InspectorGroup>
    </div>
  );
}

function ButtonInspector({ model, element, patch, patchProps }: { model: CardEditorLiveModel; element: CreativeCompositionNode; patch: (next: Partial<CreativeCompositionNode>, label: string) => void; patchProps: (props: Record<string, unknown>, label: string) => void }) {
  const action = String(element.props.actionType || "website") as ButtonActionType;
  return <>
    <InspectorGroup title="Button · Content">
      <TextControl label="Label" value={String(element.props.label || "")} onChange={(value) => patchProps({ label: value }, "Changed Button label")} />
      <label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={element.props.showLabel !== false} onChange={(event) => patchProps({ showLabel: event.target.checked }, "Changed Button label visibility")} />Show label</label>
      <TextControl label="Supporting description" multiline value={String(element.props.description || "")} onChange={(value) => patchProps({ description: value, showDescription: Boolean(value) }, "Changed Button description")} />
      <label className="flex items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={element.props.showDescription === true} onChange={(event) => patchProps({ showDescription: event.target.checked }, "Changed Button description visibility")} />Show description</label>
      <TextControl label="Icon" value={String(element.props.icon || "arrow-up-right")} onChange={(value) => patchProps({ icon: value }, "Changed Button icon")} />
      <RangeControl label="Icon size" value={Number(element.props.iconSize || 20)} min={12} max={64} suffix="px" onChange={(value) => patchProps({ iconSize: value }, "Changed Button icon size")} />
    </InspectorGroup>
    <InspectorGroup title="Button · Action">
      <SelectControl label="Action type" value={action} options={["call", "email", "website", "directions", "reviews", "social", "custom", "claim_offer", "tapsave", "campaign"]} onChange={(value) => { const location = value === "directions" ? model.locations?.find((item) => item.isDefault) || model.locations?.[0] : undefined; patchProps({ actionType: value, ...(location ? { locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "", mapSourceMode: "workspace_location", icon: "map-pin", label: "Get directions", accessibleLabel: "Get directions" } : {}) }, "Changed Button action"); }} />
      <TextControl label="Destination" value={String(element.props.href || "")} onChange={(value) => patchProps({ href: value }, "Changed Button destination")} />
      {action === "directions" ? <><SelectControl label="Location source" value={String(element.props.mapSourceMode || "workspace_default")} options={["workspace_default", "workspace_location", "custom_address", "coordinates", "pasted_url", "event_location"]} onChange={(value) => patchProps({ mapSourceMode: value }, "Changed Directions source")} /><label className="block text-[10px] text-white/70"><span>Workspace Location</span><select className="mt-1 h-10 w-full rounded border border-white/10 bg-[#0b1019] px-2 text-xs" value={String(element.props.locationId || "")} onChange={(event) => { const location = model.locations?.find((item) => item.id === event.target.value); if (location) patchProps({ locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "", mapSourceMode: "workspace_location" }, "Selected Directions Location"); }}><option value="">Choose a Location…</option>{(model.locations || []).map((location) => <option key={location.id} value={location.id}>{location.name}{location.isDefault ? " · Default" : ""} — {location.address || "No address"}</option>)}</select></label><TextControl label="Directions address" value={String(element.props.address || "")} onChange={(value) => patchProps({ address: value, mapSourceMode: "custom_address" }, "Changed Directions address")} /><SelectControl label="Open with" value={String(element.props.mapOpenApp || "default")} options={["default", "apple", "google", "waze", "browser", "custom"]} onChange={(value) => patchProps({ mapOpenApp: value }, "Changed Directions application")} /></> : null}
      <TextControl label="Accessibility label" value={String(element.props.accessibleLabel || element.props.label || "")} onChange={(value) => patchProps({ accessibleLabel: value }, "Changed Button accessibility label")} />
    </InspectorGroup>
    <InspectorGroup title="Button · Presentation">
      <OptionSelectControl label="Presentation" value={String(element.props.presentation || "rounded")} options={BUTTON_PRESENTATIONS} onChange={(value) => { const presentation = value as ButtonPresentation; const dimensions = presentation === "icon_description" ? { width: Math.max(element.width, .32), height: Math.max(element.height, .34) } : presentation === "icon_label" ? { width: Math.max(element.width, .26), height: Math.max(element.height, .27) } : (presentation === "circle" || presentation === "icon_circle") ? { width: Math.max(element.width, .2), height: Math.max(element.height, .2) } : {}; patch({ ...dimensions, props: { ...element.props, presentation } }, "Changed Button presentation"); }} />
      <RangeControl label="Icon / label spacing" value={Number(element.props.spacing || 6)} min={0} max={32} suffix="px" onChange={(value) => patchProps({ spacing: value }, "Changed Button spacing")} />
      <RangeControl label="Touch target" value={Number(element.props.touchTargetPx || 52)} min={44} max={96} suffix="px" onChange={(value) => patchProps({ touchTargetPx: value }, "Changed Button touch target")} />
    </InspectorGroup>
  </>;
}

function MapInspector({ model, element, patchProps }: { model: CardEditorLiveModel; element: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => void }) {
  const source = String(element.props.mapSourceMode || "workspace_default") as MapSourceMode;
  const href = buildMapHref(element.props, model.locations || []);
  return <div data-testid="composer-map-setup">
    <InspectorGroup title="Map setup · Source">
      <SelectControl label="Location source" value={source} options={["workspace_default", "workspace_location", "custom_address", "coordinates", "pasted_url", "event_location"]} onChange={(value) => patchProps({ mapSourceMode: value }, "Changed Map source")} />
      {(source === "workspace_default" || source === "workspace_location") ? <label className="block text-[10px] text-white/70"><span>Workspace Location</span><select data-testid="map-workspace-location-picker" className="mt-1 h-11 w-full rounded border border-white/10 bg-[#0b1019] px-2 text-xs text-white" value={String(element.props.locationId || (source === "workspace_default" ? model.locations?.find((location) => location.isDefault)?.id || "" : ""))} onChange={(event) => {
        const location = model.locations?.find((item) => item.id === event.target.value);
        if (location) patchProps({ locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "", mapSourceMode: "workspace_location" }, "Selected Workspace Location");
      }}><option value="">Choose a Location…</option>{(model.locations || []).map((location) => <option key={location.id} value={location.id}>{location.name}{location.isDefault ? " · Default" : ""} — {location.address || "No address"}</option>)}</select></label> : null}
      {(source === "custom_address" || source === "event_location") ? <><TextControl label="Location name" value={String(element.props.locationName || "")} onChange={(value) => patchProps({ locationName: value }, "Changed Map location name")} /><TextControl label="Address" multiline value={String(element.props.address || "")} onChange={(value) => patchProps({ address: value }, "Changed Map address")} /></> : null}
      {source === "coordinates" ? <div className="grid grid-cols-2 gap-2"><NumberControl label="Latitude" value={Number(element.props.latitude || 0)} onChange={(value) => patchProps({ latitude: value }, "Changed Map latitude")} /><NumberControl label="Longitude" value={Number(element.props.longitude || 0)} onChange={(value) => patchProps({ longitude: value }, "Changed Map longitude")} /></div> : null}
      {source === "pasted_url" ? <TextControl label="Pasted map URL" value={String(element.props.mapUrl || "")} onChange={(value) => patchProps({ mapUrl: value }, "Changed Map URL")} /> : null}
    </InspectorGroup>
    <InspectorGroup title="Map setup · Display">
      <OptionSelectControl label="Presentation" value={String(element.props.mapDisplayMode || "location_card")} options={MAP_DISPLAY_MODES} onChange={(value) => patchProps({ mapDisplayMode: value as MapDisplayMode }, "Changed Map presentation")} />
      <RangeControl label="Zoom" value={Number(element.props.zoom || 15)} min={1} max={20} onChange={(value) => patchProps({ zoom: value }, "Changed Map zoom")} />
      <TextControl label="Marker label" value={String(element.props.markerLabel || "Destination")} onChange={(value) => patchProps({ markerLabel: value }, "Changed Map marker")} />
    </InspectorGroup>
    <InspectorGroup title="Map setup · Open behavior">
      <SelectControl label="Open with" value={String(element.props.mapOpenApp || "default")} options={["default", "apple", "google", "waze", "browser", "custom"]} onChange={(value) => patchProps({ mapOpenApp: value as MapOpenApp }, "Changed Map application")} />
      <SelectControl label="Action" value={String(element.props.mapOpenAction || "directions")} options={["show", "directions", "routes"]} onChange={(value) => patchProps({ mapOpenAction: value }, "Changed Map open action")} />
      {element.props.mapOpenApp === "custom" ? <TextControl label="Custom directions URL" value={String(element.props.customDirectionsUrl || "")} onChange={(value) => patchProps({ customDirectionsUrl: value }, "Changed custom directions URL")} /> : null}
      <p className={href ? "text-[10px] text-emerald-200" : "text-[10px] text-amber-200"}>{href ? "Working directions link generated safely." : "Choose a Location or enter a valid source. A meaningful location card is shown instead of an empty map."}</p>
    </InspectorGroup>
  </div>;
}

const SYSTEM_FONTS = [
  { name: "Inter", value: "Inter, system-ui, sans-serif", group: "Recommended" },
  { name: "Arial", value: "Arial, sans-serif", group: "System fonts" },
  { name: "Georgia", value: "Georgia, serif", group: "System fonts" },
  { name: "Trebuchet", value: "Trebuchet MS, sans-serif", group: "System fonts" },
  { name: "Courier", value: "Courier New, monospace", group: "System fonts" },
  { name: "Verdana", value: "Verdana, sans-serif", group: "System fonts" },
];

function VisualFontPicker({ value, brandFont, onChange }: { value: string; brandFont?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const options = [{ name: "Brand font", value: brandFont || "Inter, system-ui, sans-serif", group: "Brand fonts" }, ...SYSTEM_FONTS].filter((font, index, all) => all.findIndex((candidate) => candidate.value === font.value) === index).filter((font) => font.name.toLowerCase().includes(query.toLowerCase()));
  return <div data-testid="visual-font-picker"><button type="button" className="flex min-h-10 w-full items-center justify-between rounded border border-white/10 px-2 text-left text-xs" onClick={() => setOpen((current) => !current)} aria-expanded={open}><span><span className="block text-[9px] text-white/55">Font</span><span style={{ fontFamily: value }}>Business name · Aa Bb Cc 123</span></span><span>⌄</span></button>{open ? <div className="mt-2 rounded-lg border border-white/15 bg-[#0b1019] p-2 shadow-xl"><label className="flex items-center gap-2 rounded border border-white/10 px-2"><Search className="h-3.5 w-3.5" /><input autoFocus className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fonts" /></label><div className="mt-2 max-h-52 space-y-1 overflow-y-auto" role="listbox" aria-label="Available fonts">{options.length ? options.map((font) => <div key={`${font.group}-${font.value}`} className="flex items-stretch"><button type="button" role="option" aria-selected={font.value === value} className="min-h-12 min-w-0 flex-1 rounded px-2 text-left hover:bg-white/5 aria-selected:bg-[#b8ff2c]/10" style={{ fontFamily: font.value }} onClick={() => { onChange(font.value); setOpen(false); }}><span className="block text-[9px] font-sans text-white/45">{font.group} · {font.name}</span><span className="block truncate text-sm">Business name · Aa Bb Cc 123</span></button><button type="button" className="w-8" aria-label={`${favorites.includes(font.value) ? "Remove" : "Add"} ${font.name} favorite`} onClick={() => setFavorites((current) => current.includes(font.value) ? current.filter((item) => item !== font.value) : [...current, font.value])}><Star className={favorites.includes(font.value) ? "h-3.5 w-3.5 fill-[#b8ff2c] text-[#b8ff2c]" : "h-3.5 w-3.5"} /></button></div>) : <p className="p-3 text-xs text-white/55">No fonts match “{query}”.</p>}</div><details className="mt-2"><summary className="cursor-pointer text-[10px] text-white/55">Advanced / technical</summary><TextControl label="Exact font-family string" value={value} onChange={onChange} /></details></div> : null}</div>;
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
                <span className="ml-auto text-[9px] text-white/70">{toggle?.enabled ? (reason ? "Included · ineligible" : "Included · Preview on") : "Excluded · Preview off"}</span>
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
    <p className="mt-1 text-[10px] text-white/70">Relevant fonts, palettes, logos and button styles. Applying Brand changes only the selected object.</p>
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
  if (!section) return <p className="rounded border border-white/10 p-3 text-xs text-white/70" data-testid="composer-asset-panel">Select a Section or media Element to use Assets.</p>;
  if (element?.primitive === "image") return <div className="rounded-lg border border-white/10 p-3" data-testid="composer-asset-panel"><MediaPicker value={String(element.props.src || "")} label="Image Element asset" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => {
    const composition = section.composition!;
    model.patchSection(section.id, { composition: { ...composition, nodes: composition.nodes.map((node) => node.id === element.id ? { ...node, props: { ...node.props, src: value } } : node) } }, "Selected Element Asset");
  }} /></div>;
  return <div className="rounded-lg border border-white/10 p-3" data-testid="composer-asset-panel"><MediaPicker value={section.backgroundImageUrl} label="Section background asset" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => model.patchSection(section.id, { backgroundImageUrl: value }, "Selected Section Asset")} /></div>;
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section className="rounded-lg border border-white/10 bg-white/[.025]"><button type="button" className="flex min-h-10 w-full items-center justify-between px-3 text-left text-xs font-semibold text-white/85" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{title}</span><span aria-hidden>{open ? "−" : "+"}</span></button>{open ? <div className="space-y-3 border-t border-white/5 p-3">{children}</div> : null}</section>;
}
function TextControl({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) { const C = multiline ? "textarea" : "input"; return <label className="block text-[10px] text-white/70"><span>{label}</span><C className="mt-1 min-h-9 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="flex items-center justify-between gap-2 text-[10px] text-white/70"><span>{label}</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(event) => onChange(event.target.value)} className="h-8 w-14 rounded border border-white/10 bg-transparent" /></label>; }
function RangeControl({ label, value, min, max, suffix = "", onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) { return <label className="block text-[10px] text-white/70"><span className="flex justify-between"><span>{label}</span><span>{Math.round(value)}{suffix}</span></span><input className="mt-1 w-full accent-[#b8ff2c]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function NumberControl({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-[10px] text-white/70"><span>{label}</span><input className="mt-1 h-8 w-full rounded border border-white/10 bg-black/20 px-2 text-xs text-white" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[10px] text-white/70"><span>{label}</span><select className="mt-1 h-9 w-full rounded border border-white/10 bg-[#0b1019] px-2 text-xs text-white" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
function OptionSelectControl({ label, value, options, onChange }: { label: string; value: string; options: ReadonlyArray<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="block text-[10px] text-white/70"><span>{label}</span><select className="mt-1 h-9 w-full rounded border border-white/10 bg-[#0b1019] px-2 text-xs text-white" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function ObjectActions({ visible, locked, onVisible, onLocked, onDuplicate, onDelete }: { visible: boolean; locked: boolean; onVisible: () => void; onLocked: () => void; onDuplicate: () => void; onDelete: () => void }) { return <div className="grid grid-cols-4 gap-1"><IconButton label={visible ? "Hide" : "Show"} onClick={onVisible}>{visible ? <Eye /> : <EyeOff />}</IconButton><IconButton label={locked ? "Unlock" : "Lock"} onClick={onLocked}>{locked ? <Unlock /> : <Lock />}</IconButton><IconButton label="Duplicate" onClick={onDuplicate}><Copy /></IconButton><IconButton label="Delete" onClick={onDelete}><Trash2 /></IconButton></div>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactElement }) { return <button type="button" className="flex min-h-11 flex-col items-center justify-center gap-1 rounded border border-white/10 text-[9px] text-white/70 hover:bg-white/5" onClick={onClick} title={label}>{children && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{children}</span>}{label}</button>; }
function Warnings({ warnings }: { warnings: string[] }) { return <div className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-3" role="status" data-testid="composer-responsive-warnings"><p className="text-xs font-semibold text-amber-100">Responsive checks</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-amber-100/75">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>; }
