/**
 * Apply / replace / remove Visual Parts through shared Studio authorities.
 * Never invents a second Material / Text / Icon / Action engine.
 */

import { applySurfaceMaterial } from "../material-engine";
import { applyButtonIconAsset, updateButtonLabel } from "../button-composition";
import { deriveFinishSurface, type FinishId } from "./finish-color";
import { getVisualPart, partCompatibleWithTarget } from "./registry";
import type {
  ApplyPartResult,
  IconStationPosition,
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
  asButtonSurface: boolean
): Record<string, unknown> {
  const part = getVisualPart(finishPartId);
  if (!part || part.payload.kind !== "finish") return props;
  const derived = deriveFinishSurface(part.payload.finishId as FinishId, baseColor);
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
      return { showIcon: true, iconPosition: "before", iconStationBoth: true };
    case "left":
    default:
      return { showIcon: true, iconPosition: "before", iconStationBoth: false };
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

  const asButton = options.targetFamily === "button" || options.targetFamily === "form_submit";
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
      next = applyFinishToSurface(next, partId, color, asButton);
      break;
    }
    case "rim": {
      if (socket === "iconStation.rim") {
        next = writeVisualPartsState(next, { iconStationRimPartId: partId });
        break;
      }
      next = writeVisualPartsState(next, { rimPartId: partId });
      // Dimensional rim is overlay-rendered from part id — keep border minimal.
      if (part.payload.copperFamily) {
        next.borderWidth = 0;
      } else {
        next.borderWidth = Math.max(Number(next.borderWidth || 0), 1);
        next.borderColor = next.borderColor || "#cbd5e1";
      }
      break;
    }
    case "icon_station_geometry": {
      // Geometry only — never implies backing or Signature rim styling.
      next = writeVisualPartsState(next, {
        iconStationGeometryPartId: partId,
        iconStationPosition: state.iconStationPosition || "left",
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
        next = writeVisualPartsState(next, { actionSurfacePartId: partId });
        next.actionSurfaceTone = "neutral";
      }
      break;
    }
    case "layout": {
      next = writeVisualPartsState(next, { layoutIntent: part.payload.intent });
      next.vpLayoutIntent = part.payload.intent;
      next.vpAutoStackPhone = part.payload.autoStackPhone;
      break;
    }
    case "divider": {
      next = writeVisualPartsState(next, {
        dividerLinePartId: partId,
        dividerEndcapStartPartId: part.payload.endcapAssetId ? "accent_copper_leaves" : null,
        dividerEndcapEndPartId: part.payload.endcapAssetId ? "accent_copper_leaves" : null,
      });
      next.dividerStyle = part.payload.lineStyle === "copper_botanical" ? "solid" : "solid";
      next.vpDividerTreatment = part.payload.lineStyle;
      next.vpDividerEndcapAssetId = part.payload.endcapAssetId || null;
      if (part.payload.lineStyle === "copper_botanical") {
        next.strokeWidth = Math.max(Number(next.strokeWidth || next.thickness || 2), 4);
        next.fill = "#c56a2d";
        next.color = "#c56a2d";
      }
      break;
    }
    case "action_surface": {
      next = writeVisualPartsState(next, {
        actionSurfacePartId: partId,
        rimPartId: part.payload.edgePartId || state.rimPartId || null,
      });
      next.actionSurfaceTone = part.payload.backgroundTone;
      next.componentKind = next.componentKind || "container";
      if (part.payload.backgroundTone === "copper_harmonized") {
        next.fill = "#1a1410";
        next.gradientFill =
          "linear-gradient(160deg,#3a2418 0%,#1a1410 48%,#0c0a08 100%)";
        next.borderWidth = 0;
      } else {
        next.fill = next.fill || "#111827";
        next.gradientFill = undefined;
      }
      break;
    }
    case "interaction": {
      next = writeVisualPartsState(next, { interactionPartId: partId });
      next.vpInteractionMode = part.payload.mode;
      if (part.payload.mode === "tactile") {
        next.motionPreset = next.motionPreset || "subtle_pulse";
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
  });

  const steps: Array<{ id: string | null | undefined; socket?: VisualPartSocket }> = [
    { id: ingredients.body },
    { id: ingredients.finish },
    { id: ingredients.rim, socket: "surface.rim" },
    { id: ingredients.iconStation },
    { id: ingredients.iconStationBacking, socket: "iconStation.backing" },
    { id: ingredients.iconStationRim, socket: "iconStation.rim" },
    { id: ingredients.accent },
    { id: ingredients.layout },
    { id: ingredients.interaction },
  ];

  for (const step of steps) {
    if (!step.id) continue;
    const result = applyVisualPart(next, step.id, {
      targetFamily,
      socket: step.socket,
      baseColor: family.payload.defaultBaseColor,
    });
    if (result.ok) next = result.props;
  }

  // Re-assert finish + curated color after rim/body merges
  const finishResult = applyVisualPart(next, ingredients.finish || "finish_lacquer", {
    targetFamily,
    baseColor: family.payload.defaultBaseColor,
  });
  if (finishResult.ok) next = finishResult.props;

  next = writeVisualPartsState(next, {
    curatedFamilyId: familyId,
    actionSurfacePartId: ingredients.actionSurface || null,
    dividerLinePartId: ingredients.divider || null,
    iconStationPosition: "left",
  });

  if (targetFamily === "button") {
    next.showIcon = true;
    next.icon = next.icon && next.icon !== "none" ? next.icon : "sparkles";
    const mapped = mapIconStationPosition("left");
    next.iconPosition = mapped.iconPosition;
    next.iconStationBoth = mapped.iconStationBoth;
    // Action/Bind authority is independent — never set actionType/href here.
    if (!next.label) next = updateButtonLabel(next, "Book Your Table");
  }

  return next;
}

