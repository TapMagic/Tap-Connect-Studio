/**
 * Apply / replace / remove Visual Parts through shared Studio authorities.
 * Never invents a second Material / Text / Icon / Action engine.
 * Visual recipes must not invent business content or mutate Action/Bind.
 */

import { applySurfaceMaterial } from "../material-engine";
import { applyButtonIconAsset } from "../button-composition";
import {
  deriveFinishSurface,
  finishSurfaceCssVars,
  geometryClassFromPresentation,
  type FinishId,
} from "./finish-color";
import { getVisualPart, partCompatibleWithTarget } from "./registry";
import { captureAssemblyRecipe, applyAssemblyRecipeToProps } from "./assembly";
import { composeDepthShadow } from "./depth";
import type {
  ApplyPartResult,
  FinishColorRefinement,
  IconStationAnchor,
  IconStationPosition,
  SurfaceTreatment,
  VisualPartSocket,
  VisualPartTargetFamily,
  VisualPartsState,
} from "./types";

export const VISUAL_PARTS_PROP_KEY = "visualParts";

export function readVisualPartsState(props: Record<string, unknown>): VisualPartsState {
  const raw = props[VISUAL_PARTS_PROP_KEY];
  if (!raw || typeof raw !== "object") return {};
  return { ...(raw as VisualPartsState) };
}

export function writeVisualPartsState(
  props: Record<string, unknown>,
  patch: Partial<VisualPartsState>
): Record<string, unknown> {
  const prev = readVisualPartsState(props);
  return {
    ...props,
    [VISUAL_PARTS_PROP_KEY]: { ...prev, ...patch },
  };
}

export function objectFamilyToVisualTarget(
  family: string | null | undefined
): VisualPartTargetFamily | null {
  switch (family) {
    case "button":
    case "badge":
    case "icon":
    case "divider":
    case "container":
    case "text":
    case "image":
    case "logo":
    case "coupon":
    case "ticket":
    case "card_root":
    case "hero":
    case "launch":
    case "bottom_stop":
      return family;
    case "form":
      return "form_submit";
    default:
      return null;
  }
}

function surfaceShadow(outer: number): string {
  if (!outer) return "none";
  return `0 ${Math.round(outer * 0.35)}px ${outer}px rgba(0,0,0,.42)`;
}

export function applyFinishToSurface(
  props: Record<string, unknown>,
  finishPartId: string,
  baseColor: string,
  asButtonSurface: boolean,
  refinement?: FinishColorRefinement | null
): Record<string, unknown> {
  const part = getVisualPart(finishPartId);
  if (!part || part.payload.kind !== "finish") return props;
  const state = readVisualPartsState(props);
  const geometry = geometryClassFromPresentation(String(props.presentation || ""));
  const derived = deriveFinishSurface(
    part.payload.finishId as FinishId,
    baseColor,
    refinement ?? state.colorRefinement,
    geometry
  );
  const response = derived.materialResponse;
  let next = { ...props };
  // Bridge Material catalog for texture/shine infrastructure — Finish then feeds Material response channels.
  if (part.payload.materialBridgeId) {
    next = applySurfaceMaterial(next, part.payload.materialBridgeId, {
      asButtonSurface,
      preserveTextColor: true,
    });
  }
  // Compose into Material surface props (MaterialSurfaceLayers), not a competing paint path.
  next.gradientFill = response.background;
  next.buttonSurfaceKind = "gradient";
  next.fill = undefined;
  next.shine = response.shine;
  next.highlight = response.highlight;
  next.borderWidth = response.borderWidth;
  next.borderColor = response.borderColor;
  next.boxShadow = composeDepthShadow(3, 0.35 + (refinement?.depth ?? state.colorRefinement?.depth ?? 0.5) * 0.55);
  if (!next.boxShadow || next.boxShadow === "none") {
    next.boxShadow = surfaceShadow(response.outerShadow);
  }
  next.labelColor = next.labelColor || response.textColor;
  next.textColor = next.textColor || response.textColor;
  next.materialResponse = response;
  next.materialFillAuthority = "finish";
  Object.assign(next, finishSurfaceCssVars(derived));
  return writeVisualPartsState(next, {
    finishPartId,
    baseColor: derived.baseColor,
    colorRefinement: refinement ?? state.colorRefinement ?? null,
  });
}

