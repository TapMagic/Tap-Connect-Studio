import { applySurfaceMaterial } from "../material-engine";

export const STANDARD_BUTTON_APPEARANCE_CONTRACT = "standardButtonAppearance@1.0.0" as const;

export type StandardButtonGeometry = "rectangle" | "rounded" | "pill" | "square" | "circle";
export type StandardButtonEdge = "none" | "outline" | "rim" | "bevel" | "inner_rim";
export type StandardButtonDepth = "flat" | "low" | "standard" | "high" | "recessed" | "engraved";
export type StandardButtonShadow = "none" | "soft" | "medium" | "deep";

export type StandardButtonAppearance = Readonly<{
  contractId: typeof STANDARD_BUTTON_APPEARANCE_CONTRACT;
  geometry: StandardButtonGeometry;
  edge: StandardButtonEdge;
  depth: StandardButtonDepth;
  shadow: StandardButtonShadow;
  materialId: string;
  radiusPx: number;
  borderWidthPx: number;
  faceElevationPx: number;
}>;

export type StandardButtonAppearancePatch = Partial<Omit<StandardButtonAppearance, "contractId">>;

const DEPTH_ELEVATION: Record<StandardButtonDepth, number> = {
  flat: 0,
  low: 2,
  standard: 5,
  high: 9,
  recessed: 0,
  engraved: 0,
};

const SHADOW_STRENGTH: Record<StandardButtonShadow, number> = { none: 0, soft: 8, medium: 18, deep: 30 };

export function readStandardButtonAppearance(props: Readonly<Record<string, unknown>>): StandardButtonAppearance {
  const saved = props.standardButtonAppearance && typeof props.standardButtonAppearance === "object"
    ? props.standardButtonAppearance as Partial<StandardButtonAppearance>
    : {};
  const geometry = saved.geometry ?? (Number(props.radius) >= 900 ? "pill" : "rounded");
  const depth = saved.depth ?? (props.materialPreset === "recessed" ? "recessed" : Number(props.depth ?? props.boxShadow) > 18 ? "high" : Number(props.depth ?? props.boxShadow) > 0 ? "standard" : "flat");
  const edge = saved.edge ?? (Number(props.borderWidth) > 0 ? "outline" : "none");
  const shadow = saved.shadow ?? (Number(props.boxShadow) > 22 ? "deep" : Number(props.boxShadow) > 12 ? "medium" : Number(props.boxShadow) > 0 ? "soft" : "none");
  const radiusPx = Number(saved.radiusPx ?? props.radius ?? (geometry === "pill" || geometry === "circle" ? 999 : geometry === "rectangle" || geometry === "square" ? 2 : 16));
  return {
    contractId: STANDARD_BUTTON_APPEARANCE_CONTRACT,
    geometry,
    edge,
    depth,
    shadow,
    materialId: String(saved.materialId ?? props.materialPreset ?? "flat"),
    radiusPx,
    borderWidthPx: Number(saved.borderWidthPx ?? props.borderWidth ?? (edge === "none" ? 0 : edge === "rim" ? 3 : 1)),
    faceElevationPx: Number(saved.faceElevationPx ?? props.faceElevationPx ?? DEPTH_ELEVATION[depth]),
  };
}

/** Applies presentation only. Content composition and Action are deliberately untouched. */
export function applyStandardButtonAppearance(
  props: Readonly<Record<string, unknown>>,
  patch: StandardButtonAppearancePatch,
): Record<string, unknown> {
  const current = readStandardButtonAppearance(props);
  const next: StandardButtonAppearance = { ...current, ...patch, contractId: STANDARD_BUTTON_APPEARANCE_CONTRACT };
  const geometryRadius = next.geometry === "pill" || next.geometry === "circle" ? 999 : next.geometry === "rectangle" || next.geometry === "square" ? 2 : next.radiusPx;
  const materialProps = applySurfaceMaterial({ ...props }, next.materialId, { asButtonSurface: true, preserveTextColor: true });
  return {
    ...materialProps,
    standardButtonAppearance: { ...next, radiusPx: geometryRadius },
    presentation: next.geometry === "pill" ? "pill" : "rounded",
    radius: geometryRadius,
    borderWidth: next.edge === "none" ? 0 : next.edge === "rim" ? Math.max(3, next.borderWidthPx) : next.borderWidthPx,
    edgeTreatment: next.edge,
    depthTreatment: next.depth,
    shadowTreatment: next.shadow,
    faceElevationPx: next.depth === "recessed" || next.depth === "engraved" ? 0 : (patch.faceElevationPx ?? DEPTH_ELEVATION[next.depth]),
    boxShadow: next.depth === "recessed" || next.depth === "engraved" ? 0 : SHADOW_STRENGTH[next.shadow],
    innerShadow: next.depth === "recessed"
      ? "inset 0 4px 10px rgba(0,0,0,.62), inset 0 -1px 0 rgba(255,255,255,.12)"
      : next.depth === "engraved"
        ? "inset 0 2px 5px rgba(0,0,0,.58), inset 0 -1px 1px rgba(255,255,255,.18)"
        : materialProps.innerShadow,
  };
}

