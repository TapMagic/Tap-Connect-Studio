/** Centralized landing + pricing copy for TapConnect Studio */

export const HERO_PILLS = [
  "Tap Devices",
  "Campaign Workbench",
  "Tap Device Manager",
  "Contact Collector",
  "Scheduled Offers",
  "Analytics",
  "Branded Emails",
] as const;

export const EVOLUTION_CARDS = [
  {
    title: "Tap Cards",
    body: "Premium profiles that launch campaigns, collectors, and offers — not just contact sharing.",
  },
  {
    title: "Campaign Workbench",
    body: "Build drafts before you know which Tap Device will run them.",
  },
  {
    title: "Smart Display Tags",
    body: "Shelf and product displays that open stories, specs, and offers on tap.",
  },
  {
    title: "Interactive Touchpoints",
    body: "Stable links behind every device — change the experience without replacing hardware.",
  },
  {
    title: "Review Stations",
    body: "Smart signs that route happy customers to reviews while the moment is warm.",
  },
  {
    title: "Contact Collectors",
    body: "Capture name, email, phone — then deliver a branded offer.",
  },
  {
    title: "Tap Device Manager",
    body: "Every Tap Device has a profile, history, status, and analytics.",
  },
  {
    title: "Scheduled Offers",
    body: "Rotate weekly promos and VIP specials automatically by day and time.",
  },
  {
    title: "Analytics",
    body: "Taps, leads, coupons, reviews, maps, and vCards — by device and campaign.",
  },
  {
    title: "Brand Library",
    body: "Photos, logos, icons, colors, and reusable brand blocks.",
  },
  {
    title: "Branded Emails",
    body: "Coupon delivery, thank-yous, and owner notifications.",
  },
  {
    title: "Multi-Location",
    body: "Location-specific schedules, devices, and offers.",
  },
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
    body: "Attach the campaign to a Tap Card, smart display tag, table tent, product display, or review sign.",
  },
  {
    n: "03",
    title: "Tap",
    body: "Customers tap and instantly open the live mobile experience — no app required.",
  },
  {
    n: "04",
    title: "Capture & Improve",
    body: "Collect contacts, coupon claims, reviews, feedback, vCards, map clicks, and analytics.",
  },
] as const;

export const WORKBENCH_FEATURES = [
  "Create from scratch or start from a template",
  "Clone active or archived campaigns",
  "Drag / drop + copy / paste blocks",
  "Draft · scheduled · live · complete · archived",
  "Searchable photo, logo & icon libraries",
  "Reusable brand styles & colors",
  "Mobile preview",
  "Campaign groups",
  "Publish now or assign later",
  "AI-assisted creation & rewrites",
] as const;

export const BOUTIQUE_SCHEDULE = [
  {
    when: "Mon–Tue",
    title: "New Arrivals Preview",
    body: "Early look at this week’s drops — same Tap Device, new campaign.",
  },
  {
    when: "Wed–Thu",
    title: "VIP 15% Off Denim",
    body: "Timed VIP window · contact claim unlocks the code.",
  },
  {
    when: "Fri–Sat",
    title: "Buy 2 Tees, Get 1 Free",
    body: "Weekend promo rotation · branded follow-up on signup.",
  },
  {
    when: "Sunday",
    title: "Branded fallback",
    body: "No active offer? Visitors still see your brand — not a dead link.",
  },
] as const;

export const DEVICE_FEATURES = [
  "Every Tap Device has a profile",
  "Stable tap link never changes",
  "Active, unassigned, lost, replaced, closed, archived",
  "Active device slot limits by plan",
  "Tap-to-manage & remote staff scan",
  "Assignment history & archived campaigns per device",
  "Device analytics",
  "Reassign without replacing the physical device",
  "Replace hardware without losing history",
] as const;

export const CARD_LAUNCHPAD_FEATURES = [
  "Open a classic TapConnect profile",
  "Launch a campaign or contact collector",
  "Deliver a special offer",
  "Link / unlink campaigns as needed",
  "Custom colors, borders, photos, logos, icons",
  "Collect contacts & export CSV",
  "Trigger branded follow-up emails",
  "Networking, sales, event, or campaign launcher",
] as const;

