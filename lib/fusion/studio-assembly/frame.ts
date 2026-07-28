/**
 * Full-value frame state — illustrative on landing, real when account snapshot provided.
 */

import type { AssemblyCardSnapshot, AssemblyFrameState } from "./types";

export const ILLUSTRATIVE_FRAME: AssemblyFrameState = {
  label: "Illustrative Studio state",
  illustrative: true,
  items: [
    { id: "tp", label: "Tap Points connected", active: true },
    { id: "camp", label: "Campaign active", active: true },
    { id: "save", label: "TapSave ready", active: true },
    { id: "email", label: "Email prepared", active: true },
    { id: "reply", label: "Reply routing configured", active: true },
    { id: "auto", label: "Autopilot recommendation", active: true },
    { id: "proof", label: "Confirmed customer actions", active: true },
  ],
};

export function frameFromCardSnapshot(
  card: AssemblyCardSnapshot | null | undefined
): AssemblyFrameState {
  if (!card) return ILLUSTRATIVE_FRAME;
  return {
    label: "Your Studio state",
    illustrative: false,
    items: [
      {
        id: "tp",
        label:
          card.tapPointCount > 0
            ? `${card.tapPointHealthy}/${card.tapPointCount} Tap Points healthy`
            : "No Tap Points connected",
        active: card.tapPointCount > 0,
      },
      {
        id: "camp",
        label: card.spotlightTitle
          ? `Campaign · ${card.spotlightTitle}`
          : "No Campaign Spotlight",
        active: Boolean(card.spotlightTitle),
      },
      {
        id: "save",
        label: card.tapSaveEnabled ? "TapSave ready" : "TapSave off",
        active: card.tapSaveEnabled,
      },
      {
        id: "proof",
        label: card.proofSummary,
        active: true,
      },
      {
        id: "auto",
        label: card.nextActionLabel,
        active: true,
      },
    ],
  };
}

export function demoCardSnapshot(): AssemblyCardSnapshot {
  return {
    cardName: "Harbor Grove Cafe",
    publicStateLabel: "Living relationship hub",
    businessDescriptor: "Neighborhood cafe · open daily",
    avatarInitials: "HG",
    tapCueLabel: "Tap or scan to open",
    tapPointHealthy: 2,
    tapPointCount: 3,
    spotlightTitle: "Weekend Spotlight",
    tapSaveEnabled: true,
    nextActionLabel: "Connect a Tap Point",
    proofSummary: "Illustrative · taps, saves, contacts",
    safeForPublicAnalytics: true,
  };
}
