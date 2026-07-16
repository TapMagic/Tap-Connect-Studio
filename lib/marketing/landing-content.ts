/** Centralized landing + pricing copy for TapConnect Studio */

export const HERO_PILLS = [
  "NFC + QR",
  "Campaign Workbench",
  "Tap Device Manager",
  "Contact Collector",
  "Scheduled Offers",
  "Analytics",
  "Branded Emails",
] as const;

export const EVOLUTION_CARDS = [
  { title: "Tap Cards", body: "Premium digital profiles that now launch campaigns, collectors, and offers." },
  { title: "Campaign Workbench", body: "Build drafts before you know which tag will run them." },
  { title: "Product Discs", body: "NFC discs on shelves and displays that open product stories." },
  { title: "Shelf Tags", body: "Stable URLs behind every tag — change content without rewriting NFC." },
  { title: "Review Stations", body: "Signs that route happy customers to Google while the moment is warm." },
  { title: "Contact Collectors", body: "Capture name, email, phone — then deliver a branded offer." },
  { title: "Device Manager", body: "Every tag has a profile, history, status, and analytics." },
  { title: "Scheduled Offers", body: "Rotate happy hour, wings night, and weekend specials automatically." },
  { title: "Analytics", body: "Taps, leads, coupons, reviews, maps, and vCards — by device and campaign." },
  { title: "Brand Library", body: "Photos, logos, icons, colors, and reusable brand blocks." },
  { title: "Branded Emails", body: "Coupon delivery, thank-yous, and owner notifications." },
  { title: "Multi-Location", body: "Location-specific schedules, devices, and offers." },
] as const;

export const WORKFLOW_STEPS = [
  {
    n: "01",
    title: "Build",
    body: "Create campaigns in Workbench with templates, blocks, AI, cloning, media, offers, and forms.",
  },
  {
    n: "02",
    title: "Assign",
    body: "Attach the campaign to a card, NFC disc, shelf tag, table tent, product display, or review sign.",
  },
  {
    n: "03",
    title: "Tap",
    body: "Customers tap or scan and instantly open the live mobile experience — no app required.",
  },
  {
    n: "04",
    title: "Capture & Improve",
    body: "Collect contacts, coupon claims, reviews, feedback, vCards, map clicks, and analytics.",
  },
] as const;

export const WORKBENCH_FEATURES = [
  "Full campaign designer & Workbench",
  "Draft / live / scheduled / complete / archived states",
  "Drag & drop page blocks",
  "Copy, paste, and clone campaigns — including archived",
  "Templates + AI-assisted creation",
  "Mobile preview",
  "Schedule start/end dates",
  "Campaign groups",
  "Reusable brand blocks",
  "Searchable photo, logo & icon libraries",
  "Custom colors, borders & styling",
  "Publish now or assign later",
] as const;

export const DEVICE_FEATURES = [
  "Every device has a profile",
  "Stable URL never changes",
  "Active, unassigned, lost, replaced, closed, archived",
  "Active device slot limits by plan",
  "Tap-to-manage & remote staff scan",
  "Assignment history & archived campaigns per device",
  "Device analytics",
  "Reassign without rewriting the tag",
  "Replace physical hardware without losing history",
] as const;

export const CARD_LAUNCHPAD_FEATURES = [
  "Open a classic TapConnect profile",
  "Launch a campaign or contact collector",
  "Deliver a special offer",
  "Link / unlink campaigns as needed",
  "Custom colors, borders, photos, logos, icons",
  "Collect contacts & export CSV",
  "Trigger branded follow-up emails",
  "Networking, sales, staff, product, promo, or event card",
] as const;

