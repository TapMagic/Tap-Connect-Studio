/**
 * Top Shelf Premium Action — canonical Enhanced recipe.
 * Appearance only. Content / Action remain Host-owned.
 */

import {
  applyAssemblyRecipeToProps,
  captureAssemblyRecipe,
} from "../../assembly";
import {
  applyIconStationPosition,
  applyVisualPart,
  readVisualPartsState,
  writeVisualPartsState,
} from "../../apply";
import type { VisualPartTargetFamily } from "../../types";
import { TOP_SHELF_ANCHOR_CHARCOAL, topShelfPaletteFromAnchor } from "./palette";

export const TOP_SHELF_PACKAGE_VERSION = "1.0.0";
export const TOP_SHELF_CANONICAL_RECIPE_ID = "recipe/enhanced/top-shelf-premium-action/v1";
export const TOP_SHELF_CURATED_FAMILY_ID = "family_top_shelf_premium_action";
/** Starts approved after PO visual approval; promoted to certified after dual-green. */
export const TOP_SHELF_LIFECYCLE_STATUS = "approved" as const;
export const TOP_SHELF_EXPRESSION_TIER = "enhanced" as const;
export const TOP_SHELF_PACKAGE_REFERENCE_PATH =
  "vendor/top-shelf-enhanced-component-package-v1.0/reference/code-render.png";
export const TOP_SHELF_STUDIO_GOLDEN_PATH =
  "lib/fusion/creative-studio/visual-parts/packages/top-shelf/reference/studio-integrated-charcoal-right.golden.png";

/** Stable package component IDs (manifest / PO vocabulary). */
export const TOP_SHELF_COMPONENT_IDS = {
  surface: "surface/top-shelf-metallic-glass/v1",
  ambientHalo: "effect/ambient-halo/v1",
  upperGloss: "effect/upper-gloss-reflection/v1",
  iconHousing: "housing/simple-glass-icon-ring/v1",
  typography: "typography/two-level-action-copy/v1",
  interaction: "interaction/tactile-press/v1",
} as const;

export type TopShelfParams = {
  anchorColor: string;
  iconRingPlacement: "left" | "right";
  iconRingEnabled: boolean;
  haloIntensity: number;
  haloColorMode: "brand" | "custom";
  rightCueVisible: boolean;
  rightCue: string;
  descriptionVisible: boolean;
  radiusPx: number;
  glossIntensity: number;
  reflectionIntensity: number;
  depth: number;
  edgeResponse: number;
};

export const TOP_SHELF_CANONICAL_PARAMS: TopShelfParams = {
  anchorColor: TOP_SHELF_ANCHOR_CHARCOAL,
  iconRingPlacement: "right",
  iconRingEnabled: true,
  haloIntensity: 0.5,
  haloColorMode: "brand",
  rightCueVisible: true,
  rightCue: "→",
  descriptionVisible: true,
  radiusPx: 999,
  glossIntensity: 1,
  reflectionIntensity: 0.9,
  depth: 0.8,
  edgeResponse: 0.7,
};

const CONTENT_KEYS = [
  "label",
  "description",
  "icon",
  "iconSvg",
  "iconMediaUrl",
  "iconMediaAssetId",
  "actionType",
  "actionKind",
  "href",
  "url",
  "phone",
  "phoneNumber",
  "email",
  "destination",
  "campaignId",
  "bindingId",
  "trackingId",
  "trackingName",
  "accessibleLabel",
  "ariaLabel",
  "altText",
  "buttonId",
] as const;

export function snapshotContentFields(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CONTENT_KEYS) {
    if (key in props) out[key] = props[key];
  }
  return out;
}

export function restoreContentFields(
  props: Record<string, unknown>,
  snapshot: Record<string, unknown>
): Record<string, unknown> {
  return { ...props, ...snapshot };
}

export function readTopShelfParams(props: Record<string, unknown>): TopShelfParams {
  const state = readVisualPartsState(props);
  const bag =
    props.vpTopShelfParams && typeof props.vpTopShelfParams === "object"
      ? (props.vpTopShelfParams as Partial<TopShelfParams>)
      : {};
  return {
    ...TOP_SHELF_CANONICAL_PARAMS,
    ...bag,
    anchorColor: String(bag.anchorColor || state.baseColor || TOP_SHELF_CANONICAL_PARAMS.anchorColor),
    iconRingPlacement: bag.iconRingPlacement === "left" ? "left" : "right",
    haloIntensity: clamp01(bag.haloIntensity ?? TOP_SHELF_CANONICAL_PARAMS.haloIntensity),
    glossIntensity: clamp01(bag.glossIntensity ?? TOP_SHELF_CANONICAL_PARAMS.glossIntensity),
    reflectionIntensity: clamp01(
      bag.reflectionIntensity ?? TOP_SHELF_CANONICAL_PARAMS.reflectionIntensity
    ),
    depth: clamp01(bag.depth ?? TOP_SHELF_CANONICAL_PARAMS.depth),
    edgeResponse: clamp01(bag.edgeResponse ?? TOP_SHELF_CANONICAL_PARAMS.edgeResponse),
    radiusPx: Math.min(999, Math.max(18, Number(bag.radiusPx) || 999)),
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, Number(n) || 0));
}

