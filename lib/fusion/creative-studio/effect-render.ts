/**
 * Target-aware effect CSS — named treatments must be visually distinguishable.
 */

export type EffectRenderTarget = "glyph" | "icon_artwork" | "surface" | "text_box";

export type EffectRenderInput = {
  effectPreset?: string | null;
  glow?: number;
  shadow?: number;
  glowColor?: string | null;
  secondaryGlow?: number;
  innerShadow?: string | null;
  coreBrightness?: number;
  edgeWidth?: number;
  auraIntensity?: number;
  opacity?: number;
  color?: string | null;
  textShadowLayers?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function withAlpha(color: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const hex =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `,${a})`);
  return color;
}

export function resolveEffectId(input: EffectRenderInput): string {
  return String(input.effectPreset || "none").replaceAll("-", "_");
}

/**
 * Build text-shadow / filter / box-shadow layers for a named effect.
 * Neon Edge: bright narrow core + tight glow + restrained outer aura (not fog).
 */
export function effectLayersCss(
  target: EffectRenderTarget,
  input: EffectRenderInput
): { textShadow?: string; filter?: string; boxShadow?: string } {
  const id = resolveEffectId(input);
  const color = String(input.glowColor || input.color || "#22d3ee");
  const glow = Number(input.glow ?? 0);
  const shadow = Number(input.shadow ?? 0);
  const secondary = Number(input.secondaryGlow ?? 0);
  const core = Number(input.coreBrightness ?? 1);
  const edge = Number(input.edgeWidth ?? 1.25);
  const aura = Number(input.auraIntensity ?? 0.45);
  const layers: string[] = [];

  const pushShadow = (css: string) => {
    if (css) layers.push(css);
  };

  if (id === "neon_edge") {
    const coreR = clamp(edge * 0.55, 0.4, 2.2);
    const near = clamp(glow || 10, 4, 22);
    const outer = clamp(near * 1.7 * aura, 6, 28);
    // Crisp electrical core
    pushShadow(`0 0 ${coreR}px ${withAlpha("#ffffff", clamp(0.85 * core, 0.5, 1))}`);
    pushShadow(`0 0 ${coreR * 1.4}px ${withAlpha(color, clamp(0.95 * core, 0.6, 1))}`);
    // Tight saturated glow
    pushShadow(`0 0 ${near}px ${withAlpha(color, 0.75)}`);
    // Restrained outer aura
    pushShadow(`0 0 ${outer}px ${withAlpha(color, 0.28 * aura)}`);
  } else if (id === "soft_glow") {
    const r = clamp(glow || 16, 8, 36);
    pushShadow(`0 0 ${r * 0.55}px ${withAlpha(color, 0.45)}`);
    pushShadow(`0 0 ${r}px ${withAlpha(color, 0.28)}`);
  } else if (id === "aura") {
    const inner = clamp(glow || 28, 16, 48);
    const outer = clamp(secondary || inner * 1.6, 24, 72);
    pushShadow(`0 0 ${inner}px ${withAlpha(color, 0.32)}`);
    pushShadow(`0 0 ${outer}px ${withAlpha(color, 0.18)}`);
    pushShadow(`0 0 ${outer * 1.35}px ${withAlpha(color, 0.1)}`);
  } else if (id === "double_neon") {
    const near = clamp(glow || 14, 6, 28);
    const outer = clamp(secondary || near * 2, 16, 56);
    pushShadow(`0 0 ${clamp(edge, 0.5, 2)}px ${withAlpha("#ffffff", clamp(0.9 * core, 0.55, 1))}`);
    pushShadow(`0 0 ${near * 0.45}px ${withAlpha(color, 0.95)}`);
    pushShadow(`0 0 ${near}px ${withAlpha(color, 0.7)}`);
    pushShadow(`0 0 ${outer}px ${withAlpha(color, 0.35)}`);
  } else if (id === "electric") {
    const near = clamp(glow || 12, 5, 24);
    const flash = clamp(secondary || near * 1.5, 10, 36);
    pushShadow(`0 0 ${clamp(edge * 0.4, 0.35, 1.5)}px ${withAlpha("#ffffff", 1)}`);
    pushShadow(`0 0 ${near * 0.35}px ${withAlpha(color, 1)}`);
    pushShadow(`0 0 ${near}px ${withAlpha(color, 0.65)}`);
    pushShadow(`0 0 ${flash}px ${withAlpha(color, 0.22)}`);
  } else if (id === "soft_shadow") {
    const d = clamp(shadow || 14, 4, 40);
    pushShadow(`0 ${Math.max(1, d / 5)}px ${d}px rgba(0,0,0,0.28)`);
  } else if (id === "deep_shadow") {
    const d = clamp(shadow || 28, 10, 56);
    pushShadow(`0 ${Math.max(4, d / 3.5)}px ${d}px rgba(0,0,0,0.55)`);
    pushShadow(`0 ${Math.max(2, d / 8)}px ${d * 0.35}px rgba(0,0,0,0.35)`);
  } else if (id === "floating") {
    const d = clamp(shadow || 36, 16, 64);
    pushShadow(`0 ${Math.max(8, d / 2.2)}px ${d}px rgba(0,0,0,0.42)`);
    pushShadow(`0 ${Math.max(2, d / 10)}px ${d * 0.25}px rgba(0,0,0,0.2)`);
  } else if (id === "inner_glow" && input.innerShadow) {
    pushShadow(String(input.innerShadow));
  } else {
    // Generic fallback from numeric props
    if (glow > 0) pushShadow(`0 0 ${glow}px ${withAlpha(color, 0.7)}`);
    if (secondary > 0) pushShadow(`0 0 ${secondary}px ${withAlpha(color, 0.35)}`);
    if (shadow > 0) pushShadow(`0 ${Math.max(1, shadow / 3)}px ${shadow}px rgba(0,0,0,0.55)`);
  }

  if (input.textShadowLayers) layers.unshift(String(input.textShadowLayers));
  if (input.innerShadow && id !== "inner_glow" && target === "surface") {
    layers.push(String(input.innerShadow));
  }

  const joined = layers.filter(Boolean).join(", ") || undefined;

  if (target === "glyph" || target === "text_box") {
    return { textShadow: target === "glyph" ? joined : undefined, boxShadow: target === "text_box" ? joined : undefined };
  }
  if (target === "icon_artwork") {
    // drop-shadow chain for SVG paths
    const filters = layers
      .map((layer) => {
        // Convert "0 0 10px color" → drop-shadow(0 0 10px color)
        return `drop-shadow(${layer})`;
      })
      .join(" ");
    return { filter: filters || undefined };
  }
  return { boxShadow: joined };
}

