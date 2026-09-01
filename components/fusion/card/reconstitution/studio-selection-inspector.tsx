"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { actionProps, reconcileActionIntent, standardButtonActions, validateActionDestination, type StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import { applyButtonIconAsset, updateButtonLabel, updateButtonLabelTypography, updateButtonTextSize } from "@/lib/fusion/creative-studio/button-composition";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { ButtonInspectorSection } from "./studio-selection-toolbar";
import { cn } from "@/lib/utils";
import { StudioIconDiscovery } from "./studio-icon-discovery";
import { StudioTapitAffordance } from "./studio-tapit-affordance";
import { StandardButtonPreview } from "./standard-button-preview";
import { StudioPrecisionControl } from "./studio-precision-control";

const SECTIONS: Array<{ id: ButtonInspectorSection; label: string }> = [
  { id: "content", label: "Content" },
  { id: "action", label: "Action" },
  { id: "appearance", label: "Appearance" },
  { id: "layout", label: "Layout" },
  { id: "accessibility", label: "Accessibility" },
  { id: "advanced", label: "Advanced" },
];

export function StudioSelectionInspector({
  model,
  node,
  section,
  onSectionChange,
  brandPrimary,
  onClose,
}: {
  model: CardEditorLiveModel;
  node: CreativeCompositionNode;
  section: ButtonInspectorSection;
  onSectionChange: (section: ButtonInspectorSection) => void;
  brandPrimary: string;
  onClose: () => void;
}) {
  const patchProps = (props: Record<string, unknown>, label: string) => model.patchSelection(model.selectionRef, { props }, label);
  return (
    <aside className="absolute inset-x-0 bottom-0 z-40 max-h-[66vh] overflow-y-auto rounded-t-3xl bg-[#0b111b]/98 text-white shadow-2xl backdrop-blur-xl xl:relative xl:inset-auto xl:z-10 xl:max-h-none xl:w-[310px] xl:shrink-0 xl:rounded-none" aria-label="Button Inspector" data-testid="studio-button-inspector">
      <header className="flex items-start gap-3 px-4 pb-2 pt-4"><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#b8ff2c]">Selected Button</p><h2 className="mt-1 text-base font-semibold tracking-tight">Edit Button</h2><p className="mt-1 text-[10px] text-white/38">Content, intent, and appearance stay with this Button.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-white/55 hover:bg-white/8 hover:text-white" aria-label="Close Button Inspector"><X className="h-4 w-4" /></button></header>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 md:grid md:grid-cols-3" aria-label="Inspector sections">
        {SECTIONS.map((item) => <button key={item.id} type="button" aria-pressed={section === item.id} onClick={() => onSectionChange(item.id)} className="min-h-9 shrink-0 rounded-xl px-2 text-[10px] text-white/48 hover:bg-white/6 aria-pressed:bg-white/9 aria-pressed:text-white" data-testid={`studio-inspector-tab-${item.id}`}>{item.label}</button>)}
      </nav>
      <div className="p-4">
        {section === "content" ? <ContentSection key={`${node.id}:${String(node.props.label || "")}:${String(node.props.description || "")}`} node={node} patchProps={patchProps} /> : null}
        {section === "action" ? <ActionSection key={`${node.id}:${String(node.props.actionType || "")}:${String(node.props.href || "")}`} node={node} patchProps={patchProps} /> : null}
        {section === "appearance" ? <AppearanceSection node={node} patchProps={patchProps} brandPrimary={brandPrimary} model={model} /> : null}
        {section === "layout" ? <LayoutSection node={node} model={model} /> : null}
        {section === "accessibility" ? <AccessibilitySection node={node} patchProps={patchProps} /> : null}
        {section === "advanced" ? <AdvancedSection node={node} patchProps={patchProps} /> : null}
      </div>
    </aside>
  );
}