function mapIconStationPosition(pos: IconStationPosition): {
  showIcon: boolean;
  iconPosition: string;
  iconStationBoth: boolean;
} {
  switch (pos) {
    case "none":
      return { showIcon: false, iconPosition: "none", iconStationBoth: false };
    case "right":
      return { showIcon: true, iconPosition: "after", iconStationBoth: false };
    case "both":
      // Primary left + secondary cue right — not mirrored duplicate artwork.
      return { showIcon: true, iconPosition: "before", iconStationBoth: true };
    case "left":
    default:
      return { showIcon: true, iconPosition: "before", iconStationBoth: false };
  }
}

function surfaceToneStyles(
  tone: string,
  intensity = 0.55,
  depth = 0.45
): Partial<Record<string, unknown>> {
  const i = Math.min(1, Math.max(0, intensity));
  const d = Math.min(1, Math.max(0, depth));
  const energyA = (0.08 + i * 0.28).toFixed(3);
  const energyB = (0.06 + i * 0.22).toFixed(3);
  switch (tone) {
    case "copper_harmonized": {
      const copperFoot = (0.35 + d * 0.55).toFixed(3);
      return {
        fill: `rgb(${22 + Math.round(d * 8)},${16 + Math.round(d * 6)},${12 + Math.round(d * 4)})`,
        gradientFill: `linear-gradient(160deg,rgba(90,50,28,${(0.55 + i * 0.45).toFixed(3)}) 0%,rgba(26,20,16,${(0.55 + (1 - d) * 0.35).toFixed(3)}) 48%,rgba(8,6,4,${copperFoot}) 100%)`,
        borderWidth: i > 0.35 ? 1 : 0,
        borderColor: `rgba(197,106,45,${(0.15 + i * 0.45).toFixed(3)})`,
        boxShadow: composeDepthShadow(1, d),
        opacity: 0.72 + i * 0.28,
      };
    }
    case "quiet_field": {
      const deep = (0.12 + d * 0.55).toFixed(3);
      const open = (0.35 + (1 - d) * 0.45).toFixed(3);
      return {
        fill: `rgb(${12 + Math.round(d * 8)},${16 + Math.round(d * 10)},${28 + Math.round(d * 18)})`,
        gradientFill: `linear-gradient(180deg,rgba(31,41,55,${(0.55 + i * 0.45).toFixed(3)}) 0%,rgba(17,24,39,${open}) 55%,rgba(8,10,16,${deep}) 100%)`,
        borderWidth: 0,
        boxShadow: composeDepthShadow(1, d * 0.85),
        opacity: 0.65 + i * 0.35,
      };
    }
    case "energy_field": {
      // Depth must change in-bounds pixels (cast shadows are often clipped by overflow).
      const topStop = Math.round(18 + (1 - d) * 28);
      const midStop = Math.round(28 + d * 22);
      const bottomStop = Math.round(10 + d * 18);
      const veil = (0.08 + d * 0.42).toFixed(3);
      return {
        fill: `rgb(${8 + Math.round(d * 6)},${14 + Math.round(d * 10)},${28 + Math.round(d * 24)})`,
        gradientFill: `linear-gradient(155deg,rgb(${topStop},${topStop + 8},${topStop + 40}) 0%,rgb(${midStop},${midStop + 6},${midStop + 34}) 42%,rgb(${bottomStop},${bottomStop + 2},${bottomStop + 14}) 100%), radial-gradient(ellipse at 20% 40%,rgba(56,189,248,${energyA}),transparent 45%), radial-gradient(ellipse at 80% 70%,rgba(37,99,235,${energyB}),transparent 40%), linear-gradient(180deg,transparent 35%,rgba(0,0,0,${veil}) 100%)`,
        borderWidth: 0,
        boxShadow: `${composeDepthShadow(1, d)}, 0 0 ${Math.round(8 + i * 28)}px rgba(56,189,248,${(0.08 + i * 0.35).toFixed(3)})`,
        opacity: 0.7 + i * 0.3,
      };
    }
    case "recess_well":
      return {
        fill: "#0a0c12",
        gradientFill: "linear-gradient(180deg,#151922 0%,#0a0c12 100%)",
        borderWidth: 1,
        borderColor: "#00000088",
        boxShadow: `inset 0 ${Math.round(4 + d * 14)}px ${Math.round(10 + d * 18)}px rgba(0,0,0,${(0.35 + d * 0.4).toFixed(3)}), inset 0 -1px 0 rgba(255,255,255,${(0.03 + i * 0.08).toFixed(3)})`,
        opacity: 0.75 + i * 0.25,
      };
    case "panel_plaque": {
      const foot = (0.2 + d * 0.7).toFixed(3);
      return {
        fill: `rgb(${24 + Math.round(d * 10)},${30 + Math.round(d * 12)},${42 + Math.round(d * 16)})`,
        gradientFill: `linear-gradient(180deg,rgba(55,68,90,${(0.55 + i * 0.45).toFixed(3)}) 0%,rgba(23,28,38,${(0.55 + (1 - d) * 0.4).toFixed(3)}) 55%,rgba(10,12,18,${foot}) 100%)`,
        borderWidth: 1,
        borderColor: `rgba(255,255,255,${(0.08 + i * 0.22).toFixed(3)})`,
        boxShadow: composeDepthShadow(1, d),
        opacity: 0.7 + i * 0.3,
      };
    }
    case "plinth_base":
      return {
        fill: "#12141a",
        gradientFill: "linear-gradient(180deg,#1a1d26 0%,#0e1016 70%,#08090c 100%)",
        borderWidth: 0,
        boxShadow: `0 -${Math.max(1, Math.round(d * 3))}px 0 rgba(255,255,255,${(0.04 + i * 0.08).toFixed(3)}), ${composeDepthShadow(1, d)}`,
        opacity: 0.75 + i * 0.25,
      };
    default:
      return { fill: "#111827", gradientFill: undefined };
  }
}

