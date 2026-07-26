/**
 * Structured outcome metadata for Workbench campaign templates.
 * Keyed by template id from CAMPAIGN_TEMPLATES — not a second SoT for blocks.
 */

export type TemplateOutcomeMeta = {
  id: string;
  /** Host-facing scenario label */
  scenario: string;
  /** What the visitor sees first */
  firstScreen: string;
  /** Primary CTA / action */
  primaryAction: string;
  /** Data captured (or "none") */
  dataCaptured: string;
  /** Follow-up after the primary action */
  followUp: string;
  /** Final business outcome */
  finalOutcome: string;
  /** Fusion / product pillars this supports */
  pillars: string[];
  /** What the host must have ready */
  setupRequirements: string[];
  /** Rough guided steps to go live */
  estimatedSteps: number;
  /** Modal: what this creates for the host */
  whatThisCreates: string[];
  /** Modal: visitor journey summary */
  customerExperience: string[];
  /** Modal: prerequisites checklist */
  whatYouNeed: string[];
  /** Sample product / campaign title seed */
  sampleTitle: string;
  price?: string;
  offer?: string;
  /** Distinct phone-preview media treatment */
  media: {
    kind: "product" | "video" | "coupon" | "review" | "vcard" | "event" | "lead" | "hub";
    /** Tailwind gradient stops unique per template */
    gradient: string;
    mediaLabel: string;
  };
};

