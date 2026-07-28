/**
 * Shared Studio zone-token contract.
 * Zone colors tell the host where they are — never encode product state,
 * never replace green GO, never paint host Brand into the Studio shell.
 */

export type StudioZoneId =
  | "card"
  | "brand"
  | "campaign"
  | "email"
  | "audience"
  | "service"
  | "autopilot"
  | "insights"
  | "integrations"
  | "tap_points"
  | "settings"
  | "home";

export type ZoneTokenSet = {
  id: StudioZoneId;
  label: string;
  role: string;
  /** CSS class applied to page-edge atmosphere hosts */
  atmosphereClass: string;
  /** Semantic CSS variable prefix (e.g. --zone-card) */
  cssPrefix: string;
  /** Restrained rail/active accent hint (oklch string for docs/tests) */
  railAccent: string;
  labelColor: string;
  mutedBorder: string;
  iconAccent: string;
};

/** Action / status tokens — independent of zone atmosphere */
export const STUDIO_ACTION_TOKENS = {
  goAction: "var(--studio-go)",
  goForeground: "var(--studio-go-fg)",
  secondaryAction: "var(--studio-secondary)",
  statusOk: "var(--studio-status-ok)",
  statusWarn: "var(--studio-status-warn)",
  statusCritical: "var(--studio-status-critical)",
  statusInfo: "var(--studio-status-info)",
  statusNeutral: "var(--studio-status-neutral)",
} as const;

export const ZONE_TOKENS: Record<StudioZoneId, ZoneTokenSet> = {
  home: {
    id: "home",
    label: "Home",
    role: "Card command center",
    atmosphereClass: "zone-home",
    cssPrefix: "--zone-home",
    railAccent: "oklch(0.72 0.04 95)",
    labelColor: "oklch(0.88 0.03 95)",
    mutedBorder: "oklch(0.45 0.02 95 / 0.35)",
    iconAccent: "oklch(0.78 0.05 95)",
  },
  card: {
    id: "card",
    label: "Card",
    role: "Central relationship hub",
    atmosphereClass: "zone-card",
    cssPrefix: "--zone-card",
    railAccent: "oklch(0.78 0.04 95)",
    labelColor: "oklch(0.9 0.03 95)",
    mutedBorder: "oklch(0.5 0.02 95 / 0.35)",
    iconAccent: "oklch(0.82 0.06 130)",
  },
  brand: {
    id: "brand",
    label: "Brand",
    role: "Identity and visual system",
    atmosphereClass: "zone-brand",
    cssPrefix: "--zone-brand",
    railAccent: "oklch(0.72 0.05 25)",
    labelColor: "oklch(0.86 0.04 25)",
    mutedBorder: "oklch(0.5 0.03 25 / 0.35)",
    iconAccent: "oklch(0.78 0.05 35)",
  },
  campaign: {
    id: "campaign",
    label: "Campaign",
    role: "Activation and conversion",
    atmosphereClass: "zone-campaign",
    cssPrefix: "--zone-campaign",
    railAccent: "oklch(0.62 0.07 85)",
    labelColor: "oklch(0.82 0.05 85)",
    mutedBorder: "oklch(0.48 0.04 85 / 0.4)",
    iconAccent: "oklch(0.7 0.08 80)",
  },
  email: {
    id: "email",
    label: "Email",
    role: "Prepared communication and reply routing",
    atmosphereClass: "zone-email",
    cssPrefix: "--zone-email",
    railAccent: "oklch(0.62 0.05 250)",
    labelColor: "oklch(0.82 0.04 250)",
    mutedBorder: "oklch(0.48 0.03 250 / 0.4)",
    iconAccent: "oklch(0.68 0.06 245)",
  },
  audience: {
    id: "audience",
    label: "Audience",
    role: "Memory, consent, eligibility, and customer context",
    atmosphereClass: "zone-audience",
    cssPrefix: "--zone-audience",
    railAccent: "oklch(0.6 0.05 255)",
    labelColor: "oklch(0.8 0.04 255)",
    mutedBorder: "oklch(0.46 0.03 255 / 0.4)",
    iconAccent: "oklch(0.66 0.06 255)",
  },
  service: {
    id: "service",
    label: "Service",
    role: "Service handling, support, and resolution",
    atmosphereClass: "zone-service",
    cssPrefix: "--zone-service",
    railAccent: "oklch(0.58 0.05 40)",
    labelColor: "oklch(0.8 0.04 40)",
    mutedBorder: "oklch(0.45 0.03 40 / 0.4)",
    iconAccent: "oklch(0.64 0.06 35)",
  },
  autopilot: {
    id: "autopilot",
    label: "Autopilot",
    role: "Prepared work, recommendations, and orchestration",
    atmosphereClass: "zone-autopilot",
    cssPrefix: "--zone-autopilot",
    railAccent: "oklch(0.55 0.04 160)",
    labelColor: "oklch(0.78 0.04 160)",
    mutedBorder: "oklch(0.42 0.03 160 / 0.4)",
    iconAccent: "oklch(0.62 0.05 155)",
  },
  insights: {
    id: "insights",
    label: "Insights",
    role: "Evidence, attribution, and proof",
    atmosphereClass: "zone-insights",
    cssPrefix: "--zone-insights",
    railAccent: "oklch(0.58 0.06 195)",
    labelColor: "oklch(0.8 0.04 195)",
    mutedBorder: "oklch(0.45 0.03 195 / 0.4)",
    iconAccent: "oklch(0.66 0.06 195)",
  },
  integrations: {
    id: "integrations",
    label: "Integrations",
    role: "External connection and handoff",
    atmosphereClass: "zone-integrations",
    cssPrefix: "--zone-integrations",
    railAccent: "oklch(0.6 0.05 55)",
    labelColor: "oklch(0.82 0.04 55)",
    mutedBorder: "oklch(0.46 0.03 55 / 0.4)",
    iconAccent: "oklch(0.68 0.06 50)",
  },
  tap_points: {
    id: "tap_points",
    label: "Tap Points",
    role: "Physical/digital entry and fleet health",
    atmosphereClass: "zone-tap-points",
    cssPrefix: "--zone-tap-points",
    railAccent: "oklch(0.62 0.06 230)",
    labelColor: "oklch(0.82 0.04 230)",
    mutedBorder: "oklch(0.46 0.03 230 / 0.4)",
    iconAccent: "oklch(0.7 0.07 220)",
  },
  settings: {
    id: "settings",
    label: "Settings",
    role: "Configuration, permissions, readiness, and trust",
    atmosphereClass: "zone-settings",
    cssPrefix: "--zone-settings",
    railAccent: "oklch(0.7 0.02 250)",
    labelColor: "oklch(0.84 0.01 250)",
    mutedBorder: "oklch(0.5 0.01 250 / 0.35)",
    iconAccent: "oklch(0.74 0.02 250)",
  },
};

