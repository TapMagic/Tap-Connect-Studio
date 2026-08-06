"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";

/**
 * Optional guided first-run checklist.
 * Templates owns the authoritative preset catalog — Build/Guide must not duplicate it.
 */
export function CardComposerLibrary({ model }: { model: CardEditorLiveModel | null }) {
  const [guideOpen, setGuideOpen] = useState(true);

  return (
    <div className="space-y-4" data-testid="card-composer-library">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">Guided start</p>
        <p className="mt-2 text-[10px] text-white/55">
          This is an optional checklist. Browse Templates for Card templates and Premium section presets. Elements, Text, Icons, Buttons, Badges, Coupons, and Tickets each have their own library.
        </p>
      </div>
      {guideOpen ? (
        <section className="rounded-lg border border-[#b8ff2c]/20 bg-[#b8ff2c]/5 p-3" data-testid="composer-help-guide">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-white/85">One clear next step</h2>
              <p className="mt-1 text-[10px] text-white/70">Build the essentials, then review the whole Card.</p>
            </div>
            <button type="button" className="text-[10px] text-white/70" onClick={() => setGuideOpen(false)} aria-label="Dismiss build guide">Dismiss</button>
          </div>
          <div className="mt-3 grid gap-1.5">
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => model?.onAddSectionPreset?.("identity")}>1. Add Premium Identity</button>
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => model?.onAddElement?.("button", null, { label: "Learn more" })}>2. Add a root Button</button>
            <button type="button" className="min-h-9 rounded border border-white/10 px-2 text-left text-xs" onClick={() => { if (model?.clearStudioSelection) model.clearStudioSelection(); else { model?.setSelectedId(null); model?.setSelectedCompositionNodeIds?.([]); } }}>3. Review Card</button>
          </div>
        </section>
      ) : (
        <button type="button" className="flex min-h-9 w-full items-center gap-2 rounded border border-white/10 px-2 text-xs text-white/65" onClick={() => setGuideOpen(true)} data-testid="composer-reopen-help">
          <HelpCircle className="h-3.5 w-3.5" />Help
        </button>
      )}
      <p className="text-[9px] text-white/40" data-testid="build-no-duplicate-catalog">
        Preset discovery lives under Templates. This Guide does not list section presets or the full element catalog.
      </p>
    </div>
  );
}
