/**
 * Finish ≠ Color authority.
 * Host chooses base color + refinement; Finish interprets into shared Material response channels.
 * Never store Black/Red/Green/Blue Lacquer as four unrelated finish presets.
 */

import type { FinishColorRefinement } from "./types";

export type FinishId = "lacquer" | "acrylic";

export type GeometryResponseClass = "rect" | "pill" | "circle" | "angular";

/** Channels consumed by MaterialSurfaceLayers / host boxShadow — not a second engine. */
export type MaterialResponseChannels = Readonly<{
  background: string;
  highlight: string;
  shine: boolean;
  borderWidth: number;
  borderColor: string;
  /** Soft elevation hint for Material shadow (Effects remain separate). */
  outerShadow: number;
  textColor: string;
  lightDirectionDeg: number;
  roughness: number;
  highlightStrength: number;
  edgeFalloff: number;
  geometryClass: GeometryResponseClass;
}>;

export type DerivedFinishSurface = Readonly<{
  finishId: FinishId;
  baseColor: string;
  gradient: string;
  highlight: string;
  shine: boolean;
  borderWidth: number;
  borderColor: string;
  outerShadow: number;
  textColor: string;
  proofToken: "black" | "red" | "green" | "blue" | "custom";
  materialResponse: MaterialResponseChannels;
}>;

export const LACQUER_PROOF_COLORS = {
  black: "#0a0a0c",
  red: "#b10d1a",
  green: "#16a34a",
  blue: "#155eef",
} as const;

export type LacquerProofToken = keyof typeof LACQUER_PROOF_COLORS;