export function resolveZoneTokens(zone: StudioZoneId): ZoneTokenSet {
  return ZONE_TOKENS[zone];
}

export function zoneAtmosphereClass(zone: StudioZoneId): string {
  return ZONE_TOKENS[zone].atmosphereClass;
}

/** Map primary Studio destinations to zone atmosphere (nav restraint: active only). */
export function zoneForStudioDestination(
  destinationId: string
): StudioZoneId | null {
  switch (destinationId) {
    case "home":
      return "home";
    case "experiences":
      return "card";
    case "tap_points":
      return "tap_points";
    case "audience":
      return "audience";
    case "insights":
      return "insights";
    case "assets":
      return "brand";
    case "settings":
      return "settings";
    default:
      return null;
  }
}

/** Contrast pairs for zone labels vs dark studio background (deterministic). */
export const ZONE_CONTRAST_PAIRS = [
  { id: "zone_label_on_bg", fg: "#e8e4dc", bg: "#0b0f19", minRatio: 4.5 },
  { id: "body_on_bg", fg: "#c8cdd8", bg: "#0b0f19", minRatio: 4.5 },
  { id: "secondary_on_bg", fg: "#9aa3b5", bg: "#0b0f19", minRatio: 3 },
  { id: "go_on_dark", fg: "#0b0f19", bg: "#84cc16", minRatio: 4.5 },
  { id: "status_warn", fg: "#fde68a", bg: "#0b0f19", minRatio: 4.5 },
  { id: "status_critical", fg: "#fecaca", bg: "#0b0f19", minRatio: 4.5 },
  { id: "nav_active", fg: "#a3e635", bg: "#0b0f19", minRatio: 4.5 },
] as const;
