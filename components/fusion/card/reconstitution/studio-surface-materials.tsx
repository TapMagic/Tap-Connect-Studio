"use client";

import { MaterialSurfaceSwatch } from "@/components/fusion/creative-studio/material-surface-layers";
import { applySurfaceMaterial, getMaterialRecipe, type MaterialRecipe } from "@/lib/fusion/creative-studio/material-engine";
import { resolveMaterialSurfaceFromProps } from "@/lib/fusion/creative-studio/material-surface";
import { visualPlaneToStyle, type VisualPlane } from "@/lib/fusion/creative-studio/visual-plane";

// Presentation of existing recipes; application remains with each canonical adapter.
export function StudioSurfaceMaterials({ selected, onApply }: { selected: unknown; onApply: (recipe: MaterialRecipe) => void }) {
  return <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Surface materials">
    {["gunmetal", "worn_saddle_leather"].map(id => {
      const recipe = getMaterialRecipe(id)!;
      const props = applySurfaceMaterial({}, id);
      return <button key={id} type="button" aria-pressed={selected === id} onClick={() => onApply(recipe)} className="overflow-hidden rounded-xl border border-white/10 bg-white/4 text-left aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10">
        {recipe.sourceMaster ? <span className="block h-16" style={{ ...visualPlaneToStyle(props.visualPlane as VisualPlane), filter: `brightness(${recipe.sourceMaster.brightness}) contrast(${recipe.sourceMaster.contrast}) saturate(${recipe.sourceMaster.saturation})` }} /> : <MaterialSurfaceSwatch surface={resolveMaterialSurfaceFromProps(props, "container")} className="h-16" />}
        <span className="block px-2 py-3 text-[10px] font-semibold">{recipe.label}</span>
      </button>;
    })}
  </div>;
}
