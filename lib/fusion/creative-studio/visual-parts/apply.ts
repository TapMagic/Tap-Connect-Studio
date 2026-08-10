/**
 * Apply / replace / remove Visual Parts through shared Studio authorities.
 * Never invents a second Material / Text / Icon / Action engine.
 * Visual recipes must not invent business content or mutate Action/Bind.
 */

import { applySurfaceMaterial } from "../material-engine";
import { applyButtonIconAsset } from "../button-composition";
import { deriveFinishSurface, type FinishId } from "./finish-color";
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

function applyFinishToSurface(
  props: Record<string, unknown>,
  finishPartId: string,
  baseColor: string,
  asButtonSurface: boolean,
  refinement?: FinishColorRefinement | null
): Record<string, unknown> {
  const part = getVisualPart(finishPartId);
  if (!part || part.payload.kind !== "finish") return props;
  const state = readVisualPartsState(props);
  const derived = deriveFinishSurface(
    part.payload.finishId as FinishId,
    baseColor,
    refinement ?? state.colorRefinement
  );
  let next = { ...props };
  if (part.payload.materialBridgeId) {
    next = applySurfaceMaterial(next, part.payload.materialBridgeId, {
      asButtonSurface,
      preserveTextColor: true,
    });
  }
  next.gradientFill = derived.gradient;
  next.buttonSurfaceKind = "gradient";
  next.fill = undefined;
  next.shine = derived.shine;
  next.highlight = derived.highlight;
  next.borderWidth = derived.borderWidth;
  next.borderColor = derived.borderColor;
  next.boxShadow = surfaceShadow(derived.outerShadow);
  next.labelColor = next.labelColor || derived.textColor;
  next.textColor = next.textColor || derived.textColor;
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

function surfaceToneStyles(tone: string): Partial<Record<string, unknown>> {
  switch (tone) {
    case "copper_harmonized":
      return {
        fill: "#1a1410",
        gradientFill: "linear-gradient(160deg,#3a2418 0%,#1a1410 48%,#0c0a08 100%)",
        borderWidth: 0,
        boxShadow: composeDepthShadow(1),
      };
    case "quiet_field":
      return {
        fill: "#111827",
        gradientFill: "linear-gradient(180deg,#1f2937 0%,#111827 55%,#0b1220 100%)",
        borderWidth: 0,
        boxShadow: composeDepthShadow(1, 0.7),
      };
    case "energy_field":
      return {
        fill: "#0b1224",
        gradientFill:
          "linear-gradient(155deg,#0b1224 0%,#111c3a 40%,#0a1020 70%), radial-gradient(ellipse at 20% 40%,rgba(56,189,248,.22),transparent 45%), radial-gradient(ellipse at 80% 70%,rgba(37,99,235,.18),transparent 40%)",
        borderWidth: 0,
        boxShadow: composeDepthShadow(1),
      };
    case "recess_well":
      return {
        fill: "#0a0c12",
        gradientFill: "linear-gradient(180deg,#151922 0%,#0a0c12 100%)",
        borderWidth: 1,
        borderColor: "#00000088",
        boxShadow: "inset 0 8px 18px rgba(0,0,0,.55), inset 0 -1px 0 rgba(255,255,255,.05)",
      };
    case "panel_plaque":
      return {
        fill: "#1e2430",
        gradientFill: "linear-gradient(180deg,#2a3344 0%,#171c26 100%)",
        borderWidth: 1,
        borderColor: "#ffffff22",
        boxShadow: composeDepthShadow(1),
      };
    case "plinth_base":
      return {
        fill: "#12141a",
        gradientFill: "linear-gradient(180deg,#1a1d26 0%,#0e1016 70%,#08090c 100%)",
        borderWidth: 0,
        boxShadow: "0 -2px 0 rgba(255,255,255,.06), 0 16px 28px rgba(0,0,0,.45)",
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
      const styles = surfaceToneStyles(tone);
      const treatment: SurfaceTreatment =
        tone === "neutral" ? "off" : (tone as SurfaceTreatment);
      next = writeVisualPartsState(next, {
        actionSurfacePartId: partId,
        rimPartId: part.payload.edgePartId || state.rimPartId || null,
        surfaceEnabled: tone !== "neutral",
        surfaceTreatment: treatment,
        surfaceIntensity: part.payload.intensityDefault ?? 0.55,
        surfaceDepth: part.payload.depthDefault ?? 0.45,
      });
      next.actionSurfaceTone = part.payload.backgroundTone;
      next.componentKind = next.componentKind || "container";
      Object.assign(next, styles);
      break;
    }
    case "mount": {
      next = writeVisualPartsState(next, { mountPartId: partId });
      next.vpMountStyle = part.payload.style;
      next.vpMountPaddingPx = part.payload.paddingPx;
      next.vpMountRadius = part.payload.radius;
      next.vpMountBackground = part.payload.background;
      next.vpMountBorder = part.payload.border || null;
      next.vpMountShadow = part.payload.shadow || composeDepthShadow(2);
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
      if (part.payload.mode === "tactile") {
        next.motionPreset = next.motionPreset || "subtle_pulse";
        next.motionPlay = true;
      }
      if (part.payload.mode === "mechanical") {
        next.motionPreset = next.motionPreset || "press_inset";
        next.motionPlay = true;
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
    const surfaceResult = applyVisualPart(next, ingredients.actionSurface, {
      targetFamily: "container",
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
  treatment: SurfaceTreatment = "quiet_field"
): Record<string, unknown> {
  if (!enabled) {
    return writeVisualPartsState(props, {
      surfaceEnabled: false,
      surfaceTreatment: "off",
      actionSurfacePartId: "action_surface_none",
    });
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
  const result = applyVisualPart(props, partId, { targetFamily: "container" });
  return result.ok
    ? writeVisualPartsState(result.props, { surfaceEnabled: true, surfaceTreatment: treatment })
    : writeVisualPartsState(props, { surfaceEnabled: true, surfaceTreatment: treatment });
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
      }
    | { kind: "upload"; mediaUrl: string; mediaAssetId?: string }
): Record<string, unknown> {
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
