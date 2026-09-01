"use client";

import { useState } from "react";
import {
  SIGNATURE_ASSEMBLY_RECIPES,
  setSignatureActionCount,
  setSignatureComponentVariant,
  setSignatureDecorativeFurniture,
  setSignatureLayout,
  reorderSignatureAction,
  updateSignatureAction,
  type SignatureAssemblyAuthoringState,
  type SignatureAuthoringFamily,
} from "@/lib/fusion/creative-studio/signature-assets";

type Props = {
  catalog: SignatureAuthoringFamily;
  state: SignatureAssemblyAuthoringState;
  disabled?: boolean;
  onChange: (state: SignatureAssemblyAuthoringState, label: string) => void;
};

const fieldClass = "mt-1 min-h-9 w-full rounded border border-white/15 bg-black/30 px-2 text-[11px] text-white outline-none focus-visible:border-[#b8ff2c] focus-visible:ring-2 focus-visible:ring-[#b8ff2c]/30 disabled:opacity-45";
const buttonClass = "min-h-9 rounded border border-white/15 px-2 text-[10px] text-white/75 outline-none hover:border-[#b8ff2c]/60 focus-visible:border-[#b8ff2c] focus-visible:ring-2 focus-visible:ring-[#b8ff2c]/30 disabled:opacity-40";
const choiceClass = (selected: boolean) => `${buttonClass} ${selected ? "border-[#d9aa57] bg-[#d9aa57]/12 text-[#fff0ce]" : "bg-black/20"}`;
const characterGuidance = { small: 26, medium: 20, large: 15 } as const;

