/**
 * Deterministic contrast checks for Brand Kit color roles.
 * Warnings are advisory — do not block experimentation unless unusable.
 */

export type ContrastPairId =
  | "headline_on_background"
  | "body_on_surface"
  | "cta_text_on_cta"
  | "link_on_background";

export type ContrastCheck = {
  id: ContrastPairId;
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  /** WCAG AA for normal text ≈ 4.5; large text ≈ 3 */
  aaNormal: boolean;
  aaLarge: boolean;
  severity: "ok" | "warn" | "fail";
  message: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = channel(rgb.r);
  const g = channel(rgb.g);
  const b = channel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number | null {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  if (L1 == null || L2 == null) return null;
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function classify(
  id: ContrastPairId,
  label: string,
  foreground: string,
  background: string
): ContrastCheck {
  const ratio = contrastRatio(foreground, background) ?? 1;
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3;
  let severity: ContrastCheck["severity"] = "ok";
  let message = "Contrast looks usable.";
  if (ratio < 2.5) {
    severity = "fail";
    message = "Hard to read — try a stronger contrast before publishing.";
  } else if (!aaNormal) {
    severity = "warn";
    message = "Below WCAG AA for small text — fine to experiment; check before go-live.";
  }
  return {
    id,
    label,
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    aaNormal,
    aaLarge,
    severity,
    message,
  };
}

export type BrandContrastInput = {
  background: string;
  surface: string;
  headline: string;
  body: string;
  ctaBg: string;
  ctaText: string;
  link: string;
};

export function checkBrandContrast(input: BrandContrastInput): ContrastCheck[] {
  return [
    classify(
      "headline_on_background",
      "Headline on background",
      input.headline,
      input.background
    ),
    classify("body_on_surface", "Body text on surface", input.body, input.surface),
    classify("cta_text_on_cta", "CTA text on CTA background", input.ctaText, input.ctaBg),
    classify("link_on_background", "Link on background", input.link, input.background),
  ];
}

/** Pick readable CTA text (white/black) for a CTA background. */
export function readableOn(background: string): string {
  const L = relativeLuminance(background);
  if (L == null) return "#ffffff";
  return L > 0.4 ? "#0b0f19" : "#ffffff";
}