function ContentSection({ node, patchProps }: { node: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => boolean }) {
  const [label, setLabel] = useState(String(node.props.label || ""));
  const [description, setDescription] = useState(String(node.props.description || ""));
  const commit = () => {
    if (label === String(node.props.label || "")) return;
    const previousLabel = String(node.props.label || "");
    const next = updateButtonLabel(node.props, label, node.id);
    patchProps(
      node.props.accessibleLabelSource === "label" || String(node.props.accessibleLabel || "") === previousLabel
        ? { ...next, accessibleLabel: label, accessibleLabelSource: "label" }
        : next,
      "Changed Button label"
    );
  };
  const commitDescription = () => {
    if (description === String(node.props.description || "")) return;
    patchProps({ ...node.props, description, showDescription: Boolean(description.trim()) }, "Changed Button supporting text");
  };
  const empty = !label.trim() && !String(node.props.accessibleLabel || "").trim();
  return <div className="space-y-4" data-testid="studio-inspector-content">
    <label className="block rounded-lg p-2 text-xs font-medium ring-1 ring-[#b8ff2c]/25">Label<input value={label} onChange={(event) => setLabel(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } if (event.key === "Escape") { setLabel(String(node.props.label || "")); event.currentTarget.blur(); } }} className={fieldClass} data-testid="studio-button-label" /></label>
    {empty ? <p className="rounded-lg border border-amber-300/25 bg-amber-300/8 p-2 text-[11px] text-amber-100">A Button needs a visible label or an accessible name before publication.</p> : null}
    {label.length > 42 ? <p className="text-[11px] text-amber-200">This label may wrap or overflow on phone. Shorten it or widen the Button.</p> : null}
    {(node.props.showDescription === true || description) ? <label className="block text-xs font-medium">Supporting text<input value={description} onChange={(event) => setDescription(event.target.value)} onBlur={commitDescription} onKeyDown={(event) => { if (event.key === "Enter") { commitDescription(); event.currentTarget.blur(); } }} className={fieldClass} data-testid="studio-button-description" /></label> : null}
    <div className="flex items-center justify-between"><p className="text-xs font-medium">Icon</p>{node.props.showIcon ? <button type="button" onClick={() => patchProps({ ...node.props, showIcon: false, icon: "none" }, "Removed Button icon")} className="rounded-full px-2 py-1 text-[9px] text-white/45 hover:bg-white/7 hover:text-white">Remove</button> : null}</div>
    <StudioIconDiscovery currentIcon={String(node.props.icon || "")} intentQuery={String(node.props.actionType || "action")} onSelect={(asset) => patchProps(applyButtonIconAsset(node.props, asset, node.id), `Changed Button icon to ${asset.iconName}`)} />
    {node.props.showIcon !== false ? <div><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/42">Icon placement</p><div className="grid grid-cols-4 gap-1">{(["before","above","after","below"] as const).map((position) => <button key={position} type="button" aria-pressed={String(node.props.iconPosition || "before") === position} onClick={() => patchProps({ ...node.props, iconPosition: position }, `Moved Button icon ${position}`)} className="min-h-9 rounded-lg bg-white/5 px-1 text-[9px] capitalize aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">{position}</button>)}</div></div> : null}
    <p className="text-[10px] leading-4 text-white/42">Icon and Action are independent. Changing one never silently changes the other.</p>
  </div>;
}

function ActionSection({ node, patchProps }: { node: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => boolean }) {
  const actions = standardButtonActions();
  const reconciled = reconcileActionIntent(node.props.actionType, String(node.props.href || ""));
  const initialKind = reconciled.kind;
  const [kind, setKind] = useState<StandardButtonActionIntent>(initialKind);
  const [destination, setDestination] = useState(reconciled.destination);
  const presentation = actions.find((item) => item.kind === kind)!;
  const error = destination ? validateActionDestination(kind, destination) : null;
  const commit = () => { const validation = validateActionDestination(kind, destination); if (validation) return; patchProps({ ...node.props, ...actionProps(kind, destination) }, `Changed Button Action to ${presentation.label}`); };
  return <div className="space-y-4" data-testid="studio-inspector-action">
    <label className="block text-xs font-medium">Action<select value={kind} onChange={(event) => { const next = event.target.value as StandardButtonActionIntent; setKind(next); }} className={fieldClass} data-testid="studio-button-action-kind">{actions.map((action) => <option key={action.kind} value={action.kind}>{action.label}</option>)}</select></label>
    <label className="block text-xs font-medium">{presentation.fieldLabel}<input value={destination} inputMode={presentation.inputMode === "url" ? "url" : presentation.inputMode} placeholder={presentation.placeholder} onChange={(event) => setDestination(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } }} className={fieldClass} data-testid="studio-button-action-destination" /></label>
    {error ? <p className="text-[11px] text-amber-200" role="status">{error}</p> : null}
    {reconciled.source === "destination-scheme" ? <p className="text-[10px] leading-4 text-emerald-200/70">Intent recognized from the destination protocol and reconciled with stored Action state.</p> : null}
    {kind === "call" ? <p className="text-[10px] leading-4 text-white/45">Published calls use provider-neutral <code>tel:</code> behavior in every Signature family.</p> : null}
  </div>;
}

