export type OutputProfileClass = "tapconnect" | "social" | "print" | "screen" | "custom";
export type OutputUnit = "px" | "in" | "mm";

export type OutputProfile = Readonly<{
  id: string;
  label: string;
  class: OutputProfileClass;
  width: number;
  height: number;
  unit: OutputUnit;
  dpi?: number;
  version: string;
  source: string;
  allowsMultiplePages: boolean;
  functional: boolean;
}>;

export const OUTPUT_PROFILE_REGISTRY_VERSION = "2026-08-03";

export const OUTPUT_PROFILES: readonly OutputProfile[] = [
  profile("tap-card-responsive", "Tap Card — responsive", "tapconnect", 390, 844, "px", false, true),
  profile("campaign-creative", "Campaign creative — 1080 × 1350 px", "tapconnect", 1080, 1350, "px", true, true),
  profile("email-creative", "Email creative — 600 × 900 px", "tapconnect", 600, 900, "px", true, true),
  profile("coupon", "Coupon — 1200 × 600 px", "tapconnect", 1200, 600, "px", true, true),
  profile("ticket", "Ticket — 1800 × 600 px", "tapconnect", 1800, 600, "px", true, true),
  profile("qr-deployment", "QR deployment — 1080 × 1080 px", "tapconnect", 1080, 1080, "px", true, true),
  profile("social-square", "Social square — 1080 × 1080 px", "social", 1080, 1080, "px", true, false),
  profile("social-portrait", "Social portrait — 1080 × 1350 px", "social", 1080, 1350, "px", true, false),
  profile("social-story", "Story / Reel — 1080 × 1920 px", "social", 1080, 1920, "px", true, false),
  profile("social-landscape", "Social landscape — 1200 × 630 px", "social", 1200, 630, "px", true, false),
  profile("us-letter", "US Letter — 8.5 × 11 in", "print", 8.5, 11, "in", true, false, 300),
  profile("a4", "A4 — 210 × 297 mm", "print", 210, 297, "mm", true, false, 300),
  profile("presentation-wide", "Presentation — 1920 × 1080 px", "screen", 1920, 1080, "px", true, false),
  profile("phone-wallpaper", "Phone wallpaper — 1080 × 1920 px", "screen", 1080, 1920, "px", true, false),
] as const;

function profile(
  id: string,
  label: string,
  profileClass: OutputProfileClass,
  width: number,
  height: number,
  unit: OutputUnit,
  allowsMultiplePages: boolean,
  functional: boolean,
  dpi?: number
): OutputProfile {
  return Object.freeze({
    id,
    label,
    class: profileClass,
    width,
    height,
    unit,
    dpi,
    version: OUTPUT_PROFILE_REGISTRY_VERSION,
    source: "TapConnect governed output registry",
    allowsMultiplePages,
    functional,
  });
}

export type CreativeDocumentType =
  | "tap_card"
  | "campaign_creative"
  | "email"
  | "coupon"
  | "ticket"
  | "wallet"
  | "form"
  | "qr_deployment"
  | "social"
  | "flyer"
  | "poster"
  | "custom";

export function canResizeCurrentDocument(
  documentType: CreativeDocumentType,
  target: OutputProfile
): boolean {
  if (documentType === "tap_card") return target.id === "tap-card-responsive";
  return true;
}

export function requireResizeAllowed(
  documentType: CreativeDocumentType,
  target: OutputProfile
): void {
  if (!canResizeCurrentDocument(documentType, target)) {
    throw new Error("Tap Cards are governed responsive documents. Create a related editable variation instead.");
  }
}

