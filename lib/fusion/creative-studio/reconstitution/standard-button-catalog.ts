import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";

export type StandardButtonPresetId =
  | "brand-primary"
  | "brand-outline"
  | "full-width-cta"
  | "icon-label"
  | "compact-utility";

export type StandardButtonPresetDefinition = {
  id: StandardButtonPresetId;
  version: 1;
  name: string;
  description: string;
  useCase: string;
  tags: readonly string[];
  readiness: "architecture_ready" | "product_ready";
  props: Readonly<Record<string, unknown>>;
};

export type BrandPreviewContext = {
  businessName: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  headingFontFamily?: string | null;
  bodyFontFamily?: string | null;
  logoUrl?: string | null;
  contactPhone?: string | null;
};

export const STANDARD_BUTTON_CATALOG: readonly StandardButtonPresetDefinition[] = [
  {
    id: "brand-primary", version: 1, name: "Brand Primary",
    description: "A polished Brand-led primary action with directional cue and tactile depth.",
    useCase: "Primary conversion and next-step action", tags: ["primary", "brand", "cta", "directional"], readiness: "product_ready",
    props: { label: "Get started", presentation: "pill", radius: 999, width: 0.62, height: 0.095, buttonSurfaceKind: "gradient", fontWeight: 820, showIcon: true, icon: "arrow-up-right", iconPosition: "after", iconGap: 10, borderWidth: 1, shine: true, boxShadow: 18, materialPreset: "hard_raised" },
  },
  {
    id: "brand-outline", version: 1, name: "Brand Outline",
    description: "Concept retained for later differentiation; hidden until it earns a distinct job.",
    useCase: "Secondary action", tags: ["secondary", "brand", "outline"], readiness: "architecture_ready",
    props: { label: "Learn more", presentation: "rounded", radius: 14, width: 0.56, height: 0.09, buttonSurfaceKind: "solid", fill: "transparent", borderWidth: 2, fontWeight: 750, showIcon: false, materialPreset: "flat" },
  },
  {
    id: "full-width-cta", version: 1, name: "Full-width CTA",
    description: "A substantial section-closing action with supporting context and a clear forward cue.",
    useCase: "Close a section with one unmistakable next step", tags: ["wide", "full", "cta", "conversion", "supporting-copy"], readiness: "product_ready",
    props: { label: "Explore what’s possible", description: "See services, examples, and next steps", showDescription: true, descriptionSize: 10, presentation: "rounded", radius: 18, width: 0.9, height: 0.125, buttonSurfaceKind: "gradient", gradientFill: "linear-gradient(125deg, #172033 0%, #0b1220 52%, #111827 100%)", fontWeight: 780, showIcon: true, icon: "arrow-up-right", iconPosition: "after", iconGap: 12, borderWidth: 1, borderColor: "#ffffff26", boxShadow: 22, shine: true, materialPreset: "bevel" },
  },
  {
    id: "icon-label", version: 1, name: "Icon + Label",
    description: "A direct Call action whose icon, label, and telephone intent agree at a glance.",
    useCase: "Immediate person-to-person contact", tags: ["icon", "contact", "call", "phone"], readiness: "product_ready",
    props: { label: "Call now", presentation: "pill", radius: 999, width: 0.56, height: 0.09, buttonSurfaceKind: "gradient", gradientFill: "linear-gradient(135deg, #101827 0%, #07100a 100%)", icon: "phone", showIcon: true, iconPosition: "before", iconGap: 10, actionType: "call", fontWeight: 760, borderWidth: 1, boxGlow: 12, materialPreset: "raised_resin" },
  },
  {
    id: "compact-utility", version: 1, name: "Compact Utility",
    description: "Concept retained but hidden until its utility behavior is meaningfully distinct.",
    useCase: "Utility action", tags: ["compact", "utility", "small"], readiness: "architecture_ready",
    props: { label: "View details", presentation: "rounded", radius: 9, width: 0.42, height: 0.07, buttonSurfaceKind: "solid", fontSize: 13, fontWeight: 700, padding: 8, showIcon: false, materialPreset: "flat" },
  },
] as const;

const GENERIC_BRAND: Required<Pick<BrandPreviewContext, "primaryColor" | "secondaryColor" | "accentColor" | "backgroundColor" | "textColor" | "headingFontFamily">> = {
  primaryColor: "#b8ff2c",
  secondaryColor: "#22d3ee",
  accentColor: "#b8ff2c",
  backgroundColor: "#0b1220",
  textColor: "#f8fafc",
  headingFontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
};

function readableText(fill: string, preferred?: string | null) {
  if (preferred?.trim()) return preferred;
  const hex = fill.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#07100a";
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#07100a" : "#ffffff";
}

export function resolveStandardButtonPreset(
  preset: StandardButtonPresetDefinition,
  brand: BrandPreviewContext
): Record<string, unknown> {
  const primary = String(brand.primaryColor || brand.accentColor || GENERIC_BRAND.primaryColor);
  const secondary = String(brand.secondaryColor || GENERIC_BRAND.secondaryColor);
  const base: Record<string, unknown> = { ...preset.props, accessibleLabel: String(preset.props.label || "Button"), accessibleLabelSource: "label", fontFamily: brand.headingFontFamily || GENERIC_BRAND.headingFontFamily };
  const resolved: Record<string, unknown> = preset.id === "brand-outline"
    ? { ...base, fill: "transparent", borderColor: primary, labelColor: primary }
    : preset.id === "compact-utility"
      ? { ...base, fill: brand.backgroundColor || GENERIC_BRAND.backgroundColor, borderWidth: 1, borderColor: `${secondary}88`, labelColor: brand.textColor || GENERIC_BRAND.textColor }
      : preset.id === "icon-label"
        ? { ...base, fill: brand.backgroundColor || GENERIC_BRAND.backgroundColor, borderColor: primary, glowColor: primary, labelColor: primary, iconColor: primary, href: brand.contactPhone ? `tel:${brand.contactPhone.replace(/[^+\d]/g, "")}` : "" }
        : preset.id === "full-width-cta"
          ? { ...base, borderColor: `${secondary}66`, labelColor: brand.textColor || GENERIC_BRAND.textColor, descriptionColor: `${brand.textColor || GENERIC_BRAND.textColor}b8`, iconColor: primary }
          : { ...base, fill: primary, gradientFill: `linear-gradient(120deg, ${primary} 0%, ${secondary} 100%)`, borderColor: `${primary}dd`, glowColor: primary, labelColor: readableText(primary, null), iconColor: readableText(primary, null) };
  return updateButtonLabel(resolved, String(resolved.label || "Button"), `standard-${preset.id}`);
}
