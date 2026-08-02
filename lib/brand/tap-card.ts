import { nanoid } from "nanoid";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { PremiumFinish, TextFormat } from "@/lib/design/premium-finish";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";

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
  | "custom"
  /** Fuse-box: opens in-Card support form → TapInbox (not mailto) */
  | "support";

export type TapCardSectionType =
  /** Composer Section/Surface. Its Elements live in `composition.nodes`. */
  | "surface"
  | "promo_header"
  | "hero"
  | "identity"
  | "action"
  | "action_row"
  | "image"
  | "image_gallery"
  | "video"
  | "hours"
  | "map"
  | "divider"
  | "logo_block"
  | "special_offer"
  | "coupon"
  | "ticket"
  | "announcement"
  | "special_event"
  | "text"
  | "business_name"
  | "tagline"
  | "contact_form"
  | "newsletter_signup"
  | "tapsave_prompt"
  | "campaign"
  | "campaign_group"
  | "experience"
  | "location"
  | "spacer"
  | "footer_cta"
  /** Bounded freeform Creative Composition Block inside the Card section stack. */
  | "creative_composition";

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
  /** When true, content edits are blocked until unlocked (reorder still allowed unless UI opts out). */
  locked?: boolean;
  /** Visible authorship contract for this block. Missing on legacy blocks means local. */
  sourceMode?: "LOCAL" | "BRAND" | "LINKED";
  brandResourceId?: string;
  brandResourceName?: string;
  linkedObjectType?: "CAMPAIGN" | "CAMPAIGN_GROUP" | "EXPERIENCE" | "LOCATION" | "ASSET" | "AUDIENCE_FORM" | "TAPSAVE";
  linkedObjectId?: string;
  linkedObjectName?: string;
  linkedObjectStatus?: string;
  linkedStartsAt?: string;
  linkedEndsAt?: string;
  fallbackMode?: "HIDE" | "LOCAL" | "GROUP_DEFAULT" | "LINKED_CAMPAIGN";
  fallbackText?: string;
  label?: string;
  text?: string;
  textRight?: string;
  href?: string;
  imageUrl?: string;
  mediaAssetId?: string;
  imageUrls?: string[];
  mediaAssetIds?: string[];
  videoUrl?: string;
  hoursLines?: string[];
  address?: string;
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
  offerType?: "OFFER" | "COUPON" | "TICKET" | "ANNOUNCEMENT" | "EVENT";
  offerValue?: string;
  offerStart?: string;
  offerCta?: string;
  offerExpires?: string;
  offerTerms?: string;
  redemptionInstructions?: string;
  /** When expand mode: start with offer panel open */
  offerDefaultOpen?: boolean;
  /** Linked campaign (contact capture / offer page opened via tap URL) */
  linkedCampaignId?: string;
  linkedCampaignTitle?: string;
  linkedCampaignGroupId?: string;
  linkedCampaignGroupTitle?: string;
  linkedDeviceCode?: string;
  /** Campaign-owned offer_coupon block id (authoritative offer bind) */
  offerBlockId?: string;
  /** Fingerprint of authoritative offer facts at last projection sync */
  offerFactsFingerprint?: string;
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
  /** Icon placement — before/after/left/right/above/below/only/none */
  iconPosition?:
    | "before"
    | "after"
    | "left"
    | "right"
    | "above"
    | "below"
    | "only"
    | "none";
  iconSize?: "sm" | "md" | "lg";
  textSize?: "sm" | "md" | "lg";
  iconGap?: number;
  contentAlign?: "start" | "center" | "end";
  verticalAlign?: "start" | "center" | "end";
  appearance?: "icon_text" | "icon_only" | "text";
  paddingX?: number;
  paddingY?: number;
  minHeight?: number;
  wrap?: boolean;
  fullWidth?: boolean;
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
  fields?: Array<{ id: string; label: string; type: "text" | "email" | "phone"; required?: boolean }>;
  consentText?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  neonColor?: string;
  opacity?: number;
  /** Canvas-first Section/Surface semantics. Legacy blocks remain supported. */
  surfaceKind?:
    | "blank"
    | "identity"
    | "hero"
    | "content"
    | "actions"
    | "offer"
    | "contact"
    | "location"
    | "gallery";
  surfaceLayout?: "stack" | "row" | "grid" | "free";
  surfaceWidthPercent?: number;
  surfaceMinHeightPx?: number;
  /** Stable free-layout coordinate plane. Growing the Section must not scale its Elements. */
  surfaceCoordinateHeightPx?: number;
  surfaceHeightMode?: "auto" | "fixed";
  surfacePaddingPx?: number;
  surfaceGapPx?: number;
  surfaceAlign?: "start" | "center" | "end" | "stretch";
  surfaceDistribute?: "start" | "center" | "end" | "between" | "around";
  surfaceBorderWidthPx?: number;
  surfaceBorderColor?: string;
  surfaceRadiusPx?: number;
  surfaceShadow?: "none" | "soft" | "medium" | "strong";
  backgroundImageUrl?: string;
  backgroundMediaAssetId?: string;
  backgroundFit?: "cover" | "contain" | "fill";
  backgroundPosition?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  responsiveBehavior?: "scale" | "stack" | "hide_decorative";
  mobileStackOrder?: string[];
  collapsible?: boolean;
  siblingId?: string;
  children?: TapCardSection[];
  layout?: TapCardActionsLayout;
  imageWidthPercent?: number;
  imageRadius?: TapCardButtonShape;
  altText?: string;
  /** Image fit for Card media blocks */
  objectFit?: "cover" | "contain" | "fill";
  decorative?: boolean;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  /**
   * Creative Composition Block payload (when type === "creative_composition").
   */
  composition?: CreativeCompositionBlock;
};