function AppearanceSection({ node, patchProps, brandPrimary, model }: { node: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => boolean; brandPrimary: string; model: CardEditorLiveModel }) {
  const treatments = [
    { id: "brand-glow", label: "Brand glow", detail: "Luminous primary action", props: { buttonSurfaceKind: "gradient", fill: brandPrimary, gradientFill: `linear-gradient(135deg,${brandPrimary},#7ee787)`, labelColor: "#07100a", borderWidth: 1, borderColor: "#ffffff42", radius: 999, shine: true, boxGlow: 14, boxShadow: 18, materialPreset: "raised_resin" } },
    { id: "quiet-outline", label: "Quiet outline", detail: "Low-noise secondary action", props: { buttonSurfaceKind: "solid", fill: "transparent", gradientFill: undefined, labelColor: "#f8fafc", borderWidth: 1, borderColor: "#ffffff55", radius: 14, shine: false, boxGlow: 0, boxShadow: 0, materialPreset: "flat" } },
    { id: "ink-raised", label: "Ink raised", detail: "Dimensional dark surface", props: { buttonSurfaceKind: "gradient", fill: "#111827", gradientFill: "linear-gradient(145deg,#263244 0%,#111827 48%,#06090f 100%)", labelColor: "#ffffff", borderWidth: 1, borderColor: "#ffffff26", radius: 16, shine: true, boxGlow: 0, boxShadow: 22, materialPreset: "bevel" } },
  ] as const;
  const swatches = Array.from(new Set([brandPrimary, String(node.props.fill || "#111827"), "#111827", "#f8fafc"]));
  const previewProps = (props: Record<string, unknown>) => model.previewSelection?.(model.selectionRef, { props });
  const precision = (label: string) => ({ onBegin: model.beginLiveAdjustment, onCommit: () => model.commitLiveAdjustment?.(label), onCancel: model.cancelLiveAdjustment });
  return <div className="space-y-5" data-testid="studio-inspector-appearance">
    <div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold">What should this look like?</h3><p className="mt-1 text-[10px] leading-4 text-white/40">Start visually, then refine only the properties that apply.</p></div><StudioTapitAffordance context="appearance" operations={[{ id: "brand", label: "Match my Brand", description: "Apply the current Brand primary color with readable contrast.", onSelect: () => patchProps({ ...node.props, ...treatments[0].props }, "Matched Button Appearance to Brand") }, { id: "contrast", label: "Increase contrast", description: "Use a dark raised surface with a high-contrast label.", onSelect: () => patchProps({ ...node.props, ...treatments[2].props }, "Increased Button contrast") }]} /></div>
    <section><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/42">Quick visual treatments</p><div className="space-y-2">{treatments.map((treatment) => <button key={treatment.id} type="button" onClick={() => patchProps({ ...node.props, ...treatment.props }, `Applied ${treatment.label}`)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[.04] p-2 text-left transition hover:bg-white/[.075]" data-testid={`studio-appearance-${treatment.id}`}><StandardButtonPreview props={{ ...node.props, ...treatment.props, label: String(node.props.label || "Button") }} className="min-h-[58px] w-28 shrink-0" /><span><strong className="block text-[11px]">{treatment.label}</strong><span className="mt-1 block text-[9px] text-white/38">{treatment.detail}</span></span></button>)}</div></section>
    <section><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/42">Button color</p><div className="flex flex-wrap gap-2">{swatches.map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Use ${index === 0 ? "Brand" : "document"} color ${color}`} onClick={() => patchProps({ ...node.props, fill: color, gradientFill: undefined, buttonSurfaceKind: "solid", labelColor: color.toLowerCase() === "#f8fafc" ? "#07100a" : "#ffffff" }, "Changed Button color")} className="h-9 w-9 rounded-full ring-1 ring-white/18 ring-offset-2 ring-offset-[#0b111b]" style={{ background: color }} />)}<label className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] text-[0px] ring-1 ring-white/20"><span className="sr-only">Custom Button color</span><input type="color" value={safeHexColor(node.props.fill, brandPrimary)} onChange={(event) => patchProps({ ...node.props, fill: event.target.value, gradientFill: undefined, buttonSurfaceKind: "solid" }, "Changed Button custom color")} className="h-0 w-0 opacity-0" /></label></div><p className="mt-2 text-[9px] text-white/32">Brand and document colors remain semantic underneath these real swatches.</p></section>
    <section className="space-y-4"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#d9c7ff]/70">Typography</p><div><p className="mb-2 text-xs font-medium">Text alignment</p><div className="grid grid-cols-3 gap-2">{(["left","center","right"] as const).map((align) => <button key={align} type="button" aria-pressed={String(node.props.textAlign || "center") === align} onClick={() => patchProps(updateButtonLabelTypography(node.props, { textAlign: align }, node.id), `Aligned Button text ${align}`)} className="min-h-9 rounded-lg border border-white/10 bg-white/[.035] px-2 text-[10px] capitalize hover:bg-white/[.075] aria-pressed:border-[#b8ff2c]/55 aria-pressed:bg-[#b8ff2c]/10 aria-pressed:text-[#d8ff82]">{align}</button>)}</div></div><StudioPrecisionControl label="Label size" value={Number(node.props.fontSize || 14)} descriptor={{ unit: "px", min: 10, max: 28, step: 1, fineStep: .5, defaultValue: 14 }} onPreview={(value) => previewProps(updateButtonTextSize(node.props, value, node.id))} {...precision("Changed Button text size")} testId="studio-button-text-size" /><div className="grid grid-cols-2 gap-2"><ColorWell label="Text" value={safeHexColor(node.props.labelColor, "#ffffff")} onChange={(value) => patchProps(updateButtonLabelTypography(node.props, { color: value }, node.id), "Changed Button text color")} />{node.props.showIcon ? <ColorWell label="Icon" value={safeHexColor(node.props.iconColor, safeHexColor(node.props.labelColor, "#ffffff"))} onChange={(value) => patchProps({ ...node.props, iconColor: value }, "Changed Button icon color")} /> : null}</div><label className="flex min-h-10 items-center justify-between rounded-xl bg-white/[.04] px-3 text-xs"><span><strong className="font-medium">Raised text</strong><small className="mt-0.5 block text-[9px] text-white/35">Adds a readable dimensional edge</small></span><input type="checkbox" checked={Boolean(node.props.textShadowLayers)} onChange={(event) => patchProps({ ...node.props, textShadowLayers: event.target.checked ? "0 1px 0 rgba(255,255,255,.32),0 -1px 0 rgba(0,0,0,.48),0 2px 4px rgba(0,0,0,.32)" : undefined }, `${event.target.checked ? "Raised" : "Flattened"} Button text`)} /></label></section>
    <section className="space-y-4"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#d9c7ff]/70">Typeface</p><label className="block text-xs font-medium">Family<select value={String(node.props.fontFamily || "Inter, system-ui, sans-serif")} onChange={(event) => patchProps(updateButtonLabelTypography(node.props, { fontFamily: event.target.value }, node.id), "Changed Button typeface")} className={fieldClass}><option value="Inter, system-ui, sans-serif">Inter</option><option value="Georgia, serif">Georgia</option><option value="ui-monospace, SFMono-Regular, monospace">Mono</option></select></label><StudioPrecisionControl label="Weight" value={Number(node.props.fontWeight || 600)} descriptor={{ unit: "number", min: 300, max: 900, step: 100, defaultValue: 600 }} onPreview={(value) => previewProps(updateButtonLabelTypography(node.props, { fontWeight: value }, node.id))} {...precision("Changed Button text weight")} /></section>
    <section className="space-y-4"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#d9c7ff]/70">Shape & edge</p><StudioPrecisionControl label="Corner radius" value={Number(node.props.radius || 0)} descriptor={{ unit: "px", min: 0, max: 40, step: 1, fineStep: .5, defaultValue: 14 }} onPreview={(value) => previewProps({ ...node.props, radius: value })} {...precision("Changed Button corners")} /><StudioPrecisionControl label="Border" value={Number(node.props.borderWidth || 0)} descriptor={{ unit: "px", min: 0, max: 6, step: 1, fineStep: .5, defaultValue: 0 }} onPreview={(value) => previewProps({ ...node.props, borderWidth: value, borderColor: String(node.props.borderColor || brandPrimary) })} {...precision("Changed Button border")} /><StudioPrecisionControl label="Shadow / depth" value={Number(node.props.boxShadow || 0)} descriptor={{ unit: "px", min: 0, max: 40, step: 1, defaultValue: 0 }} onPreview={(value) => previewProps({ ...node.props, boxShadow: value })} {...precision("Changed Button depth")} /></section>
  </div>;
}

