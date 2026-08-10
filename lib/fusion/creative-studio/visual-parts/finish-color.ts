/**
 * Finish ≠ Color authority.
 * Host chooses base color; TapConnect derives finish-aware surface stops.
 * Never store Black/Red/Green/Blue Lacquer as four unrelated finish presets.
 */

export type FinishId = "lacquer" | "acrylic";

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
  /** Named proof tokens — mechanical only, not final Signature lock. */
  proofToken: "black" | "red" | "green" | "blue" | "custom";
}>;

/** Canonical proof base colors for mechanical certification. */
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

/** Relative luminance (sRGB). */
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
  // Near-match for Host-picked close variants
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

/**
 * Perceptual finish derivation — not a single naive lighten/darken %.
 * Dark bases get stronger specular; bright bases get deeper edge falloff.
 */
export function deriveFinishSurface(finishId: FinishId, baseColor: string): DerivedFinishSurface {
  const base = hexToRgb(baseColor) ? baseColor : LACQUER_PROOF_COLORS.green;
  const L = relativeLuminance(base);
  const proofToken = lacquerProofTokenForColor(base);

  if (finishId === "acrylic") {
    const hi = lighten(base, L < 0.25 ? 0.55 : 0.35);
    const mid = mix(base, "#94a3b8", 0.22);
    const deep = darken(base, 0.45);
    return {
      finishId,
      baseColor: base,
      gradient: `linear-gradient(145deg,${hi}aa 0%,${mid}88 42%,${deep}cc 100%)`,
      highlight: "linear-gradient(110deg,#ffffff66 0 18%,#0000 40%)",
      shine: true,
      borderWidth: 1,
      borderColor: "#ffffff77",
      outerShadow: 22,
      textColor: L < 0.45 ? "#f8fafc" : "#0f172a",
      proofToken,
    };
  }

  // Bright Lacquer
  const specularBoost = L < 0.18 ? 0.72 : L < 0.35 ? 0.55 : 0.38;
  const edgeDeep = L > 0.4 ? 0.62 : 0.78;
  const lightFacing = lighten(base, specularBoost);
  const mid = mix(base, lightFacing, 0.28);
  const darkFacing = darken(base, 0.35);
  const deepEdge = darken(base, edgeDeep);
  const hiStop = L < 0.2 ? "#ffffffcc" : lighten(base, 0.82);

  return {
    finishId: "lacquer",
    baseColor: base,
    gradient: `linear-gradient(180deg,${hiStop} 0%,${lightFacing} 22%,${mid} 48%,${darkFacing} 78%,${deepEdge} 100%)`,
    highlight: "linear-gradient(180deg,#ffffff88,#0000 48%)",
    shine: true,
    borderWidth: 1,
    borderColor: "#ffffff55",
    outerShadow: 26,
    textColor: L < 0.5 ? "#f8fafc" : "#111827",
    proofToken,
  };
}

export function finishSurfaceCssVars(derived: DerivedFinishSurface): Record<string, string> {
  return {
    "--vp-finish-gradient": derived.gradient,
    "--vp-finish-highlight": derived.highlight,
    "--vp-finish-text": derived.textColor,
  };
}
