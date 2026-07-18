import { nanoid } from "nanoid";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { PremiumFinish, TextFormat } from "@/lib/design/premium-finish";

/** Action kinds — link target helpers. Any custom URL still works with kind "custom". */
export type TapCardActionKind =
  | "vcard"
  | "call"
  | "email"
  | "sms"
  | "website"
  | "map"
  | "review"
  | "calendar"
  | "shop"
  | "book"
  | "homescreen"
  | "bookmark"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "snapchat"
  | "x"
  | "youtube"
  | "linkedin"
  | "whatsapp"
  | "yelp"
  | "custom";

export type TapCardSectionType =
  | "promo_header"
  | "hero"
  | "identity"
  | "action"
  | "action_row"
  | "image"
  | "logo_block"
  | "special_offer"
  | "text"
  | "spacer"
  | "footer_cta";

export type TapCardSpecialStyle = "banner" | "ribbon" | "tile" | "card";
export type TapCardOfferMode = "link" | "expand" | "campaign";

/** @deprecated use PremiumFinish via `finish` — kept for older cards */
export type TapCardActionStyle = PremiumFinish;

export type TapCardActionsLayout = "stack" | "grid_2" | "icon_row";

export type TapCardButtonShape =
  | "pill"
  | "circle"
  | "square"
  | "rounded_sm"
  | "rounded_md"
  | "rounded_lg"
  | "rounded_xl";

/** @deprecated legacy stored values — normalized on read */
export type TapCardButtonShapeLegacy = TapCardButtonShape | "round" | "stadium";

export const TAP_CARD_SHAPE_OPTIONS: { id: TapCardButtonShape; label: string; radius: string }[] =
  [
    { id: "pill", label: "Pill", radius: "999px" },
    { id: "circle", label: "Circle", radius: "50%" },
    { id: "square", label: "Square", radius: "0" },
    { id: "rounded_sm", label: "Soft corners", radius: "0.4rem" },
    { id: "rounded_md", label: "Medium corners", radius: "0.75rem" },
    { id: "rounded_lg", label: "Large corners", radius: "1rem" },
    { id: "rounded_xl", label: "Extra large corners", radius: "1.35rem" },
  ];

export const TAP_CARD_LAYOUT_OPTIONS: { id: TapCardActionsLayout; label: string }[] = [
  { id: "stack", label: "Stack" },
  { id: "grid_2", label: "Two columns" },
  { id: "icon_row", label: "Icon row" },
];

export type TapCardSurfaceFill = "solid" | "gradient";
export type TapCardHeroFill = "photo" | "gradient" | "photo_gradient";

export const COMMON_SOCIAL_KINDS: TapCardActionKind[] = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "whatsapp",
];

