"use client";

import { useMemo } from 'react';
import { CreativeCompositionCanvas } from '@/components/fusion/creative-studio/creative-composition-canvas';
import { INTRODUCTION_LOOKS, introductionPreview, type IntroductionLook } from '@/lib/fusion/creative-studio/reconstitution/native-starting-compositions';

export function StudioDesignedIntroductions({ onPlace }: { onPlace: (look: IntroductionLook) => void }) {
  const previews = useMemo(() => INTRODUCTION_LOOKS.map(resource => ({ resource, block: introductionPreview(resource.application) })), []);
  return <section aria-label="Designed introductions" className="mb-5 space-y-3">
    <div><h3 className="text-sm font-semibold">Designed</h3><p className="mt-1 text-xs leading-5 text-white/50">Editable introductions. Add one, then refine its content and Button Action.</p></div>
    {previews.map(({resource,block}) => <article key={resource.ref.resourceId} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-start gap-3 p-3">
        <div inert className="pointer-events-none w-[116px] shrink-0 overflow-hidden rounded-lg" aria-hidden>
          <div className="w-[360px]" style={{ zoom: .32 }}><CreativeCompositionCanvas block={block} /></div>
        </div>
        <div className="min-w-0 flex-1"><h4 className="text-sm font-semibold">{resource.label}</h4><p className="mt-1 text-[11px] leading-4 text-white/55">{resource.description}</p><button type="button" onClick={() => onPlace(resource.application)} className="mt-2 min-h-11 w-full rounded-lg bg-[#b8ff2c] px-2 text-xs font-semibold text-[#07100a]">Add {resource.label}</button></div>
      </div>
      <details className="border-t border-white/8">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs text-white/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8ff2c]">Inspect {resource.label}</summary>
        <div inert className="pointer-events-none mx-auto w-[360px] max-w-full p-3" aria-hidden><CreativeCompositionCanvas block={block} /></div>
      </details>
    </article>)}
  </section>;
}