export function applyVisualPart(
  props: Record<string, unknown>,
  partId: string,
  options: {
    targetFamily: VisualPartTargetFamily;
    socket?: VisualPartSocket;
    baseColor?: string;
  }
): ApplyPartResult {
  const compatibility = partCompatibleWithTarget(partId, options.targetFamily);
  if (!compatibility.compatible) {
    return {
      ok: false,
      reason: compatibility.reason || "Incompatible",
      partId,
      targetFamily: options.targetFamily,
    };
  }
  const part = getVisualPart(partId)!;
  const socket = options.socket || part.supportedSockets[0]!;
  if (!part.supportedSockets.includes(socket)) {
    return {
      ok: false,
      reason: `${part.label} does not support socket ${socket}.`,
      partId,
      targetFamily: options.targetFamily,
    };
  }

  const asButton =
    options.targetFamily === "button" ||
    options.targetFamily === "form_submit" ||
    options.targetFamily === "launch";
  let next = { ...props };
  const state = readVisualPartsState(next);

  switch (part.payload.kind) {
    case "body": {
      next.presentation = part.payload.presentation;
      next.radius = part.payload.radius;
      next = writeVisualPartsState(next, { bodyPartId: partId, curatedFamilyId: state.curatedFamilyId || null });
      break;
    }
    case "finish": {
      const color = options.baseColor || state.baseColor || "#16a34a";
      next = applyFinishToSurface(next, partId, color, asButton, state.colorRefinement);
      break;
    }
    case "rim": {
      if (socket === "iconStation.rim") {
        next = writeVisualPartsState(next, { iconStationRimPartId: partId });
        break;
      }
      next = writeVisualPartsState(next, { rimPartId: partId });
      if (part.payload.copperFamily || part.payload.industrialFamily || part.payload.electricFamily) {
        next.borderWidth = 0;
      } else {
        next.borderWidth = Math.max(Number(next.borderWidth || 0), 1);
        next.borderColor = next.borderColor || "#cbd5e1";
      }
      break;
    }
    case "icon_station_geometry": {
      next = writeVisualPartsState(next, {
        iconStationGeometryPartId: partId,
        iconStationPosition: state.iconStationPosition || "left",
        iconStationAnchor: state.iconStationAnchor || "left_center",
        iconStationScale: state.iconStationScale ?? 0.45,
      });
      next.showIcon = true;
      next.iconStationShape = part.payload.shape;
      next.iconStationClipPath = part.payload.clipPath || null;
      break;
    }
    case "icon_station_backing": {
      next = writeVisualPartsState(next, { iconStationBackingPartId: partId });
      break;
    }
    case "accent": {
      next = writeVisualPartsState(next, { accentPartId: partId });
      next.accentOrnamentAssetId = part.payload.svgAssetId;
      break;
    }
    case "none": {
      if (part.category === "accent") {
        next = writeVisualPartsState(next, { accentPartId: partId });
        next.accentOrnamentAssetId = null;
      }
      if (part.category === "action_surface") {
        next = writeVisualPartsState(next, {
          actionSurfacePartId: partId,
          surfaceEnabled: false,
          surfaceTreatment: "off",
        });
        next.actionSurfaceTone = "neutral";
      }
      if (part.category === "mount") {
        next = writeVisualPartsState(next, { mountPartId: null });
      }
      break;
    }
    case "layout": {
      next = writeVisualPartsState(next, { layoutIntent: part.payload.intent });
      next.vpLayoutIntent = part.payload.intent;
      next.vpAutoStackPhone = part.payload.autoStackPhone;
      next.vpRailAware = part.payload.railAware !== false;
      next.vpRailLeftPct = next.vpRailLeftPct ?? 0.12;
      next.vpRailRightPct = next.vpRailRightPct ?? 0.88;
      // Parent Action Group / Container owns grid geometry.
      if (
        options.targetFamily === "container" ||
        options.targetFamily === "action_surface" ||
        next.componentKind === "container" ||
        next.vpActionGroup === true
      ) {
        next.vpActionGroup = true;
        if (part.payload.intent === "two_column") next.layout = "grid";
        else if (part.payload.intent === "round_team_grid") next.layout = "round_team";
        else next.layout = "stack";
      }
      break;
    }
    case "divider": {
      next = writeVisualPartsState(next, {
        dividerLinePartId: partId,
        dividerEndcapStartPartId: part.payload.endcapAssetId ? "accent_copper_leaves" : null,
        dividerEndcapEndPartId: part.payload.endcapAssetId ? "accent_copper_leaves" : null,
      });
      next.dividerStyle = "solid";
      next.vpDividerTreatment = part.payload.lineStyle;
      next.vpDividerEndcapAssetId = part.payload.endcapAssetId || null;
      next.vpDividerMotion = part.payload.motion || "none";
      if (part.payload.lineStyle === "copper_botanical") {
        next.strokeWidth = Math.max(Number(next.strokeWidth || next.thickness || 2), 4);
        next.fill = "#c56a2d";
        next.color = "#c56a2d";
      } else if (part.payload.lineStyle === "electric") {
        next.strokeWidth = Math.max(Number(next.strokeWidth || next.thickness || 2), 3);
        next.fill = "#38bdf8";
        next.color = "#38bdf8";
      } else if (part.payload.lineStyle === "industrial") {
        next.strokeWidth = Math.max(Number(next.strokeWidth || next.thickness || 2), 3);
        next.fill = "#94a3b8";
        next.color = "#94a3b8";
      } else if (part.payload.lineStyle === "geometric") {
        next.strokeWidth = 2;
        next.fill = "#e2e8f0";
        next.color = "#e2e8f0";
      }
      break;
    }
    case "action_surface": {
      const tone = part.payload.backgroundTone;
      const intensity = part.payload.intensityDefault ?? state.surfaceIntensity ?? 0.55;
      const depth = part.payload.depthDefault ?? state.surfaceDepth ?? 0.45;
      const styles = surfaceToneStyles(tone, intensity, depth);
      const treatment: SurfaceTreatment =
        tone === "neutral" ? "off" : (tone as SurfaceTreatment);
      next = writeVisualPartsState(next, {
        actionSurfacePartId: partId,
        rimPartId: part.payload.edgePartId || state.rimPartId || null,
        surfaceEnabled: tone !== "neutral",
        surfaceTreatment: treatment,
        surfaceIntensity: intensity,
        surfaceDepth: depth,
      });
      next.actionSurfaceTone = part.payload.backgroundTone;
      // Surface is a Visual Parts socket — never rewrite Button/Launch/Badge identity
      // into Container (that hijacks NodeVisual + objectFamily).
      const buttonishHost =
        options.targetFamily === "button" ||
        options.targetFamily === "launch" ||
        options.targetFamily === "badge" ||
        options.targetFamily === "form_submit";
      if (!buttonishHost) {
        next.componentKind = next.componentKind || "container";
        Object.assign(next, styles);
      }
      break;
    }
    case "mount": {
      next = writeVisualPartsState(next, { mountPartId: partId });
      next.vpMountStyle = part.payload.style;
      next.vpMountPaddingPx = part.payload.paddingPx;
      next.vpMountRadius = part.payload.radius;
      next.vpMountBackground = part.payload.background;
      next.vpMountBorder = part.payload.border || null;
      // Persist relational depth shadow — Mount style remains structurally distinct via bg/border/radius.
      next.vpMountShadow = composeDepthShadow(2, state.surfaceDepth ?? 0.55);
      next.vpMountDepthLevel = 2;
      break;
    }
    case "bottom_stop": {
      next = writeVisualPartsState(next, { bottomStopPartId: partId });
      next.vpBottomStopStyle = part.payload.style;
      next.vpBottomStopHeightPx = part.payload.heightPx;
      next.elementKind = next.elementKind || "composition";
      break;
    }
    case "hero": {
      next = writeVisualPartsState(next, {
        heroStructure: part.payload.structure,
        heroSizeIntent: part.payload.sizeIntent,
        heroFlowShape: part.payload.flowShape || "none",
      });
      next.vpHeroStructure = part.payload.structure;
      next.vpHeroSize = part.payload.sizeIntent;
      next.vpHeroFlow = part.payload.flowShape || "none";
      next.componentKind = next.componentKind || "container";
      next.vpSectionRole = "hero";
      break;
    }
    case "interaction": {
      next = writeVisualPartsState(next, { interactionPartId: partId });
      next.vpInteractionMode = part.payload.mode;
      // Interaction is pointer-driven — not a perpetual motion loop.
      if (part.payload.mode === "quiet") {
        next.motionPreset = "none";
        next.motionPlay = false;
      }
      if (part.payload.mode === "tactile") {
        next.motionPreset = "none";
        next.motionPlay = false;
      }
      if (part.payload.mode === "mechanical") {
        next.motionPreset = "none";
        next.motionPlay = false;
      }
      break;
    }
    case "curated_family": {
      next = applyCuratedFamily(next, partId, options.targetFamily);
      break;
    }
    default:
      break;
  }

  return { ok: true, props: next, appliedPartId: partId, socket };
}