export const BLOCK_LIBRARY = [
  "Hero Section",
  "Video",
  "Image Gallery",
  "Product Story",
  "Product Details",
  "Product Feature Bullets",
  "Offer / Coupon",
  "Contact Collector",
  "Email Capture",
  "Phone Capture",
  "Review Link",
  "Feedback Form",
  "vCard Download",
  "Map / Directions",
  "Multi-Location Links",
  "Social Links",
  "FAQ",
  "Age Gate",
  "Disclaimer",
  "Menu / Specials",
  "Event Schedule",
  "Add to Calendar",
  "Photo Upload",
  "Testimonial Capture",
  "Appointment Link",
  "E-commerce Link",
  "Product Comparison",
  "Staff Notes",
  "PDF / File Download",
  "VIP Signup",
  "Loyalty Prompt",
  "Custom Button Group",
] as const;

export const CAPTURE_FEATURES = [
  "Collect name, email, phone",
  "Source tied to campaign, device, location",
  "Coupon / offer delivery after signup",
  "Owner notification when a contact is created",
  "Branded auto-reply email",
  "CSV downloads",
  "Customer notes & tags",
  "Future email & SMS campaigns",
] as const;

export const EMAIL_FEATURES = [
  "Coupon delivery",
  "Thank-you after signup",
  "Product information follow-up",
  "Owner notification",
  "Staff scan link email",
  "Branded logo & colors",
  "Reply-to support",
  "Campaign / source context",
  "Future email campaign upsell",
] as const;

export const ANALYTICS_FEATURES = [
  "Taps by device, campaign, location",
  "Taps over time",
  "Leads collected",
  "Coupon claims",
  "Review & map clicks",
  "vCard downloads",
  "Top campaigns & devices",
  "Inactive device visibility",
  "Scheduled offer performance",
  "CSV / export (roadmap)",
] as const;

export const BRAND_LIBRARY_FEATURES = [
  "Searchable photo library",
  "Logo library",
  "Icon library",
  "Campaign media storage",
  "Reusable assets",
  "Brand colors & themes",
  "Button styles & borders",
  "Reusable sections",
  "Company templates",
  "Quick-apply branding",
] as const;

export const USE_CASES = [
  {
    industry: "Taverns / Restaurants / Bars",
    tap: "Bar, booth, and restroom devices",
    opens: "Rotating happy hour & specials",
    action: "Claim coupon / join list",
    captures: "Contacts + owner notification",
  },
  {
    industry: "Smoke Shops / Specialty Retail",
    tap: "Product display discs",
    opens: "Video, product info, offers, locations",
    action: "Learn & claim deal",
    captures: "Leads + fewer staff explanations",
  },
  {
    industry: "Boutiques",
    tap: "Shelf tags",
    opens: "Outfit ideas, sizes, new arrivals",
    action: "VIP signup",
    captures: "Email list + style preferences",
  },
  {
    industry: "Trade Shows",
    tap: "Booth signs",
    opens: "Product demos & stories",
    action: "Lead capture",
    captures: "Contacts + follow-up email + CSV",
  },
  {
    industry: "Salons / Med Spas",
    tap: "Counter & mirror cards",
    opens: "Booking + review + offer",
    action: "Book / review",
    captures: "Appointments + reputation",
  },
  {
    industry: "Real Estate",
    tap: "Yard signs & lockboxes",
    opens: "Listing story + agent card",
    action: "Save contact / tour request",
    captures: "Buyer leads",
  },
  {
    industry: "Pet Businesses",
    tap: "Collar tags & store displays",
    opens: "Profile, services, offers",
    action: "Book / join list",
    captures: "Owners & loyalty",
  },
  {
    industry: "Gyms / Studios",
    tap: "Front desk & class boards",
    opens: "Class schedule + trial offer",
    action: "VIP / trial signup",
    captures: "Leads + branded email",
  },
  {
    industry: "Food Trucks / Markets",
    tap: "Window & menu signs",
    opens: "Today’s specials",
    action: "Join SMS/email list",
    captures: "Repeat-visit contacts",
  },
  {
    industry: "Venues / Events",
    tap: "Table tents & entry signs",
    opens: "Schedule, maps, VIP",
    action: "Add calendar / signup",
    captures: "Attendee data",
  },
  {
    industry: "Multi-Location Retail",
    tap: "Shelf & review stations",
    opens: "Location-specific offers",
    action: "Claim / review",
    captures: "Per-store analytics",
  },
  {
    industry: "Nonprofits",
    tap: "Event & donation signs",
    opens: "Story + donate + volunteer",
    action: "Give / join",
    captures: "Supporters + follow-up",
  },
] as const;

