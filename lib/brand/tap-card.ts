import { nanoid } from "nanoid";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";

/** Action kinds supported on a Tap Connect Card (beyond .vcf download). */
export type TapCardActionKind =
  | "vcard"
  | "call"
  | "email"
  | "sms"
  | "website"
  | "map"
  | "review"
  | "calendar"
  | "square"
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
  | "spacer"
  | "footer_cta";

export type TapCardActionStyle = "metallic" | "soft" | "brand" | "outline";

export type TapCardSection = {
  id: string;
  type: TapCardSectionType;
  enabled: boolean;
  order: number;
  /** Display label in builder / pill rows */
  label?: string;
  /** Promo text (left/right or body) */
  text?: string;
  textRight?: string;
  href?: string;
  /** Hero / media */
  imageUrl?: string;
  logoUrl?: string;
  /** Action row */
  actionKind?: TapCardActionKind;
  icon?: string;
  style?: TapCardActionStyle;
  /** Identity overrides */
  name?: string;
  title?: string;
  organization?: string;
  headline?: string;
  /** Show circular Call badge over hero */
  showCallBadge?: boolean;
  /** Spacer height */
  height?: "sm" | "md" | "lg";
  /** Footer CTA copy */
  buttonLabel?: string;
  description?: string;
};

export type TapConnectCardConfig = {
  version: 1;
  /** Living header accent — brand gold / lime / custom */
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  /** Mesh / glow intensity 0–100 */
  headerEnergy: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
  sections: TapCardSection[];
};

export const TAP_CARD_ACTION_CATALOG: {
  kind: TapCardActionKind;
  label: string;
  icon: string;
  placeholder?: string;
  brand?: boolean;
}[] = [
  { kind: "vcard", label: "Download vCard", icon: "vcard" },
  { kind: "call", label: "Click to Call", icon: "phone" },
  { kind: "email", label: "Send an Email", icon: "mail" },
  { kind: "sms", label: "Text Us", icon: "sms" },
  { kind: "website", label: "Website", icon: "link" },
  { kind: "map", label: "Directions", icon: "map" },
  { kind: "review", label: "Leave a Review", icon: "google" },
  { kind: "calendar", label: "Book / Schedule", icon: "calendar", placeholder: "https://cal.com/…" },
  { kind: "square", label: "Pay with Square", icon: "square", placeholder: "https://square.link/…" },
  { kind: "shop", label: "Shop", icon: "cart", placeholder: "https://" },
  { kind: "book", label: "Book Now", icon: "calendar", placeholder: "https://" },
  { kind: "homescreen", label: "Add to Home Screen", icon: "homescreen" },
  { kind: "bookmark", label: "Bookmark This Card", icon: "bookmark" },
  { kind: "instagram", label: "Instagram", icon: "instagram", brand: true },
  { kind: "facebook", label: "Facebook", icon: "facebook", brand: true },
  { kind: "tiktok", label: "TikTok", icon: "tiktok", brand: true },
  { kind: "snapchat", label: "Snapchat", icon: "snapchat", brand: true },
  { kind: "x", label: "X", icon: "x", brand: true },
  { kind: "youtube", label: "YouTube", icon: "youtube", brand: true },
  { kind: "linkedin", label: "LinkedIn", icon: "linkedin", brand: true },
  { kind: "whatsapp", label: "WhatsApp", icon: "whatsapp", brand: true },
  { kind: "yelp", label: "Yelp", icon: "yelp", brand: true },
  { kind: "custom", label: "Custom Link", icon: "link", placeholder: "https://" },
];

function sid() {
  return nanoid(8);
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
  const sections: TapCardSection[] = [
    {
      id: sid(),
      type: "promo_header",
      enabled: true,
      order: 0,
      text: "Click Here to",
      textRight: "Hottest Deal!!!",
      href: params.profile?.website || "#",
      label: "Promo header",
    },
    {
      id: sid(),
      type: "hero",
      enabled: true,
      order: 1,
      imageUrl: params.heroImageUrl || undefined,
      logoUrl: params.logoUrl || undefined,
      showCallBadge: Boolean(params.profile?.phone),
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
    },
    {
      id: sid(),
      type: "action",
      enabled: true,
      order: 3,
      actionKind: "vcard",
      label: "Download VCard",
      style: "metallic",
      icon: "vcard",
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
      style: "soft",
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
      style: "metallic",
      icon: "link",
    });
  }

  const socialOrder: { key: keyof NonNullable<BrandContactProfile["socials"]>; kind: TapCardActionKind }[] =
    [
      { key: "facebook", kind: "facebook" },
      { key: "instagram", kind: "instagram" },
      { key: "tiktok", kind: "tiktok" },
      { key: "snapchat", kind: "snapchat" },
      { key: "x", kind: "x" },
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
      style: "metallic",
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
      style: "outline",
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
    }
  );

  return {
    version: 1,
    accentColor: params.accentColor || "#d4af37",
    surfaceColor: "#f4f1ea",
    textColor: "#0b0f19",
    headerEnergy: 72,
    collapsible: true,
    defaultCollapsed: false,
    sections,
  };
}

export function parseTapConnectCard(
  raw: unknown,
  fallback: Parameters<typeof defaultTapConnectCard>[0]
): TapConnectCardConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultTapConnectCard(fallback);
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.sections) || o.sections.length === 0) {
    return defaultTapConnectCard(fallback);
  }
  return {
    version: 1,
    accentColor: typeof o.accentColor === "string" ? o.accentColor : "#d4af37",
    surfaceColor: typeof o.surfaceColor === "string" ? o.surfaceColor : "#f4f1ea",
    textColor: typeof o.textColor === "string" ? o.textColor : "#0b0f19",
    headerEnergy: typeof o.headerEnergy === "number" ? o.headerEnergy : 72,
    collapsible: o.collapsible !== false,
    defaultCollapsed: o.defaultCollapsed === true,
    sections: o.sections as TapCardSection[],
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
