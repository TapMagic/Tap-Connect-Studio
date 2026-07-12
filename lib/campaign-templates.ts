import type { CampaignTemplate, ContentBlock } from "@/lib/types/campaign";
import { nanoid } from "nanoid";

function block(
  type: ContentBlock["type"],
  label: string,
  data: Record<string, unknown>,
  order: number
): ContentBlock {
  return { id: nanoid(8), type, label, order, enabled: true, data };
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "product-story",
    campaignType: "PRODUCT_STORY",
    name: "Product Story",
    description: "Showcase a product with video, features, and a call to action.",
    industry: "retail",
    suggestedBlocks: ["hero_video", "headline", "product_details", "email_capture", "offer_coupon", "action_block"],
    defaultBlocks: [
      block("hero_video", "Product Video", { videoUrl: "", provider: "youtube", title: "" }, 0),
      block("headline", "Headline", { headline: "Featured Product", subheadline: "Tap to learn more", alignment: "center" }, 1),
      block("product_details", "Product Details", { name: "", description: "", features: [] }, 2),
      block(
        "email_capture",
        "Join VIP List",
        {
          headline: "Unlock the offer",
          description: "Share your contact info to reveal today’s special.",
          buttonLabel: "Unlock Offer",
          fields: ["name", "email"],
          requireName: true,
          successMessage: "You're in — your offer is below.",
        },
        3
      ),
      block(
        "offer_coupon",
        "Special Offer",
        {
          title: "Limited Offer",
          description: "",
          code: "",
          ctaLabel: "Claim Offer",
          lockedUntilContact: true,
        },
        4
      ),
      block("action_block", "Quick Actions", { actions: [{ id: "1", type: "call", label: "Call Store" }, { id: "2", type: "directions", label: "Get Directions" }, { id: "3", type: "review", label: "Leave a Review" }] }, 5),
    ],
  },
  {
    id: "video-demo",
    campaignType: "VIDEO_DEMO",
    name: "Video Demo",
    description: "Lead with video and a simple next step.",
    suggestedBlocks: ["hero_video", "headline", "rich_text", "button_group"],
    defaultBlocks: [
      block("hero_video", "Demo Video", { videoUrl: "", provider: "youtube" }, 0),
      block("headline", "Headline", { headline: "See It In Action", subheadline: "" }, 1),
      block("rich_text", "Description", { body: "" }, 2),
      block("button_group", "Buttons", { buttons: [{ id: "1", label: "Learn More", url: "", style: "primary" }] }, 3),
    ],
  },
  {
    id: "coupon-offer",
    campaignType: "COUPON_OFFER",
    name: "Coupon / Offer",
    description: "Collect contact info first, then unlock the coupon on the same page.",
    suggestedBlocks: ["hero_image", "headline", "email_capture", "offer_coupon", "disclaimer"],
    defaultBlocks: [
      block("hero_image", "Hero Image", { imageUrl: "", altText: "Offer" }, 0),
      block(
        "headline",
        "Headline",
        { headline: "Exclusive Offer", subheadline: "Enter your info to unlock your coupon", alignment: "center" },
        1
      ),
      block(
        "email_capture",
        "Contact Capture",
        {
          headline: "Unlock your coupon",
          description: "Tell us how to reach you, then your offer appears below.",
          buttonLabel: "Unlock My Coupon",
          fields: ["name", "email"],
          requireName: true,
          requirePhone: false,
          successMessage: "You're in — your coupon is below.",
        },
        2
      ),
      block(
        "offer_coupon",
        "Coupon",
        {
          title: "Your Offer",
          description: "Show this code in store.",
          code: "SAVE10",
          ctaLabel: "I've Got My Code",
          lockedUntilContact: true,
        },
        3
      ),
      block("disclaimer", "Disclaimer", { text: "Offer valid while supplies last. One per customer." }, 4),
    ],
  },
  {
    id: "review-request",
    campaignType: "REVIEW_REQUEST",
    name: "Review Request",
    description: "Thank customers and guide them to leave a review.",
    suggestedBlocks: ["headline", "rich_text", "google_review", "feedback_form", "action_block"],
    defaultBlocks: [
      block("headline", "Thank You", { headline: "Thanks for visiting!", subheadline: "We'd love your feedback" }, 0),
      block("rich_text", "Message", { body: "Your experience matters to us." }, 1),
      block("google_review", "Google Review", { headline: "Leave a Google Review", reviewUrl: "", buttonLabel: "Review on Google" }, 2),
      block("feedback_form", "Private Feedback", { headline: "Private feedback", buttonLabel: "Send Feedback", successMessage: "Thank you for your feedback." }, 3),
      block("action_block", "More Actions", { actions: [{ id: "1", type: "directions", label: "Get Directions" }, { id: "2", type: "website", label: "Visit Website" }] }, 4),
    ],
  },
  {
    id: "contact-vcard",
    campaignType: "CONTACT_VCARD",
    name: "Contact / vCard",
    description: "Digital business card with contact info and social links.",
    suggestedBlocks: ["hero_image", "headline", "vcard_download", "button_group", "social_links", "map_location"],
    defaultBlocks: [
      block("hero_image", "Profile Photo", { imageUrl: "", altText: "Profile" }, 0),
      block("headline", "Name & Title", { headline: "Your Name", subheadline: "Your Title" }, 1),
      block("vcard_download", "Save Contact", { name: "", title: "", phone: "", email: "", website: "", buttonLabel: "Save to Contacts" }, 2),
      block("button_group", "Contact Buttons", { buttons: [{ id: "1", label: "Call", url: "tel:", style: "primary" }, { id: "2", label: "Email", url: "mailto:", style: "secondary" }] }, 3),
      block("social_links", "Social Links", { links: [] }, 4),
      block("map_location", "Location", { headline: "Find Us", address: "", buttonLabel: "Get Directions" }, 5),
    ],
  },
  {
    id: "event-announcement",
    campaignType: "EVENT_ANNOUNCEMENT",
    name: "Event / Announcement",
    description: "Promote an event with details, RSVP, and map.",
    suggestedBlocks: ["hero_image", "headline", "rich_text", "email_capture", "map_location", "offer_coupon"],
    defaultBlocks: [
      block("hero_image", "Event Image", { imageUrl: "" }, 0),
      block("headline", "Event Title", { headline: "Upcoming Event", subheadline: "Date & Time" }, 1),
      block("rich_text", "Event Details", { body: "" }, 2),
      block("email_capture", "RSVP", { headline: "RSVP Now", buttonLabel: "Reserve Spot", fields: ["name", "email"], successMessage: "You're on the list!" }, 3),
      block("map_location", "Location", { headline: "Event Location", address: "", buttonLabel: "Get Directions" }, 4),
    ],
  },
  {
    id: "lead-capture",
    campaignType: "LEAD_CAPTURE",
    name: "Lead Capture",
    description: "Simple page focused on collecting contact information.",
    suggestedBlocks: ["headline", "rich_text", "email_capture", "action_block"],
    defaultBlocks: [
      block("headline", "Headline", { headline: "Join Our List", subheadline: "Get updates and exclusive offers" }, 0),
      block("rich_text", "Description", { body: "" }, 1),
      block("email_capture", "Sign Up Form", { headline: "Sign up", buttonLabel: "Join Now", fields: ["name", "email", "phone"], successMessage: "Welcome aboard!" }, 2),
      block("action_block", "Actions", { actions: [{ id: "1", type: "website", label: "Visit Website" }] }, 3),
    ],
  },
  {
    id: "link-hub",
    campaignType: "LINK_HUB",
    name: "Link Hub",
    description: "Central hub for all your important links.",
    suggestedBlocks: ["hero_image", "headline", "button_group", "social_links"],
    defaultBlocks: [
      block("hero_image", "Logo / Photo", { imageUrl: "" }, 0),
      block("headline", "Business Name", { headline: "Your Business", subheadline: "" }, 1),
      block("button_group", "Links", { buttons: [] }, 2),
      block("social_links", "Social", { links: [] }, 3),
    ],
  },
];

export function getTemplateById(id: string) {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateByType(campaignType: string) {
  return CAMPAIGN_TEMPLATES.find((t) => t.campaignType === campaignType);
}