export function writeTopShelfParams(
  props: Record<string, unknown>,
  patch: Partial<TopShelfParams>
): Record<string, unknown> {
  const current = readTopShelfParams(props);
  const nextParams: TopShelfParams = { ...current, ...patch };
  const content = snapshotContentFields(props);
  let next: Record<string, unknown> = {
    ...props,
    vpTopShelfParams: nextParams,
    vpTopShelfRecipe: true,
  };
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    curatedFamilyId: TOP_SHELF_CURATED_FAMILY_ID,
    assemblyRecipeId: TOP_SHELF_CANONICAL_RECIPE_ID,
    baseColor: nextParams.anchorColor,
    iconStationPosition: nextParams.iconRingPlacement,
  });
  next = applyIconStationPosition(next, nextParams.iconRingPlacement);
  const palette = topShelfPaletteFromAnchor(nextParams.anchorColor);
  next.gradientFill = `linear-gradient(180deg,${palette.faceTop},${palette.faceMid} 48%,${palette.faceBottom})`;
  next.buttonSurfaceKind = "gradient";
  next.materialFillAuthority = "finish";
  next.shine = false;
  next.textColor = palette.text;
  next.labelColor = palette.text;
  next.descriptionColor = palette.mutedText;
  next.iconColor = palette.icon;
  next.radius = nextParams.radiusPx;
  next.presentation = "pill";
  next.showDescription = nextParams.descriptionVisible;
  next.showIcon = nextParams.iconRingEnabled;
  next.vpTopShelfHaloIntensity = nextParams.haloIntensity;
  next.vpTopShelfGlossIntensity = nextParams.glossIntensity;
  next = restoreContentFields(next, content);
  return next;
}

/**
 * Apply Top Shelf Premium Action appearance to a normal Button.
 * Preserves content/Action fields exactly.
 */
export function applyTopShelfPremiumAction(
  props: Record<string, unknown>,
  targetFamily: VisualPartTargetFamily = "button",
  params: Partial<TopShelfParams> = {}
): Record<string, unknown> {
  const content = snapshotContentFields(props);
  const merged: TopShelfParams = { ...TOP_SHELF_CANONICAL_PARAMS, ...params };

  let next = { ...props };
  // Shared foundation parts where equivalent
  for (const partId of ["body_capsule", "finish_lacquer", "icon_station_round", "interaction_tactile"]) {
    const result = applyVisualPart(next, partId, {
      targetFamily: targetFamily === "launch" ? "button" : targetFamily,
      baseColor: merged.anchorColor,
    });
    if (result.ok) next = result.props;
  }

  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    curatedFamilyId: TOP_SHELF_CURATED_FAMILY_ID,
    assemblyRecipeId: TOP_SHELF_CANONICAL_RECIPE_ID,
    baseColor: merged.anchorColor,
    finishPartId: "finish_top_shelf_metallic_glass",
    bodyPartId: "body_capsule",
    iconStationGeometryPartId: "housing_simple_glass_icon_ring",
    interactionPartId: "interaction_tactile",
    actionRole: "signature",
    iconStationPosition: merged.iconRingPlacement,
    iconStationScale: 0.55,
  });

  next.vpTopShelfRecipe = true;
  next.vpTopShelfComponentIds = { ...TOP_SHELF_COMPONENT_IDS };
  next.vpCandidateStatus = TOP_SHELF_LIFECYCLE_STATUS;
  next.vpExpressionTier = TOP_SHELF_EXPRESSION_TIER;
  next = writeTopShelfParams(next, merged);

  const recipe = captureAssemblyRecipe(next, {
    id: TOP_SHELF_CANONICAL_RECIPE_ID,
    label: "Top Shelf Premium Action",
    ingredientPartIds: {
      family: TOP_SHELF_CURATED_FAMILY_ID,
      body: "body_capsule",
      finish: "finish_top_shelf_metallic_glass",
      iconStation: "housing_simple_glass_icon_ring",
      interaction: "interaction_tactile",
      surface: TOP_SHELF_COMPONENT_IDS.surface,
      ambientHalo: TOP_SHELF_COMPONENT_IDS.ambientHalo,
      upperGloss: TOP_SHELF_COMPONENT_IDS.upperGloss,
      typography: TOP_SHELF_COMPONENT_IDS.typography,
    },
  });
  next = applyAssemblyRecipeToProps(next, recipe);
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    assemblyRecipeId: TOP_SHELF_CANONICAL_RECIPE_ID,
    curatedFamilyId: TOP_SHELF_CURATED_FAMILY_ID,
  });
  next.vpAssemblyRecipeId = TOP_SHELF_CANONICAL_RECIPE_ID;

  return restoreContentFields(next, content);
}

/** Reset appearance parameters to canonical Top Shelf defaults — content untouched. */
export function resetTopShelfToCanonical(props: Record<string, unknown>): Record<string, unknown> {
  const content = snapshotContentFields(props);
  const next = applyTopShelfPremiumAction(props, "button", { ...TOP_SHELF_CANONICAL_PARAMS });
  return restoreContentFields(next, content);
}
