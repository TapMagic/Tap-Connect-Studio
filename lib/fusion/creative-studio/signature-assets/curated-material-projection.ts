import type { CSSProperties } from "react";
import { getMaterialRecipe } from "../material-engine";
import { resolveMaterialSurfaceFromRecipe } from "../material-surface";

export type CuratedMaterialRoleProjection = { materialId: string; target: string };

export function curatedMaterialRoles(value: unknown): Readonly<Record<string, CuratedMaterialRoleProjection>> {
  return value&&typeof value==="object"?value as Record<string,CuratedMaterialRoleProjection>:{};
}

/** Complete shared Material response, including highlight/shine/texture channels. */
export function curatedMaterialSurface(materialId: string | undefined, color?: string) {
  const recipe=getMaterialRecipe(materialId);
  if (!recipe) return undefined;
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return resolveMaterialSurfaceFromRecipe(recipe);
  const channels = [1,3,5].map((index) => parseInt(color.slice(index,index+2),16));
  const mix = (target: number, amount: number) => `#${channels.map((channel) => Math.round(channel*(1-amount)+target*amount).toString(16).padStart(2,"0")).join("")}`;
  // Replace only the base pigment. Specular, grain, bevel and finish remain Material-owned.
  return resolveMaterialSurfaceFromRecipe({ ...recipe, fill: color, gradient: `linear-gradient(165deg,${mix(255,.22)} 0%,${color} 24%,${mix(0,.55)} 68%,${color} 100%)` });
}

/** Canonical Curated adapter into the shared Material surface authority. */
export function curatedMaterialSurfaceStyle(materialId: string | undefined, color?: string): CSSProperties | undefined {
  const surface=curatedMaterialSurface(materialId, color);
  if (!surface) return undefined;
  return {background:surface.background,...(surface.backgroundSize ? {backgroundSize:surface.backgroundSize} : {}),borderWidth:surface.borderWidth,borderStyle:surface.borderStyle,borderColor:surface.borderColor,boxShadow:surface.boxShadow,opacity:surface.opacity};
}