/** Page-level utilities that survive Campaign / Experience resolution. */
export type CardUtilityKind =
  | "keep"
  | "call"
  | "support"
  | "vcard"
  | "map"
  | "book"
  | "shop";

export type CardUtilityPresentation =
  | "sticky_bar"
  | "bottom_sheet"
  | "compact_row"
  | "action_deck";

export type CardUtilityToggle = {
  kind: CardUtilityKind;
  enabled: boolean;
  label?: string;
  icon?: string;
  order?: number;
  style?: "brand" | "soft" | "outline" | "solid";
  destination?: string;
  eligibility?: "eligible" | "missing_phone" | "missing_address" | "unavailable";
  sourceMode?: "BRAND" | "CUSTOM";
};

export type CardUtilityLayerSettings = {
  /** When false, suppress the page-level utility layer (in-Card section actions remain). */
  enabled?: boolean;
  presentation?: CardUtilityPresentation;
  utilities?: CardUtilityToggle[];
};

export type CardPropertySource = {
  mode: "BRAND" | "CUSTOM";
  source: "BRAND";
  sourceValue?: string;
};

export type CardPropertySources = Partial<
  Record<"accentColor" | "surfaceColor" | "textColor" | "pillColor" | "pillTextColor", CardPropertySource>
>;

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
  /** First-class positioning plane for Elements placed directly on the Card. */
  rootComposition?: CreativeCompositionBlock;
  rootCanvasMinHeightPx?: number;
  rootCanvasPaddingPx?: number;
  rootBackgroundImageUrl?: string;
  rootBackgroundFit?: "cover" | "contain" | "fill";
  rootBackgroundPosition?: string;
  rootOverlayColor?: string;
  rootOverlayOpacity?: number;
  /** Card-scoped editable resources. Instances are cloned into canonical compositions. */
  reusableCompositions?: CreativeCompositionBlock[];
  sections: TapCardSection[];
  /** Soft-retire without deleting Brand Kit card content (J1 lifecycle). */
  lifecycleStatus?: "active" | "retired";
  retiredAt?: string;
  /**
   * Persistent Card utility layer — visible on public Tap Points even when a
   * Campaign is active (Keep, Ask a Question, Save Contact, etc.).
   */
  utilityLayer?: CardUtilityLayerSettings;
  /** Wave 1 durable authority for the appearance properties exercised by Card editing. */
  propertySources?: CardPropertySources;
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
  {
    kind: "support",
    label: "Ask a Question",
    icon: "mail",
    placeholder: "Opens in-Card support (TapInbox)",
  },
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
    rootComposition: undefined,
    rootCanvasMinHeightPx: 520,
    rootCanvasPaddingPx: 12,
    rootBackgroundFit: "cover",
    rootBackgroundPosition: "50% 50%",
    rootOverlayColor: "#000000",
    rootOverlayOpacity: 0,
    sections,
    utilityLayer: {
      enabled: true,
      presentation: "compact_row",
      utilities: [
        { kind: "keep", enabled: true, label: "Keep this Card" },
        { kind: "support", enabled: true, label: "Ask a Question" },
        { kind: "vcard", enabled: true, label: "Save Contact" },
        { kind: "map", enabled: true },
        { kind: "book", enabled: true },
        { kind: "shop", enabled: true },
      ],
    },
  };
}

