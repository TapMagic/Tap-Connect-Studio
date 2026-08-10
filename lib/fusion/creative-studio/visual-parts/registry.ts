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
  "launch",
];

const FRAMEABLE: VisualPartTargetFamily[] = [
  "button",
  "badge",
  "image",
  "logo",
  "container",
  "icon",
  "action_surface",
  "launch",
  "hero",
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
  original({
    id: "body_rectangle",
    label: "Rectangle",
    collection: "foundation",
    category: "body",
    supportedSockets: ["body.geometry"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "body_geometry",
    colorization: "none",
    payload: { kind: "body", presentation: "rectangle", radius: 4 },
  }),
  original({
    id: "body_angular_mission",
    label: "Mission Control Plate",
    collection: "tapconnect_signature",
    category: "body",
    supportedSockets: ["body.geometry"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "body_geometry",
    colorization: "none",
    payload: { kind: "body", presentation: "angular", radius: 6 },
    previewHint: "mission-control-body",
  }),
  original({
    id: "body_circle",
    label: "Circle",
    collection: "foundation",
    category: "body",
    supportedSockets: ["body.geometry"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "body_geometry",
    colorization: "none",
    payload: { kind: "body", presentation: "circle", radius: 999 },
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
    payload: { kind: "layout", intent: "one_column", autoStackPhone: false, railAware: true },
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
    payload: { kind: "layout", intent: "two_column", autoStackPhone: true, railAware: true },
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

  // ── Action Surface / Stage ──
  original({
    id: "action_surface_none",
    label: "Surface Off",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background"],
    supportedTargetFamilies: ["container", "action_surface", "hero"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "neutral" },
  }),
  original({
    id: "action_surface_quiet_field",
    label: "Quiet Field",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background"],
    supportedTargetFamilies: ["container", "action_surface", "hero"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "quiet_field", intensityDefault: 0.45, depthDefault: 0.4 },
  }),
  original({
    id: "action_surface_panel",
    label: "Panel / Plaque",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background", "container.edge"],
    supportedTargetFamilies: ["container", "action_surface", "hero"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "panel_plaque", intensityDefault: 0.55, depthDefault: 0.5 },
  }),
  original({
    id: "action_surface_recess",
    label: "Recess / Well",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background"],
    supportedTargetFamilies: ["container", "action_surface"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "recess_well", intensityDefault: 0.6, depthDefault: 0.7 },
  }),
  original({
    id: "action_surface_energy_field",
    label: "Energy Field",
    collection: "tapconnect_signature",
    category: "action_surface",
    supportedSockets: ["actionSurface.background"],
    supportedTargetFamilies: ["container", "action_surface", "hero"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "energy_field", intensityDefault: 0.55, depthDefault: 0.5 },
  }),
  original({
    id: "action_surface_plinth",
    label: "Plinth / Base",
    collection: "foundation",
    category: "action_surface",
    supportedSockets: ["actionSurface.background", "actionSurface.capBottom"],
    supportedTargetFamilies: ["container", "action_surface"],
    renderKind: "action_surface_cap",
    colorization: "none",
    payload: { kind: "action_surface", backgroundTone: "plinth_base", intensityDefault: 0.5, depthDefault: 0.55 },
  }),
  original({
    id: "action_surface_copper_harmonized",
    label: "Copper Harmonized Surface",
    collection: "tapconnect_signature",
    category: "action_surface",
    supportedSockets: ["actionSurface.background", "actionSurface.edge", "container.edge"],
    supportedTargetFamilies: ["container", "action_surface", "hero"],
    renderKind: "action_surface_cap",
    colorization: "metal_fixed",
    payload: {
      kind: "action_surface",
      backgroundTone: "copper_harmonized",
      edgePartId: "rim_pounded_copper",
      intensityDefault: 0.6,
      depthDefault: 0.55,
    },
  }),

  // ── Mount / Backplate ──
  original({
    id: "mount_dark_plaque",
    label: "Dark Plaque Mount",
    collection: "foundation",
    category: "mount",
    supportedSockets: ["mount.plate"],
    supportedTargetFamilies: [...BUTTONISH, "container", "hero", "launch"],
    renderKind: "mount_plate",
    colorization: "none",
    payload: {
      kind: "mount",
      style: "dark_plaque",
      paddingPx: 6,
      radius: 16,
      background: "linear-gradient(180deg,#1f2430,#0c0e14)",
      border: "1px solid rgba(255,255,255,.12)",
      shadow: "0 10px 22px rgba(0,0,0,.4)",
    },
  }),
  original({
    id: "mount_beveled_plate",
    label: "Beveled Plate Mount",
    collection: "foundation",
    category: "mount",
    supportedSockets: ["mount.plate"],
    supportedTargetFamilies: [...BUTTONISH, "container", "launch"],
    renderKind: "mount_plate",
    colorization: "none",
    payload: {
      kind: "mount",
      style: "beveled_plate",
      paddingPx: 7,
      radius: 14,
      background: "linear-gradient(145deg,#3a3f4d,#12151c 55%,#0a0c10)",
      border: "1px solid rgba(255,255,255,.18)",
      shadow: "0 12px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.2)",
    },
  }),
  original({
    id: "mount_mission_control",
    label: "Mission Control Mount",
    collection: "tapconnect_signature",
    category: "mount",
    supportedSockets: ["mount.plate"],
    supportedTargetFamilies: [...BUTTONISH, "launch"],
    renderKind: "mount_plate",
    colorization: "none",
    payload: {
      kind: "mount",
      style: "mission_control_plate",
      paddingPx: 8,
      radius: 8,
      background: "linear-gradient(180deg,#243044,#0f172a 60%,#020617)",
      border: "1px solid rgba(56,189,248,.35)",
      shadow: "0 14px 28px rgba(0,0,0,.5), inset 0 0 0 1px rgba(15,23,42,.8)",
    },
  }),

  // ── Bottom Stop ──
  original({
    id: "bottom_stop_minimal",
    label: "Minimal End Cap",
    collection: "foundation",
    category: "bottom_stop",
    supportedSockets: ["bottomStop.cap", "container.capBottom"],
    supportedTargetFamilies: ["container", "bottom_stop", "card_root", "hero"],
    renderKind: "bottom_stop_cap",
    colorization: "none",
    payload: { kind: "bottom_stop", style: "minimal", heightPx: 10 },
  }),
  original({
    id: "bottom_stop_themed_border",
    label: "Themed Footer Border",
    collection: "tapconnect_signature",
    category: "bottom_stop",
    supportedSockets: ["bottomStop.cap", "container.capBottom"],
    supportedTargetFamilies: ["container", "bottom_stop", "card_root"],
    renderKind: "bottom_stop_cap",
    colorization: "metal_fixed",
    payload: { kind: "bottom_stop", style: "themed_border", heightPx: 14 },
  }),
  original({
    id: "bottom_stop_surface_closure",
    label: "Surface Closure",
    collection: "foundation",
    category: "bottom_stop",
    supportedSockets: ["bottomStop.cap", "actionSurface.capBottom"],
    supportedTargetFamilies: ["container", "bottom_stop", "action_surface"],
    renderKind: "bottom_stop_cap",
    colorization: "none",
    payload: { kind: "bottom_stop", style: "surface_closure", heightPx: 16 },
  }),

  // ── Hero structures ──
  original({
    id: "hero_compact",
    label: "Compact Hero",
    collection: "foundation",
    category: "hero",
    supportedSockets: ["hero.section"],
    supportedTargetFamilies: ["hero", "container", "card_root"],
    renderKind: "hero_section",
    colorization: "none",
    payload: { kind: "hero", structure: "compact", sizeIntent: "compact", flowShape: "geometric_band" },
  }),
  original({
    id: "hero_identity",
    label: "Identity Hero",
    collection: "foundation",
    category: "hero",
    supportedSockets: ["hero.section"],
    supportedTargetFamilies: ["hero", "container", "card_root"],
    renderKind: "hero_section",
    colorization: "none",
    payload: { kind: "hero", structure: "identity", sizeIntent: "standard", flowShape: "arc" },
  }),
  original({
    id: "hero_spotlight",
    label: "Spotlight Hero",
    collection: "tapconnect_signature",
    category: "hero",
    supportedSockets: ["hero.section"],
    supportedTargetFamilies: ["hero", "container"],
    renderKind: "hero_section",
    colorization: "none",
    payload: { kind: "hero", structure: "spotlight", sizeIntent: "feature", flowShape: "swoosh" },
  }),
  original({
    id: "hero_media",
    label: "Media Hero",
    collection: "foundation",
    category: "hero",
    supportedSockets: ["hero.section"],
    supportedTargetFamilies: ["hero", "container"],
    renderKind: "hero_section",
    colorization: "none",
    payload: { kind: "hero", structure: "media", sizeIntent: "standard", flowShape: "organic_wave" },
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
  original({
    id: "interaction_mechanical",
    label: "Mechanical",
    collection: "tapconnect_signature",
    category: "interaction",
    supportedSockets: ["interaction.hover", "interaction.press", "interaction.motion"],
    supportedTargetFamilies: BUTTONISH,
    renderKind: "interaction_recipe",
    colorization: "none",
    payload: { kind: "interaction", mode: "mechanical" },
  }),

  // ── Extra dividers ──
  original({
    id: "divider_geometric",
    label: "Geometric Divider",
    collection: "foundation",
    category: "divider",
    supportedSockets: ["divider.line"],
    supportedTargetFamilies: ["divider"],
    renderKind: "divider_treatment",
    colorization: "host_base_color",
    payload: { kind: "divider", lineStyle: "geometric" },
  }),
  original({
    id: "divider_industrial",
    label: "Industrial Divider",
    collection: "tapconnect_signature",
    category: "divider",
    supportedSockets: ["divider.line"],
    supportedTargetFamilies: ["divider"],
    renderKind: "divider_treatment",
    colorization: "metal_fixed",
    payload: { kind: "divider", lineStyle: "industrial" },
  }),
  original({
    id: "divider_electric",
    label: "Electric Divider",
    collection: "tapconnect_signature",
    category: "divider",
    supportedSockets: ["divider.line"],
    supportedTargetFamilies: ["divider"],
    renderKind: "divider_treatment",
    colorization: "none",
    payload: { kind: "divider", lineStyle: "electric", motion: "energy_travel" },
  }),

  // ── Layout: round team grid ──
  original({
    id: "layout_round_team_grid",
    label: "Round Team Grid",
    collection: "foundation",
    category: "layout",
    supportedSockets: ["layout.intent"],
    supportedTargetFamilies: ["container", "action_surface"],
    renderKind: "layout_intent",
    colorization: "none",
    responsive: { autoStackWhenNarrow: true, preserveTapTarget: true, minLabelReadable: true },
    payload: { kind: "layout", intent: "round_team_grid", autoStackPhone: true, railAware: true },
  }),

  // ── Curated families ──
  original({
    id: "family_bright_lacquer_pounded_copper",
    label: "Bright Lacquer + Pounded Copper",
    collection: "tapconnect_signature",
    category: "curated",
    supportedSockets: ["curated.family"],
    supportedTargetFamilies: ["button", "action_surface", "launch"],
    renderKind: "curated_family",
    colorization: "host_base_color",
    payload: {
      kind: "curated_family",
      defaultBaseColor: LACQUER_PROOF_COLORS.green,
      actionRole: "signature",
      mountPartId: "mount_dark_plaque",
      surfaceTreatment: "copper_harmonized",
      ingredientPartIds: {
        body: "body_rounded_rect",
        finish: "finish_lacquer",
        rim: "rim_pounded_copper",
        iconStation: "icon_station_round",
        iconStationBacking: "icon_station_backing_dark",
        iconStationRim: "rim_pounded_copper",
        mount: "mount_dark_plaque",
        accent: "accent_copper_leaves",
        layout: "layout_one_column",
        divider: "divider_copper_botanical",
        actionSurface: "action_surface_copper_harmonized",
        interaction: "interaction_tactile",
        bottomStop: "bottom_stop_themed_border",
      },
    },
  }),
  original({
    id: "family_mission_control",
    label: "Mission Control",
    collection: "tapconnect_signature",
    category: "curated",
    supportedSockets: ["curated.family"],
    supportedTargetFamilies: ["button", "launch", "action_surface"],
    renderKind: "curated_family",
    colorization: "host_base_color",
    payload: {
      kind: "curated_family",
      defaultBaseColor: "#0f172a",
      actionRole: "hero",
      mountPartId: "mount_mission_control",
      surfaceTreatment: "energy_field",
      ingredientPartIds: {
        body: "body_angular_mission",
        finish: "finish_acrylic",
        rim: "rim_simple_chrome",
        iconStation: "icon_station_faceted",
        iconStationBacking: "icon_station_backing_dark",
        iconStationRim: "rim_simple_chrome",
        mount: "mount_mission_control",
        accent: "accent_none",
        layout: "layout_one_column",
        divider: "divider_electric",
        actionSurface: "action_surface_energy_field",
        interaction: "interaction_mechanical",
        bottomStop: "bottom_stop_minimal",
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
  // Color stays in-cabinet (base color + refinement + Host Brand Recipes).
  // Existing Color picker remains available via the Color drawer passthrough button.
  color: { label: "Color", categories: ["color"] },
  frame_ring: { label: "Frame & Ring", categories: ["frame_ring"] },
  icon_image: { label: "Icon / Image", categories: ["icon_station", "icon_content"] },
  accents: { label: "Accents", categories: ["accent"] },
  text: { label: "Text", categories: ["text"], passthrough: "text" },
  layout: { label: "Layout", categories: ["layout"] },
  divider: { label: "Divider", categories: ["divider"] },
  surface_zone: { label: "Surface / Zone", categories: ["action_surface"] },
  mount: { label: "Mount", categories: ["mount"] },
  bottom_stop: { label: "Bottom Stop", categories: ["bottom_stop"] },
  hero: { label: "Hero", categories: ["hero"] },
  action: { label: "Action", categories: ["action"], passthrough: "action" },
  // Interaction modes are Host-facing Visual Parts; Motion intensity remains the existing Motion authority.
  motion: { label: "Motion", categories: ["interaction", "motion"], passthrough: "motion" },
  advanced: { label: "Advanced", categories: [], passthrough: "advanced" },
};

export const POUNDED_COPPER_PART_ID = "rim_pounded_copper";
export const CURATED_FAMILY_BRIGHT_LACQUER_ID = "family_bright_lacquer_pounded_copper";
export const CURATED_FAMILY_MISSION_CONTROL_ID = "family_mission_control";
