/**
 * TapConnect proprietary icon family — single registry for landing + Studio.
 * Rounded-line geometry, consistent stroke, zone-compatible, monochrome-safe.
 */

import type { StudioZoneId } from "@/lib/fusion/studio/zone-tokens";

export type TapConnectIconId =
  | "card"
  | "brand"
  | "assets"
  | "tap_points"
  | "campaigns"
  | "tapsave"
  | "audience"
  | "email"
  | "service"
  | "autopilot"
  | "insights"
  | "integrations"
  | "trust_fabric"
  | "settings"
  | "create"
  | "home";

export type TapConnectIconDef = {
  id: TapConnectIconId;
  label: string;
  zone: StudioZoneId | "go";
  /** Studio nav destination when applicable */
  navDestinationId?: string;
  description: string;
};

export const TAPCONNECT_ICON_REGISTRY: Record<TapConnectIconId, TapConnectIconDef> = {
  card: {
    id: "card",
    label: "Card",
    zone: "card",
    navDestinationId: "experiences",
    description: "Living TapConnect Card — central relationship hub",
  },
  brand: {
    id: "brand",
    label: "Brand Kit",
    zone: "brand",
    navDestinationId: "assets",
    description: "Identity layers resolving into the Card",
  },
  assets: {
    id: "assets",
    label: "Assets",
    zone: "assets",
    navDestinationId: "assets",
    description: "Reusable media and creative library shelf",
  },
  tap_points: {
    id: "tap_points",
    label: "Tap Points",
    zone: "tap_points",
    navDestinationId: "tap_points",
    description: "Signal point with NFC ripple language",
  },
  campaigns: {
    id: "campaigns",
    label: "Campaigns",
    zone: "campaign",
    navDestinationId: "experiences",
    description: "Spotlight attaching to the Card",
  },
  tapsave: {
    id: "tapsave",
    label: "TapSave",
    zone: "card",
    navDestinationId: "home",
    description: "Retained Card return path",
  },
  audience: {
    id: "audience",
    label: "Audience & Relationships",
    zone: "audience",
    navDestinationId: "audience",
    description: "Customer signals into remembered relationship",
  },
  email: {
    id: "email",
    label: "Email & Communications",
    zone: "email",
    navDestinationId: "experiences",
    description: "Message path with routing branch",
  },
  service: {
    id: "service",
    label: "TapInbox / Service",
    zone: "service",
    navDestinationId: "audience",
    description: "Governed message or case path",
  },
  autopilot: {
    id: "autopilot",
    label: "Autopilot",
    zone: "autopilot",
    navDestinationId: "home",
    description: "Loose paths organizing into one prepared forward path",
  },
  insights: {
    id: "insights",
    label: "Insights & TapProof",
    zone: "insights",
    navDestinationId: "insights",
    description: "Evidence points resolving into confirmed proof",
  },
  integrations: {
    id: "integrations",
    label: "Integrations",
    zone: "integrations",
    navDestinationId: "settings",
    description: "Bridge extending outward from TapConnect",
  },
  trust_fabric: {
    id: "trust_fabric",
    label: "Trust Fabric",
    zone: "settings",
    navDestinationId: "settings",
    description: "Shielded lattice beneath the system",
  },
  settings: {
    id: "settings",
    label: "Settings / Governance",
    zone: "settings",
    navDestinationId: "settings",
    description: "Workspace trust and configuration",
  },
  create: {
    id: "create",
    label: "Create",
    zone: "go",
    description: "Forward create action",
  },
  home: {
    id: "home",
    label: "Home",
    zone: "home",
    navDestinationId: "home",
    description: "Card command center",
  },
};

export function getTapConnectIcon(id: TapConnectIconId): TapConnectIconDef {
  return TAPCONNECT_ICON_REGISTRY[id];
}

/** Map Studio nav destination → branded icon */
export const NAV_DESTINATION_ICON: Record<string, TapConnectIconId> = {
  home: "home",
  experiences: "card",
  tap_points: "tap_points",
  audience: "audience",
  insights: "insights",
  assets: "assets",
  settings: "settings",
};

export const REQUIRED_ICON_IDS = Object.keys(
  TAPCONNECT_ICON_REGISTRY
) as TapConnectIconId[];