export function applyCuratedFamily(
  props: Record<string, unknown>,
  familyId: string,
  targetFamily: VisualPartTargetFamily
): Record<string, unknown> {
  const family = getVisualPart(familyId);
  if (!family || family.payload.kind !== "curated_family") return props;
  // Top Shelf Enhanced package — dedicated recipe apply preserves layered package paint.
  if (familyId === "family_top_shelf_premium_action") {
    // Lazy import avoids circular init with packages/top-shelf/recipe.
    const { applyTopShelfPremiumAction } = require("./packages/top-shelf/recipe") as typeof import("./packages/top-shelf/recipe");
    return applyTopShelfPremiumAction(props, targetFamily);
  }
  const ingredients = family.payload.ingredientPartIds;
  let next = writeVisualPartsState(props, {
    curatedFamilyId: familyId,
    baseColor: family.payload.defaultBaseColor,
    iconStationPosition: "left",
    iconStationAnchor: "left_center",
    iconStationScale: 0.5,
    actionRole: family.payload.actionRole || "signature",
    surfaceTreatment: family.payload.surfaceTreatment || null,
  });

  const steps: Array<{ id: string | null | undefined; socket?: VisualPartSocket }> = [
    { id: ingredients.body },
    { id: ingredients.finish },
    { id: ingredients.rim, socket: "surface.rim" },
    { id: ingredients.iconStation },
    { id: ingredients.iconStationBacking, socket: "iconStation.backing" },
    { id: ingredients.iconStationRim, socket: "iconStation.rim" },
    { id: ingredients.mount, socket: "mount.plate" },
    { id: ingredients.accent },
    { id: ingredients.layout },
    { id: ingredients.interaction },
    { id: ingredients.bottomStop, socket: "bottomStop.cap" },
  ];

  for (const step of steps) {
    if (!step.id) continue;
    const result = applyVisualPart(next, step.id, {
      targetFamily: targetFamily === "action_surface" ? "container" : targetFamily,
      socket: step.socket,
      baseColor: family.payload.defaultBaseColor,
    });
    if (result.ok) next = result.props;
  }

  const finishResult = applyVisualPart(next, ingredients.finish || "finish_lacquer", {
    targetFamily: targetFamily === "action_surface" ? "button" : targetFamily,
    baseColor: family.payload.defaultBaseColor,
  });
  if (finishResult.ok) next = finishResult.props;

  if (ingredients.actionSurface) {
    const surfaceHost =
      targetFamily === "button" || targetFamily === "launch" || targetFamily === "badge"
        ? targetFamily
        : targetFamily === "action_surface"
          ? "container"
          : targetFamily === "container" || targetFamily === "hero"
            ? targetFamily
            : "container";
    const surfaceResult = applyVisualPart(next, ingredients.actionSurface, {
      targetFamily: surfaceHost,
    });
    if (surfaceResult.ok) next = surfaceResult.props;
  }

  next = writeVisualPartsState(next, {
    curatedFamilyId: familyId,
    actionSurfacePartId: ingredients.actionSurface || null,
    dividerLinePartId: ingredients.divider || null,
    mountPartId: ingredients.mount || family.payload.mountPartId || null,
    iconStationPosition: "left",
    actionRole: family.payload.actionRole || "signature",
  });

  if (targetFamily === "button" || targetFamily === "launch") {
    // Repair any prior Surface mis-apply that stamped Container identity on a Button.
    if (next.componentKind === "container") delete next.componentKind;
    next.showIcon = true;
    next.icon = next.icon && next.icon !== "none" ? next.icon : "sparkles";
    const mapped = mapIconStationPosition("left");
    next.iconPosition = mapped.iconPosition;
    next.iconStationBoth = mapped.iconStationBoth;
    if (family.payload.actionRole === "launch") next.actionRole = "launch";
    // Never invent business wording — starter/template authorities own placeholders.
  }

  const recipe = captureAssemblyRecipe(next, {
    id: familyId,
    label: family.label,
    ingredientPartIds: { family: familyId, ...ingredients },
  });
  next = applyAssemblyRecipeToProps(next, recipe);
  next = writeVisualPartsState(next, { assemblyRecipeId: recipe.id, curatedFamilyId: familyId });
  // Persist recipe id only — full recipe reconstructs from catalog + state (avoid prop bloat).
  return next;
}

