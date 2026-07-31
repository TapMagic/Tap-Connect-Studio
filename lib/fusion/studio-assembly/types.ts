/**
 * Studio Assembly — shared types for landing and authenticated entry.
 * Product law: the Card is the center; Studio capabilities work around it.
 */

import type { StudioZoneId } from "@/lib/fusion/studio/zone-tokens";

export type StudioAssemblyMode =
  | "LANDING_FULL"
  | "FIRST_STUDIO_ENTRY"
  | "EVERYDAY_ENTRY";

export type AssemblyPhase =
  | "idle"
  | "dark"
  | "card_glow"
  | "card_resolve"
  | "tap_pulse"
  | "capabilities_emerge"
  | "capability_demo"
  | "crescendo"
  | "full_value_frame"
  | "pullback"
  | "icons_settle"
  | "card_forward"
  | "retention_choice"
  | "save_home"
  | "reopen_card"
  | "card_unfold"
  | "complete"
  | "skipped"
  | "failed";

export type AssemblyCapabilityId =
  | "brand"
  | "tap_points"
  | "campaigns"
  | "tapsave"
  | "audience"
  | "email"
  | "autopilot"
  | "insights"
  | "integrations"
  | "trust_fabric";

export type AssemblyCapabilityDef = {
  id: AssemblyCapabilityId;
  name: string;
  zone: StudioZoneId;
  /** Semantic emergence description for SR / docs */
  emergence: string;
  /** Studio nav destination id or special target */
  destinationId:
    | "home"
    | "experiences"
    | "tap_points"
    | "audience"
    | "insights"
    | "assets"
    | "settings"
    | "autopilot_next"
    | "trust_underlay";
  /** Shown in TapConnect (core) marketing mode */
  tapconnectCore: boolean;
  /** Cross-cutting — not an equal orbital peer of Card */
  crossCutting?: boolean;
  order: number;
};

export type AssemblyFrameState = {
  label: string;
  illustrative: boolean;
  items: Array<{ id: string; label: string; active: boolean }>;
};

export type AssemblyCardSnapshot = {
  cardName: string;
  publicStateLabel: string;
  tapPointHealthy: number;
  tapPointCount: number;
  spotlightTitle: string | null;
  tapSaveEnabled: boolean;
  nextActionLabel: string;
  proofSummary: string;
  /** Never include private PII in public analytics */
  safeForPublicAnalytics: boolean;
  /** Marketing / Assembly profile presentation */
  businessDescriptor?: string;
  avatarInitials?: string;
  tapCueLabel?: string;
};

export type StudioAssemblyEvent =
  | { type: "START" }
  | { type: "TICK"; phase: AssemblyPhase }
  | { type: "SKIP" }
  | { type: "ACCELERATE" }
  | { type: "COMPLETE" }
  | { type: "FAIL"; reason: string }
  | { type: "REPLAY" };

export type StudioAssemblyMachineState = {
  mode: StudioAssemblyMode;
  phase: AssemblyPhase;
  reducedMotion: boolean;
  capabilityIndex: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
};