function safeHexColor(value: unknown, fallback: string) {
  const candidate = String(value || "");
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

function ColorWell({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white/[.04] px-2.5 text-[10px] font-medium"><span className="h-7 w-7 rounded-lg ring-1 ring-white/20" style={{ background: value }} /><span>{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-0 w-0 opacity-0" /></label>;
}

function LayoutSection({ node, model }: { node: CreativeCompositionNode; model: CardEditorLiveModel }) {
  const patch = (next: Partial<CreativeCompositionNode>, label: string) => model.patchSelection(model.selectionRef, next, label);
  const move = (dx: number, dy: number, label: string) => patch({ x: Math.max(0, Math.min(1 - node.width, node.x + dx)), y: Math.max(0, Math.min(1 - node.height, node.y + dy)) }, label);
  if (node.compositionKind === "module") {
    const patchFlow = (props: Record<string, unknown>, label: string) => model.patchCompositionNode(node.id, { props: { ...node.props, ...props } }, label);
    return <div className="space-y-5" data-testid="studio-inspector-layout" data-position-authority="card-flow"><section><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#8bdcff]/70">Flow layout</p><StudioPrecisionControl label="Width" value={Number(node.props.flowWidthPercent ?? 100)} descriptor={{ unit: "%", min: 20, max: 100, step: 1, defaultValue: 100 }} onPreview={(value) => model.previewCompositionNode?.(node.id, { props: { ...node.props, flowWidthPercent: value } })} onBegin={model.beginLiveAdjustment} onCommit={() => model.commitLiveAdjustment?.("Changed Button width")} onCancel={model.cancelLiveAdjustment} /><StudioPrecisionControl label="Minimum height" value={Number(node.minHeightPx ?? 52)} descriptor={{ unit: "px", min: 44, max: 160, step: 1, defaultValue: 52 }} onPreview={(value) => model.previewCompositionNode?.(node.id, { minHeightPx: value })} onBegin={model.beginLiveAdjustment} onCommit={() => model.commitLiveAdjustment?.("Changed Button minimum height")} onCancel={model.cancelLiveAdjustment} /><StudioPrecisionControl label="Inner padding" value={Number(node.props.padding ?? 8)} descriptor={{ unit: "px", min: 4, max: 32, step: 1, defaultValue: 8 }} onPreview={(value) => model.previewCompositionNode?.(node.id, { props: { ...node.props, padding: value } })} onBegin={model.beginLiveAdjustment} onCommit={() => model.commitLiveAdjustment?.("Changed Button padding")} onCancel={model.cancelLiveAdjustment} /><div><p className="mb-2 text-xs font-medium">Alignment</p><div className="grid grid-cols-4 gap-1">{["start","center","end","stretch"].map((value) => <button key={value} type="button" aria-pressed={String(node.props.flowAlignment || "stretch") === value} onClick={() => patchFlow({ flowAlignment: value }, `Aligned Button ${value}`)} className="min-h-9 rounded-lg bg-white/5 px-1 text-[9px] capitalize aria-pressed:bg-[#b8ff2c] aria-pressed:text-[#07100a]">{value}</button>)}</div></div></section><p className="text-[10px] leading-4 text-white/42">This Button participates in Card flow. Drag it spatially to change canonical parent and order; unrestricted X/Y is intentionally unavailable.</p></div>;
  }
  return <div className="space-y-4" data-testid="studio-inspector-layout">
    <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium">Position & size</p><span className="text-[9px] text-white/32">% of canvas</span></div><div className="grid grid-cols-2 gap-3">{([['x','X'],['y','Y'],['width','Width'],['height','Height']] as const).map(([key, label]) => <label key={key} className="text-xs font-medium">{label}<input type="number" min={0} max={100} step={1} value={Math.round(Number(node[key]) * 100)} onChange={(event) => patch({ [key]: Math.max(0, Math.min(1, Number(event.target.value) / 100)) }, `Changed Button ${label}`)} className={fieldClass} data-testid={`studio-position-${key}`} /></label>)}</div></div>
    <label className="flex min-h-10 items-center justify-between rounded-xl bg-white/[.04] px-3 text-xs"><span>Lock aspect ratio</span><input type="checkbox" checked={node.props.aspectLocked === true} onChange={(event) => patch({ props: { ...node.props, aspectLocked: event.target.checked } }, `${event.target.checked ? "Locked" : "Unlocked"} Button aspect ratio`)} data-testid="studio-position-aspect-lock" /></label>
    <div><p className="mb-2 text-xs font-medium">Align</p><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => patch({ x: 0 }, "Aligned Button left")} className={compactButton}>Left</button><button type="button" onClick={() => patch({ x: (1 - node.width) / 2 }, "Centered Button horizontally")} className={compactButton}>Center</button><button type="button" onClick={() => patch({ x: 1 - node.width }, "Aligned Button right")} className={compactButton}>Right</button></div></div>
    <div><p className="mb-2 text-xs font-medium">Nudge</p><div className="grid grid-cols-4 gap-2"><button type="button" onClick={() => move(-.01, 0, "Nudged Button left")} className={compactButton} aria-label="Nudge left">←</button><button type="button" onClick={() => move(0, -.01, "Nudged Button up")} className={compactButton} aria-label="Nudge up">↑</button><button type="button" onClick={() => move(0, .01, "Nudged Button down")} className={compactButton} aria-label="Nudge down">↓</button><button type="button" onClick={() => move(.01, 0, "Nudged Button right")} className={compactButton} aria-label="Nudge right">→</button></div></div>
    <div><p className="mb-2 text-xs font-medium">Layer order</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => patch({ zIndex: node.zIndex - 1 }, "Sent Button backward")} className="min-h-10 rounded-lg border border-white/12 px-2 text-xs">Send backward</button><button type="button" onClick={() => patch({ zIndex: node.zIndex + 1 }, "Brought Button forward")} className="min-h-10 rounded-lg border border-white/12 px-2 text-xs">Bring forward</button></div></div>
    <p className="text-[10px] leading-4 text-white/42">Desktop: drag with smart guides; arrows nudge 1 px, Shift + arrows 10 px. Corner-resize with Shift preserves ratio. Touch uses these direct position controls instead of miniature desktop handles.</p>
  </div>;
}