export type PricingTierId = "basic" | "studio" | "pro" | "growth" | "enterprise";

export const PRICING_PREVIEW = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "$19",
    blurb: "For individuals or simple tap profiles.",
    featured: false,
    recommended: false,
    features: [
      "1 TapConnect profile/card",
      "3 mini pages",
      "Basic QR/tap page",
      "Basic analytics",
    ],
  },
  {
    id: "studio" as const,
    name: "Studio",
    price: "$49",
    blurb: "For small businesses starting with campaigns.",
    featured: false,
    recommended: false,
    features: [
      "10 active devices",
      "10 active campaigns",
      "Workbench",
      "Templates",
      "Lead capture",
      "Coupons / offers",
      "Basic analytics",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$99",
    blurb: "For serious retail and active campaigns.",
    featured: true,
    recommended: true,
    features: [
      "50 active devices",
      "50 active campaigns",
      "Tap Device Manager",
      "Scan mode",
      "Contact collector",
      "Branded emails",
      "Archive / republish",
      "Lead export",
      "Advanced analytics",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: "$199",
    blurb: "For multi-location or high-volume businesses.",
    featured: false,
    recommended: false,
    features: [
      "150 active devices",
      "Multi-location",
      "Team users",
      "Advanced analytics",
      "Campaign scheduling",
      "Priority support",
      "Future email campaign access",
    ],
  },
] as const;

export type CompareValue = boolean | string;

export type CompareRow = {
  feature: string;
  basic: CompareValue;
  studio: CompareValue;
  pro: CompareValue;
  growth: CompareValue;
  enterprise: CompareValue;
};

export type CompareGroup = {
  title: string;
  rows: CompareRow[];
};

export const FEATURE_COMPARISON: CompareGroup[] = [
  {
    title: "Core TapConnect",
    rows: [
      { feature: "TapConnect profile / card", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Custom branding", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "vCard download", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Social links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Map / directions", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Google review link", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "QR support", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "NFC support", basic: true, studio: true, pro: true, growth: true, enterprise: true },
    ],
  },
  {
    title: "Campaign Builder",
    rows: [
      { feature: "Mini pages", basic: "3", studio: "10", pro: "50", growth: "150+", enterprise: "Custom" },
      { feature: "Campaign Workbench", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Templates", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Drag / drop blocks", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Copy / paste blocks", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Clone campaigns", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Archived campaign cloning", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Mobile preview", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "AI campaign builder", basic: false, studio: "Limited", pro: true, growth: true, enterprise: true },
      { feature: "AI rewrite tools", basic: false, studio: "Limited", pro: true, growth: true, enterprise: true },
      { feature: "Scheduled publishing", basic: false, studio: false, pro: true, growth: true, enterprise: true },
    ],
  },
  {
    title: "Tap Devices",
    rows: [
      { feature: "Active device slots", basic: "1", studio: "10", pro: "50", growth: "150", enterprise: "Custom" },
      { feature: "Device profiles", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Stable tap URLs", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Device assignment history", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Statuses: active / lost / closed / replaced", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Remote staff scan", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Desktop + phone scan mode", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Device analytics", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Replacement tag workflow", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Verified secure tags", basic: "Add-on", studio: "Add-on", pro: "Add-on", growth: "Add-on", enterprise: "Custom" },
    ],
  },
  {
    title: "Campaign Automation",
    rows: [
      { feature: "Campaign groups", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Scheduled offers", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Day / time rotation", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "No-active-offer fallback", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Location-specific campaigns", basic: false, studio: false, pro: "Limited", growth: true, enterprise: true },
      { feature: "Recurring campaigns", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Publish / pause / complete / archive", basic: false, studio: true, pro: true, growth: true, enterprise: true },
    ],
  },
  {
    title: "Content Blocks",
    rows: [
      { feature: "Video embeds", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Image galleries", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Product story blocks", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Offer / coupon blocks", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Contact collector", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Feedback forms", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Review links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "vCard", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Maps", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "FAQ", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Age gate / disclaimers", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Event blocks", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Photo upload", basic: false, studio: "Limited", pro: true, growth: true, enterprise: true },
      { feature: "E-commerce link", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Menu / specials", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Product comparison", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Staff notes", basic: false, studio: false, pro: true, growth: true, enterprise: true },
    ],
  },
  {
    title: "Customer Capture",
    rows: [
      { feature: "Contact collector", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Lead dashboard", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Coupon claim tracking", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Owner notifications", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Branded auto-reply emails", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "CSV export", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Customer notes / tags", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Future email campaigns", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Included path", enterprise: "Custom" },
      { feature: "Future SMS campaigns", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Add-on", enterprise: "Custom" },
    ],
  },
  {
    title: "Media and Branding",
    rows: [
      { feature: "Searchable photo library", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Logo library", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Icon library", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Brand kit", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Custom colors", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Borders / styles", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Reusable blocks", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Company templates", basic: false, studio: false, pro: true, growth: true, enterprise: true },
    ],
  },
  {
    title: "Analytics",
    rows: [
      { feature: "Tap analytics", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Campaign analytics", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Device analytics", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Location analytics", basic: false, studio: false, pro: "Limited", growth: true, enterprise: true },
      { feature: "CTA click tracking", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Review click tracking", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Coupon claim tracking", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Lead conversion tracking", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Inactive device alerts", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Advanced reports", basic: false, studio: false, pro: "Limited", growth: true, enterprise: "Custom" },
    ],
  },
  {
    title: "Team and Locations",
    rows: [
      { feature: "Team users", basic: "1", studio: "2", pro: "5", growth: "15", enterprise: "Custom" },
      { feature: "Staff scanner role", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Manager / marketing roles", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Multi-location", basic: false, studio: false, pro: "Limited", growth: true, enterprise: true },
      { feature: "Location-specific dashboards", basic: false, studio: false, pro: false, growth: true, enterprise: true },
      { feature: "Location-specific schedules", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Agency / white-label", basic: false, studio: false, pro: false, growth: "Coming soon", enterprise: "Custom" },
    ],
  },
  {
    title: "Support and Setup",
    rows: [
      { feature: "Email support", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Priority support", basic: false, studio: false, pro: false, growth: true, enterprise: true },
      { feature: "Premium setup option", basic: "Add-on", studio: "Add-on", pro: "Add-on", growth: "Add-on", enterprise: "Included" },
      { feature: "Device packs", basic: "Sold separately", studio: "Sold separately", pro: "Sold separately", growth: "Sold separately", enterprise: "Custom" },
      { feature: "On-metal tags", basic: "Add-on", studio: "Add-on", pro: "Add-on", growth: "Add-on", enterprise: "Custom" },
      { feature: "Verified tags", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Coming soon", enterprise: "Custom" },
      { feature: "Custom integrations", basic: false, studio: false, pro: false, growth: "Limited", enterprise: "Custom" },
    ],
  },
];

export const FAQS = [
  {
    q: "Is Studio just a digital business card?",
    a: "No. TapConnect started as a smart card. Studio is a full tap-to-campaign platform — Workbench, device manager, scheduled offers, contact collectors, branded emails, and analytics.",
  },
  {
    q: "Do visitors need an app?",
    a: "Never. They tap or scan and your mini-page opens in their browser instantly.",
  },
  {
    q: "Do I rewrite the NFC tag when content changes?",
    a: "No. Each device has a stable URL. The dashboard controls what that URL displays — reassign, schedule, or archive anytime.",
  },
  {
    q: "Can one device rotate different offers?",
    a: "Yes. Campaign groups schedule day/time rotations. If nothing is active, visitors see a branded fallback.",
  },
  {
    q: "What happens when someone submits a contact?",
    a: "You get the lead (and can export CSV on Pro+). They can receive a branded offer email. Owners can be notified when a contact is created.",
  },
] as const;