export function applySurfaceMode(
  props: Record<string, unknown>,
  enabled: boolean,
  treatment: SurfaceTreatment = "quiet_field",
  targetFamily: VisualPartTargetFamily = "container"
): Record<string, unknown> {
  if (!enabled) {
    const cleared = writeVisualPartsState(props, {
      surfaceEnabled: false,
      surfaceTreatment: "off",
      actionSurfacePartId: "action_surface_none",
    });
    if (
      (targetFamily === "button" || targetFamily === "launch" || targetFamily === "badge") &&
      cleared.componentKind === "container"
    ) {
      delete cleared.componentKind;
    }
    return cleared;
  }
  const partId =
    treatment === "copper_harmonized"
      ? "action_surface_copper_harmonized"
      : treatment === "energy_field"
        ? "action_surface_energy_field"
        : treatment === "recess_well"
          ? "action_surface_recess"
          : treatment === "panel_plaque"
            ? "action_surface_panel"
            : treatment === "plinth_base"
              ? "action_surface_plinth"
              : "action_surface_quiet_field";
  const result = applyVisualPart(props, partId, { targetFamily });
  return result.ok
    ? writeVisualPartsState(result.props, { surfaceEnabled: true, surfaceTreatment: treatment })
    : writeVisualPartsState(props, { surfaceEnabled: true, surfaceTreatment: treatment });
}

