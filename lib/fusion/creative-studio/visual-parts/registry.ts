/**
 * Canonical Studio Visual Parts registry — tiny proof inventory only.
 * Do not extend MATERIAL_CATALOG into a junk drawer.
 */

import { tapconnectOriginalProvenance } from "./provenance";
import { FACETED_STATION_CLIP } from "./ornaments";
import { LACQUER_PROOF_COLORS } from "./finish-color";
import type {
  VisualPartCollection,
  VisualPartDefinition,
  VisualPartSocket,
  VisualPartTargetFamily,
  VisualPartsDrawerId,
} from "./types";

function original(part: VisualPartDefinition): VisualPartDefinition {
  const prov = tapconnectOriginalProvenance(part.id, part.label);
  return { ...part, provenance: { provenanceId: prov.provenanceId } };
}

const SURFACE_AND_FRAME_RIM: VisualPartSocket[] = [
  "surface.rim",
  "frame.rim",
  "iconStation.rim",
  "container.edge",
  "divider.line",
];

const BUTTONISH: VisualPartTargetFamily[] = [
  "button",
  "badge",
  "form_submit",
  "coupon",
  "ticket",
];

const FRAMEABLE: VisualPartTargetFamily[] = [
  "button",
  "badge",
  "image",
  "logo",
  "container",
  "icon",
  "action_surface",
];

