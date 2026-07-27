/**
 * Adapter between BrandKit Prisma fields and Shared Visual Authoring color/font roles.
 * Non-destructive — keeps existing Brand Kit fields as source of truth.
 */

import type { BrandColorRole, BrandFontRole } from "./visual-property";
import {
  PREMIUM_FONT_OPTIONS,
  type PremiumFontFamily,
} from "@/lib/design/premium-finish";

/** Subset of BrandKit / Business fields used by the visual core. */
export type BrandKitVisualFields = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  fontStyle?: string | null;
  buttonStyle?: string | null;
  logoUrl?: string | null;
  iconColor?: string | null;
};

export const BRAND_COLOR_ROLE_LABELS: Record<BrandColorRole, string> = {
  primary: "Primary Brand",
  secondary: "Secondary Brand",
  background: "Background",
  surface: "Surface",
  headline: "Headline",
  body: "Body text",
  cta: "Customer-facing CTA",
  link: "Link",
  offerEmphasis: "Offer emphasis",
};

/** Brand Kit field that backs each color role (adapter, not migration). */
export const COLOR_ROLE_TO_BRAND_FIELD: Record<
  BrandColorRole,
  keyof BrandKitVisualFields
> = {
  primary: "primaryColor",
  secondary: "secondaryColor",
  background: "backgroundColor",
  /** Surface reuses background — secondary is often a bright accent, not a plate. */
  surface: "backgroundColor",
  headline: "textColor",
  body: "textColor",
  /** Customer CTA defaults to primary Brand — Studio green is platform-only. */
  cta: "primaryColor",
  link: "accentColor",
  offerEmphasis: "accentColor",
};

export function colorRoleFromBrandField(
  field: keyof BrandKitVisualFields
): BrandColorRole | null {
  const entries = Object.entries(COLOR_ROLE_TO_BRAND_FIELD) as [
    BrandColorRole,
    keyof BrandKitVisualFields,
  ][];
  const hit = entries.find(([, f]) => f === field);
  return hit?.[0] ?? null;
}

export function readColorRole(
  kit: BrandKitVisualFields,
  role: BrandColorRole
): string | null {
  const field = COLOR_ROLE_TO_BRAND_FIELD[role];
  const value = kit[field];
  return typeof value === "string" && value.trim() ? value : null;
}

export function writeColorRole(
  kit: BrandKitVisualFields,
  role: BrandColorRole,
  value: string
): BrandKitVisualFields {
  const field = COLOR_ROLE_TO_BRAND_FIELD[role];
  return { ...kit, [field]: value };
}

/** Map BrandKit FontStyle enum → available PremiumFontFamily (honest fallbacks). */
export const FONT_STYLE_TO_PREMIUM: Record<string, PremiumFontFamily> = {
  MODERN: "sans",
  CLASSIC: "serif",
  PLAYFUL: "rounded",
  PREMIUM: "display",
  MINIMAL: "sans",
};

export const FONT_ROLE_DEFAULTS: Record<BrandFontRole, PremiumFontFamily> = {
  display: "display",
  body: "sans",
  accent: "serif",
};

export function resolveFontFamily(
  kit: BrandKitVisualFields,
  role: BrandFontRole
): { id: PremiumFontFamily; css: string; label: string } {
  const fromKit = kit.fontStyle
    ? FONT_STYLE_TO_PREMIUM[kit.fontStyle]
    : undefined;
  const id =
    role === "body"
      ? fromKit ?? FONT_ROLE_DEFAULTS.body
      : role === "display"
        ? fromKit === "serif" || fromKit === "display"
          ? fromKit
          : FONT_ROLE_DEFAULTS.display
        : FONT_ROLE_DEFAULTS.accent;
  const opt = PREMIUM_FONT_OPTIONS.find((f) => f.id === id)!;
  return { id: opt.id, css: opt.css, label: opt.label };
}

export function buttonStyleToRadius(buttonStyle?: string | null): string {
  switch (buttonStyle) {
    case "PILL":
      return "999px";
    case "SHARP":
      return "0";
    case "SOFT":
      return "0.75rem";
    case "ROUNDED":
    default:
      return "1rem";
  }
}

export function brandColorsFromKit(kit: BrandKitVisualFields): Record<
  BrandColorRole,
  string
> {
  const fallbacks: Record<BrandColorRole, string> = {
    primary: "#22c55e",
    secondary: "#0ea5e9",
    background: "#0b0f19",
    surface: "#111827",
    headline: "#f8fafc",
    body: "#e2e8f0",
    cta: "#22c55e",
    link: "#f59e0b",
    offerEmphasis: "#f59e0b",
  };
  const out = { ...fallbacks };
  for (const role of Object.keys(fallbacks) as BrandColorRole[]) {
    const v = readColorRole(kit, role);
    if (v) out[role] = v;
  }
  // Surface plate: prefer background; never treat bright secondary as a full surface fill
  if (kit.backgroundColor?.trim()) {
    out.surface = kit.backgroundColor;
  }
  return out;
}
