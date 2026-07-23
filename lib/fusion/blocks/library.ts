/**
 * Unified Block Library — V1 campaign blocks + Tap Card sections + expanded families.
 */

export type BlockFamily =
  | "layout"
  | "content"
  | "media"
  | "actions"
  | "conversion"
  | "relationship"
  | "communication"
  | "social"
  | "commerce"
  | "forms"
  | "advanced"
  | "templates";

export type BlockLibraryEntry = {
  id: string;
  label: string;
  family: BlockFamily;
  /** V1 campaign BlockType if applicable */
  campaignType?: string;
  /** Tap Card section type if applicable */
  tapCardType?: string;
  addable: boolean;
  contracts: Array<"text" | "color" | "media" | "layout" | "divider" | "spacer" | "action" | "form">;
  description: string;
};

export const BLOCK_LIBRARY: BlockLibraryEntry[] = [
  // V1 campaign blocks (including previously non-addable)
  { id: "campaign.hero_image", label: "Hero image", family: "media", campaignType: "hero_image", addable: true, contracts: ["media", "layout"], description: "Full-width hero photo" },
  { id: "campaign.hero_video", label: "Hero video", family: "media", campaignType: "hero_video", addable: true, contracts: ["media"], description: "Embedded or hosted video hero" },
  { id: "campaign.headline", label: "Headline", family: "content", campaignType: "headline", addable: true, contracts: ["text", "color"], description: "Primary heading" },
  { id: "campaign.rich_text", label: "Rich text", family: "content", campaignType: "rich_text", addable: true, contracts: ["text"], description: "Body copy" },
  { id: "campaign.button_group", label: "Button group", family: "actions", campaignType: "button_group", addable: true, contracts: ["action", "layout"], description: "CTA buttons" },
  { id: "campaign.product_details", label: "Product details", family: "content", campaignType: "product_details", addable: true, contracts: ["text", "media"], description: "Product story block" },
  { id: "campaign.image_gallery", label: "Image gallery", family: "media", campaignType: "image_gallery", addable: true, contracts: ["media", "layout"], description: "Multi-image gallery (restored)" },
  { id: "campaign.offer_coupon", label: "Offer / coupon", family: "conversion", campaignType: "offer_coupon", addable: true, contracts: ["text", "action"], description: "Coupon or offer" },
  { id: "campaign.email_capture", label: "Email capture", family: "forms", campaignType: "email_capture", addable: true, contracts: ["form"], description: "Lead capture" },
  { id: "campaign.feedback_form", label: "Feedback form", family: "forms", campaignType: "feedback_form", addable: true, contracts: ["form"], description: "Feedback form (restored)" },
  { id: "campaign.google_review", label: "Google review", family: "actions", campaignType: "google_review", addable: true, contracts: ["action"], description: "Review CTA" },
  { id: "campaign.map_location", label: "Map / location", family: "content", campaignType: "map_location", addable: true, contracts: ["text", "action"], description: "Directions / map" },
  { id: "campaign.vcard_download", label: "Download vCard", family: "actions", campaignType: "vcard_download", addable: true, contracts: ["action"], description: "Contact download" },
  { id: "campaign.social_links", label: "Social links", family: "social", campaignType: "social_links", addable: true, contracts: ["action", "layout"], description: "Social action row" },
  { id: "campaign.disclaimer", label: "Disclaimer", family: "content", campaignType: "disclaimer", addable: true, contracts: ["text"], description: "Legal / disclaimer" },
  { id: "campaign.age_gate", label: "Age gate", family: "advanced", campaignType: "age_gate", addable: true, contracts: ["form", "text"], description: "Age gate (restored)" },
  { id: "campaign.faq", label: "FAQ", family: "content", campaignType: "faq", addable: true, contracts: ["text", "layout"], description: "FAQ accordion" },
  { id: "campaign.action_block", label: "Action block", family: "actions", campaignType: "action_block", addable: true, contracts: ["action"], description: "Generic action" },
  { id: "campaign.upcoming_schedule", label: "Upcoming schedule", family: "content", campaignType: "upcoming_schedule", addable: true, contracts: ["layout"], description: "Schedule strip" },
  { id: "campaign.digital_card", label: "Digital card", family: "relationship", campaignType: "digital_card", addable: true, contracts: ["layout"], description: "Embed Tap Card" },
  { id: "campaign.spacer", label: "Spacer", family: "layout", campaignType: "spacer", addable: true, contracts: ["spacer"], description: "Vertical space" },
  { id: "campaign.columns", label: "Columns", family: "layout", campaignType: "columns", addable: true, contracts: ["layout"], description: "Multi-column layout" },
  { id: "campaign.banner", label: "Banner", family: "conversion", campaignType: "banner", addable: true, contracts: ["text", "color", "media"], description: "Promo banner" },

  // Tap Card sections
  { id: "card.promo_header", label: "Promo header", family: "conversion", tapCardType: "promo_header", addable: true, contracts: ["text", "color"], description: "Pinned or inline promo" },
  { id: "card.hero", label: "Hero", family: "media", tapCardType: "hero", addable: true, contracts: ["media", "color", "layout"], description: "Card hero" },
  { id: "card.identity", label: "Identity", family: "content", tapCardType: "identity", addable: true, contracts: ["text", "color"], description: "Name / title / org" },
  { id: "card.action", label: "Action", family: "actions", tapCardType: "action", addable: true, contracts: ["action"], description: "Single action button" },
  { id: "card.action_row", label: "Action row", family: "actions", tapCardType: "action_row", addable: true, contracts: ["action", "layout"], description: "Grouped actions" },
  { id: "card.image", label: "Image", family: "media", tapCardType: "image", addable: true, contracts: ["media"], description: "Image block" },
  { id: "card.logo_block", label: "Logo block", family: "media", tapCardType: "logo_block", addable: true, contracts: ["media", "layout"], description: "Logo layout" },
  { id: "card.special_offer", label: "Special offer", family: "conversion", tapCardType: "special_offer", addable: true, contracts: ["text", "action", "color"], description: "Offer tile/banner" },
  { id: "card.text", label: "Text", family: "content", tapCardType: "text", addable: true, contracts: ["text"], description: "Text section" },
  { id: "card.spacer", label: "Spacer", family: "layout", tapCardType: "spacer", addable: true, contracts: ["spacer"], description: "Card spacer" },
  { id: "card.footer_cta", label: "Footer CTA", family: "actions", tapCardType: "footer_cta", addable: true, contracts: ["action"], description: "Footer call to action" },

  // Expanded relationship / pillar blocks (wired, feature-gated)
  { id: "rel.tapsave", label: "TapSave / Keep Card", family: "relationship", addable: true, contracts: ["action"], description: "Save relationship CTA" },
  { id: "rel.wallet", label: "Add to Wallet", family: "relationship", addable: true, contracts: ["action"], description: "Apple/Google Wallet" },
  { id: "rel.loyalty", label: "Loyalty", family: "relationship", addable: true, contracts: ["text", "action"], description: "TapLoop membership" },
  { id: "rel.booking", label: "Booking status", family: "commerce", addable: true, contracts: ["text", "action"], description: "Appointment status" },
  { id: "rel.order", label: "Order status", family: "commerce", addable: true, contracts: ["text", "action"], description: "Order / invoice status" },
];

export function listAddableCampaignBlockTypes(): string[] {
  return BLOCK_LIBRARY.filter((b) => b.addable && b.campaignType).map((b) => b.campaignType!);
}

export function searchBlockLibrary(query: string, family?: BlockFamily): BlockLibraryEntry[] {
  const q = query.trim().toLowerCase();
  return BLOCK_LIBRARY.filter((b) => {
    if (family && b.family !== family) return false;
    if (!q) return true;
    return (
      b.label.toLowerCase().includes(q) ||
      b.id.includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.family.includes(q)
    );
  });
}
