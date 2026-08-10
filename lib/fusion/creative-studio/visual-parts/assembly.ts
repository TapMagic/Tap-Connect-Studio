/**
 * Assembly / reassembly recipe — the “cake recipe.”
 * Ingredient IDs alone are insufficient; order, anchors, depth, and responsive rules matter.
 * Decomposition must not produce a diet version of an approved composition.
 */

import type {
  ActionVisualRole,
  FinishColorRefinement,
  HeroSizeIntent,
  HeroStructureType,
  IconStationAnchor,
  IconStationPosition,
  SurfaceTreatment,
  VisualPartsState,
} from "./types";

const VP_KEY = "visualParts";

function readVisualPartsState(props: Record<string, unknown>): VisualPartsState {
  const raw = props[VP_KEY];
  if (!raw || typeof raw !== "object") return {};
  return { ...(raw as VisualPartsState) };
}

function writeVisualPartsState(
  props: Record<string, unknown>,
  patch: Partial<VisualPartsState>
): Record<string, unknown> {
  return { ...props, [VP_KEY]: { ...readVisualPartsState(props), ...patch } };
}

export type AssemblyLayerOrder = readonly (
  | "surface"
  | "mount"
  | "core"
  | "icon_station"
  | "rim"
  | "accent"
  | "bottom_stop"
)[];

export type VisualAssemblyRecipe = Readonly<{
  id: string;
  label: string;
  version: 1;
  ingredientPartIds: Readonly<Record<string, string | null>>;
  order: AssemblyLayerOrder;
  geometry?: Readonly<{
    bodyPresentation?: string;
    radius?: number;
    iconStationShape?: string;
  }>;
  anchors?: Readonly<{
    iconStationPosition?: IconStationPosition;
    iconStationAnchor?: IconStationAnchor;
    iconStationScale?: number;
  }>;
  overlaps?: Readonly<{
    visualHullOverflow?: boolean;
    accentPassBehindStation?: boolean;
  }>;
  depth?: Readonly<{
    mountLevel?: number;
    coreLevel?: number;
    stationLevel?: number;
  }>;
  responsive?: Readonly<{
    layoutIntent?: VisualPartsState["layoutIntent"];
    autoStackPhone?: boolean;
    railAware?: boolean;
  }>;
  surface?: Readonly<{
    enabled?: boolean;
    treatment?: SurfaceTreatment;
    intensity?: number;
    depth?: number;
  }>;
  spacing?: Readonly<{
    railLeftPct?: number;
    railRightPct?: number;
    gapPx?: number;
  }>;
  interactionPartId?: string | null;
  color?: Readonly<{
    baseColor?: string;
    brandRecipeId?: string | null;
    refinement?: FinishColorRefinement | null;
  }>;
  actionRole?: ActionVisualRole;
  hero?: Readonly<{
    structure?: HeroStructureType;
    sizeIntent?: HeroSizeIntent;
    flowShape?: string;
  }>;
  /** Decomposition parity: composite parts kept when further split would harm fidelity. */
  compositePartIds?: readonly string[];
}>;

export const ASSEMBLY_LAYER_DEFAULT: AssemblyLayerOrder = [
  "surface",
  "mount",
  "core",
  "rim",
  "icon_station",
  "accent",
  "bottom_stop",
] as const;

/** Capture durable recipe from current Visual Parts state + known ingredients. */
export function captureAssemblyRecipe(
  props: Record<string, unknown>,
  meta: { id: string; label: string; ingredientPartIds: Record<string, string | null> }
): VisualAssemblyRecipe {
  const state = readVisualPartsState(props);
  return {
    id: meta.id,
    label: meta.label,
    version: 1,
    ingredientPartIds: { ...meta.ingredientPartIds },
    order: ASSEMBLY_LAYER_DEFAULT,
    geometry: {
      bodyPresentation: typeof props.presentation === "string" ? props.presentation : undefined,
      radius: typeof props.radius === "number" ? props.radius : undefined,
      iconStationShape: typeof props.iconStationShape === "string" ? props.iconStationShape : undefined,
    },
    anchors: {
      iconStationPosition: state.iconStationPosition || "left",
      iconStationAnchor: state.iconStationAnchor || "left_center",
      iconStationScale: state.iconStationScale ?? 0.45,
    },
    overlaps: {
      visualHullOverflow: true,
      accentPassBehindStation: Boolean(state.accentPartId && state.accentPartId !== "accent_none"),
    },
    depth: { mountLevel: 2, coreLevel: 3, stationLevel: 4 },
    responsive: {
      layoutIntent: state.layoutIntent || "one_column",
      autoStackPhone: state.layoutIntent === "two_column" || state.layoutIntent === "round_team_grid",
      railAware: true,
    },
    surface: {
      enabled: state.surfaceEnabled !== false && Boolean(state.actionSurfacePartId || state.surfaceTreatment),
      treatment: state.surfaceTreatment || undefined,
      intensity: state.surfaceIntensity ?? 0.55,
      depth: state.surfaceDepth ?? 0.45,
    },
    spacing: { railLeftPct: 0.12, railRightPct: 0.88, gapPx: 10 },
    interactionPartId: state.interactionPartId || null,
    color: {
      baseColor: state.baseColor || undefined,
      brandRecipeId: state.brandRecipeId || null,
      refinement: state.colorRefinement || null,
    },
    actionRole: state.actionRole || "signature",
    hero: state.heroStructure
      ? {
          structure: state.heroStructure,
          sizeIntent: state.heroSizeIntent || "compact",
          flowShape: state.heroFlowShape || "none",
        }
      : undefined,
  };
}

