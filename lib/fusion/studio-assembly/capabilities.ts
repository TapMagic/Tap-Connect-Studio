/**
 * Studio Assembly capability choreography — semantic order and destinations.
 * Destinations map to real Studio IA, not fictional UI.
 */

import type { AssemblyCapabilityDef } from "./types";

export const ASSEMBLY_CAPABILITIES: AssemblyCapabilityDef[] = [
  {
    id: "brand",
    name: "Brand Kit",
    zone: "brand",
    emergence:
      "Emerges from logo, color, typography, and visual identity already present on the Card.",
    destinationId: "assets",
    tapconnectCore: true,
    order: 1,
  },
  {
    id: "tap_points",
    name: "Tap Points",
    zone: "tap_points",
    emergence: "Enters as a pulse or signal reaching the Card.",
    destinationId: "tap_points",
    tapconnectCore: true,
    order: 2,
  },
  {
    id: "campaigns",
    name: "Campaigns",
    zone: "campaign",
    emergence: "Emerges from a temporary Spotlight or timely offer attached to the Card.",
    destinationId: "experiences",
    tapconnectCore: true,
    order: 3,
  },
  {
    id: "tapsave",
    name: "TapSave",
    zone: "card",
    emergence: "Forms as a retained glow, save action, or pocket/return path.",
    destinationId: "home",
    tapconnectCore: true,
    order: 4,
  },
  {
    id: "audience",
    name: "Audience & Relationships",
    zone: "audience",
    emergence:
      "Forms from customer signals joining into remembered relationship context.",
    destinationId: "audience",
    tapconnectCore: false,
    order: 5,
  },
  {
    id: "email",
    name: "Email & Communications",
    zone: "email",
    emergence:
      "Appears as a message leaving the Card ecosystem and returning with response context.",
    destinationId: "experiences",
    tapconnectCore: false,
    order: 6,
  },
  {
    id: "autopilot",
    name: "Autopilot",
    zone: "autopilot",
    emergence:
      "Organizes loose threads, decisions, or unfinished work into one prepared next action.",
    destinationId: "autopilot_next",
    tapconnectCore: false,
    order: 7,
  },
  {
    id: "insights",
    name: "Insights & TapProof",
    zone: "insights",
    emergence: "Forms as evidence points resolving into a confirmed proof signal.",
    destinationId: "insights",
    tapconnectCore: false,
    order: 8,
  },
  {
    id: "integrations",
    name: "Integrations",
    zone: "integrations",
    emergence:
      "Extends outward as a bridge to Monday, CRM, support, booking, or other external systems.",
    destinationId: "settings",
    tapconnectCore: false,
    crossCutting: true,
    order: 9,
  },
  {
    id: "trust_fabric",
    name: "Trust Fabric",
    zone: "settings",
    emergence:
      "Appears beneath the system as consent, Guardian, permissions, readiness, security, and evidence boundaries.",
    destinationId: "trust_underlay",
    tapconnectCore: false,
    crossCutting: true,
    order: 10,
  },
];

export function capabilitiesForMode(
  mode: "tapconnect" | "studio"
): AssemblyCapabilityDef[] {
  if (mode === "tapconnect") {
    return ASSEMBLY_CAPABILITIES.filter((c) => c.tapconnectCore);
  }
  return ASSEMBLY_CAPABILITIES;
}

export function capabilityById(id: string): AssemblyCapabilityDef | undefined {
  return ASSEMBLY_CAPABILITIES.find((c) => c.id === id);
}

/** Logical destination anchors — measured in UI via data-assembly-dest. */
export const ASSEMBLY_DESTINATION_SELECTORS: Record<string, string> = {
  home: '[data-assembly-dest="home"]',
  experiences: '[data-assembly-dest="experiences"]',
  tap_points: '[data-assembly-dest="tap_points"]',
  audience: '[data-assembly-dest="audience"]',
  insights: '[data-assembly-dest="insights"]',
  assets: '[data-assembly-dest="assets"]',
  settings: '[data-assembly-dest="settings"]',
  autopilot_next: '[data-assembly-dest="autopilot_next"]',
  trust_underlay: '[data-assembly-dest="trust_underlay"]',
};
