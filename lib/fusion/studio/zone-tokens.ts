/**
 * Shared Studio zone-token contract.
 * Zone colors tell the host where they are — never encode product state,
 * never replace green GO, never paint host Brand into the Studio shell.
 *
 * Owner calibration: chroma/edge strength raised for normal-brightness distinction.
 */

export type StudioZoneId =
  | "card"
  | "brand"
  | "assets"
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
  /** Crisp illuminated edge for premium surfaces */
  neonEdge: string;
  /** Soft ambient bloom */
  bloom: string;
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
    railAccent: "oklch(0.78 0.07 95)",
    labelColor: "oklch(0.92 0.04 95)",
    mutedBorder: "oklch(0.55 0.03 95 / 0.45)",
    iconAccent: "oklch(0.84 0.07 95)",
    neonEdge: "oklch(0.86 0.08 95 / 0.75)",
    bloom: "oklch(0.78 0.07 95 / 0.28)",
  },
  card: {
    id: "card",
    label: "Card",
    role: "Central relationship hub",
    atmosphereClass: "zone-card",
    cssPrefix: "--zone-card",
    railAccent: "oklch(0.82 0.06 95)",
    labelColor: "oklch(0.94 0.03 95)",
    mutedBorder: "oklch(0.58 0.03 95 / 0.45)",
    iconAccent: "oklch(0.86 0.08 130)",
    neonEdge: "oklch(0.9 0.06 95 / 0.8)",
    bloom: "oklch(0.82 0.06 95 / 0.32)",
  },
  brand: {
    id: "brand",
    label: "Brand",
    role: "Identity, voice, and visual system",
    atmosphereClass: "zone-brand",
    cssPrefix: "--zone-brand",
    railAccent: "oklch(0.74 0.1 28)",
    labelColor: "oklch(0.9 0.07 28)",
    mutedBorder: "oklch(0.55 0.06 28 / 0.5)",
    iconAccent: "oklch(0.82 0.1 35)",
    neonEdge: "oklch(0.84 0.12 30 / 0.85)",
    bloom: "oklch(0.74 0.1 28 / 0.34)",
  },
  assets: {
    id: "assets",
    label: "Assets",
    role: "Reusable media, content, and creative library",
    atmosphereClass: "zone-assets",
    cssPrefix: "--zone-assets",
    railAccent: "oklch(0.62 0.14 295)",
    labelColor: "oklch(0.86 0.1 295)",
    mutedBorder: "oklch(0.5 0.1 295 / 0.55)",
    iconAccent: "oklch(0.78 0.14 300)",
    neonEdge: "oklch(0.82 0.12 295 / 0.9)",
    bloom: "oklch(0.58 0.14 295 / 0.38)",
  },
  campaign: {
    id: "campaign",
    label: "Campaign",
    role: "Activation and conversion",
    atmosphereClass: "zone-campaign",
    cssPrefix: "--zone-campaign",
    railAccent: "oklch(0.7 0.12 82)",
    labelColor: "oklch(0.88 0.09 82)",
    mutedBorder: "oklch(0.52 0.08 82 / 0.55)",
    iconAccent: "oklch(0.78 0.13 78)",
    neonEdge: "oklch(0.8 0.14 80 / 0.88)",
    bloom: "oklch(0.68 0.12 82 / 0.36)",
  },
  email: {
    id: "email",
    label: "Email",
    role: "Prepared communication and reply routing",
    atmosphereClass: "zone-email",
    cssPrefix: "--zone-email",
    railAccent: "oklch(0.66 0.12 248)",
    labelColor: "oklch(0.88 0.08 248)",
    mutedBorder: "oklch(0.5 0.08 248 / 0.55)",
    iconAccent: "oklch(0.76 0.12 245)",
    neonEdge: "oklch(0.78 0.14 248 / 0.88)",
    bloom: "oklch(0.62 0.12 248 / 0.34)",
  },
  audience: {
    id: "audience",
    label: "Audience",
    role: "Memory, consent, eligibility, and customer context",
    atmosphereClass: "zone-audience",
    cssPrefix: "--zone-audience",
    railAccent: "oklch(0.64 0.12 275)",
    labelColor: "oklch(0.86 0.09 275)",
    mutedBorder: "oklch(0.48 0.08 275 / 0.55)",
    iconAccent: "oklch(0.74 0.13 275)",
    neonEdge: "oklch(0.78 0.14 275 / 0.88)",
    bloom: "oklch(0.6 0.12 275 / 0.34)",
  },
  service: {
    id: "service",
    label: "Service",
    role: "Service handling, support, and resolution",
    atmosphereClass: "zone-service",
    cssPrefix: "--zone-service",
    railAccent: "oklch(0.66 0.12 42)",
    labelColor: "oklch(0.88 0.09 42)",
    mutedBorder: "oklch(0.5 0.08 42 / 0.55)",
    iconAccent: "oklch(0.76 0.13 38)",
    neonEdge: "oklch(0.8 0.14 40 / 0.88)",
    bloom: "oklch(0.62 0.12 42 / 0.34)",
  },
  autopilot: {
    id: "autopilot",
    label: "Autopilot",
    role: "Prepared work, recommendations, and orchestration",
    atmosphereClass: "zone-autopilot",
    cssPrefix: "--zone-autopilot",
    railAccent: "oklch(0.62 0.11 168)",
    labelColor: "oklch(0.86 0.08 168)",
    mutedBorder: "oklch(0.48 0.08 168 / 0.55)",
    iconAccent: "oklch(0.74 0.12 165)",
    neonEdge: "oklch(0.78 0.13 168 / 0.88)",
    bloom: "oklch(0.58 0.11 168 / 0.34)",
  },
  insights: {
    id: "insights",
    label: "Insights",
    role: "Evidence, attribution, and proof",
    atmosphereClass: "zone-insights",
    cssPrefix: "--zone-insights",
    railAccent: "oklch(0.66 0.13 195)",
    labelColor: "oklch(0.88 0.09 195)",
    mutedBorder: "oklch(0.5 0.09 195 / 0.55)",
    iconAccent: "oklch(0.78 0.13 195)",
    neonEdge: "oklch(0.82 0.14 195 / 0.9)",
    bloom: "oklch(0.64 0.13 195 / 0.36)",
  },
  integrations: {
    id: "integrations",
    label: "Integrations",
    role: "External connection and handoff",
    atmosphereClass: "zone-integrations",
    cssPrefix: "--zone-integrations",
    railAccent: "oklch(0.7 0.13 52)",
    labelColor: "oklch(0.9 0.09 52)",
    mutedBorder: "oklch(0.52 0.09 52 / 0.55)",
    iconAccent: "oklch(0.8 0.14 48)",
    neonEdge: "oklch(0.84 0.15 50 / 0.92)",
    bloom: "oklch(0.68 0.13 52 / 0.38)",
  },
  tap_points: {
    id: "tap_points",
    label: "Tap Points",
    role: "Physical/digital entry and fleet health",
    atmosphereClass: "zone-tap-points",
    cssPrefix: "--zone-tap-points",
    railAccent: "oklch(0.7 0.13 225)",
    labelColor: "oklch(0.9 0.09 225)",
    mutedBorder: "oklch(0.52 0.09 225 / 0.55)",
    iconAccent: "oklch(0.8 0.14 220)",
    neonEdge: "oklch(0.84 0.15 222 / 0.9)",
    bloom: "oklch(0.68 0.13 225 / 0.36)",
  },
  settings: {
    id: "settings",
    label: "Settings",
    role: "Configuration, permissions, readiness, and trust",
    atmosphereClass: "zone-settings",
    cssPrefix: "--zone-settings",
    railAccent: "oklch(0.74 0.04 250)",
    labelColor: "oklch(0.9 0.02 250)",
    mutedBorder: "oklch(0.55 0.02 250 / 0.45)",
    iconAccent: "oklch(0.8 0.04 250)",
    neonEdge: "oklch(0.84 0.05 250 / 0.75)",
    bloom: "oklch(0.7 0.04 250 / 0.28)",
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
      return "assets";
    case "settings":
      return "settings";
    default:
      return null;
  }
}

/** Distinct hue families for Owner-visible pairs. */
export const ZONE_DISTINCTION_PAIRS = [
  { a: "brand", b: "assets" },
  { a: "campaign", b: "email" },
  { a: "audience", b: "insights" },
  { a: "service", b: "autopilot" },
] as const;

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