/** Rehydrate VisualPartsState fields from a saved recipe (structural parity). */
export function assemblyRecipeToVisualPartsPatch(recipe: VisualAssemblyRecipe): Partial<VisualPartsState> {
  const ing = recipe.ingredientPartIds;
  return {
    assemblyRecipeId: recipe.id,
    curatedFamilyId: ing.family || (recipe.id.startsWith("family_") ? recipe.id : null),
    bodyPartId: ing.body || null,
    finishPartId: ing.finish || null,
    rimPartId: ing.rim || null,
    iconStationGeometryPartId: ing.iconStation || null,
    iconStationBackingPartId: ing.iconStationBacking || null,
    iconStationRimPartId: ing.iconStationRim || null,
    accentPartId: ing.accent || null,
    interactionPartId: recipe.interactionPartId || ing.interaction || null,
    layoutIntent: recipe.responsive?.layoutIntent || null,
    actionSurfacePartId: ing.actionSurface || null,
    mountPartId: ing.mount || null,
    bottomStopPartId: ing.bottomStop || null,
    surfaceEnabled: recipe.surface?.enabled ?? null,
    surfaceTreatment: recipe.surface?.treatment || null,
    surfaceIntensity: recipe.surface?.intensity ?? null,
    surfaceDepth: recipe.surface?.depth ?? null,
    iconStationPosition: recipe.anchors?.iconStationPosition || "left",
    iconStationAnchor: recipe.anchors?.iconStationAnchor || "left_center",
    iconStationScale: recipe.anchors?.iconStationScale ?? 0.45,
    baseColor: recipe.color?.baseColor || null,
    brandRecipeId: recipe.color?.brandRecipeId || null,
    colorRefinement: recipe.color?.refinement || null,
    actionRole: recipe.actionRole || null,
    heroStructure: recipe.hero?.structure || null,
    heroSizeIntent: recipe.hero?.sizeIntent || null,
    heroFlowShape: recipe.hero?.flowShape || null,
    dividerLinePartId: ing.divider || null,
  };
}

export function applyAssemblyRecipeToProps(
  props: Record<string, unknown>,
  recipe: VisualAssemblyRecipe
): Record<string, unknown> {
  let next = writeVisualPartsState(props, assemblyRecipeToVisualPartsPatch(recipe));
  if (recipe.geometry?.radius != null) next.radius = recipe.geometry.radius;
  if (recipe.geometry?.bodyPresentation) next.presentation = recipe.geometry.bodyPresentation;
  if (recipe.geometry?.iconStationShape) next.iconStationShape = recipe.geometry.iconStationShape;
  if (recipe.actionRole === "launch") next.actionRole = "launch";
  next.vpAssemblyRecipeId = recipe.id;
  next.vpRailLeftPct = recipe.spacing?.railLeftPct ?? 0.12;
  next.vpRailRightPct = recipe.spacing?.railRightPct ?? 0.88;
  next.vpAutoStackPhone = recipe.responsive?.autoStackPhone ?? false;
  next.vpRailAware = recipe.responsive?.railAware ?? true;
  return next;
}

export function recipesStructurallyEqual(a: VisualAssemblyRecipe, b: VisualAssemblyRecipe): boolean {
  return (
    a.id === b.id &&
    JSON.stringify(a.ingredientPartIds) === JSON.stringify(b.ingredientPartIds) &&
    JSON.stringify(a.order) === JSON.stringify(b.order) &&
    a.anchors?.iconStationAnchor === b.anchors?.iconStationAnchor &&
    a.responsive?.layoutIntent === b.responsive?.layoutIntent &&
    a.surface?.treatment === b.surface?.treatment &&
    a.ingredientPartIds.mount === b.ingredientPartIds.mount
  );
}

/** Proof: capture → patch → re-capture must preserve ingredient IDs and anchors. */
export function reassemblyParityCheck(
  props: Record<string, unknown>,
  recipe: VisualAssemblyRecipe
): { ok: boolean; missing: string[] } {
  const rebuilt = applyAssemblyRecipeToProps({}, recipe);
  const state = readVisualPartsState(rebuilt);
  const missing: string[] = [];
  const ing = recipe.ingredientPartIds;
  if (ing.body && state.bodyPartId !== ing.body) missing.push("body");
  if (ing.finish && state.finishPartId !== ing.finish) missing.push("finish");
  if (ing.rim && state.rimPartId !== ing.rim) missing.push("rim");
  if (ing.iconStation && state.iconStationGeometryPartId !== ing.iconStation) missing.push("iconStation");
  if (ing.mount && state.mountPartId !== ing.mount) missing.push("mount");
  if (recipe.anchors?.iconStationAnchor && state.iconStationAnchor !== recipe.anchors.iconStationAnchor) {
    missing.push("iconStationAnchor");
  }
  if (recipe.color?.baseColor && state.baseColor !== recipe.color.baseColor) missing.push("baseColor");
  // Content independence: Action must remain untouched on original props
  if (props.actionType !== undefined && rebuilt.actionType !== undefined && rebuilt.actionType !== props.actionType) {
    missing.push("actionMutated");
  }
  return { ok: missing.length === 0, missing };
}