/** Change only base color — Finish part id preserved. */
export function applyVisualPartBaseColor(
  props: Record<string, unknown>,
  baseColor: string,
  targetFamily: VisualPartTargetFamily
): Record<string, unknown> {
  const state = readVisualPartsState(props);
  const finishId = state.finishPartId || "finish_lacquer";
  const asButton = targetFamily === "button" || targetFamily === "form_submit";
  let next = applyFinishToSurface(props, finishId, baseColor, asButton);
  // Preserve identity sockets
  next = writeVisualPartsState(next, {
    ...readVisualPartsState(next),
    rimPartId: state.rimPartId,
    accentPartId: state.accentPartId,
    iconStationGeometryPartId: state.iconStationGeometryPartId,
    iconStationBackingPartId: state.iconStationBackingPartId,
    iconStationRimPartId: state.iconStationRimPartId,
    iconStationPosition: state.iconStationPosition,
    curatedFamilyId: state.curatedFamilyId,
    bodyPartId: state.bodyPartId,
    interactionPartId: state.interactionPartId,
    layoutIntent: state.layoutIntent,
    dividerLinePartId: state.dividerLinePartId,
    actionSurfacePartId: state.actionSurfacePartId,
    baseColor,
  });
  return next;
}

export function applyIconStationPosition(
  props: Record<string, unknown>,
  position: IconStationPosition
): Record<string, unknown> {
  const mapped = mapIconStationPosition(position);
  return writeVisualPartsState(
    {
      ...props,
      showIcon: mapped.showIcon,
      iconPosition: mapped.iconPosition,
      iconStationBoth: mapped.iconStationBoth,
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
      next = writeVisualPartsState(next, { curatedFamilyId: null });
      break;
    default:
      break;
  }
  return next;
}

/** Exposed ingredient map for Curated → Customize proof. */
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
  if (state.accentPartId !== ingredients.accent) missing.push("accent");
  if (state.interactionPartId !== ingredients.interaction) missing.push("interaction");
  return { ok: missing.length === 0, missing };
}