function clamp(n: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.2;
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function mix(hex: string, toward: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  if (!a || !b) return hex;
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function lighten(hex: string, amount: number) {
  return mix(hex, "#ffffff", amount);
}

function darken(hex: string, amount: number) {
  return mix(hex, "#000000", amount);
}

export function lacquerProofTokenForColor(baseColor: string): LacquerProofToken | "custom" {
  const normalized = baseColor.trim().toLowerCase();
  for (const [token, hex] of Object.entries(LACQUER_PROOF_COLORS) as [LacquerProofToken, string][]) {
    if (normalized === hex.toLowerCase()) return token;
  }
  const rgb = hexToRgb(baseColor);
  if (!rgb) return "custom";
  let best: LacquerProofToken | "custom" = "custom";
  let bestDist = Infinity;
  for (const [token, hex] of Object.entries(LACQUER_PROOF_COLORS) as [LacquerProofToken, string][]) {
    const other = hexToRgb(hex)!;
    const dist = (rgb.r - other.r) ** 2 + (rgb.g - other.g) ** 2 + (rgb.b - other.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = token;
    }
  }
  return bestDist < 40 ** 2 ? best : "custom";
}

function applyTemperature(hex: string, temperature = 0.5): string {
  const cool = mix(hex, "#38bdf8", (0.5 - temperature) * 0.35);
  const warm = mix(hex, "#f59e0b", (temperature - 0.5) * 0.35);
  return temperature >= 0.5 ? warm : cool;
}

function applyRichness(hex: string, richness = 0.55): string {
  const gray = mix(hex, "#808080", 1 - richness);
  return mix(hex, gray, 0.35);
}

function geometryAngle(geometry: GeometryResponseClass, lightDirectionDeg: number): number {
  switch (geometry) {
    case "circle":
      return (lightDirectionDeg + 25) % 360;
    case "pill":
      return (lightDirectionDeg + 10) % 360;
    case "angular":
      return (lightDirectionDeg + 40) % 360;
    default:
      return lightDirectionDeg % 360;
  }
}

function geometryHighlight(geometry: GeometryResponseClass, strength: number, lightDeg: number): string {
  const alpha = Math.round(40 + strength * 80)
    .toString(16)
    .padStart(2, "0");
  if (geometry === "circle") {
    return `radial-gradient(circle at ${30 + (lightDeg / 360) * 40}% ${22 + (lightDeg / 360) * 20}%,#ffffff${alpha} 0 18%,#0000 52%)`;
  }
  if (geometry === "angular") {
    return `linear-gradient(${(lightDeg + 55) % 360}deg,#ffffff${alpha} 0 12%,#0000 34%), linear-gradient(${(lightDeg + 200) % 360}deg,#00000055 70%,#0000 100%)`;
  }
  if (geometry === "pill") {
    return `linear-gradient(${lightDeg}deg,#ffffff${alpha} 0 22%,#0000 48%)`;
  }
  return `linear-gradient(${lightDeg}deg,#ffffff${alpha} 0 18%,#0000 46%)`;
}

/**
 * Finish → Material response channels.
 * Geometry class changes highlight/mask profile — not a second Material engine.
 */
export function deriveFinishSurface(
  finishId: FinishId,
  baseColor: string,
  refinement?: FinishColorRefinement | null,
  geometryClass: GeometryResponseClass = "rect"
): DerivedFinishSurface {
  const r = {
    richness: refinement?.richness ?? 0.6,
    depth: refinement?.depth ?? 0.5,
    temperature: refinement?.temperature ?? 0.5,
    contrast: refinement?.contrast ?? 0.55,
    lightResponse: refinement?.lightResponse ?? 0.6,
    lightDirectionDeg: refinement?.lightDirectionDeg ?? 180,
    roughness: refinement?.roughness ?? (finishId === "acrylic" ? 0.35 : 0.18),
    highlightStrength: refinement?.highlightStrength ?? refinement?.lightResponse ?? 0.6,
    edgeFalloff: refinement?.edgeFalloff ?? 0.55,
  };
  let base = hexToRgb(baseColor) ? baseColor : LACQUER_PROOF_COLORS.green;
  base = applyTemperature(applyRichness(base, r.richness), r.temperature);
  const L = relativeLuminance(base);
  const proofToken = lacquerProofTokenForColor(baseColor);
  const angle = geometryAngle(geometryClass, r.lightDirectionDeg);
  const rough = Math.min(1, Math.max(0, r.roughness));
  const hiStrength = Math.min(1, Math.max(0, r.highlightStrength)) * (1 - rough * 0.45);

  if (finishId === "acrylic") {
    const hiAmt = (L < 0.25 ? 0.55 : 0.35) * (0.7 + r.lightResponse * 0.5) * (1 - rough * 0.3);
    const hi = lighten(base, hiAmt);
    const mid = mix(base, "#94a3b8", 0.22 * (1.1 - r.contrast * 0.3));
    const deep = darken(base, 0.35 + r.depth * 0.25 * r.edgeFalloff);
    const gradient = `linear-gradient(${angle}deg,${hi}aa 0%,${mid}88 42%,${deep}cc 100%)`;
    const highlight = geometryHighlight(geometryClass, hiStrength, angle);
    const materialResponse: MaterialResponseChannels = {
      background: gradient,
      highlight,
      shine: r.lightResponse > 0.25 && rough < 0.85,
      borderWidth: 1,
      borderColor: "#ffffff77",
      outerShadow: Math.round(16 + r.depth * 14),
      textColor: L < 0.45 ? "#f8fafc" : "#0f172a",
      lightDirectionDeg: angle,
      roughness: rough,
      highlightStrength: hiStrength,
      edgeFalloff: r.edgeFalloff,
      geometryClass,
    };
    return {
      finishId,
      baseColor: base,
      gradient,
      highlight,
      shine: materialResponse.shine,
      borderWidth: 1,
      borderColor: "#ffffff77",
      outerShadow: materialResponse.outerShadow,
      textColor: materialResponse.textColor,
      proofToken,
      materialResponse,
    };
  }

  const specularBoost =
    (L < 0.18 ? 0.72 : L < 0.35 ? 0.55 : 0.38) * (0.65 + r.lightResponse * 0.55) * (1 - rough * 0.35);
  const edgeDeep = (L > 0.4 ? 0.62 : 0.78) * (0.7 + r.depth * 0.45) * (0.7 + r.edgeFalloff * 0.3);
  const contrastSep = 0.7 + r.contrast * 0.45;
  const lightFacing = lighten(base, specularBoost);
  const mid = mix(base, lightFacing, 0.28 / contrastSep);
  const darkFacing = darken(base, 0.28 + r.depth * 0.2);
  const deepEdge = darken(base, Math.min(0.92, edgeDeep));
  const hiStop = L < 0.2 ? "#ffffffcc" : lighten(base, 0.7 + r.lightResponse * 0.2);
  const gradient =
    geometryClass === "angular"
      ? `linear-gradient(${angle}deg,${hiStop} 0%,${lightFacing} 18%,${mid} 46%,${darkFacing} 72%,${deepEdge} 100%)`
      : geometryClass === "circle"
        ? `radial-gradient(circle at ${28 + (angle / 360) * 44}% 24%,${hiStop} 0%,${lightFacing} 28%,${mid} 55%,${deepEdge} 100%)`
        : `linear-gradient(${angle}deg,${hiStop} 0%,${lightFacing} 22%,${mid} 48%,${darkFacing} 78%,${deepEdge} 100%)`;
  const highlight = geometryHighlight(geometryClass, hiStrength, angle);
  const materialResponse: MaterialResponseChannels = {
    background: gradient,
    highlight,
    shine: r.lightResponse > 0.2 && rough < 0.8,
    borderWidth: 1,
    borderColor: "#ffffff55",
    outerShadow: Math.round(18 + r.depth * 16),
    textColor: L < 0.5 ? "#f8fafc" : "#111827",
    lightDirectionDeg: angle,
    roughness: rough,
    highlightStrength: hiStrength,
    edgeFalloff: r.edgeFalloff,
    geometryClass,
  };

  return {
    finishId: "lacquer",
    baseColor: base,
    gradient,
    highlight,
    shine: materialResponse.shine,
    borderWidth: 1,
    borderColor: "#ffffff55",
    outerShadow: materialResponse.outerShadow,
    textColor: materialResponse.textColor,
    proofToken,
    materialResponse,
  };
}

/** CSS vars for Material host — Finish feeds Material, does not bypass it. */
export function finishSurfaceCssVars(derived: DerivedFinishSurface): Record<string, string> {
  const m = derived.materialResponse;
  return {
    "--vp-finish-gradient": m.background,
    "--vp-finish-highlight": m.highlight,
    "--vp-finish-text": m.textColor,
    "--vp-light-direction": `${m.lightDirectionDeg}deg`,
    "--vp-roughness": String(m.roughness),
    "--vp-highlight-strength": String(m.highlightStrength),
  };
}

export function geometryClassFromPresentation(
  presentation: string | null | undefined
): GeometryResponseClass {
  switch (String(presentation || "")) {
    case "pill":
      return "pill";
    case "circle":
      return "circle";
    case "angular":
      return "angular";
    default:
      return "rect";
  }
}
