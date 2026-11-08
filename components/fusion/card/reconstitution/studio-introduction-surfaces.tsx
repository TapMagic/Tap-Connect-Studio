"use client";

import { MaterialSurfaceSwatch } from '@/components/fusion/creative-studio/material-surface-layers';
import { resolveMaterialSurfaceFromProps } from '@/lib/fusion/creative-studio/material-surface';
import { applyIntroductionSurface, INTRODUCTION_LOOKS, type IntroductionLook } from '@/lib/fusion/creative-studio/reconstitution/native-starting-compositions';

export function StudioIntroductionSurfaces({ onApply, root = false }: { onApply: (look: IntroductionLook) => void; root?: boolean }) {
  return <section className="mb-5" aria-label="Surface treatments"><h3 className="text-xs font-semibold">Surface treatments</h3><p className="my-2 text-[11px] leading-4 text-white/50">{root ? 'Background color only.' : 'Fill, border, corners and depth only.'} Your content and layout stay unchanged. Check text contrast after applying.</p><div className="grid grid-cols-2 gap-2">{INTRODUCTION_LOOKS.map(resource => {
    const props = applyIntroductionSurface({}, resource.application);
    return <button key={resource.ref.resourceId} type="button" onClick={() => onApply(resource.application)} className="overflow-hidden rounded-xl border border-white/15 text-left" aria-label={`Apply ${resource.label} Surface treatment`}>
      <MaterialSurfaceSwatch surface={resolveMaterialSurfaceFromProps(root ? { fill: props.fill } : props, 'container')} className="h-16" /><span className="flex min-h-11 items-center px-3 text-xs">{resource.label}</span>
    </button>;
  })}</div></section>;
}