function ActionEditor({ action, index, count, catalog, state, onChange }: {
  action: SignatureAssemblyAuthoringState["input"]["actions"][number];
  index: number;
  count: number;
  catalog: SignatureAuthoringFamily;
  state: SignatureAssemblyAuthoringState;
  onChange: Props["onChange"];
}) {
  const [plugSearch, setPlugSearch] = useState("");
  const [showAllPlugs, setShowAllPlugs] = useState(false);
  const selectedPlug = catalog.plugs.find((plug) => plug.normalizedContract?.componentId === action.plugComponentId);
  const matchedPlugs = catalog.plugs.filter((plug) => `${plug.label} ${plug.normalizedContract?.componentId ?? ""}`.toLowerCase().includes(plugSearch.trim().toLowerCase()));
  const orderedPlugs = [selectedPlug, ...matchedPlugs.filter((plug) => plug.id !== selectedPlug?.id)].filter(Boolean) as typeof catalog.plugs;
  const visiblePlugs = showAllPlugs || plugSearch.trim() ? orderedPlugs : orderedPlugs.slice(0, 8);
  const textAlign = action.textAlign ?? "center";
  const textSize = action.textSize ?? "medium";
  const recommendedCharacters = characterGuidance[textSize];
  const needsShorterCopy = action.label.trim().length > recommendedCharacters;

  return (
    <details open={index === 0} className="group rounded border border-white/10 bg-black/15" data-testid={`signature-action-${action.id}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b8ff2c]/45">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#d9aa57]/35 text-[9px] font-semibold text-[#f0c778]">{index + 1}</span>
        {selectedPlug ? <img className="h-8 w-8 shrink-0 object-contain" src={selectedPlug.sourceAsset} alt="" aria-hidden /> : null}
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/85">{action.label || `Action ${index + 1}`}</span>
        <span className="text-[9px] text-white/35 group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <div className="space-y-2 border-t border-white/8 p-2">
        <div className="flex justify-end gap-1">
          <button type="button" className={buttonClass} aria-label={`Move ${action.label} up`} disabled={index === 0} onClick={() => onChange(reorderSignatureAction(state, index, index - 1), "Reordered Signature action")}>↑</button>
          <button type="button" className={buttonClass} aria-label={`Move ${action.label} down`} disabled={index === count - 1} onClick={() => onChange(reorderSignatureAction(state, index, index + 1), "Reordered Signature action")}>↓</button>
        </div>
        <label className="block text-[9px] text-white/60">Label<input className={fieldClass} value={action.label} aria-label={`Action ${index + 1} label`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { label: event.target.value }), "Changed Signature action label")} /></label>
        <div>
          <p className="mb-1 text-[9px] text-white/60">Alignment</p>
          <div className="grid grid-cols-3 gap-1" aria-label={`Action ${index + 1} text alignment`}>
            {(["left", "center", "right"] as const).map((alignment) => <button key={alignment} type="button" className={choiceClass(textAlign === alignment)} aria-pressed={textAlign === alignment} onClick={() => onChange(updateSignatureAction(state, action.id, { textAlign: alignment }), `Aligned Signature action ${alignment}`)}>{alignment === "left" ? "≡ Left" : alignment === "right" ? "Right ≡" : "≡ Center ≡"}</button>)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[9px] text-white/60">Text size</p>
          <div className="grid grid-cols-3 gap-1" aria-label={`Action ${index + 1} text size`}>
            {(["small", "medium", "large"] as const).map((size) => <button key={size} type="button" className={choiceClass(textSize === size)} aria-pressed={textSize === size} onClick={() => onChange(updateSignatureAction(state, action.id, { textSize: size }), `Changed Signature action text to ${size}`)}>{size[0].toUpperCase() + size.slice(1)}</button>)}
          </div>
          <p className={`mt-1 text-[8px] ${needsShorterCopy ? "text-[#ffbf66]" : "text-white/38"}`}>{needsShorterCopy ? `Shorten this label for ${textSize} type (best under ${recommendedCharacters} characters).` : `${textSize[0].toUpperCase() + textSize.slice(1)} type is certified for labels up to ${recommendedCharacters} characters.`}</p>
        </div>
        <label className="block text-[9px] text-white/60">Destination<input className={fieldClass} value={action.destination} aria-label={`Action ${index + 1} destination`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { destination: event.target.value }), "Changed Signature action destination")} /></label>
        <label className="block text-[9px] text-white/60">Accessible name<input className={fieldClass} value={action.accessibilityLabel} aria-label={`Action ${index + 1} accessible name`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { accessibilityLabel: event.target.value }), "Changed Signature action accessible name")} /></label>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2"><p className="text-[9px] text-white/60">Plug</p><span className="text-[8px] text-white/35">Selected + compatible</span></div>
          <input className={fieldClass} value={plugSearch} aria-label={`Search Action ${index + 1} visual plugs`} placeholder="Search plugs" onChange={(event) => setPlugSearch(event.target.value)} />
          <div className="mt-2 grid grid-cols-4 gap-1.5" role="listbox" aria-label={`Action ${index + 1} visual plug`}>
            {visiblePlugs.map((plug) => {
              const componentId = plug.normalizedContract!.componentId;
              const selected = componentId === action.plugComponentId;
              return <button key={plug.id} type="button" role="option" aria-selected={selected} title={plug.label} className={`min-w-0 rounded border p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[#b8ff2c]/50 ${selected ? "border-[#d9aa57] bg-[#d9aa57]/14" : "border-white/10 bg-black/25 hover:border-white/30"}`} onClick={() => onChange(updateSignatureAction(state, action.id, { plugComponentId: componentId }), "Changed Signature visual plug")}><img className="mx-auto h-10 w-10 object-contain" src={plug.sourceAsset} alt="" aria-hidden /><span className="mt-0.5 block truncate text-[7px] text-white/55">{plug.label.split(" /")[0]}</span></button>;
            })}
          </div>
          {!plugSearch.trim() && orderedPlugs.length > 8 ? <button type="button" className="mt-1.5 text-[9px] text-[#e7bd71] underline-offset-2 hover:underline" onClick={() => setShowAllPlugs((value) => !value)}>{showAllPlugs ? "Show recommended" : `View all ${orderedPlugs.length} plugs`}</button> : null}
          {!visiblePlugs.length ? <p className="mt-2 text-[9px] text-white/45">No compatible plugs match that search.</p> : null}
          <p className="mt-1 text-[8px] text-white/38">Visual meaning and destination remain independent.</p>
        </div>
      </div>
    </details>
  );
}

