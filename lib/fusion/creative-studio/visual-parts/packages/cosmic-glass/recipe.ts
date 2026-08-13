/** Cosmic Glass Signature — recovered final review recipe. Appearance only. */
import { applyAssemblyRecipeToProps, captureAssemblyRecipe } from "../../assembly";
import { applyVisualPart, readVisualPartsState, writeVisualPartsState } from "../../apply";
import type { VisualPartTargetFamily } from "../../types";

export const COSMIC_GLASS_CANONICAL_RECIPE_ID = "recipe/signature/cosmic-glass-action/v1";
export const COSMIC_GLASS_CURATED_FAMILY_ID = "family_cosmic_glass_signature";
export const COSMIC_GLASS_LIFECYCLE_STATUS = "approved" as const;
export const COSMIC_GLASS_EXPRESSION_TIER = "signature" as const;
export const COSMIC_GLASS_REFERENCE_DIR = "lib/fusion/creative-studio/visual-parts/packages/cosmic-glass/reference";
export const COSMIC_GLASS_ASSETS = {
  leftRod: "/visual-parts/cosmic-glass/electric-rod-left.svg",
  rightRod: "/visual-parts/cosmic-glass/electric-rod-right.svg",
  centerDiamond: "/visual-parts/cosmic-glass/center-diamond.svg",
} as const;

export type CosmicGlassParams = {
  ringFinish: "gold" | "copper";
  ringShape: "round" | "soft_square";
  eyebrowVisible: boolean;
  descriptionVisible: boolean;
  cueVisible: boolean;
  dividerCenter: "diamond" | "identity" | "none";
  dividerIntensity: number;
};

export const COSMIC_GLASS_CANONICAL_PARAMS: CosmicGlassParams = {
  ringFinish: "gold",
  ringShape: "round",
  eyebrowVisible: true,
  descriptionVisible: true,
  cueVisible: true,
  dividerCenter: "diamond",
  dividerIntensity: 1,
};

const CONTENT_KEYS = [
  "label", "description", "eyebrow", "icon", "iconSvg", "iconMediaUrl", "iconMediaAssetId",
  "logoUrl", "imageUrl", "actionType", "actionKind", "href", "url", "phone", "phoneNumber",
  "email", "destination", "campaignId", "bindingId", "trackingId", "trackingName", "accessibleLabel",
  "ariaLabel", "altText", "buttonId",
] as const;

function snapshotContent(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of CONTENT_KEYS) if (key in props) out[key] = props[key];
  return out;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function readCosmicGlassParams(props: Record<string, unknown>): CosmicGlassParams {
  const bag = props.vpCosmicGlassParams && typeof props.vpCosmicGlassParams === "object"
    ? props.vpCosmicGlassParams as Partial<CosmicGlassParams>
    : {};
  return {
    ...COSMIC_GLASS_CANONICAL_PARAMS,
    ...bag,
    ringFinish: bag.ringFinish === "copper" ? "copper" : "gold",
    ringShape: bag.ringShape === "soft_square" ? "soft_square" : "round",
    dividerCenter: bag.dividerCenter === "identity" || bag.dividerCenter === "none" ? bag.dividerCenter : "diamond",
    dividerIntensity: clamp01(bag.dividerIntensity ?? 1),
  };
}

export function writeCosmicGlassParams(props: Record<string, unknown>, patch: Partial<CosmicGlassParams>) {
  const content = snapshotContent(props);
  const params = { ...readCosmicGlassParams(props), ...patch };
  let next: Record<string, unknown> = { ...props, vpCosmicGlassParams: params, vpCosmicGlassRecipe: true };
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    curatedFamilyId: COSMIC_GLASS_CURATED_FAMILY_ID,
    assemblyRecipeId: COSMIC_GLASS_CANONICAL_RECIPE_ID,
    actionRole: "hero",
    iconStationPosition: "left",
    iconStationAnchor: "left_center",
    iconStationScale: 1,
  });
  next.presentation = "rounded";
  next.showIcon = true;
  next.showLabel = true;
  next.showDescription = params.descriptionVisible;
  next.textColor = "#f8f4e9";
  next.labelColor = "#f8f4e9";
  next.descriptionColor = "#7185a6";
  next.vpAssemblyRecipeId = COSMIC_GLASS_CANONICAL_RECIPE_ID;
  return { ...next, ...content };
}

export function applyCosmicGlassSignature(
  props: Record<string, unknown>,
  targetFamily: VisualPartTargetFamily = "button",
  params: Partial<CosmicGlassParams> = {}
) {
  const content = snapshotContent(props);
  let next = { ...props };
  for (const partId of ["body_angular_mission", "finish_acrylic", "icon_station_round", "interaction_tactile"]) {
    const result = applyVisualPart(next, partId, {
      targetFamily: targetFamily === "launch" ? "button" : targetFamily,
      baseColor: "#031126",
    });
    if (result.ok) next = result.props;
  }
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    curatedFamilyId: COSMIC_GLASS_CURATED_FAMILY_ID,
    assemblyRecipeId: COSMIC_GLASS_CANONICAL_RECIPE_ID,
    bodyPartId: "body_angular_mission",
    finishPartId: "finish_acrylic",
    iconStationGeometryPartId: "icon_station_round",
    interactionPartId: "interaction_tactile",
    dividerLinePartId: "divider_cosmic_glass",
    actionRole: "hero",
    iconStationPosition: "left",
    iconStationAnchor: "left_center",
    iconStationScale: 1,
  });
  next = writeCosmicGlassParams(next, { ...COSMIC_GLASS_CANONICAL_PARAMS, ...params });
  next.vpCosmicGlassComponentIds = {
    chassis: "body/cosmic-glass-chassis/v1",
    ringSeat: "housing/cosmic-glass-ring-seat/v1",
    identity: "content/live-host-identity/v1",
    cue: "action/cosmic-glass-cue/v1",
    divider: "divider/cosmic-electric-rods/v1",
  };
  next.vpCandidateStatus = COSMIC_GLASS_LIFECYCLE_STATUS;
  next.vpExpressionTier = COSMIC_GLASS_EXPRESSION_TIER;
  const recipe = captureAssemblyRecipe(next, {
    id: COSMIC_GLASS_CANONICAL_RECIPE_ID,
    label: "Cosmic Glass Signature",
    ingredientPartIds: {
      family: COSMIC_GLASS_CURATED_FAMILY_ID,
      body: "body_angular_mission",
      finish: "finish_acrylic",
      iconStation: "icon_station_round",
      interaction: "interaction_tactile",
      divider: "divider_cosmic_glass",
    },
  });
  next = applyAssemblyRecipeToProps(next, recipe);
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    curatedFamilyId: COSMIC_GLASS_CURATED_FAMILY_ID,
    assemblyRecipeId: COSMIC_GLASS_CANONICAL_RECIPE_ID,
  });
  return { ...next, ...content };
}

export function resetCosmicGlassToCanonical(props: Record<string, unknown>) {
  return applyCosmicGlassSignature(props, "button", COSMIC_GLASS_CANONICAL_PARAMS);
}