/** Reflects real BlockType + Tap Card capabilities; aspirational labels marked carefully */
export const BLOCK_LIBRARY_GROUPS = [
  {
    title: "Campaign blocks",
    items: [
      "Hero",
      "Video",
      "Headline",
      "Rich Text",
      "Banner",
      "Image Gallery",
      "Product Details",
      "Offer / Coupon",
      "Email Capture",
      "Feedback Form",
      "Google Review",
      "Map / Directions",
      "Button Group",
      "Social Links",
      "FAQ",
      "Age Gate",
      "Disclaimer",
      "Upcoming Schedule",
      "Digital Card",
      "vCard Download",
    ],
  },
  {
    title: "Tap Card & shared",
    items: [
      "Hero / Identity",
      "Special Offer",
      "Logo Block",
      "Action Pills",
      "Contact Collector",
      "Review Link",
      "Maps",
      "Socials",
      "Save to Contacts",
      "Custom Buttons",
    ],
  },
] as const;

export const CAPTURE_FEATURES = [
  "Contact collector — name / email / phone",
  "Source tied to campaign, device, location",
  "Special offer delivery after signup",
  "Owner notification when a contact is created",
  "Branded auto-reply email",
  "CSV downloads",
  "Customer notes & tags (roadmap)",
  "Future email & SMS campaigns",
] as const;

export const EMAIL_FEATURES = [
  "Coupon / offer auto-reply",
  "Thank-you after signup",
  "Product information follow-up",
  "Owner notifications",
  "Staff scan link email",
  "Branded logo & colors",
  "Reply-to support",
  "Campaign / source context",
  "Future email campaign expansion",
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
] as const;

export const BRAND_LIBRARY_FEATURES = [
  "Searchable photo library",
  "Logo library",
  "Icon library",
  "Campaign media storage",
  "Brand colors & themes",
  "Button styles & borders",
  "Reusable sections",
  "Company templates",
] as const;

export const USE_CASES = [
  {
    industry: "Boutiques",
    tap: "Shelf tags & fitting-room signs",
    opens: "New arrivals, VIP offers, size tips",
    action: "VIP signup / claim promo",
    captures: "Email list + offer claims",
  },
  {
    industry: "Specialty Retail",
    tap: "Product displays",
    opens: "Product story, video, details",
    action: "Learn & claim deal",
    captures: "Leads + fewer staff explanations",
  },
  {
    industry: "Salons / Med Spas",
    tap: "Counter & mirror cards",
    opens: "Booking + review + offer",
    action: "Book / leave review",
    captures: "Appointments + reputation",
  },
  {
    industry: "Restaurants / Cafés",
    tap: "Table tents & window signs",
    opens: "Specials, menu highlights, loyalty",
    action: "Join list / claim offer",
    captures: "Contacts + repeat visits",
  },
  {
    industry: "Trade Shows",
    tap: "Booth signs",
    opens: "Product demos & stories",
    action: "Lead capture",
    captures: "Contacts + follow-up email + CSV",
  },
  {
    industry: "Event Pros",
    tap: "Entry & table displays",
    opens: "Schedule, VIP, directions",
    action: "Add calendar / signup",
    captures: "Attendee data",
  },
  {
    industry: "Real Estate",
    tap: "Yard signs & open-house cards",
    opens: "Listing story + agent card",
    action: "Save contact / tour request",
    captures: "Buyer leads",
  },
  {
    industry: "Pet Businesses",
    tap: "Store displays & service cards",
    opens: "Services, offers, booking",
    action: "Book / join list",
    captures: "Owners & loyalty",
  },
  {
    industry: "Service Businesses",
    tap: "Truck magnets & counter cards",
    opens: "Quote request + reviews",
    action: "Request quote",
    captures: "Jobs leads",
  },
  {
    industry: "Venues",
    tap: "Lobby & suite signs",
    opens: "Wayfinding, VIP, events",
    action: "Signup / directions",
    captures: "Guests + preferences",
  },
  {
    industry: "Fitness / Studios",
    tap: "Front desk & class boards",
    opens: "Class schedule + trial offer",
    action: "Trial signup",
    captures: "Leads + branded email",
  },
  {
    industry: "Multi-Location Retail",
    tap: "Shelf & review stations",
    opens: "Location-specific offers",
    action: "Claim / review",
    captures: "Per-store analytics",
  },
] as const;