function AccessibilitySection({ node, patchProps }: { node: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => boolean }) {
  return <div className="space-y-4"><label className="block text-xs font-medium">Accessible name<input value={String(node.props.accessibleLabel || node.props.label || "")} onChange={(event) => patchProps({ ...node.props, accessibleLabel: event.target.value, accessibleLabelSource: "custom" }, "Changed Button accessible name")} className={fieldClass} data-testid="studio-button-accessible-name" /></label><p className="text-[10px] leading-4 text-white/45">The visible label is used by default. Set a distinct name only when it adds necessary context.</p></div>;
}

function AdvancedSection({ node, patchProps }: { node: CreativeCompositionNode; patchProps: (props: Record<string, unknown>, label: string) => boolean }) {
  return <div className="space-y-4"><label className="block text-xs font-medium">Opacity<input type="number" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ ...node.props, opacity: Number(event.target.value) / 100 }, "Changed Button opacity")} className={fieldClass} /></label><label className="block text-xs font-medium">Tracking name<input value={String(node.props.trackingName || "")} onChange={(event) => patchProps({ ...node.props, trackingName: event.target.value }, "Changed Button tracking name")} className={fieldClass} /></label><p className="text-[10px] leading-4 text-white/40">Exact controls live here so common visual choices remain fast and understandable.</p></div>;
}

const fieldClass = cn("mt-1.5 h-10 w-full rounded-lg border border-white/12 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#b8ff2c]/60");
const compactButton = "min-h-9 rounded-lg border border-white/10 bg-white/[.035] px-2 text-[10px] hover:bg-white/[.075]";