export function SignatureAssemblyAuthoringControls({ catalog, state, disabled = false, onChange }: Props) {
  const currentLayout = catalog.layouts.find((layout) => layout.recipeId === state.input.recipeId);
  const recipe = SIGNATURE_ASSEMBLY_RECIPES.find((candidate) => candidate.recipeId === state.input.recipeId && candidate.recipeVersion === state.input.recipeVersion);
  const optionalFurniture = recipe?.optionalDecorativeTermination;
  const currentVariantRole = catalog.variants[0]?.role;

  return (
    <div className="space-y-3 rounded border border-[#d56c2d]/35 bg-black/25 p-2" data-testid="signature-assembly-authoring">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ffe1c2]">Assembly</p>
        <span className="text-[9px] text-white/45">{state.input.actions.length} live actions</span>
      </div>

      <fieldset disabled={disabled} className="space-y-3">
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-wide text-white/50">Layout</p>
          <div className="grid grid-cols-2 gap-1">
            {catalog.layouts.map((layout) => (
              <button key={layout.recipeId} type="button" className={buttonClass} aria-pressed={layout.recipeId === state.input.recipeId} data-testid={`signature-layout-${layout.layoutMode}`} onClick={() => onChange(setSignatureLayout(state, layout.layoutMode), `Changed Signature layout to ${layout.label}`)}>{layout.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[9px] uppercase tracking-wide text-white/50">Action count</p>
          <div className="flex flex-wrap gap-1" data-testid="signature-action-counts">
            {currentLayout?.launchCertifiedActionCounts.map((count) => (
              <button key={count} type="button" className={buttonClass} aria-pressed={count === state.input.requestedActionCount} data-testid={`signature-action-count-${count}`} onClick={() => onChange(setSignatureActionCount(state, count), `Changed Signature action count to ${count}`)}>{count}</button>
            ))}
          </div>
        </div>

        {currentVariantRole && catalog.variants.length ? (
          <label className="block text-[10px] text-white/65">Topper variant
            <select className={fieldClass} aria-label="Signature topper variant" data-testid="signature-topper-variant" value={state.input.componentVariants?.[currentVariantRole] ?? catalog.variants[0].componentId} onChange={(event) => onChange(setSignatureComponentVariant(state, currentVariantRole, event.target.value), "Changed Signature topper variant")}>
              {catalog.variants.filter((variant) => variant.role === currentVariantRole).map((variant) => <option key={variant.componentId} value={variant.componentId}>{variant.label}</option>)}
            </select>
          </label>
        ) : null}

        <details open className="rounded border border-white/10 bg-black/15">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-2 text-[9px] uppercase tracking-wide text-white/55"><span>Appearance</span><span className="normal-case tracking-normal text-[#e7bd71]">Certified finish</span></summary>
          <div className="flex items-center gap-2 border-t border-white/8 px-2 py-2">
            <span className="h-8 w-8 rounded-md border border-[#d3a55a]/60 bg-[linear-gradient(135deg,#060606_15%,#8b6a38_48%,#dfbd78_62%,#17130e_84%)] shadow-[inset_0_1px_rgba(255,255,255,.18)]" aria-hidden />
            <span><span className="block text-[10px] text-white/75">Champagne gold · blackened gunmetal</span><span className="block text-[8px] text-white/38">Certified Cabinet Noir finish</span></span>
          </div>
        </details>

        <div className="space-y-2" data-testid="signature-action-editor">
          <p className="text-[9px] uppercase tracking-wide text-white/50">Actions</p>
          {state.input.actions.map((action, index) => <ActionEditor key={action.id} action={action} index={index} count={state.input.actions.length} catalog={catalog} state={state} onChange={onChange} />)}
        </div>

        {optionalFurniture ? (
          <label className="flex min-h-10 items-center gap-2 rounded border border-white/10 px-2 text-[10px] text-white/70">
            <input type="checkbox" checked={Boolean(state.input.decorativeFurniture?.[optionalFurniture.role])} data-testid="signature-decorative-termination" onChange={(event) => onChange(setSignatureDecorativeFurniture(state, optionalFurniture.role, event.target.checked), "Changed optional Signature furniture")} />
            Optional decorative termination
          </label>
        ) : null}
      </fieldset>
    </div>
  );
}
