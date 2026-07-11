// Content block system — structured, typed blocks (not drag-and-drop freeform)

export type BlockType =
  | "hero_image"
  | "hero_video"
  | "headline"
  | "rich_text"
  | "button_group"
  | "product_details"
  | "image_gallery"
  | "offer_coupon"
  | "email_capture"
  | "feedback_form"
  | "google_review"
  | "map_location"
  | "vcard_download"
  | "social_links"
  | "disclaimer"
  | "age_gate"
  | "faq"
  | "action_block";

export interface ContentBlock<T = Record<string, unknown>> {
  id: string;
  type: BlockType;
  order: number;
  enabled: boolean;
  label: string;
  data: T;
}

export interface HeroImageData {
  imageUrl: string;
  altText?: string;
  overlayText?: string;
}

export interface HeroVideoData {
  videoUrl: string;
  provider: "youtube" | "vimeo" | "other";
  title?: string;
}

export interface HeadlineData {
  headline: string;
  subheadline?: string;
  alignment?: "left" | "center" | "right";
}

export interface RichTextData {
  body: string;
}

export interface ButtonItem {
  id: string;
  label: string;
  url: string;
  style: "primary" | "secondary" | "outline";
  icon?: string;
}

export interface ButtonGroupData {
  buttons: ButtonItem[];
}

export interface ProductDetailsData {
  name: string;
  description: string;
  features: string[];
  price?: string;
}

export interface ImageGalleryData {
  images: { id: string; url: string; caption?: string }[];
}

export interface OfferCouponData {
  title: string;
  description: string;
  code?: string;
  expiresAt?: string;
  ctaLabel: string;
}

export interface EmailCaptureData {
  headline: string;
  description?: string;
  buttonLabel: string;
  fields: ("name" | "email" | "phone")[];
  successMessage: string;
}

export interface FeedbackFormData {
  headline: string;
  description?: string;
  buttonLabel: string;
  successMessage: string;
}

export interface GoogleReviewData {
  headline: string;
  description?: string;
  reviewUrl: string;
  buttonLabel: string;
}

export interface MapLocationData {
  headline: string;
  address: string;
  mapUrl?: string;
  buttonLabel: string;
}

export interface VcardDownloadData {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  buttonLabel: string;
}

export interface SocialLinksData {
  headline?: string;
  links: { platform: string; url: string }[];
}

export interface DisclaimerData {
  text: string;
}

export interface AgeGateData {
  minAge: number;
  message: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqData {
  headline: string;
  items: FaqItem[];
}

export interface ActionBlockData {
  headline?: string;
  actions: {
    id: string;
    type:
      | "review"
      | "feedback"
      | "call"
      | "directions"
      | "website"
      | "vcard"
      | "social"
      | "vip"
      | "shop"
      | "book"
      | "contact";
    label: string;
    url?: string;
  }[];
}

export interface CampaignTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: string;
}

export interface CampaignTemplate {
  id: string;
  campaignType: string;
  name: string;
  description: string;
  industry?: string;
  suggestedBlocks: BlockType[];
  defaultBlocks: ContentBlock[];
}