export type TapCardSection = {
  id: string;
  type: TapCardSectionType;
  enabled: boolean;
  order: number;
  label?: string;
  text?: string;
  textRight?: string;
  href?: string;
  imageUrl?: string;
  logoUrl?: string;
  showLogoWindow?: boolean;
  /** Opt-in hero logo overlay (replaces legacy showLogoWindow default-on) */
  showHeroLogo?: boolean;
  logoScale?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  /** classic = photo + window; logo_top = scalable logo header; columns = two-col text/image/logo */
  heroLayout?: "classic" | "logo_top" | "columns";
  columnLeft?: "logo" | "text" | "image" | "empty";
  columnRight?: "logo" | "text" | "image" | "empty";
  /** @deprecated use columnLeftText / columnRightText */
  columnText?: string;
  /** @deprecated use columnLeftImageUrl / columnRightImageUrl */
  columnImageUrl?: string;
  columnLeftText?: string;
  columnRightText?: string;
  columnLeftImageUrl?: string;
  columnRightImageUrl?: string;
  /** Per-column link (logo block / hero columns) */
  columnLeftHref?: string;
  columnRightHref?: string;
  /** logo_block: single row or two columns */
  logoBlockLayout?: "stack" | "columns";
  /** promo_header: pin above card shell (legacy Hottest Deal) vs inline */
  pinTop?: boolean;
  /** special_offer visual treatment */
  specialStyle?: TapCardSpecialStyle;
  /** link out to URL/campaign page vs expand inline offer builder content */
  offerMode?: TapCardOfferMode;
  offerTitle?: string;
  offerDescription?: string;
  offerCode?: string;
  offerCta?: string;
  offerExpires?: string;
  /** When expand mode: start with offer panel open */
  offerDefaultOpen?: boolean;
  /** Linked campaign (contact capture / offer page opened via tap URL) */
  linkedCampaignId?: string;
  linkedCampaignTitle?: string;
  linkedDeviceCode?: string;
  heroFill?: TapCardHeroFill;
  gradientStart?: string;
  gradientEnd?: string;
  /** Gradient direction in degrees (0 = up, 90 = right) */
  gradientAngle?: number;
  /** Keep card outline / frame around the hero */
  showOutline?: boolean;
  actionKind?: TapCardActionKind;
  icon?: string;
  iconUrl?: string;
  /** Custom icon tint — omit to keep brand schemes (Google Reviews, socials) */
  iconColor?: string;
  finish?: PremiumFinish;
  style?: TapCardActionStyle;
  shape?: TapCardButtonShape;
  format?: TextFormat;
  name?: string;
  title?: string;
  organization?: string;
  headline?: string;
  /** Per-line colors for identity block (overrides shared format.color) */
  lineColors?: {
    name?: string;
    title?: string;
    organization?: string;
    headline?: string;
  };
  showCallBadge?: boolean;
  height?: "sm" | "md" | "lg";
  buttonLabel?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  neonColor?: string;
  opacity?: number;
  siblingId?: string;
  children?: TapCardSection[];
  layout?: TapCardActionsLayout;
  imageWidthPercent?: number;
  imageRadius?: TapCardButtonShape;
  altText?: string;
};

export type TapConnectCardConfig = {
  version: 1 | 2 | 3;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  neonColor?: string;
  pillColor?: string;
  pillTextColor?: string;
  headerEnergy: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
  actionsLayout: TapCardActionsLayout;
  defaultFinish: PremiumFinish;
  cardFinish: PremiumFinish;
  defaultShape: TapCardButtonShape;
  view3d?: boolean;
  /** Optional logo strip above the card shell (opt-in) */
  showHeaderLogo?: boolean;
  headerLogoUrl?: string;
  headerLogoScale?: number;
  surfaceOpacity?: number;
  surfaceFill?: TapCardSurfaceFill;
  surfaceGradientStart?: string;
  surfaceGradientEnd?: string;
  /** Gradient direction in degrees (0 = up, 90 = right) */
  surfaceGradientAngle?: number;
  titleFormat?: TextFormat;
  bodyFormat?: TextFormat;
  compactActionsOnly?: boolean;
  sections: TapCardSection[];
};

