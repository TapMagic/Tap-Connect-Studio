/**
 * Canonical Material surface render contract.
 *
 * Previews and authored targets (Button / Badge / Container / Icon backing /
 * Text Box / compatible surfaces) must resolve through this authority so a
 * Material tile cannot look richer than the applied result.
 *
 * gradientFill (or recipe.gradient) is the full multi-stop fill authority.
 * gradientStart / gradientEnd are editor mirrors only — never the sole renderer input.
 */

import { dimensionalSurfaceCss, effectLayersCss } from "./effect-render";

export type MaterialSurfaceRole =
  | "button"
  | "badge"
  | "container"
  | "icon_backing"
  | "text_box"
  | "generic";

export type MaterialFillAuthority =
  | "gradientFill"
  | "solid"
  | "transparent"
  | "image"
  | "pattern"
  | "texture"
  | "legacy_two_stop"
  | "none";

export type MaterialSurfaceDescriptor = Readonly<{
  background: string;
  backgroundSize?: string;
  borderWidth: number;
  borderStyle: string;
  borderColor: string;
  boxShadow?: string;
  opacity: number;
  /** Dedicated specular / highlight layer CSS background (may be multi-stop). */
  highlight: string | null;
  /** Distinct gloss sheen overlay (upper-half) when recipe/props request shine. */
  shine: boolean;
  textureToken: string | null;
  materialPreset: string | null;
  bevel: boolean;
  fillAuthority: MaterialFillAuthority;
  /** Stop count when background is a CSS gradient (for parity proofs). */
  gradientStopCount: number;
}>;

/** Structural recipe shape — avoids circular import with material-engine. */
export type MaterialRecipeFill = Readonly<{
  id: string;
  fill?: string;
  gradient?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderWidth?: number;
  borderColor?: string;
  highlight?: string;
  innerShadow?: string;
  outerShadow?: number;
  glow?: number;
  glowColor?: string;
  secondaryGlow?: number;
  bevel?: boolean;
  shine?: boolean;
  texture?: string;
  opacity?: number;
}>;

