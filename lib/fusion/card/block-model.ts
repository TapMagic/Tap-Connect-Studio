import { nanoid } from "nanoid";
import type {
  TapCardActionKind,
  TapCardSection,
  TapCardSectionType,
  TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import { createStarterCreativeComposition } from "@/lib/fusion/creative-studio/composition";

export type CardBlockCategory =
  | "Identity"
  | "Content"
  | "Actions"
  | "Promotion"
  | "Relationship"
  | "Connected";

export type CardBlockKind =
  | Exclude<TapCardSectionType, "action" | "action_row">
  | `action:${TapCardActionKind}`;

export type CardBlockDefinition = {
  kind: CardBlockKind;
  label: string;
  category: CardBlockCategory;
  description: string;
};

export const CARD_BLOCK_LIBRARY: readonly CardBlockDefinition[] = [
  { kind: "identity", label: "Business identity", category: "Identity", description: "Name, role, organization and headline" },
  { kind: "logo_block", label: "Logo", category: "Identity", description: "Brand or custom logo" },
  { kind: "business_name", label: "Business name", category: "Identity", description: "A focused business-name heading" },
  { kind: "tagline", label: "Tagline or headline", category: "Identity", description: "A short, prominent message" },
  { kind: "text", label: "Text", category: "Content", description: "Paragraph or heading copy" },
  { kind: "image", label: "Image", category: "Content", description: "One image from Assets, Brand or a URL" },
  { kind: "image_gallery", label: "Image gallery", category: "Content", description: "A responsive collection of images" },
  { kind: "video", label: "Video", category: "Content", description: "An embedded video with a title" },
  { kind: "hours", label: "Hours", category: "Content", description: "Business hours in a readable list" },
  { kind: "map", label: "Map / directions", category: "Content", description: "Address with a directions action" },
  { kind: "divider", label: "Divider", category: "Content", description: "A visual break between blocks" },
  { kind: "spacer", label: "Spacer", category: "Content", description: "Intentional compact spacing" },
  { kind: "action:call", label: "Call", category: "Actions", description: "Call a phone number" },
  { kind: "action:email", label: "Email", category: "Actions", description: "Compose an email" },
  { kind: "action:website", label: "Website", category: "Actions", description: "Open a website" },
  { kind: "action:map", label: "Directions", category: "Actions", description: "Open directions" },
  { kind: "action:review", label: "Reviews", category: "Actions", description: "Open a review destination" },
  { kind: "action:instagram", label: "Social link", category: "Actions", description: "Link to a social profile" },
  { kind: "action:custom", label: "Custom link", category: "Actions", description: "Link to any supported URL" },
  { kind: "action:vcard", label: "Save this Card / TapSave", category: "Actions", description: "Keep this Card or save contact details" },
  { kind: "special_offer", label: "Offer", category: "Promotion", description: "A complete local offer; Campaign optional" },
  { kind: "coupon", label: "Coupon", category: "Promotion", description: "Code, value, artwork and redemption terms" },
  { kind: "ticket", label: "Ticket", category: "Promotion", description: "Ticket details, artwork and action" },
  { kind: "announcement", label: "Announcement", category: "Promotion", description: "Time-sensitive news or notice" },
  { kind: "special_event", label: "Special event", category: "Promotion", description: "Event details, dates and action" },
  { kind: "contact_form", label: "Contact / lead form", category: "Relationship", description: "Consent-aware contact fields" },
  { kind: "newsletter_signup", label: "Newsletter / Email signup", category: "Relationship", description: "Email signup with consent copy" },
  { kind: "tapsave_prompt", label: "TapSave prompt", category: "Relationship", description: "Invite visitors to keep the Card" },
  { kind: "campaign", label: "Campaign", category: "Connected", description: "Link an existing Campaign with a safe fallback" },
  { kind: "campaign_group", label: "Campaign Group", category: "Connected", description: "Link a Campaign Group or eligible rotation" },
  { kind: "experience", label: "Experience", category: "Connected", description: "Link a TapConnect experience" },
  { kind: "location", label: "Location", category: "Connected", description: "Link a reusable business location" },
  { kind: "creative_composition", label: "Reusable TapCanvas composition", category: "Connected", description: "The canonical reusable composition block" },
] as const;

export const CARD_BLOCK_CATEGORIES: readonly CardBlockCategory[] = [
  "Identity", "Content", "Actions", "Promotion", "Relationship", "Connected",
];

export function cardBlockDefinition(kind: CardBlockKind) {
  return CARD_BLOCK_LIBRARY.find((item) => item.kind === kind);
}

export function cardBlockSourceLabel(section: TapCardSection): string {
  if (section.sourceMode === "BRAND") return "From Brand";
  if (section.sourceMode === "LINKED") {
    const object = section.linkedObjectType?.replace(/_/g, " ").toLowerCase() || "item";
    return `Linked to ${object.replace(/^./, (letter) => letter.toUpperCase())} — ${section.linkedObjectName || "Choose one"}`;
  }
  return "Custom on this Card";
}

export function createBlankCard(config: TapConnectCardConfig): TapConnectCardConfig {
  return { ...structuredClone(config), sections: [] };
}

export function createCardBlock(
  kind: CardBlockKind,
  context: {
    order: number;
    businessName?: string;
    logoUrl?: string | null;
    defaultFinish?: TapConnectCardConfig["defaultFinish"];
    defaultShape?: TapConnectCardConfig["defaultShape"];
    pillColor?: string;
    pillTextColor?: string;
    neonColor?: string;
  }
): TapCardSection {
  const definition = cardBlockDefinition(kind) || (
    kind === "hero" ? { kind, label: "Hero", category: "Identity" as const, description: "Legacy Card hero" } :
    kind === "promo_header" ? { kind, label: "Promotion banner", category: "Promotion" as const, description: "Legacy promotion header" } :
    kind === "footer_cta" ? { kind, label: "Footer call to action", category: "Actions" as const, description: "Legacy footer action" } :
    null
  );
  if (!definition) throw new Error(`Unsupported Card block: ${kind}`);
  const id = nanoid(8);
  const base: TapCardSection = {
    id,
    type: kind.startsWith("action:") ? "action" : kind as TapCardSectionType,
    enabled: true,
    locked: false,
    order: context.order,
    label: definition.label,
    sourceMode: "LOCAL",
    opacity: 100,
  };

  if (kind.startsWith("action:")) {
    const actionKind = kind.slice(7) as TapCardActionKind;
    return {
      ...base,
      actionKind,
      icon: actionKind,
      href: "",
      finish: actionKind === "review" ? "soft" : context.defaultFinish || "metallic",
      shape: context.defaultShape || "pill",
      backgroundColor: context.pillColor,
      textColor: context.pillTextColor,
      neonColor: context.neonColor,
    };
  }

  switch (kind) {
    case "hero":
      return { ...base, imageUrl: undefined, logoUrl: context.logoUrl || undefined, heroLayout: "classic", heroFill: "gradient", showHeroLogo: false, logoScale: 100 };
    case "promo_header":
      return { ...base, text: "Special", textRight: "Limited-Time Offer", href: "", pinTop: false, format: { fontFamily: "script", italic: true, fontSize: "base" } };
    case "footer_cta":
      return { ...base, text: "Want a Card like this?", description: "Build your TapConnect Card.", buttonLabel: "Get TapConnect", href: "/sign-up", finish: "soft" };
    case "identity":
      return { ...base, name: context.businessName || "Business name", organization: context.businessName || "", headline: "Your headline", format: { fontFamily: "sans", fontWeight: "bold", align: "center", fontSize: "xl" } };
    case "logo_block":
      return { ...base, logoUrl: context.logoUrl || undefined, logoBlockLayout: "stack", logoScale: 100, altText: context.businessName ? `${context.businessName} logo` : "Business logo" };
    case "business_name":
      return { ...base, text: context.businessName || "Business name", format: { fontFamily: "sans", fontWeight: "bold", align: "center", fontSize: "xl" } };
    case "tagline":
      return { ...base, text: "Your headline", format: { fontFamily: "sans", align: "center", fontSize: "lg" } };
    case "text":
      return { ...base, text: "Your message here", format: { fontFamily: "sans", align: "center", fontSize: "base" } };
    case "image":
      return { ...base, imageWidthPercent: 100, imageRadius: "rounded_md", altText: "" };
    case "image_gallery":
      return { ...base, imageUrls: [], mediaAssetIds: [], altText: "Image gallery" };
    case "video":
      return { ...base, text: "Featured video", videoUrl: "" };
    case "hours":
      return { ...base, text: "Hours", hoursLines: ["Monday–Friday · 9:00 AM–5:00 PM", "Saturday–Sunday · Closed"] };
    case "map":
      return { ...base, text: "Find us", address: "Enter an address", buttonLabel: "Get directions" };
    case "divider":
      return { ...base, height: "sm", accentColor: context.neonColor };
    case "spacer":
      return { ...base, height: "md" };
    case "special_offer":
    case "coupon":
    case "ticket":
    case "announcement":
    case "special_event": {
      const offerType = kind === "special_offer" ? "OFFER" : kind === "special_event" ? "EVENT" : kind.toUpperCase() as NonNullable<TapCardSection["offerType"]>;
      return { ...base, offerType, specialStyle: "card", offerMode: "expand", headline: definition.label === "Offer" ? "Limited-Time Offer" : definition.label, offerTitle: definition.label, description: "Add a short description", offerDescription: "Add redemption details", offerCta: kind === "announcement" ? "Learn more" : "Claim", offerDefaultOpen: true, finish: "soft", fallbackMode: "LOCAL" };
    }
    case "contact_form":
      return { ...base, text: "Contact us", description: "We’ll respond using the details you choose to share.", fields: [{ id: "name", label: "Name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }], consentText: "I agree to be contacted about this request." };
    case "newsletter_signup":
      return { ...base, text: "Stay in the loop", description: "Get occasional updates.", fields: [{ id: "email", label: "Email", type: "email", required: true }], consentText: "I consent to receive email updates. I can unsubscribe at any time." };
    case "tapsave_prompt":
      return { ...base, text: "Keep this Card", description: "Save this Card so it is easy to find again.", buttonLabel: "Save this Card", linkedObjectType: "TAPSAVE" };
    case "campaign":
      return { ...base, sourceMode: "LINKED", linkedObjectType: "CAMPAIGN", headline: "Campaign", description: "Choose a Campaign", fallbackMode: "LOCAL", fallbackText: "Visit again soon for the latest offer." };
    case "campaign_group":
      return { ...base, sourceMode: "LINKED", linkedObjectType: "CAMPAIGN_GROUP", headline: "Campaign Group", description: "Choose a Campaign Group", fallbackMode: "GROUP_DEFAULT", fallbackText: "Current promotions are unavailable." };
    case "experience":
      return { ...base, sourceMode: "LINKED", linkedObjectType: "EXPERIENCE", headline: "Experience", description: "Choose an Experience", fallbackMode: "LOCAL", fallbackText: "Explore this Card instead." };
    case "location":
      return { ...base, sourceMode: "LINKED", linkedObjectType: "LOCATION", headline: "Location", description: "Choose a Location", fallbackMode: "LOCAL", fallbackText: "Location details are unavailable." };
    case "creative_composition":
      return { ...base, composition: createStarterCreativeComposition(`comp-${id}`) };
    default:
      return base;
  }
}

export function useBrandResource(
  section: TapCardSection,
  resource: { id: string; name: string; value?: string }
): TapCardSection {
  return {
    ...section,
    sourceMode: "BRAND",
    brandResourceId: resource.id,
    brandResourceName: resource.name,
    ...(resource.value && (section.type === "logo_block" || section.type === "image")
      ? { imageUrl: resource.value, logoUrl: resource.value }
      : {}),
  };
}

export function useLocalCopy(section: TapCardSection): TapCardSection {
  return {
    ...section,
    sourceMode: "LOCAL",
    brandResourceId: undefined,
    brandResourceName: undefined,
    linkedObjectType: undefined,
    linkedObjectId: undefined,
    linkedObjectName: undefined,
    linkedCampaignId: undefined,
    linkedCampaignTitle: undefined,
    linkedCampaignGroupId: undefined,
    linkedCampaignGroupTitle: undefined,
    offerMode: section.offerMode === "campaign" ? "expand" : section.offerMode,
  };
}

export function linkCardBlock(
  section: TapCardSection,
  target: { type: NonNullable<TapCardSection["linkedObjectType"]>; id: string; name: string }
): TapCardSection {
  return { ...section, sourceMode: "LINKED", linkedObjectType: target.type, linkedObjectId: target.id, linkedObjectName: target.name };
}

export function isCardBlockLinkEligible(section: TapCardSection, now = new Date()): boolean {
  if (section.sourceMode !== "LINKED") return true;
  if (!section.linkedObjectId && !section.linkedCampaignId && !section.linkedCampaignGroupId) return false;
  if (section.linkedObjectStatus && !["LIVE", "READY", "ACTIVE"].includes(section.linkedObjectStatus)) return false;
  if (section.linkedStartsAt && now < new Date(section.linkedStartsAt)) return false;
  if (section.linkedEndsAt && now >= new Date(section.linkedEndsAt)) return false;
  return true;
}
