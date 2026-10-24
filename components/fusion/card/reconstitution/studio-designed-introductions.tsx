"use client";

import { useMemo } from 'react';
import { CreativeCompositionCanvas } from '@/components/fusion/creative-studio/creative-composition-canvas';
import { INTRODUCTION_LOOKS, introductionPreview, type IntroductionLook } from '@/lib/fusion/creative-studio/reconstitution/native-starting-compositions';

export function StudioDesignedIntroductions({ onPlace }: { onPlace: (look: IntroductionLook) => void }) {
  const previews = useMemo(() => INTRODUCTION_LOOKS.map(resource => ({ resource, block: introductionPreview(resource.application) })), []);
  return <section aria-label="Designed introductions" className="mb-6 space-y-4">
    <div><h3 className="text-sm font-semibold">Designed</h3><p className="mt-1 text-xs leading-5 text-white/50">A finished introduction. Every word, Button and surface stays editable. Set the Button’s Action after adding.</p></div>
    {previews.map(({resource,block}) => <div key={resource.ref.resourceId} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div inert className="pointer-events-none p-3" style={{ zoom: .65 }} aria-hidden><CreativeCompositionCanvas block={block} /></div>
      <div className="p-3"><h4 className="font-semibold">{resource.label}</h4><p className="mt-1 text-xs leading-5 text-white/55">{resource.description}</p><button type="button" onClick={() => onPlace(resource.application)} className="mt-3 min-h-11 w-full rounded-xl bg-[#b8ff2c] px-3 text-sm font-semibold text-[#07100a]">Add {resource.label}</button></div>
    </div>)}
  </section>;
}