export type PricingTierId = "basic" | "studio" | "pro" | "growth" | "enterprise";

/** Compact pricing bullets — keep lists short for side-by-side cards */
export const PRICING_PREVIEW = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "$19",
    blurb: "Individuals & simple profiles",
    featured: false,
    recommended: false,
    features: ["1 Tap Card / profile", "3 mini pages", "Basic branding", "Basic analytics"],
  },
  {
    id: "studio" as const,
    name: "Studio",
    price: "$49",
    blurb: "Small business campaigns",
    featured: false,
    recommended: false,
    features: [
      "10 active devices",
      "10 campaigns · Workbench",
      "Templates + capture",
      "Offers / coupons",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$99",
    blurb: "Serious retail & ops",
    featured: true,
    recommended: true,
    features: [
      "50 devices · 50 campaigns",
      "Device manager + scan",
      "Groups + scheduled offers",
      "Branded emails + CSV export",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: "$199",
    blurb: "Multi-location scale",
    featured: false,
    recommended: false,
    features: [
      "150 active devices",
      "Multi-location + teams",
      "Advanced analytics",
      "Priority support",
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
      { feature: "Tap Card / Profile", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Custom branding", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "vCard / Save to contacts", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Social links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Map / directions", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Review links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Tap Devices (interactive touchpoints)", basic: true, studio: true, pro: true, growth: true, enterprise: true },
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
      { feature: "Clone archived campaigns", basic: false, studio: false, pro: true, growth: true, enterprise: true },
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
      { feature: "Stable tap links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Device assignment history", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Statuses: active / lost / closed / replaced", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Remote staff scan", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Desktop + phone scan mode", basic: false, studio: false, pro: true, growth: true, enterprise: true },
      { feature: "Device analytics", basic: "Basic", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Replacement device workflow", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Verified / premium devices", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Coming soon", enterprise: "Custom" },
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
      { feature: "Product story / details", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Offer / coupon blocks", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Contact collector", basic: "Limited", studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Feedback forms", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Review links", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "vCard", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Maps", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "FAQ", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Age gate / disclaimers", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Event / upcoming schedule", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Digital card block", basic: false, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "E-commerce / custom buttons", basic: true, studio: true, pro: true, growth: true, enterprise: true },
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
      { feature: "Customer notes / tags", basic: false, studio: false, pro: "Coming soon", growth: "Coming soon", enterprise: "Custom" },
      { feature: "Future email campaigns", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Included path", enterprise: "Custom" },
      { feature: "Future SMS campaigns", basic: "Coming soon", studio: "Coming soon", pro: "Coming soon", growth: "Add-on", enterprise: "Custom" },
    ],
  },
  {
    title: "Media / Branding",
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
    title: "Team / Locations",
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
    title: "Support / Add-ons",
    rows: [
      { feature: "Email support", basic: true, studio: true, pro: true, growth: true, enterprise: true },
      { feature: "Priority support", basic: false, studio: false, pro: false, growth: true, enterprise: true },
      { feature: "Premium setup", basic: "Add-on", studio: "Add-on", pro: "Add-on", growth: "Add-on", enterprise: "Included" },
      { feature: "Device packs", basic: "Sold separately", studio: "Sold separately", pro: "Sold separately", growth: "Sold separately", enterprise: "Custom" },
      { feature: "Custom integrations", basic: false, studio: false, pro: false, growth: "Limited", enterprise: "Custom" },
    ],
  },
];

export const FAQS = [
  {
    q: "Is Studio just a digital business card?",
    a: "No. TapConnect started as a smart card. Studio is a full tap-to-campaign platform — Workbench, Tap Device Manager, scheduled offers, contact collectors, branded emails, and analytics.",
  },
  {
    q: "Do visitors need an app?",
    a: "Never. They tap and your mini-page opens in their browser instantly.",
  },
  {
    q: "Do I replace the physical device when content changes?",
    a: "No. Each Tap Device has a stable link. The dashboard controls what that link displays — reassign, schedule, or archive anytime.",
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