export const VISUAL_PARTS_CATALOG: readonly VisualPartDefinition[] = [
  // ── Body ──
  original({
    id: "body_rounded_rect",
    label: "Rounded Rectangle",
    collection: "foundation",
    category: "body",
    supportedSockets: ["body.geometry"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "body_geometry",
    colorization: "none",
    payload: { kind: "body", presentation: "rounded", radius: 14 },
    previewHint: "rounded-rect",
  }),
  original({
    id: "body_capsule",
    label: "Capsule",
    collection: "foundation",
    category: "body",
    supportedSockets: ["body.geometry"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "body_geometry",
    colorization: "none",
    payload: { kind: "body", presentation: "pill", radius: 999 },
    previewHint: "capsule",
  }),

  // ── Finish (independent of Color) ──
  original({
    id: "finish_lacquer",
    label: "Lacquer",
    collection: "foundation",
    category: "finish",
    supportedSockets: ["finish.recipe", "surface.material", "surface.highlight"],
    supportedTargetFamilies: [...BUTTONISH, "container", "action_surface", "badge"],
    renderKind: "finish_recipe",
    colorization: "finish_aware_derivation",
    payload: { kind: "finish", finishId: "lacquer", materialBridgeId: "gloss_lacquer" },
    previewHint: "lacquer-finish",
  }),
  original({
    id: "finish_acrylic",
    label: "Acrylic",
    collection: "foundation",
    category: "finish",
    supportedSockets: ["finish.recipe", "surface.material", "surface.highlight"],
    supportedTargetFamilies: [...BUTTONISH, "container", "action_surface", "badge"],
    renderKind: "finish_recipe",
    colorization: "finish_aware_derivation",
    payload: { kind: "finish", finishId: "acrylic", materialBridgeId: "acrylic" },
    previewHint: "acrylic-finish",
  }),

  // ── Frame & Ring ──
  original({
    id: "rim_simple_chrome",
    label: "Simple Chrome",
    collection: "foundation",
    category: "frame_ring",
    supportedSockets: SURFACE_AND_FRAME_RIM,
    supportedTargetFamilies: FRAMEABLE,
    renderKind: "rim_overlay",
    colorization: "metal_fixed",
    payload: { kind: "rim", cssClass: "vp-rim-simple-chrome", rimWidthPx: 3 },
    previewHint: "chrome-rim",
  }),
  original({
    id: "rim_pounded_copper",
    label: "Pounded Copper Rim",
    collection: "tapconnect_signature",
    category: "frame_ring",
    supportedSockets: SURFACE_AND_FRAME_RIM,
    supportedTargetFamilies: FRAMEABLE,
    renderKind: "rim_overlay",
    colorization: "metal_fixed",
    payload: {
      kind: "rim",
      cssClass: "vp-rim-pounded-copper",
      copperFamily: true,
      rimWidthPx: 8,
    },
    previewHint: "pounded-copper",
  }),

  // ── Icon Station geometry ──
  original({
    id: "icon_station_round",
    label: "Round",
    collection: "foundation",
    category: "icon_station",
    supportedSockets: ["iconStation.geometry"],
    supportedTargetFamilies: ["button", "badge", "icon", "image", "logo"],
    renderKind: "icon_station_shell",
    colorization: "none",
    payload: { kind: "icon_station_geometry", shape: "round" },
  }),
  original({
    id: "icon_station_faceted",
    label: "Faceted",
    collection: "foundation",
    category: "icon_station",
    supportedSockets: ["iconStation.geometry"],
    supportedTargetFamilies: ["button", "badge", "icon", "image", "logo"],
    renderKind: "icon_station_shell",
    colorization: "none",
    payload: {
      kind: "icon_station_geometry",
      shape: "faceted",
      clipPath: FACETED_STATION_CLIP,
    },
  }),
  original({
    id: "icon_station_backing_dark",
    label: "Dark Lacquer Backing",
    collection: "foundation",
    category: "icon_station",
    supportedSockets: ["iconStation.backing"],
    supportedTargetFamilies: ["button", "badge", "icon", "image", "logo"],
    renderKind: "icon_station_shell",
    colorization: "none",
    payload: {
      kind: "icon_station_backing",
      tone: "dark",
      background: "radial-gradient(circle at 35% 28%, #3a3a44, #0a0a0d 62%, #000)",
    },
    previewHint: "icon-station-dark-backing",
  }),

  // ── Accents ──
  original({
    id: "accent_none",
    label: "None",
    collection: "foundation",
    category: "accent",
    supportedSockets: ["accent.left", "accent.right", "accent.both"],
    supportedTargetFamilies: ["button", "badge", "container", "action_surface", "divider"],
    renderKind: "accent_ornament",
    colorization: "none",
    payload: { kind: "none" },
  }),
  original({
    id: "accent_copper_leaves",
    label: "Copper Leaves",
    collection: "tapconnect_signature",
    category: "accent",
    supportedSockets: ["accent.left", "accent.right", "accent.both", "iconStation.accent", "divider.endcapStart", "divider.endcapEnd"],
    supportedTargetFamilies: ["button", "badge", "container", "action_surface", "divider", "image", "logo"],
    renderKind: "accent_ornament",
    colorization: "ornament_fixed",
    payload: {
      kind: "accent",
      svgAssetId: "copper_leaves",
      defaultPlacement: "left",
    },
  }),

  // ── Layout ──
  original({
    id: "layout_one_column",
    label: "One Column",
    collection: "foundation",
    category: "layout",
    supportedSockets: ["layout.intent"],
    supportedTargetFamilies: ["button", "container", "action_surface"],
    renderKind: "layout_intent",
    colorization: "none",
    responsive: { autoStackWhenNarrow: false, preserveTapTarget: true, minLabelReadable: true },
    payload: { kind: "layout", intent: "one_column", autoStackPhone: false },
  }),
  original({
    id: "layout_two_column",
    label: "Two Column",
    collection: "foundation",
    category: "layout",
    supportedSockets: ["layout.intent"],
    supportedTargetFamilies: ["button", "container", "action_surface"],
    renderKind: "layout_intent",
    colorization: "none",
    responsive: { autoStackWhenNarrow: true, preserveTapTarget: true, minLabelReadable: true },
    payload: { kind: "layout", intent: "two_column", autoStackPhone: true },
  }),

  // ── Divider ──
  original({
    id: "divider_minimal_line",
    label: "Minimal Line",
    collection: "foundation",
    category: "divider",
    supportedSockets: ["divider.line"],
    supportedTargetFamilies: ["divider"],
    renderKind: "divider_treatment",
    colorization: "host_base_color",
    payload: { kind: "divider", lineStyle: "minimal" },
  }),
  original({
    id: "divider_copper_botanical",
    label: "Copper Botanical Divider",
    collection: "tapconnect_signature",
    category: "divider",
    supportedSockets: ["divider.line", "divider.endcapStart", "divider.endcapEnd"],
    supportedTargetFamilies: ["divider"],
    renderKind: "divider_treatment",
    colorization: "metal_fixed",
    payload: {
      kind: "divider",
      lineStyle: "copper_botanical",
      endcapAssetId: "copper_divider_endcap",
    },
  }),

  // ── Action Surface ──
  original({
    id: "action_surface_none",
    label: "None / Neutral Field",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background"],
    supportedTargetFamilies: ["container", "action_surface"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "neutral" },
  }),
  original({
    id: "action_surface_copper_harmonized",
    label: "Copper Harmonized Surface",
    collection: "tapconnect_signature",
    category: "action_surface",
    supportedSockets: ["actionSurface.background", "actionSurface.edge", "container.edge"],
    supportedTargetFamilies: ["container", "action_surface"],
    renderKind: "action_surface_cap",
    colorization: "metal_fixed",
    payload: {
      kind: "action_surface",
      backgroundTone: "copper_harmonized",
      edgePartId: "rim_pounded_copper",
    },
  }),

  // ── Interaction ──
  original({
    id: "interaction_quiet",
    label: "Quiet",
    collection: "foundation",
    category: "interaction",
    supportedSockets: ["interaction.hover", "interaction.press"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "interaction_recipe",
    colorization: "none",
    payload: { kind: "interaction", mode: "quiet" },
  }),
  original({
    id: "interaction_tactile",
    label: "Tactile",
    collection: "foundation",
    category: "interaction",
    supportedSockets: ["interaction.hover", "interaction.press", "interaction.motion"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "interaction_recipe",
    colorization: "none",
    payload: { kind: "interaction", mode: "tactile" },
  }),

  // ── Curated family (decomposition test) ──
  original({
    id: "family_bright_lacquer_pounded_copper",
    label: "Bright Lacquer + Pounded Copper",
    collection: "tapconnect_signature",
    category: "curated",
    supportedSockets: ["curated.family"],
    supportedTargetFamilies: ["button", "action_surface"],
    renderKind: "curated_family",
    colorization: "host_base_color",
    payload: {
      kind: "curated_family",
      defaultBaseColor: LACQUER_PROOF_COLORS.green,
      // Visual recipe only — never mutates Action/Bind authority.
      ingredientPartIds: {
        body: "body_rounded_rect",
        finish: "finish_lacquer",
        rim: "rim_pounded_copper",
        iconStation: "icon_station_round",
        iconStationBacking: "icon_station_backing_dark",
        iconStationRim: "rim_pounded_copper",
        accent: "accent_copper_leaves",
        layout: "layout_one_column",
        divider: "divider_copper_botanical",
        actionSurface: "action_surface_copper_harmonized",
        interaction: "interaction_tactile",
      },
    },
  }),
] as const;

const BY_ID = new Map(VISUAL_PARTS_CATALOG.map((part) => [part.id, part]));

export function getVisualPart(id: string): VisualPartDefinition | undefined {
  return BY_ID.get(id);
}

export function listVisualParts(filter?: {
  collection?: VisualPartCollection;
  category?: VisualPartDefinition["category"];
  socket?: VisualPartSocket;
  targetFamily?: VisualPartTargetFamily;
}): VisualPartDefinition[] {
  return VISUAL_PARTS_CATALOG.filter((part) => {
    if (filter?.collection && part.collection !== filter.collection) return false;
    if (filter?.category && part.category !== filter.category) return false;
    if (filter?.socket && !part.supportedSockets.includes(filter.socket)) return false;
    if (filter?.targetFamily && !part.supportedTargetFamilies.includes(filter.targetFamily)) return false;
    return true;
  });
}

export function partCompatibleWithTarget(
  partId: string,
  targetFamily: VisualPartTargetFamily
): { compatible: boolean; reason?: string } {
  const part = getVisualPart(partId);
  if (!part) return { compatible: false, reason: "Unknown Visual Part." };
  if (!part.supportedTargetFamilies.includes(targetFamily)) {
    return {
      compatible: false,
      reason: `${part.label} is not compatible with ${targetFamily.replaceAll("_", " ")}.`,
    };
  }
  return { compatible: true };
}

export function partSupportsSocket(partId: string, socket: VisualPartSocket): boolean {
  return Boolean(getVisualPart(partId)?.supportedSockets.includes(socket));
}

/** Drawer IA → part categories / passthrough authorities. */
export const VISUAL_PARTS_DRAWER_CONTRACT: Readonly<
  Record<
    VisualPartsDrawerId,
    {
      label: string;
      categories: readonly VisualPartDefinition["category"][];
      /** Existing Studio authority when drawer is a handle into Text/Action/Motion/Color. */
      passthrough?: "color" | "text" | "action" | "motion" | "advanced";
    }
  >
> = {
  curated: { label: "Curated", categories: ["curated"] },
  body: { label: "Body", categories: ["body"] },
  finish: { label: "Finish", categories: ["finish"] },
  color: { label: "Color", categories: ["color"], passthrough: "color" },
  frame_ring: { label: "Frame & Ring", categories: ["frame_ring"] },
  icon_image: { label: "Icon / Image", categories: ["icon_station", "icon_content"] },
  accents: { label: "Accents", categories: ["accent"] },
  text: { label: "Text", categories: ["text"], passthrough: "text" },
  layout: { label: "Layout", categories: ["layout"] },
  divider: { label: "Divider", categories: ["divider"] },
  surface_zone: { label: "Surface / Zone", categories: ["action_surface"] },
  action: { label: "Action", categories: ["action"], passthrough: "action" },
  motion: { label: "Motion", categories: ["motion"], passthrough: "motion" },
  advanced: { label: "Advanced", categories: [], passthrough: "advanced" },
};

export const POUNDED_COPPER_PART_ID = "rim_pounded_copper";
export const CURATED_FAMILY_BRIGHT_LACQUER_ID = "family_bright_lacquer_pounded_copper";