export function parseTapConnectCard(
  raw: unknown,
  fallback: Parameters<typeof defaultTapConnectCard>[0]
): TapConnectCardConfig {
  const base = defaultTapConnectCard(fallback);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  // An explicit empty array is a real blank Card. Only a missing/malformed
  // sections value falls back to the legacy seeded document.
  if (!Array.isArray(o.sections)) return base;

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
    rootComposition:
      o.rootComposition && typeof o.rootComposition === "object"
        ? (o.rootComposition as CreativeCompositionBlock)
        : undefined,
    rootCanvasMinHeightPx:
      typeof o.rootCanvasMinHeightPx === "number"
        ? Math.max(120, Math.min(2400, o.rootCanvasMinHeightPx))
        : 520,
    rootCanvasPaddingPx:
      typeof o.rootCanvasPaddingPx === "number"
        ? Math.max(0, Math.min(120, o.rootCanvasPaddingPx))
        : 12,
    rootBackgroundImageUrl:
      typeof o.rootBackgroundImageUrl === "string" ? o.rootBackgroundImageUrl : undefined,
    rootBackgroundFit:
      o.rootBackgroundFit === "contain" || o.rootBackgroundFit === "fill"
        ? o.rootBackgroundFit
        : "cover",
    rootBackgroundPosition:
      typeof o.rootBackgroundPosition === "string" ? o.rootBackgroundPosition : "50% 50%",
    rootOverlayColor:
      typeof o.rootOverlayColor === "string" ? o.rootOverlayColor : "#000000",
    rootOverlayOpacity:
      typeof o.rootOverlayOpacity === "number"
        ? Math.max(0, Math.min(1, o.rootOverlayOpacity))
        : 0,
    reusableCompositions: Array.isArray(o.reusableCompositions)
      ? o.reusableCompositions.filter(
          (value): value is CreativeCompositionBlock =>
            Boolean(
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              (value as Record<string, unknown>).version === 1 &&
              Array.isArray((value as Record<string, unknown>).nodes)
            )
        )
      : undefined,
    lifecycleStatus: o.lifecycleStatus === "retired" ? "retired" : "active",
    retiredAt: typeof o.retiredAt === "string" ? o.retiredAt : undefined,
    utilityLayer: parseUtilityLayer(o.utilityLayer, base.utilityLayer),
    propertySources: parseCardPropertySources(o.propertySources, o),
    sections,
  };
}

function parseCardPropertySources(
  raw: unknown,
  document: Record<string, unknown>,
): CardPropertySources {
  const keys = ["accentColor", "surfaceColor", "textColor", "pillColor", "pillTextColor"] as const;
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const result: CardPropertySources = {};
  for (const key of keys) {
    const candidate = source[key];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const value = candidate as Record<string, unknown>;
      if (value.mode === "BRAND" || value.mode === "CUSTOM") {
        result[key] = {
          mode: value.mode,
          source: "BRAND",
          sourceValue: typeof value.sourceValue === "string" ? value.sourceValue : undefined,
        };
        continue;
      }
    }
    // Conservative compatibility: every old explicit Card value is local/custom.
    if (typeof document[key] === "string") {
      result[key] = { mode: "CUSTOM", source: "BRAND" };
    }
  }
  return result;
}

function parseUtilityLayer(
  raw: unknown,
  fallback?: CardUtilityLayerSettings
): CardUtilityLayerSettings | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const o = raw as Record<string, unknown>;
  const presentation =
    o.presentation === "sticky_bar" ||
    o.presentation === "bottom_sheet" ||
    o.presentation === "compact_row" ||
    o.presentation === "action_deck"
      ? o.presentation
      : fallback?.presentation ?? "compact_row";
  const utilities = Array.isArray(o.utilities)
    ? (o.utilities as CardUtilityToggle[])
        .filter(
          (u) =>
            u &&
            typeof u === "object" &&
            ["keep", "call", "support", "vcard", "map", "book", "shop"].includes(u.kind)
        )
        .map((u) => ({
          kind: u.kind,
          enabled: u.enabled !== false,
          label: typeof u.label === "string" ? u.label : undefined,
          icon: typeof u.icon === "string" ? u.icon : undefined,
          order: typeof u.order === "number" ? u.order : undefined,
          style: u.style,
          destination: typeof u.destination === "string" ? u.destination : undefined,
          eligibility: u.eligibility,
          sourceMode: u.sourceMode,
        }))
    : fallback?.utilities;
  return {
    enabled: o.enabled !== false,
    presentation,
    utilities,
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
  /** Platform-bound actions never resolve to a URL — handled by Card runtime. */
  if (kind === "support") return undefined;
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