export const TAP_CARD_ACTION_CATALOG: {
  kind: TapCardActionKind;
  label: string;
  icon: string;
  placeholder?: string;
}[] = [
  { kind: "vcard", label: "Save to contacts", icon: "vcard" },
  { kind: "call", label: "Click to Call", icon: "phone" },
  { kind: "email", label: "Send an Email", icon: "mail" },
  { kind: "sms", label: "Text Us", icon: "sms" },
  { kind: "website", label: "Website", icon: "globe" },
  { kind: "map", label: "Directions", icon: "map" },
  { kind: "review", label: "Leave a Review", icon: "google" },
  { kind: "calendar", label: "Book / Schedule", icon: "calendar", placeholder: "https://cal.com/…" },
  { kind: "shop", label: "Shop / Store", icon: "cart", placeholder: "https://" },
  { kind: "book", label: "Book Now", icon: "calendar", placeholder: "https://" },
  { kind: "homescreen", label: "Add to Home Screen", icon: "homescreen" },
  { kind: "bookmark", label: "Bookmark This Card", icon: "bookmark" },
  { kind: "instagram", label: "Instagram", icon: "instagram" },
  { kind: "facebook", label: "Facebook", icon: "facebook" },
  { kind: "tiktok", label: "TikTok", icon: "tiktok" },
  { kind: "snapchat", label: "Snapchat", icon: "snapchat" },
  { kind: "x", label: "X", icon: "x" },
  { kind: "youtube", label: "YouTube", icon: "youtube" },
  { kind: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { kind: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { kind: "yelp", label: "Yelp", icon: "yelp" },
  { kind: "custom", label: "Any custom link", icon: "link", placeholder: "https://" },
];

function sid() {
  return nanoid(8);
}

export function sectionFinish(section: TapCardSection, fallback: PremiumFinish = "metallic"): PremiumFinish {
  return (section.finish || section.style || fallback) as PremiumFinish;
}

export function normalizeShape(
  shape?: TapCardButtonShapeLegacy | null,
  fallback: TapCardButtonShape = "pill"
): TapCardButtonShape {
  if (!shape) return fallback;
  if (shape === "round" || shape === "stadium") return "pill";
  if (TAP_CARD_SHAPE_OPTIONS.some((o) => o.id === shape)) return shape as TapCardButtonShape;
  return fallback;
}

export function shapeRadius(
  shape?: TapCardButtonShapeLegacy | null,
  fallback: TapCardButtonShape = "pill"
): string {
  const id = normalizeShape(shape, fallback);
  return TAP_CARD_SHAPE_OPTIONS.find((o) => o.id === id)?.radius ?? "999px";
}

export function buildGradientCss(start: string, end: string, angle = 160): string {
  const deg = Number.isFinite(angle) ? angle : 160;
  return `linear-gradient(${deg}deg, ${start}, ${end})`;
}

export function defaultTapConnectCard(params: {
  businessName: string;
  profile?: BrandContactProfile;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  accentColor?: string;
  reviewUrl?: string | null;
}): TapConnectCardConfig {
  const name =
    params.profile?.displayName ||
    params.profile?.organization ||
    params.businessName;
  const accent = params.accentColor || "#d4af37";
  const sections: TapCardSection[] = [
    {
      id: sid(),
      type: "promo_header",
      enabled: true,
      order: 0,
      text: "Click Here to",
      textRight: "Hottest Deal!!!",
      href: params.profile?.website || "#",
      label: "Special / Hottest Deal",
      pinTop: true,
      format: { fontFamily: "script", italic: true, fontSize: "base" },
    },
    {
      id: sid(),
      type: "hero",
      enabled: true,
      order: 1,
      imageUrl: params.heroImageUrl || undefined,
      logoUrl: params.logoUrl || undefined,
      showCallBadge: Boolean(params.profile?.phone),
      showLogoWindow: false,
      showHeroLogo: false,
      logoScale: 100,
      logoOffsetX: 0,
      logoOffsetY: 0,
      href: params.profile?.website || undefined,
      label: "Hero",
    },
    {
      id: sid(),
      type: "identity",
      enabled: true,
      order: 2,
      name,
      title: params.profile?.jobTitle,
      organization: params.profile?.organization || params.businessName,
      headline: "Every conversation → a customer",
      label: "Identity",
      format: { fontFamily: "sans", fontWeight: "bold", align: "center", fontSize: "xl" },
    },
    {
      id: sid(),
      type: "action",
      enabled: true,
      order: 3,
      actionKind: "vcard",
      label: "Save to contacts",
      finish: "metallic",
      icon: "vcard",
      format: { fontFamily: "serif", fontWeight: "semibold", fontSize: "lg" },
    },
  ];

  let order = 4;
  if (params.reviewUrl) {
    sections.push({
      id: sid(),
      type: "action",
      enabled: true,
      order: order++,
      actionKind: "review",
      label: "Please Leave Us a Review",
      href: params.reviewUrl,
      finish: "soft",
      icon: "google",
    });
  }
  if (params.profile?.website) {
    sections.push({
      id: sid(),
      type: "action",
      enabled: true,
      order: order++,
      actionKind: "website",
      label: "Website",
      href: params.profile.website,
      finish: "metallic",
      icon: "globe",
    });
  }

  const socialOrder: {
    key: keyof NonNullable<BrandContactProfile["socials"]>;
    kind: TapCardActionKind;
  }[] = [
    { key: "instagram", kind: "instagram" },
    { key: "facebook", kind: "facebook" },
    { key: "tiktok", kind: "tiktok" },
    { key: "x", kind: "x" },
    { key: "youtube", kind: "youtube" },
    { key: "linkedin", kind: "linkedin" },
  ];
  for (const s of socialOrder) {
    const url = params.profile?.socials?.[s.key];
    if (!url) continue;
    sections.push({
      id: sid(),
      type: "action",
      enabled: true,
      order: order++,
      actionKind: s.kind,
      label: TAP_CARD_ACTION_CATALOG.find((c) => c.kind === s.kind)?.label ?? s.kind,
      href: url,
      finish: "metallic",
      shape: "pill",
      icon: s.kind,
    });
  }

  sections.push(
    {
      id: sid(),
      type: "action",
      enabled: true,
      order: order++,
      actionKind: "homescreen",
      label: "Add to Home Screen",
      finish: "outline",
      shape: "pill",
      icon: "homescreen",
    },
    {
      id: sid(),
      type: "footer_cta",
      enabled: true,
      order: order++,
      label: "Get your own",
      text: "Want a card like this?",
      description: "Build your Tap Connect Card — offers, reviews, and follow-up in one tap.",
      buttonLabel: "Get Tap Connect",
      href: "/sign-up",
      finish: "neon",
    }
  );

  return {
    version: 3,
    accentColor: accent,
    surfaceColor: "#f4f1ea",
    textColor: "#0b0f19",
    neonColor: accent,
    pillColor: "#0c0a07",
    pillTextColor: "#f5e6a8",
    headerEnergy: 72,
    collapsible: true,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "metallic",
    cardFinish: "soft",
    defaultShape: "pill",
    view3d: false,
    showHeaderLogo: false,
    headerLogoUrl: params.logoUrl || undefined,
    headerLogoScale: 100,
    surfaceOpacity: 100,
    surfaceFill: "solid",
    surfaceGradientStart: accent,
    surfaceGradientEnd: "#0b0f19",
    surfaceGradientAngle: 160,
    titleFormat: { fontFamily: "sans", fontWeight: "bold", align: "center", fontSize: "xl" },
    bodyFormat: { fontFamily: "sans", fontSize: "sm", align: "center" },
    compactActionsOnly: false,
    sections,
  };
}

export function parseTapConnectCard(
  raw: unknown,
  fallback: Parameters<typeof defaultTapConnectCard>[0]
): TapConnectCardConfig {
  const base = defaultTapConnectCard(fallback);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.sections) || o.sections.length === 0) return base;

  const sections = (o.sections as TapCardSection[]).map((s) => ({
    ...s,
    finish: s.finish || s.style || base.defaultFinish,
    shape: s.shape ? normalizeShape(s.shape as TapCardButtonShapeLegacy) : s.shape,
    imageRadius: s.imageRadius
      ? normalizeShape(s.imageRadius as TapCardButtonShapeLegacy)
      : s.imageRadius,
    // Hero logo overlay is opt-in via showHeroLogo (legacy showLogoWindow defaults are ignored)
    showHeroLogo: s.type === "hero" ? s.showHeroLogo === true : s.showHeroLogo,
    showLogoWindow: s.type === "hero" ? s.showHeroLogo === true : s.showLogoWindow,
  }));

  return {
    version: 3,
    accentColor: typeof o.accentColor === "string" ? o.accentColor : base.accentColor,
    surfaceColor: typeof o.surfaceColor === "string" ? o.surfaceColor : base.surfaceColor,
    textColor: typeof o.textColor === "string" ? o.textColor : base.textColor,
    neonColor: typeof o.neonColor === "string" ? o.neonColor : base.neonColor,
    pillColor: typeof o.pillColor === "string" ? o.pillColor : base.pillColor,
    pillTextColor: typeof o.pillTextColor === "string" ? o.pillTextColor : base.pillTextColor,
    headerEnergy: typeof o.headerEnergy === "number" ? o.headerEnergy : base.headerEnergy,
    collapsible: o.collapsible !== false,
    defaultCollapsed: o.defaultCollapsed === true,
    actionsLayout:
      o.actionsLayout === "grid_2"
        ? "grid_2"
        : o.actionsLayout === "icon_row"
          ? "icon_row"
          : "stack",
    defaultFinish: (o.defaultFinish as PremiumFinish) || base.defaultFinish,
    cardFinish: (o.cardFinish as PremiumFinish) || base.cardFinish,
    defaultShape: normalizeShape(o.defaultShape as TapCardButtonShapeLegacy, base.defaultShape),
    view3d: o.view3d === true,
    showHeaderLogo: o.showHeaderLogo === true,
    headerLogoUrl:
      typeof o.headerLogoUrl === "string"
        ? o.headerLogoUrl
        : base.headerLogoUrl,
    headerLogoScale:
      typeof o.headerLogoScale === "number" ? o.headerLogoScale : base.headerLogoScale,
    surfaceOpacity:
      typeof o.surfaceOpacity === "number" ? o.surfaceOpacity : base.surfaceOpacity,
    surfaceFill: o.surfaceFill === "gradient" ? "gradient" : "solid",
    surfaceGradientStart:
      typeof o.surfaceGradientStart === "string"
        ? o.surfaceGradientStart
        : base.surfaceGradientStart,
    surfaceGradientEnd:
      typeof o.surfaceGradientEnd === "string" ? o.surfaceGradientEnd : base.surfaceGradientEnd,
    surfaceGradientAngle:
      typeof o.surfaceGradientAngle === "number"
        ? o.surfaceGradientAngle
        : base.surfaceGradientAngle,
    titleFormat: (o.titleFormat as TextFormat) || base.titleFormat,
    bodyFormat: (o.bodyFormat as TextFormat) || base.bodyFormat,
    compactActionsOnly: o.compactActionsOnly === true,
    sections,
  };
}

