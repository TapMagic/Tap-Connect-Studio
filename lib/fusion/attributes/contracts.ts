/**
 * Universal attribute contracts — typed, versioned, reusable.
 * Registered objects declare applicable contracts and receive editors automatically.
 */

export const ATTRIBUTE_CONTRACT_VERSION = 1 as const;

export type TextAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  fontFamily?: string;
  fontFamilySource?: "brand" | "system" | "uploaded" | "licensed";
  emailSafeFallback?: string;
  role?: "display" | "heading" | "body" | "caption" | "label" | "legal";
  fontSize?: string | number;
  fontSizePx?: number;
  responsiveSizes?: Partial<Record<"sm" | "md" | "lg" | "xl", string | number>>;
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | "normal" | "medium" | "semibold" | "bold" | "black";
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  capitalization?: "none" | "uppercase" | "lowercase" | "capitalize";
  lineHeight?: number | string;
  letterSpacing?: number | "tight" | "normal" | "wide";
  wordSpacing?: number;
  color?: string;
  backgroundColor?: string;
  align?: "left" | "center" | "right" | "justify";
  wrapping?: "normal" | "nowrap" | "balance";
  maxLines?: number;
  truncation?: boolean;
  width?: string | number;
  height?: string | number;
  padding?: Partial<Record<"t" | "r" | "b" | "l", number>>;
  margin?: Partial<Record<"t" | "r" | "b" | "l", number>>;
  listStyle?: "none" | "disc" | "decimal";
  linkHref?: string;
  deviceVisibility?: Partial<Record<"mobile" | "tablet" | "desktop", boolean>>;
  effects?: { shadow?: boolean; glow?: string; outline?: string };
  inheritFromBrand?: boolean;
};

export type ColorAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  mode: "solid" | "linear" | "radial";
  hex?: string;
  rgb?: { r: number; g: number; b: number };
  hsl?: { h: number; s: number; l: number };
  alpha?: number;
  gradientStops?: { color: string; position: number }[];
  angle?: number; // 0–360
  role?:
    | "accent"
    | "surface"
    | "text"
    | "pill_fill"
    | "pill_text"
    | "neon_glow"
    | "gradient_start"
    | "gradient_end"
    | "border"
    | "icon"
    | "fill"
    | "hover"
    | "focus"
    | "pressed"
    | "disabled"
    | "overlay"
    | "shadow";
  brandSwatchId?: string;
  lightDarkVariant?: "light" | "dark" | "auto";
};

export type MediaAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  source:
    | "upload"
    | "url"
    | "pexels"
    | "unsplash"
    | "logo_dev"
    | "web_logo"
    | "icon_library"
    | "library";
  url?: string;
  assetId?: string;
  alt?: string;
  caption?: string;
  crop?: { x: number; y: number; w: number; h: number };
  focal?: { x: number; y: number };
  objectFit?: "contain" | "cover" | "fill" | "none" | "natural";
  width?: number | string;
  height?: number | string;
  opacity?: number;
  overlayColor?: string;
  borderRadius?: string;
  shadow?: boolean;
  rights?: string;
  responsiveSources?: { mobile?: string; desktop?: string };
};

export type LayoutAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  type: "stack" | "row" | "grid" | "columns" | "group";
  columns?: "1" | "2" | "3" | "50/50" | "33/67" | "67/33" | "25/75" | "75/25" | "thirds";
  gap?: number;
  padding?: Partial<Record<"t" | "r" | "b" | "l", number>>;
  alignment?: "start" | "center" | "end" | "stretch";
  distribution?: "start" | "center" | "end" | "between" | "around";
  mobileStack?: boolean;
  sticky?: boolean;
  background?: ColorAttributeContract;
  borderRadius?: string;
  overflow?: "visible" | "hidden" | "auto";
  locked?: boolean;
  hidden?: boolean;
};

export type DividerAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  width?: string | number;
  thickness?: number;
  style: "solid" | "dashed" | "dotted" | "double";
  color?: ColorAttributeContract;
  align?: "left" | "center" | "right";
  spacing?: number;
};

export type SpacerAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  size: "sm" | "md" | "lg" | "xl" | number;
  perBreakpoint?: Partial<Record<"sm" | "md" | "lg", number>>;
};

export type ActionAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  label: TextAttributeContract;
  iconId?: string;
  iconUrl?: string;
  iconPosition?: "left" | "right" | "only" | "none";
  destination?: string;
  actionKind?: string;
  size?: "sm" | "md" | "lg";
  width?: "auto" | "full";
  fill?: ColorAttributeContract;
  textColor?: string;
  border?: string;
  radius?: string;
  shadow?: boolean;
  glow?: string;
  finish?: string;
  confirmation?: string;
  analyticsId?: string;
};

export type FormAttributeContract = {
  version: typeof ATTRIBUTE_CONTRACT_VERSION;
  inputType: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "consent";
  label?: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  privacyClass?: "public" | "contact" | "sensitive";
  consentPurpose?: string;
  retentionDays?: number;
  providerMapping?: string;
};

export type AttributeContractSet = {
  text?: TextAttributeContract;
  color?: ColorAttributeContract;
  media?: MediaAttributeContract;
  layout?: LayoutAttributeContract;
  divider?: DividerAttributeContract;
  spacer?: SpacerAttributeContract;
  action?: ActionAttributeContract;
  form?: FormAttributeContract;
};

export const CONTRACT_KEYS = [
  "text",
  "color",
  "media",
  "layout",
  "divider",
  "spacer",
  "action",
  "form",
] as const;

export type ContractKey = (typeof CONTRACT_KEYS)[number];