function isCssShadowString(value: unknown): value is string {
  return typeof value === "string" && /(?:px|inset|rgba?\(|hsla?\()/i.test(value);
}

export function surfaceShadowCss(props: Record<string, unknown>): string | undefined {
  // Visual Parts / Depth may already author a full CSS box-shadow string.
  // Preserve it — Number("0 12px …") is NaN and must not erase Depth/Finish.
  const authoredShadow = isCssShadowString(props.boxShadow)
    ? props.boxShadow
    : isCssShadowString(props.vpDepthShadow)
      ? props.vpDepthShadow
      : null;

  const effectPreset = typeof props.effectPreset === "string" ? props.effectPreset : null;
  if (effectPreset && effectPreset !== "none") {
    const numericShadow = isCssShadowString(props.boxShadow)
      ? Number(props.shadow ?? 0)
      : Number(props.boxShadow ?? props.shadow ?? 0);
    const layers = effectLayersCss("surface", {
      effectPreset,
      glow: Number(props.boxGlow ?? props.glow ?? 0),
      shadow: Number.isFinite(numericShadow) ? numericShadow : 0,
      glowColor: typeof props.glowColor === "string" ? props.glowColor : null,
      secondaryGlow: Number(props.secondaryGlow ?? 0),
      innerShadow: typeof props.innerShadow === "string" ? props.innerShadow : null,
      coreBrightness: Number(props.coreBrightness ?? 1),
      edgeWidth: Number(props.edgeWidth ?? 1.25),
      auraIntensity: Number(props.auraIntensity ?? 0.45),
      opacity: Number(props.opacity ?? 1),
      color: typeof props.color === "string" ? props.color : null,
    });
    if (layers.boxShadow && authoredShadow) return `${authoredShadow}, ${layers.boxShadow}`;
    if (layers.boxShadow) return layers.boxShadow;
  }
  if (authoredShadow) return authoredShadow;

  const shadow = Number(props.boxShadow ?? props.shadow ?? 0);
  const glow = Number(props.boxGlow ?? props.glow ?? 0);
  const secondary = Number(props.secondaryGlow ?? 0);
  const glowColor = String(props.glowColor || "#67e8f9");
  const inner = typeof props.innerShadow === "string" ? props.innerShadow : "";
  const material = String(props.materialPreset || "");
  const dimensional = dimensionalSurfaceCss(material);
  const parts = [
    dimensional.boxShadow || "",
    shadow > 0 && !dimensional.boxShadow ? `0 8px ${shadow}px rgba(0,0,0,.4)` : "",
    glow > 0 ? `0 0 ${glow}px ${glowColor}` : "",
    secondary > 0 ? `0 0 ${secondary}px ${glowColor}` : "",
    inner,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function countGradientStops(css: string): number {
  if (!css || !/gradient\(/i.test(css)) return 0;
  const colors = css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi) || [];
  return colors.length;
}

function legacyTwoStopGradient(props: Record<string, unknown>): string | null {
  const start = typeof props.gradientStart === "string" ? props.gradientStart : "";
  const end = typeof props.gradientEnd === "string" ? props.gradientEnd : "";
  if (!start || !end) return null;
  const angle =
    typeof props.gradientAngle === "number" && Number.isFinite(props.gradientAngle)
      ? props.gradientAngle
      : 120;
  return `linear-gradient(${angle}deg, ${start}, ${end})`;
}

type ResolvedFill = {
  background: string;
  backgroundSize?: string;
  fillAuthority: MaterialFillAuthority;
};

function resolveButtonBackground(props: Record<string, unknown>): ResolvedFill {
  const kind = String(props.buttonSurfaceKind || "solid");
  if (kind === "transparent") {
    return { background: "transparent", fillAuthority: "transparent" };
  }
  if (kind === "image" && typeof props.backgroundImageUrl === "string" && props.backgroundImageUrl) {
    return {
      background: `url("${props.backgroundImageUrl.replaceAll('"', "%22")}") center / cover no-repeat`,
      fillAuthority: "image",
    };
  }
  if (kind === "pattern") {
    return {
      background: `repeating-linear-gradient(135deg, ${String(props.fill || "#22c55e")} 0 10px, ${String(props.gradientEnd || "#a3e635")} 10px 20px)`,
      fillAuthority: "pattern",
    };
  }
  if (kind === "texture") {
    return {
      background: `radial-gradient(circle at 25% 25%, #ffffff28 0 1px, transparent 2px), ${String(props.fill || "#22c55e")}`,
      backgroundSize: "8px 8px",
      fillAuthority: "texture",
    };
  }
  const full = typeof props.gradientFill === "string" ? props.gradientFill.trim() : "";
  if (full) {
    return { background: full, fillAuthority: "gradientFill" };
  }
  if (kind === "gradient") {
    const legacy = legacyTwoStopGradient(props);
    if (legacy) return { background: legacy, fillAuthority: "legacy_two_stop" };
  }
  return {
    background: String(props.fill || "#22c55e"),
    fillAuthority: "solid",
  };
}

function resolveGenericBackground(
  props: Record<string, unknown>,
  role: MaterialSurfaceRole
): ResolvedFill {
  if (role === "icon_backing" || role === "text_box") {
    const boxGradient = typeof props.boxGradient === "string" ? props.boxGradient.trim() : "";
    if (boxGradient) return { background: boxGradient, fillAuthority: "gradientFill" };
    const boxFill = String(props.boxFill || "transparent");
    if (!boxFill || boxFill === "transparent" || boxFill === "none") {
      return { background: "transparent", fillAuthority: "transparent" };
    }
    return { background: boxFill, fillAuthority: "solid" };
  }
  const full = typeof props.gradientFill === "string" ? props.gradientFill.trim() : "";
  if (full) return { background: full, fillAuthority: "gradientFill" };
  const legacy = legacyTwoStopGradient(props);
  if (legacy && String(props.surfaceFillKind || props.fillKind || "") === "gradient") {
    return { background: legacy, fillAuthority: "legacy_two_stop" };
  }
  const fill = String(props.fill || "#334155");
  if (fill === "transparent" || fill === "none") {
    return { background: "transparent", fillAuthority: "transparent" };
  }
  return { background: fill, fillAuthority: "solid" };
}

export function resolveMaterialSurfaceFromProps(
  props: Record<string, unknown>,
  role: MaterialSurfaceRole = "generic"
): MaterialSurfaceDescriptor {
  const resolved =
    role === "button" ? resolveButtonBackground(props) : resolveGenericBackground(props, role);
  const borderWidth = Number(props.borderWidth ?? 0) || 0;
  const borderStyle = borderWidth > 0 ? String(props.borderStyle || "solid") : "none";
  const borderColor = String(props.borderColor || "transparent");
  const opacity =
    role === "button"
      ? Number(props.surfaceOpacity ?? props.opacity ?? 1)
      : Number(props.opacity ?? 1);
  const highlight =
    typeof props.highlight === "string" && props.highlight.trim()
      ? props.highlight.trim()
      : null;
  const shine = props.shine === true;
  const textureToken = typeof props.texture === "string" ? props.texture : null;
  const materialPreset =
    typeof props.materialPreset === "string" ? props.materialPreset : null;
  const dimensional = dimensionalSurfaceCss(materialPreset);
  const background =
    dimensional.backgroundImage && resolved.fillAuthority === "solid"
      ? `${dimensional.backgroundImage}, ${resolved.background}`
      : resolved.background;
  return {
    background,
    backgroundSize: resolved.backgroundSize,
    borderWidth,
    borderStyle,
    borderColor,
    boxShadow: surfaceShadowCss(props),
    opacity: Number.isFinite(opacity) ? opacity : 1,
    highlight,
    shine,
    textureToken,
    materialPreset,
    bevel: Boolean(
      (materialPreset && /bevel|hard_raised|raised_resin/i.test(materialPreset)) ||
        props.bevel === true
    ),
    fillAuthority: resolved.fillAuthority,
    gradientStopCount: countGradientStops(background),
  };
}

/**
 * Same descriptor from a catalog recipe (Material tile previews).
 * Must match applySurfaceMaterial → resolveMaterialSurfaceFromProps.
 */
export function resolveMaterialSurfaceFromRecipe(recipe: MaterialRecipeFill): MaterialSurfaceDescriptor {
  const props: Record<string, unknown> = {
    materialPreset: recipe.id,
    fill: recipe.fill,
    gradientFill: recipe.gradient,
    buttonSurfaceKind: recipe.gradient
      ? "gradient"
      : recipe.fill === "transparent"
        ? "transparent"
        : "solid",
    surfaceFillKind: recipe.gradient ? "gradient" : "solid",
    borderWidth: recipe.borderWidth ?? 0,
    borderColor: recipe.borderColor,
    borderStyle: recipe.borderStyle || (recipe.borderWidth ? "solid" : "none"),
    boxShadow: recipe.outerShadow ?? 0,
    shadow: recipe.outerShadow ?? 0,
    boxGlow: recipe.glow ?? 0,
    glow: recipe.glow ?? 0,
    glowColor: recipe.glowColor,
    secondaryGlow: recipe.secondaryGlow,
    shine: recipe.shine === true,
    innerShadow: recipe.innerShadow,
    highlight: recipe.highlight,
    texture: recipe.texture,
    surfaceOpacity: recipe.opacity,
    opacity: recipe.opacity ?? 1,
    bevel: recipe.bevel === true,
  };
  if (recipe.gradient) {
    const stops = recipe.gradient.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g) || [];
    if (stops[0]) props.gradientStart = stops[0];
    if (stops[1]) props.gradientEnd = stops[1];
  }
  return resolveMaterialSurfaceFromProps(props, "button");
}

export function materialSurfaceBackgroundCss(descriptor: MaterialSurfaceDescriptor): string {
  return descriptor.background;
}

export function materialPreviewBackgroundFromRecipe(recipe: MaterialRecipeFill): string {
  return resolveMaterialSurfaceFromRecipe(recipe).background;
}

export function materialSurfaceParityKey(descriptor: MaterialSurfaceDescriptor): string {
  return [
    descriptor.fillAuthority,
    descriptor.gradientStopCount,
    descriptor.background,
    descriptor.highlight || "",
    descriptor.shine ? "shine" : "",
    descriptor.borderWidth,
    descriptor.borderColor,
    descriptor.boxShadow || "",
    descriptor.textureToken || "",
  ].join("|");
}