export function sortTapCardSections(sections: TapCardSection[]) {
  return [...sections].sort((a, b) => a.order - b.order);
}

export function resolveActionHref(
  section: TapCardSection,
  profile: BrandContactProfile,
  reviewUrl?: string | null
): string | undefined {
  const kind = section.actionKind;
  if (section.href?.trim()) return section.href.trim();
  switch (kind) {
    case "call":
      return profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, "")}` : undefined;
    case "email":
      return profile.email ? `mailto:${profile.email}` : undefined;
    case "sms":
      return profile.phone ? `sms:${profile.phone.replace(/[^\d+]/g, "")}` : undefined;
    case "website":
      return profile.website;
    case "map":
      return profile.address
        ? `https://maps.google.com/?q=${encodeURIComponent(profile.address)}`
        : undefined;
    case "review":
      return reviewUrl || undefined;
    case "instagram":
      return profile.socials?.instagram;
    case "facebook":
      return profile.socials?.facebook;
    case "tiktok":
      return profile.socials?.tiktok;
    case "snapchat":
      return profile.socials?.snapchat;
    case "x":
      return profile.socials?.x;
    case "youtube":
      return profile.socials?.youtube;
    case "linkedin":
      return profile.socials?.linkedin;
    case "whatsapp":
      return profile.socials?.whatsapp;
    case "yelp":
      return profile.socials?.yelp;
    default:
      return section.href;
  }
}

/** Pair consecutive actions when layout is grid_2 (for rendering). */
export function groupActionsForLayout(
  actions: TapCardSection[],
  layout: TapCardActionsLayout
): TapCardSection[][] {
  if (layout === "icon_row") return actions.map((a) => [a]);
  if (layout !== "grid_2") return actions.map((a) => [a]);
  const rows: TapCardSection[][] = [];
  for (let i = 0; i < actions.length; i += 2) {
    rows.push(actions.slice(i, i + 2));
  }
  return rows;
}
