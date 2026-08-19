"use client";

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

        <div className="space-y-2" data-testid="signature-action-editor">
          <p className="text-[9px] uppercase tracking-wide text-white/50">Actions</p>
          {state.input.actions.map((action, index) => (
            <div key={action.id} className="rounded border border-white/10 p-2" data-testid={`signature-action-${action.id}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold text-white/60">{index + 1}</span>
                <span className="flex gap-1">
                  <button type="button" className={buttonClass} aria-label={`Move ${action.label} up`} disabled={index === 0} onClick={() => onChange(reorderSignatureAction(state, index, index - 1), "Reordered Signature action")}>↑</button>
                  <button type="button" className={buttonClass} aria-label={`Move ${action.label} down`} disabled={index === state.input.actions.length - 1} onClick={() => onChange(reorderSignatureAction(state, index, index + 1), "Reordered Signature action")}>↓</button>
                </span>
              </div>
              <label className="block text-[9px] text-white/60">Label<input className={fieldClass} value={action.label} aria-label={`Action ${index + 1} label`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { label: event.target.value }), "Changed Signature action label")} /></label>
              <label className="mt-1 block text-[9px] text-white/60">Destination<input className={fieldClass} value={action.destination} aria-label={`Action ${index + 1} destination`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { destination: event.target.value }), "Changed Signature action destination")} /></label>
              <label className="mt-1 block text-[9px] text-white/60">Accessible name<input className={fieldClass} value={action.accessibilityLabel} aria-label={`Action ${index + 1} accessible name`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { accessibilityLabel: event.target.value }), "Changed Signature action accessible name")} /></label>
              <label className="mt-1 block text-[9px] text-white/60">Visual plug<select className={fieldClass} value={action.plugComponentId} aria-label={`Action ${index + 1} visual plug`} onChange={(event) => onChange(updateSignatureAction(state, action.id, { plugComponentId: event.target.value }), "Changed Signature visual plug")}>
                {catalog.plugs.map((plug) => <option key={plug.id} value={plug.normalizedContract!.componentId}>{plug.label}</option>)}
              </select></label>
              <p className="mt-1 text-[8px] text-white/40">Visual meaning and destination remain independent.</p>
            </div>
          ))}
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