/** Dimensional material edge helpers — paired highlight + directional shadow. */
export function dimensionalSurfaceCss(kind: string | null | undefined): {
  boxShadow?: string;
  backgroundImage?: string;
} {
  const id = String(kind || "").replaceAll("-", "_");
  switch (id) {
    case "soft_raised":
    case "raised":
      return {
        boxShadow: "0 1px 0 rgba(255,255,255,.28), 0 10px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.2)",
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.14), rgba(0,0,0,.08))",
      };
    case "hard_raised":
      return {
        boxShadow: "0 2px 0 rgba(255,255,255,.2), 0 14px 22px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25)",
      };
    case "recessed":
      return {
        boxShadow: "inset 0 3px 10px rgba(0,0,0,.55), inset 0 -1px 0 rgba(255,255,255,.12), 0 1px 0 rgba(255,255,255,.05)",
      };
    case "beveled":
      return {
        boxShadow: "inset 1px 1px 0 rgba(255,255,255,.35), inset -1px -1px 0 rgba(0,0,0,.45), 0 6px 12px rgba(0,0,0,.3)",
        backgroundImage: "linear-gradient(145deg, rgba(255,255,255,.18), rgba(0,0,0,.12))",
      };
    case "embossed":
      return {
        boxShadow: "0 1px 0 rgba(255,255,255,.3), 0 -1px 0 rgba(0,0,0,.35), 0 8px 14px rgba(0,0,0,.28)",
      };
    case "debossed":
      return {
        boxShadow: "inset 0 2px 6px rgba(0,0,0,.55), inset 0 -1px 0 rgba(255,255,255,.1)",
      };
    default:
      return {};
  }
}

export function effectIdentitySignature(input: EffectRenderInput): string {
  const layers = effectLayersCss("surface", input);
  return `${resolveEffectId(input)}|${layers.boxShadow || ""}|${layers.filter || ""}|${layers.textShadow || ""}`;
}