export const TEMPLATE_OUTCOMES: Record<string, TemplateOutcomeMeta> = {
  "product-story": {
    id: "product-story",
    scenario: "Showcase a hero product and unlock a VIP offer",
    firstScreen: "Product video + headline",
    primaryAction: "Unlock offer (contact)",
    dataCaptured: "Name, email",
    followUp: "Reveal locked coupon on the same page",
    finalOutcome: "Product interest + VIP lead + redeemable offer",
    pillars: ["Campaigns", "Lead capture", "Offers"],
    setupRequirements: ["Product name & media", "Offer code", "Contact fields"],
    estimatedSteps: 5,
    whatThisCreates: [
      "A product-led campaign page with video and details",
      "Contact capture that unlocks a coupon",
      "Quick actions (call, directions, review)",
    ],
    customerExperience: [
      "Sees the product story and media first",
      "Shares contact to unlock today’s special",
      "Gets the offer code and store actions",
    ],
    whatYouNeed: [
      "Product photo or video URL",
      "Offer title and code",
      "Store phone / maps ready in Brand Kit (optional)",
    ],
    sampleTitle: "Midnight Reserve Cigar",
    price: "$28",
    offer: "VIP 10% off",
    media: {
      kind: "product",
      gradient: "from-emerald-600/90 via-lime-700/50 to-stone-900",
      mediaLabel: "Product hero",
    },
  },
  "video-demo": {
    id: "video-demo",
    scenario: "Explain with video, then one clear next step",
    firstScreen: "Full-bleed demo video",
    primaryAction: "Learn more / CTA button",
    dataCaptured: "None by default",
    followUp: "Optional outbound link or deeper page",
    finalOutcome: "Educated visitor ready to act",
    pillars: ["Campaigns", "Content"],
    setupRequirements: ["Video URL", "Headline", "CTA destination"],
    estimatedSteps: 3,
    whatThisCreates: [
      "A video-first campaign with supporting copy",
      "A primary button group for the next step",
    ],
    customerExperience: [
      "Watches the demo immediately",
      "Reads a short explanation",
      "Taps the CTA to continue",
    ],
    whatYouNeed: ["YouTube/Vimeo (or hosted) video", "CTA label and URL"],
    sampleTitle: "Smart Humidor Demo",
    media: {
      kind: "video",
      gradient: "from-sky-500/90 via-cyan-800/60 to-slate-950",
      mediaLabel: "Demo reel",
    },
  },
  "coupon-offer": {
    id: "coupon-offer",
    scenario: "Gate a coupon behind contact capture",
    firstScreen: "Offer hero + unlock prompt",
    primaryAction: "Unlock my coupon",
    dataCaptured: "Name, email",
    followUp: "Show coupon code + disclaimer",
    finalOutcome: "Redeemable coupon + new contact",
    pillars: ["Campaigns", "Lead capture", "Offers"],
    setupRequirements: ["Offer creative", "Coupon code", "Disclaimer copy"],
    estimatedSteps: 4,
    whatThisCreates: [
      "Contact-first coupon flow on one page",
      "Locked offer until form submit",
      "Legal disclaimer block",
    ],
    customerExperience: [
      "Sees the exclusive offer tease",
      "Enters contact to unlock",
      "Shows code in store",
    ],
    whatYouNeed: ["Coupon code", "Hero image", "Terms / disclaimer"],
    sampleTitle: "Weekend Bundle",
    price: "Save $15",
    offer: "CODE: WEEKEND15",
    media: {
      kind: "coupon",
      gradient: "from-amber-400/90 via-orange-700/55 to-stone-950",
      mediaLabel: "Coupon unlock",
    },
  },
  "review-request": {
    id: "review-request",
    scenario: "Thank guests and ask for a public review",
    firstScreen: "Thank-you headline",
    primaryAction: "Leave a Google review",
    dataCaptured: "Optional private feedback",
    followUp: "Directions / website actions",
    finalOutcome: "More reviews + private feedback channel",
    pillars: ["Campaigns", "Reputation"],
    setupRequirements: ["Google review URL", "Thank-you copy"],
    estimatedSteps: 3,
    whatThisCreates: [
      "Post-visit thank-you page",
      "Google review button",
      "Optional private feedback form",
    ],
    customerExperience: [
      "Feels appreciated after the visit",
      "One tap to review publicly",
      "Can send private feedback instead",
    ],
    whatYouNeed: ["Google Business review link", "Short thank-you message"],
    sampleTitle: "Thank-you + Google review",
    media: {
      kind: "review",
      gradient: "from-violet-500/85 via-fuchsia-800/45 to-zinc-950",
      mediaLabel: "Review ask",
    },
  },
  "contact-vcard": {
    id: "contact-vcard",
    scenario: "Digital business card people can save",
    firstScreen: "Photo + name / title",
    primaryAction: "Save to contacts (vCard)",
    dataCaptured: "None (they save you)",
    followUp: "Call, email, socials, map",
    finalOutcome: "Contact saved + easy reconnection",
    pillars: ["Tap Card", "Campaigns"],
    setupRequirements: ["Name & title", "Phone/email", "Optional photo"],
    estimatedSteps: 4,
    whatThisCreates: [
      "vCard download campaign",
      "Call / email buttons",
      "Social + map blocks",
    ],
    customerExperience: [
      "Sees who you are immediately",
      "Saves the contact in one tap",
      "Can call, email, or find you",
    ],
    whatYouNeed: ["Contact details in Brand Kit", "Profile photo (optional)"],
    sampleTitle: "Alex Rivera · Sales Lead",
    media: {
      kind: "vcard",
      gradient: "from-slate-300/70 via-zinc-700/50 to-neutral-950",
      mediaLabel: "Save contact",
    },
  },
  "event-announcement": {
    id: "event-announcement",
    scenario: "Promote an event and collect RSVPs",
    firstScreen: "Event image + date line",
    primaryAction: "RSVP / reserve spot",
    dataCaptured: "Name, email",
    followUp: "Map / directions to the venue",
    finalOutcome: "RSVP list + informed attendees",
    pillars: ["Campaigns", "Lead capture", "Events"],
    setupRequirements: ["Event title & time", "Venue address", "Hero image"],
    estimatedSteps: 5,
    whatThisCreates: [
      "Event announcement page",
      "RSVP capture form",
      "Location / directions block",
    ],
    customerExperience: [
      "Sees what’s on and when",
      "Reserves a spot with contact info",
      "Gets directions when ready",
    ],
    whatYouNeed: ["Date & time copy", "Venue address", "Optional capacity note"],
    sampleTitle: "Friday Tasting Night",
    offer: "RSVP required",
    media: {
      kind: "event",
      gradient: "from-rose-500/90 via-pink-800/50 to-stone-950",
      mediaLabel: "Event night",
    },
  },
  "lead-capture": {
    id: "lead-capture",
    scenario: "Simple list signup focused on contacts",
    firstScreen: "Join headline + short pitch",
    primaryAction: "Join now",
    dataCaptured: "Name, email, phone",
    followUp: "Website action",
    finalOutcome: "Growing VIP / marketing list",
    pillars: ["Lead capture", "Audience"],
    setupRequirements: ["Signup headline", "Success message"],
    estimatedSteps: 3,
    whatThisCreates: [
      "Minimal lead-capture page",
      "Name / email / phone form",
      "Optional website action",
    ],
    customerExperience: [
      "Understands the list benefit quickly",
      "Submits contact details",
      "Sees a clear success message",
    ],
    whatYouNeed: ["List value proposition", "Where leads go (Audience)"],
    sampleTitle: "VIP list signup",
    media: {
      kind: "lead",
      gradient: "from-teal-400/85 via-emerald-800/55 to-slate-950",
      mediaLabel: "List signup",
    },
  },
  "link-hub": {
    id: "link-hub",
    scenario: "Link-in-bio hub for all key destinations",
    firstScreen: "Logo + business name",
    primaryAction: "Tap any link button",
    dataCaptured: "None by default",
    followUp: "Social icons",
    finalOutcome: "One tap destination for all important URLs",
    pillars: ["Campaigns", "Content"],
    setupRequirements: ["Logo", "Link list", "Social URLs"],
    estimatedSteps: 3,
    whatThisCreates: [
      "Central link hub page",
      "Button group for destinations",
      "Social links row",
    ],
    customerExperience: [
      "Recognizes your brand",
      "Picks the link they need",
      "Optionally follows socials",
    ],
    whatYouNeed: ["Logo or photo", "URLs for each button", "Social profiles"],
    sampleTitle: "All your important links",
    media: {
      kind: "hub",
      gradient: "from-indigo-500/85 via-blue-800/50 to-slate-950",
      mediaLabel: "Link hub",
    },
  },
};

export function getTemplateOutcome(id: string): TemplateOutcomeMeta | undefined {
  return TEMPLATE_OUTCOMES[id];
}
