import type { CSSProperties } from "react";

/** Shared premium finishes used by Tap Connect Cards, campaign buttons, and blocks. */

export type PremiumFinish =
  | "metallic"
  | "soft"
  | "glass"
  | "tile"
  | "neon"
  | "outline"
  | "brand"
  | "solid"
  | "ghost";

export const PREMIUM_FINISH_OPTIONS: {
  id: PremiumFinish;
  label: string;
  hint: string;
}[] = [
  { id: "metallic", label: "Metallic", hint: "Brushed dark metal + accent rim" },
  { id: "glass", label: "Glass", hint: "Frosted translucent panel" },
  { id: "tile", label: "Tile", hint: "Raised ceramic / enamel tile" },
  { id: "neon", label: "Neon glow", hint: "Colored outline glow" },
  { id: "soft", label: "Soft light", hint: "Clean light pill / review style" },
  { id: "outline", label: "Outline", hint: "Dashed or line border" },
  { id: "brand", label: "Brand fill", hint: "Fill with accent / platform color" },
  { id: "solid", label: "Solid", hint: "Flat solid fill" },
  { id: "ghost", label: "Ghost", hint: "Minimal transparent" },
];

export type PremiumFontFamily =
  | "sans"
  | "serif"
  | "display"
  | "mono"
  | "script"
  | "rounded";

export const PREMIUM_FONT_OPTIONS: { id: PremiumFontFamily; label: string; css: string }[] =
  [
    {
      id: "sans",
      label: "Modern sans",
      css: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    },
    {
      id: "serif",
      label: "Classic serif",
      css: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
    },
    {
      id: "display",
      label: "Display / impact",
      css: "'Segoe UI', 'Helvetica Neue', Impact, sans-serif",
    },
    {
      id: "mono",
      label: "Mono / tech",
      css: "var(--font-geist-mono), ui-monospace, monospace",
    },
    {
      id: "script",
      label: "Script / elegant",
      css: "Georgia, 'Palatino Linotype', 'Book Antiqua', serif",
    },
    {
      id: "rounded",
      label: "Rounded friendly",
      css: "'Segoe UI Rounded', 'Nunito', ui-sans-serif, system-ui, sans-serif",
    },
  ];

export type TextFormat = {
  fontFamily?: PremiumFontFamily;
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold" | "black";
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  letterSpacing?: "tight" | "normal" | "wide";
  align?: "left" | "center" | "right";
  color?: string;
};

export const FONT_SIZE_CSS: Record<NonNullable<TextFormat["fontSize"]>, string> = {
  xs: "0.7rem",
  sm: "0.8rem",
  base: "0.95rem",
  lg: "1.05rem",
  xl: "1.2rem",
  "2xl": "1.4rem",
  "3xl": "1.75rem",
};

export const FONT_WEIGHT_CSS: Record<NonNullable<TextFormat["fontWeight"]>, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
};

export function textFormatToCss(format?: TextFormat): CSSProperties {
  if (!format) return {};
  const family = PREMIUM_FONT_OPTIONS.find((f) => f.id === format.fontFamily)?.css;
  return {
    fontFamily: family,
    fontSize: format.fontSize ? FONT_SIZE_CSS[format.fontSize] : undefined,
    fontWeight: format.fontWeight ? FONT_WEIGHT_CSS[format.fontWeight] : undefined,
    fontStyle: format.italic ? "italic" : undefined,
    textDecoration: format.underline ? "underline" : undefined,
    textTransform: format.uppercase ? "uppercase" : undefined,
    letterSpacing:
      format.letterSpacing === "tight"
        ? "-0.02em"
        : format.letterSpacing === "wide"
          ? "0.08em"
          : undefined,
    textAlign: format.align,
    color: format.color,
  };
}

export function finishClass(finish?: PremiumFinish | string | null, prefix = "tap-finish") {
  const f = (finish || "metallic") as string;
  return `${prefix}-${f}`;
}