/** Re-derive Surface fill/shadow when Host Intensity / Depth change. */
export function applySurfaceParameters(
  props: Record<string, unknown>,
  patch: { intensity?: number; depth?: number },
  targetFamily: VisualPartTargetFamily = "container"
): Record<string, unknown> {
  const state = readVisualPartsState(props);
  const intensity = patch.intensity ?? state.surfaceIntensity ?? 0.55;
  const depth = patch.depth ?? state.surfaceDepth ?? 0.45;
  const treatment = (state.surfaceTreatment || "quiet_field") as SurfaceTreatment;
  if (!state.surfaceEnabled || treatment === "off") {
    return writeVisualPartsState(props, { surfaceIntensity: intensity, surfaceDepth: depth });
  }
  const tone =
    treatment === "copper_harmonized"
      ? "copper_harmonized"
      : treatment === "energy_field"
        ? "energy_field"
        : treatment === "recess_well"
          ? "recess_well"
          : treatment === "panel_plaque"
            ? "panel_plaque"
            : treatment === "plinth_base"
              ? "plinth_base"
              : "quiet_field";
  const styles = surfaceToneStyles(tone, intensity, depth);
  const next = writeVisualPartsState(props, {
    surfaceIntensity: intensity,
    surfaceDepth: depth,
    surfaceTreatment: treatment,
  });
  const buttonishHost =
    targetFamily === "button" ||
    targetFamily === "launch" ||
    targetFamily === "badge" ||
    targetFamily === "form_submit";
  if (buttonishHost) return next;
  return { ...next, ...styles };
}