export const STANDARD_BUTTON_APPEARANCE_PRESETS = [
  { id: "clean-flat", name: "Clean Flat", category: "2D", description: "Crisp, quiet, and direct.", materialId: "flat", geometry: "rounded", edge: "none", depth: "flat", shadow: "none" },
  { id: "brand-outline", name: "Brand Outline", category: "2D", description: "Open surface with a clear Brand edge.", materialId: "clean_outline", geometry: "rounded", edge: "outline", depth: "flat", shadow: "none" },
  { id: "soft-raised", name: "Soft Raised", category: "Dimensional", description: "Gentle tactile lift.", materialId: "soft_raised", geometry: "rounded", edge: "none", depth: "low", shadow: "soft" },
  { id: "deep-raised", name: "Deep Raised", category: "Dimensional", description: "Substantial face and side-wall depth.", materialId: "hard_raised", geometry: "rounded", edge: "bevel", depth: "high", shadow: "deep" },
  { id: "embossed-light", name: "Embossed Light", category: "Dimensional", description: "A lifted embossed face with restrained relief.", materialId: "embossed", geometry: "rounded", edge: "bevel", depth: "low", shadow: "soft" },
  { id: "recessed", name: "Recessed", category: "Dimensional", description: "An inset action surface.", materialId: "recessed", geometry: "rounded", edge: "inner_rim", depth: "recessed", shadow: "none" },
  { id: "engraved-dark", name: "Engraved Dark", category: "Dimensional", description: "A controlled engraved treatment.", materialId: "debossed", geometry: "rounded", edge: "inner_rim", depth: "engraved", shadow: "none" },
  { id: "gloss-enamel", name: "Gloss Enamel", category: "Gloss & Glass", description: "High-fidelity lacquer and highlight.", materialId: "gloss_lacquer", geometry: "pill", edge: "rim", depth: "standard", shadow: "medium" },
  { id: "smoked-glass", name: "Smoked Glass", category: "Gloss & Glass", description: "Dark translucent premium glass.", materialId: "smoked_glass", geometry: "pill", edge: "outline", depth: "low", shadow: "medium" },
  { id: "brushed-metal", name: "Brushed Metal", category: "Metal", description: "Brushed dimensional metal.", materialId: "brushed_silver", geometry: "rounded", edge: "bevel", depth: "standard", shadow: "medium" },
  { id: "black-chrome", name: "Black Chrome", category: "Metal", description: "Dark polished metal with a controlled rim.", materialId: "black_chrome", geometry: "pill", edge: "rim", depth: "standard", shadow: "deep" },
] as const;

export type StandardButtonAppearancePresetId = typeof STANDARD_BUTTON_APPEARANCE_PRESETS[number]["id"];

export function applyStandardButtonAppearancePreset(
  props: Readonly<Record<string, unknown>>,
  presetId: StandardButtonAppearancePresetId,
): Record<string, unknown> {
  const preset = STANDARD_BUTTON_APPEARANCE_PRESETS.find((candidate) => candidate.id === presetId) ?? STANDARD_BUTTON_APPEARANCE_PRESETS[0];
  return applyStandardButtonAppearance(props, {
    geometry: preset.geometry,
    edge: preset.edge,
    depth: preset.depth,
    shadow: preset.shadow,
    materialId: preset.materialId,
  });
}
