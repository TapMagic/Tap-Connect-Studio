/**
 * Versioned TapConnect starter creative library.
 * Future design packs append collections without changing editor kernels.
 */

export const STARTER_PRESET_PACK = {
  id: "tapconnect-starter",
  version: 1,
  label: "TapConnect Starter",
} as const;

export type StarterTextCombination = {
  id: string;
  label: string;
  structure: string;
  style: string;
  lines: Array<{ text: string; fontSize: number; fontWeight: number; fontFamily?: string; letterSpacingEm?: number; yOffset?: number }>;
  effects?: Record<string, unknown>;
};

export const STARTER_TEXT_COMBINATIONS: readonly StarterTextCombination[] = [
  {
    id: "editorial-serif",
    label: "Editorial serif",
    structure: "small kicker + large serif display",
    style: "linear-gradient(135deg,#f8fafc,#cbd5e1)",
    lines: [
      { text: "The", fontSize: 15, fontWeight: 500, fontFamily: '"Playfair Display", Georgia, serif', letterSpacingEm: 0.18 },
      { text: "EDIT", fontSize: 42, fontWeight: 700, fontFamily: '"Playfair Display", Georgia, serif' },
    ],
  },
  {
    id: "script-plus-sans",
    label: "Script plus sans",
    structure: "script overline + bold sans stack",
    style: "linear-gradient(135deg,#fbcfe8,#fb7185)",
    lines: [
      { text: "made with", fontSize: 18, fontWeight: 500, fontFamily: '"Great Vibes", cursive' },
      { text: "LOVE", fontSize: 36, fontWeight: 900, fontFamily: '"Montserrat", sans-serif', letterSpacingEm: 0.12 },
    ],
  },
  {
    id: "bold-stacked-retail",
    label: "Bold stacked retail",
    structure: "tight stacked condensed retail hierarchy",
    style: "linear-gradient(135deg,#ff7a18,#ef233c)",
    lines: [
      { text: "TODAY ONLY", fontSize: 14, fontWeight: 800, fontFamily: '"Oswald", sans-serif', letterSpacingEm: 0.2 },
      { text: "BIG", fontSize: 40, fontWeight: 900, fontFamily: '"Oswald", sans-serif' },
      { text: "SAVINGS", fontSize: 34, fontWeight: 900, fontFamily: '"Oswald", sans-serif' },
    ],
  },
  {
    id: "outlined-sport",
    label: "Outlined sport",
    structure: "outlined display + solid accent word",
    style: "linear-gradient(135deg,#22c55e,#facc15)",
    lines: [
      { text: "GAME", fontSize: 20, fontWeight: 800, fontFamily: '"Bebas Neue", sans-serif', letterSpacingEm: 0.16 },
      { text: "DAY", fontSize: 48, fontWeight: 900, fontFamily: '"Bebas Neue", sans-serif' },
    ],
    effects: { stroke: "#ffffff", strokeWidth: 2, fill: "transparent" },
  },
  {
    id: "neon",
    label: "Neon",
    structure: "glowing condensed neon pair",
    style: "linear-gradient(135deg,#67e8f9,#c084fc)",
    lines: [
      { text: "CREATING", fontSize: 15, fontWeight: 700, fontFamily: '"Orbitron", sans-serif' },
      { text: "MAGIC", fontSize: 38, fontWeight: 900, fontFamily: '"Orbitron", sans-serif' },
    ],
    effects: { glow: 18, color: "#67e8f9" },
  },
  {
    id: "beveled-dimensional",
    label: "Beveled dimensional",
    structure: "embossed dimensional headline stack",
    style: "linear-gradient(180deg,#ffffff,#94a3b8 45%,#334155)",
    lines: [
      { text: "DEPTH", fontSize: 18, fontWeight: 700, fontFamily: '"Roboto Slab", serif' },
      { text: "LAYER", fontSize: 36, fontWeight: 900, fontFamily: '"Roboto Slab", serif' },
    ],
    effects: { materialPreset: "embossed", shadow: 12 },
  },
  {
    id: "luxury-minimal",
    label: "Luxury minimal",
    structure: "wide tracking micro + single luxury word",
    style: "linear-gradient(135deg,#d4af37,#fff4b0)",
    lines: [
      { text: "THE", fontSize: 12, fontWeight: 500, fontFamily: '"Cormorant Garamond", serif', letterSpacingEm: 0.45 },
      { text: "SIGNATURE", fontSize: 30, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif', letterSpacingEm: 0.28 },
    ],
  },
  {
    id: "playful-offset",
    label: "Playful offset composition",
    structure: "offset staggered playful pair",
    style: "linear-gradient(135deg,#fde047,#f472b6)",
    lines: [
      { text: "SUPER", fontSize: 22, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', yOffset: -0.02 },
      { text: "FUN!", fontSize: 40, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', yOffset: 0.04 },
    ],
  },
  {
    id: "retro-layered",
    label: "Retro layered shadow",
    structure: "retro display with layered drop shadow stack",
    style: "linear-gradient(135deg,#fb7185,#fbbf24)",
    lines: [
      { text: "RETRO", fontSize: 18, fontWeight: 700, fontFamily: '"Righteous", sans-serif', letterSpacingEm: 0.2 },
      { text: "NIGHTS", fontSize: 40, fontWeight: 900, fontFamily: '"Righteous", sans-serif' },
    ],
    effects: { shadow: 10, layeredShadow: true },
  },
  {
    id: "wedding-elegant",
    label: "Wedding elegant",
    structure: "delicate script names over thin serif date",
    style: "linear-gradient(135deg,#fdf2f8,#e7e5e4)",
    lines: [
      { text: "Ava & Noah", fontSize: 34, fontWeight: 500, fontFamily: '"Great Vibes", cursive' },
      { text: "celebrate with us", fontSize: 14, fontWeight: 400, fontFamily: '"Cormorant Garamond", serif', letterSpacingEm: 0.22 },
    ],
  },
  {
    id: "professional-business",
    label: "Professional business",
    structure: "tight sans kicker + confident business headline",
    style: "linear-gradient(135deg,#e2e8f0,#94a3b8)",
    lines: [
      { text: "CONSULTING", fontSize: 12, fontWeight: 700, fontFamily: '"Inter", sans-serif', letterSpacingEm: 0.28 },
      { text: "Clarity that converts", fontSize: 26, fontWeight: 650, fontFamily: '"Source Sans 3", sans-serif' },
    ],
  },
  {
    id: "restaurant-promo",
    label: "Restaurant promotion",
    structure: "menu-style serif dish + sans price callout",
    style: "linear-gradient(135deg,#fde68a,#b45309)",
    lines: [
      { text: "Tonight's Special", fontSize: 16, fontWeight: 600, fontFamily: '"Playfair Display", Georgia, serif' },
      { text: "Chef's tasting · $48", fontSize: 22, fontWeight: 700, fontFamily: '"Montserrat", sans-serif' },
    ],
  },
  {
    id: "event-announcement",
    label: "Event announcement",
    structure: "date block + condensed event title",
    style: "linear-gradient(135deg,#38bdf8,#6366f1)",
    lines: [
      { text: "SAT · 8PM", fontSize: 14, fontWeight: 800, fontFamily: '"Oswald", sans-serif', letterSpacingEm: 0.16 },
      { text: "OPEN HOUSE", fontSize: 34, fontWeight: 900, fontFamily: '"Oswald", sans-serif' },
    ],
  },
] as const;

export const STARTER_BUTTON_PRESETS = [
  { id: "minimal", label: "Minimal", props: { presentation: "rounded", radius: 8, fill: "transparent", borderWidth: 1, borderColor: "#e2e8f0", labelColor: "#f8fafc", label: "Continue" } },
  { id: "outlined", label: "Outlined", props: { presentation: "rounded", radius: 12, fill: "transparent", borderWidth: 2, borderColor: "#b8ff2c", labelColor: "#b8ff2c", label: "Visit website", actionType: "website" } },
  { id: "pill", label: "Pill", props: { presentation: "pill", radius: 999, fill: "#b8ff2c", labelColor: "#07100a", label: "Claim offer", actionType: "coupon" } },
  { id: "round-icon", label: "Round Icon", props: { presentation: "circle", radius: 999, fill: "#111827", borderWidth: 2, borderColor: "#b8ff2c", icon: "phone", iconPosition: "before", label: "Call", labelColor: "#b8ff2c", actionType: "call" } },
  { id: "glass", label: "Glass", props: { presentation: "rounded", radius: 20, buttonSurfaceKind: "gradient", gradientStart: "#ffffff3d", gradientEnd: "#ffffff0a", borderWidth: 1, borderColor: "#ffffff80", label: "Directions", actionType: "directions" } },
  { id: "high-gloss", label: "High gloss", props: { presentation: "pill", radius: 999, buttonSurfaceKind: "gradient", gradientStart: "#f97316", gradientEnd: "#dc2626", shine: true, label: "Shop now", actionType: "website" } },
  { id: "metallic", label: "Metallic", props: { presentation: "rounded", radius: 10, buttonSurfaceKind: "gradient", gradientStart: "#e5e7eb", gradientEnd: "#64748b", labelColor: "#0f172a", label: "Add to wallet", actionType: "wallet" } },
  { id: "neon", label: "Neon", props: { presentation: "pill", radius: 999, fill: "#111827", borderWidth: 2, borderColor: "#67e8f9", labelColor: "#67e8f9", boxGlow: 18, glowColor: "#67e8f9", label: "RSVP now", actionType: "rsvp" } },
] as const;

export const STARTER_BADGE_PRESETS = [
  { id: "pill", label: "Pill", props: { text: "SALE", badgeShape: "pill", radius: 999, fill: "#dc2626", color: "#ffffff" } },
  { id: "burst", label: "Burst", props: { text: "NEW", badgeShape: "burst", radius: 0, fill: "#f59e0b", color: "#111827" } },
  { id: "ribbon", label: "Ribbon", props: { text: "FEATURED", badgeShape: "ribbon", radius: 0, fill: "#7c3aed", color: "#ffffff" } },
  { id: "seal", label: "Seal", props: { text: "APPROVED", badgeShape: "seal", radius: 999, fill: "linear-gradient(120deg,#8a5a00,#ffe169,#b77900)", color: "#17100a" } },
  { id: "shield", label: "Shield", props: { text: "TRUSTED", badgeShape: "shield", radius: 0, fill: "#0f766e", color: "#ecfdf5" } },
  { id: "neon", label: "Neon", props: { text: "LIVE", badgeShape: "pill", radius: 999, fill: "#111827", color: "#67e8f9", borderWidth: 2, borderColor: "#67e8f9", boxGlow: 16 } },
  { id: "metallic", label: "Metallic", props: { text: "VIP", badgeShape: "rounded", radius: 14, fill: "linear-gradient(120deg,#64748b,#ffffff 50%,#64748b)", color: "#111827" } },
  { id: "glass", label: "Glass", props: { text: "OPEN", badgeShape: "rounded", radius: 16, fill: "#ffffff24", color: "#ffffff", borderWidth: 1, borderColor: "#ffffff66" } },
] as const;

export type StarterCommerceLayout = {
  id: string;
  label: string;
  layout: string;
  geometry: "retail_card" | "perforated_stub" | "split_image" | "qr_first" | "admission_stub" | "vip_pass" | "raffle" | "wallet_pass";
  props: Record<string, unknown>;
};

export const STARTER_COUPON_LAYOUTS: readonly StarterCommerceLayout[] = [
  { id: "clean-retail", label: "Clean retail card", layout: "stack", geometry: "retail_card", props: { presetId: "clean-retail", headline: "SPECIAL OFFER", offerValue: "20% OFF", code: "SAVE20", visualStyle: "clean retail", mask: "coupon", layoutVariant: "retail_card", width: 0.84, height: 0.28 } },
  { id: "perforated-stub", label: "Perforated coupon stub", layout: "row", geometry: "perforated_stub", props: { presetId: "perforated-stub", headline: "TEAR HERE", offerValue: "$10 OFF", code: "TEAR10", visualStyle: "ticket stub", mask: "coupon", layoutVariant: "perforated_stub", perforated: true, width: 0.88, height: 0.22 } },
  { id: "split-image", label: "Split-image promotion", layout: "row", geometry: "split_image", props: { presetId: "split-image", headline: "LOOK BOOK", offerValue: "BUY 1 GET 1", code: "LOOKBOGO", visualStyle: "split promotion", mask: "coupon", layoutVariant: "split_image", showArtwork: true, width: 0.9, height: 0.32 } },
  { id: "qr-first", label: "QR-first claim card", layout: "stack", geometry: "qr_first", props: { presetId: "qr-first", headline: "SCAN TO CLAIM", offerValue: "FREE GIFT", code: "SCANME", visualStyle: "qr claim", mask: "coupon", layoutVariant: "qr_first", qrFirst: true, width: 0.72, height: 0.36 } },
] as const;

export const STARTER_TICKET_LAYOUTS: readonly StarterCommerceLayout[] = [
  { id: "admission-stub", label: "Admission stub", layout: "row", geometry: "admission_stub", props: { presetId: "admission-stub", title: "ADMIT ONE", event: "Main Event", ticketId: "GATE-001", visualStyle: "admission stub", mask: "ticket", layoutVariant: "admission_stub", stubSide: "right", width: 0.9, height: 0.24 } },
  { id: "vip-pass", label: "VIP pass", layout: "stack", geometry: "vip_pass", props: { presetId: "vip-pass", title: "VIP ACCESS", event: "VIP Lounge", ticketId: "VIP-100", visualStyle: "luxury pass", mask: "ticket", layoutVariant: "vip_pass", metallic: true, width: 0.78, height: 0.3 } },
  { id: "raffle", label: "Raffle ticket", layout: "row", geometry: "raffle", props: { presetId: "raffle", title: "LUCKY TICKET", event: "Prize Drawing", ticketId: "RAFFLE-42", visualStyle: "raffle", mask: "ticket", layoutVariant: "raffle", numbered: true, width: 0.86, height: 0.2 } },
  { id: "wallet-pass", label: "Wallet-style event pass", layout: "stack", geometry: "wallet_pass", props: { presetId: "wallet-pass", title: "EVENT PASS", event: "Tonight", ticketId: "WALLET-01", visualStyle: "wallet", mask: "ticket", layoutVariant: "wallet_pass", walletStyle: true, width: 0.7, height: 0.34 } },
] as const;

export const STARTER_DIVIDER_PRESETS = [
  { id: "solid-full", label: "Solid full width", props: { dividerStyle: "full_width", strokeWidth: 2, fill: "#ffffff66" } },
  { id: "dashed-accent", label: "Dashed short accent", props: { dividerStyle: "short_accent", borderStyle: "dashed", strokeWidth: 3, fill: "#b8ff2c", width: 0.42 } },
  { id: "ornamental", label: "Centered flourish", props: { dividerStyle: "centered_flourish", strokeWidth: 2, fill: "#f8fafc" } },
  { id: "icon-centered", label: "Icon-centered", props: { dividerStyle: "icon_centered", strokeWidth: 2, fill: "#67e8f9", icon: "sparkles" } },
] as const;

export const STARTER_FORM_PRESETS = [
  { id: "email-capture", label: "Email capture", props: { heading: "Stay in touch", fields: [{ id: "email", label: "Email", type: "email", required: true }], layout: "stack" } },
  { id: "contact-request", label: "Contact request", props: { heading: "Contact us", fields: [{ id: "name", label: "Name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: false }], layout: "stack" } },
  { id: "rsvp-lite", label: "RSVP lite", props: { heading: "RSVP", fields: [{ id: "name", label: "Name", type: "text", required: true }, { id: "guests", label: "Guests", type: "select", required: true }], layout: "stack" } },
  { id: "waitlist", label: "Waitlist", props: { heading: "Join the waitlist", fields: [{ id: "email", label: "Email", type: "email", required: true }, { id: "phone", label: "Phone", type: "tel", required: false }], layout: "stack" } },
] as const;

export const STARTER_CONTAINER_PRESETS = [
  { id: "stack-card", label: "Stack card", props: { layout: "stack", gap: 12, padding: 16, fill: "#111827", radius: 18, resizePolicy: "reflow" } },
  { id: "row-actions", label: "Row actions", props: { layout: "row", gap: 10, padding: 12, fill: "transparent", borderWidth: 1, borderColor: "#ffffff33", radius: 14, resizePolicy: "frame" } },
  { id: "glass-panel", label: "Glass panel", props: { layout: "stack", gap: 14, padding: 20, fill: "#ffffff18", radius: 22, borderWidth: 1, borderColor: "#ffffff55", resizePolicy: "reflow" } },
  { id: "media-frame", label: "Media frame", props: { layout: "free", padding: 8, fill: "#0b0f19", radius: 12, borderWidth: 2, borderColor: "#b8ff2c55", resizePolicy: "frame" } },
] as const;

export function listStarterPresetFamilies() {
  return {
    pack: STARTER_PRESET_PACK,
    text: STARTER_TEXT_COMBINATIONS.length,
    buttons: STARTER_BUTTON_PRESETS.length,
    badges: STARTER_BADGE_PRESETS.length,
    coupons: STARTER_COUPON_LAYOUTS.length,
    tickets: STARTER_TICKET_LAYOUTS.length,
    dividers: STARTER_DIVIDER_PRESETS.length,
    forms: STARTER_FORM_PRESETS.length,
    containers: STARTER_CONTAINER_PRESETS.length,
  };
}
