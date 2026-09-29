import type { CSSProperties } from "react";
import { getMaterialRecipe } from "../material-engine";
import { resolveMaterialSurfaceFromRecipe } from "../material-surface";

export type CuratedMaterialRoleProjection = { materialId: string; target: string };

export function curatedMaterialRoles(value: unknown): Readonly<Record<string, CuratedMaterialRoleProjection>> {
  return value&&typeof value==="object"?value as Record<string,CuratedMaterialRoleProjection>:{};
}

/** Canonical Curated adapter into the shared Material surface authority. */
export function curatedMaterialSurfaceStyle(materialId: string | undefined): CSSProperties | undefined {
  const recipe=getMaterialRecipe(materialId);
  if (!recipe) return undefined;
  const surface=resolveMaterialSurfaceFromRecipe(recipe);
  return {background:surface.background,backgroundSize:surface.backgroundSize,borderWidth:surface.borderWidth,borderStyle:surface.borderStyle,borderColor:surface.borderColor,boxShadow:surface.boxShadow,opacity:surface.opacity};
}