export function applyColorRefinement(
  props: Record<string, unknown>,
  refinement: FinishColorRefinement,
  targetFamily: VisualPartTargetFamily
): Record<string, unknown> {
  const state = readVisualPartsState(props);
  const next = writeVisualPartsState(props, { colorRefinement: refinement });
  const finishId = state.finishPartId || "finish_lacquer";
  const base = state.baseColor || "#16a34a";
  return applyFinishToSurface(
    next,
    finishId,
    base,
    targetFamily === "button" || targetFamily === "launch" || targetFamily === "form_submit",
    refinement
  );
}

export function applyIconStationScale(
  props: Record<string, unknown>,
  scale: number,
  anchor?: IconStationAnchor
): Record<string, unknown> {
  const clamped = Math.min(1, Math.max(0, scale));
  const state = readVisualPartsState(props);
  return writeVisualPartsState(props, {
    iconStationScale: clamped,
    iconStationAnchor: anchor || state.iconStationAnchor || "left_center",
  });
}

export function applyIconStationAnchor(
  props: Record<string, unknown>,
  anchor: IconStationAnchor
): Record<string, unknown> {
  return writeVisualPartsState(props, { iconStationAnchor: anchor });
}

/** Change only base color — Finish part id preserved. */
export function applyVisualPartBaseColor(
  props: Record<string, unknown>,
  baseColor: string,
  targetFamily: VisualPartTargetFamily
): Record<string, unknown> {
  const state = readVisualPartsState(props);
  const finishId = state.finishPartId || "finish_lacquer";
  const asButton =
    targetFamily === "button" || targetFamily === "form_submit" || targetFamily === "launch";
  let next = applyFinishToSurface(props, finishId, baseColor, asButton, state.colorRefinement);
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    rimPartId: state.rimPartId,
    accentPartId: state.accentPartId,
    iconStationGeometryPartId: state.iconStationGeometryPartId,
    iconStationBackingPartId: state.iconStationBackingPartId,
    iconStationRimPartId: state.iconStationRimPartId,
    iconStationPosition: state.iconStationPosition,
    iconStationScale: state.iconStationScale,
    iconStationAnchor: state.iconStationAnchor,
    curatedFamilyId: state.curatedFamilyId,
    bodyPartId: state.bodyPartId,
    interactionPartId: state.interactionPartId,
    layoutIntent: state.layoutIntent,
    dividerLinePartId: state.dividerLinePartId,
    actionSurfacePartId: state.actionSurfacePartId,
    mountPartId: state.mountPartId,
    bottomStopPartId: state.bottomStopPartId,
    surfaceEnabled: state.surfaceEnabled,
    surfaceTreatment: state.surfaceTreatment,
    brandRecipeId: state.brandRecipeId,
    colorRefinement: state.colorRefinement,
    actionRole: state.actionRole,
    assemblyRecipeId: state.assemblyRecipeId,
    baseColor,
  });
  return next;
}

export function applyIconStationPosition(
  props: Record<string, unknown>,
  position: IconStationPosition
): Record<string, unknown> {
  const mapped = mapIconStationPosition(position);
  const secondaryCue = position === "both" ? props.iconSecondary || "phone" : props.iconSecondary;
  return writeVisualPartsState(
    {
      ...props,
      showIcon: mapped.showIcon,
      iconPosition: mapped.iconPosition,
      iconStationBoth: mapped.iconStationBoth,
      iconSecondary: secondaryCue,
    },
    { iconStationPosition: position }
  );
}

export function applyIconStationContent(
  props: Record<string, unknown>,
  content:
    | {
        kind: "library";
        icon: string;
        asset?: Parameters<typeof applyButtonIconAsset>[1];
        slot?: "primary" | "secondary";
      }
    | { kind: "upload"; mediaUrl: string; mediaAssetId?: string; slot?: "primary" | "secondary" }
): Record<string, unknown> {
  const slot = content.slot || "primary";
  if (slot === "secondary") {
    if (content.kind === "library") {
      return {
        ...props,
        showIcon: true,
        iconStationBoth: true,
        iconSecondary: content.icon,
        iconSecondarySvg: undefined,
        iconSecondaryMediaUrl: undefined,
      };
    }
    return {
      ...props,
      showIcon: true,
      iconStationBoth: true,
      iconSecondaryMediaUrl: content.mediaUrl,
      iconSecondaryMediaAssetId: content.mediaAssetId,
    };
  }
  let next: Record<string, unknown> = { ...props, showIcon: true };
  if (content.kind === "library") {
    if (content.asset) {
      next = applyButtonIconAsset(next, content.asset);
    } else {
      next = {
        ...next,
        icon: content.icon,
        iconSvg: undefined,
        iconMediaUrl: undefined,
      };
    }
  } else {
    next = {
      ...next,
      iconMediaUrl: content.mediaUrl,
      iconMediaAssetId: content.mediaAssetId,
      iconMediaFit: next.iconMediaFit || "cover",
      icon: next.icon || "image",
    };
  }
  const state = readVisualPartsState(next);
  if (!state.iconStationGeometryPartId) {
    next = writeVisualPartsState(next, {
      iconStationGeometryPartId: "icon_station_round",
      iconStationPosition: state.iconStationPosition || "left",
      iconStationAnchor: state.iconStationAnchor || "left_center",
      iconStationScale: state.iconStationScale ?? 0.55,
    });
  }
  return next;
}

export function removeVisualPartSocket(
  props: Record<string, unknown>,
  socket: VisualPartSocket
): Record<string, unknown> {
  const state = readVisualPartsState(props);
  let next = { ...props };
  switch (socket) {
    case "surface.rim":
    case "frame.rim":
    case "container.edge":
      next = writeVisualPartsState(next, { rimPartId: null });
      break;
    case "iconStation.rim":
      next = writeVisualPartsState(next, { iconStationRimPartId: null });
      break;
    case "iconStation.backing":
      next = writeVisualPartsState(next, { iconStationBackingPartId: null });
      break;
    case "iconStation.geometry":
      next = writeVisualPartsState(next, { iconStationGeometryPartId: null });
      next.iconStationShape = null;
      next.iconStationClipPath = null;
      break;
    case "mount.plate":
      next = writeVisualPartsState(next, { mountPartId: null });
      next.vpMountStyle = null;
      break;
    case "bottomStop.cap":
      next = writeVisualPartsState(next, { bottomStopPartId: null });
      break;
    case "accent.left":
    case "accent.right":
    case "accent.both":
      next = writeVisualPartsState(next, { accentPartId: "accent_none" });
      next.accentOrnamentAssetId = null;
      break;
    case "finish.recipe":
      next = writeVisualPartsState(next, { finishPartId: null, baseColor: state.baseColor });
      break;
    case "curated.family":
      next = writeVisualPartsState(next, { curatedFamilyId: null, assemblyRecipeId: null });
      break;
    default:
      break;
  }
  return next;
}

export function curatedFamilyIngredientIds(familyId: string): Record<string, string | null> | null {
  const family = getVisualPart(familyId);
  if (!family || family.payload.kind !== "curated_family") return null;
  return { ...family.payload.ingredientPartIds };
}

export function visualPartsStateMatchesIngredients(
  props: Record<string, unknown>,
  familyId: string
): { ok: boolean; missing: string[] } {
  const ingredients = curatedFamilyIngredientIds(familyId);
  if (!ingredients) return { ok: false, missing: ["family"] };
  const state = readVisualPartsState(props);
  const missing: string[] = [];
  if (state.bodyPartId !== ingredients.body) missing.push("body");
  if (state.finishPartId !== ingredients.finish) missing.push("finish");
  if (state.rimPartId !== ingredients.rim) missing.push("rim");
  if (state.iconStationGeometryPartId !== ingredients.iconStation) missing.push("iconStation");
  if (
    ingredients.iconStationBacking &&
    state.iconStationBackingPartId !== ingredients.iconStationBacking
  ) {
    missing.push("iconStationBacking");
  }
  if (ingredients.iconStationRim && state.iconStationRimPartId !== ingredients.iconStationRim) {
    missing.push("iconStationRim");
  }
  if (ingredients.mount && state.mountPartId !== ingredients.mount) missing.push("mount");
  if (state.accentPartId !== ingredients.accent) missing.push("accent");
  if (state.interactionPartId !== ingredients.interaction) missing.push("interaction");
  return { ok: missing.length === 0, missing };
}
