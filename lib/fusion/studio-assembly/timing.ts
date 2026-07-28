/**
 * Studio Assembly timing profiles — one shared phase sequence, mode-scaled durations.
 */

import type { AssemblyPhase, StudioAssemblyMode } from "./types";

/** Ordered storyboard phases before terminal states. */
export const ASSEMBLY_STORYBOARD: AssemblyPhase[] = [
  "dark",
  "card_glow",
  "card_resolve",
  "tap_pulse",
  "capabilities_emerge",
  "capability_demo",
  "crescendo",
  "full_value_frame",
  "pullback",
  "icons_settle",
  "card_forward",
  "card_unfold",
  "complete",
];

export type PhaseTiming = Partial<Record<AssemblyPhase, number>>;

/** Landing cinematic ~14s uninterrupted. */
export const TIMING_LANDING_FULL: PhaseTiming = {
  dark: 350,
  card_glow: 700,
  card_resolve: 900,
  tap_pulse: 700,
  capabilities_emerge: 2400,
  capability_demo: 2200,
  crescendo: 800,
  full_value_frame: 1100,
  pullback: 1800,
  icons_settle: 900,
  card_forward: 0,
  card_unfold: 0,
  complete: 0,
};

/** First Studio entry ~7s. */
export const TIMING_FIRST_ENTRY: PhaseTiming = {
  dark: 200,
  card_glow: 500,
  card_resolve: 700,
  tap_pulse: 500,
  capabilities_emerge: 1400,
  capability_demo: 0,
  crescendo: 0,
  full_value_frame: 800,
  pullback: 0,
  icons_settle: 1100,
  card_forward: 700,
  card_unfold: 900,
  complete: 0,
};

/** Everyday entry ~2s. */
export const TIMING_EVERYDAY: PhaseTiming = {
  dark: 80,
  card_glow: 200,
  card_resolve: 280,
  tap_pulse: 180,
  capabilities_emerge: 400,
  capability_demo: 0,
  crescendo: 0,
  full_value_frame: 0,
  pullback: 0,
  icons_settle: 350,
  card_forward: 280,
  card_unfold: 350,
  complete: 0,
};

/** Reduced-motion: short fades in place. */
export const TIMING_REDUCED: PhaseTiming = {
  dark: 50,
  card_glow: 100,
  card_resolve: 150,
  tap_pulse: 80,
  capabilities_emerge: 160,
  capability_demo: 120,
  crescendo: 80,
  full_value_frame: 120,
  pullback: 180,
  icons_settle: 120,
  card_forward: 100,
  card_unfold: 150,
  complete: 0,
};

export function timingForMode(
  mode: StudioAssemblyMode,
  reducedMotion: boolean
): PhaseTiming {
  if (reducedMotion) return TIMING_REDUCED;
  switch (mode) {
    case "LANDING_FULL":
      return TIMING_LANDING_FULL;
    case "FIRST_STUDIO_ENTRY":
      return TIMING_FIRST_ENTRY;
    case "EVERYDAY_ENTRY":
      return TIMING_EVERYDAY;
  }
}

export function phaseSequenceForMode(mode: StudioAssemblyMode): AssemblyPhase[] {
  if (mode === "LANDING_FULL") {
    return [
      "dark",
      "card_glow",
      "card_resolve",
      "tap_pulse",
      "capabilities_emerge",
      "capability_demo",
      "crescendo",
      "full_value_frame",
      "pullback",
      "icons_settle",
      "complete",
    ];
  }
  if (mode === "EVERYDAY_ENTRY") {
    return [
      "dark",
      "card_glow",
      "card_resolve",
      "tap_pulse",
      "capabilities_emerge",
      "icons_settle",
      "card_forward",
      "card_unfold",
      "complete",
    ];
  }
  // FIRST_STUDIO_ENTRY — skip cinematic landing-only phases with 0ms
  return [
    "dark",
    "card_glow",
    "card_resolve",
    "tap_pulse",
    "capabilities_emerge",
    "full_value_frame",
    "icons_settle",
    "card_forward",
    "card_unfold",
    "complete",
  ];
}

export function totalDurationMs(
  mode: StudioAssemblyMode,
  reducedMotion: boolean
): number {
  const timing = timingForMode(mode, reducedMotion);
  const seq = phaseSequenceForMode(mode);
  return seq.reduce((sum, phase) => sum + (timing[phase] ?? 0), 0);
}

/** Demo beat order during capability_demo (meaningful magic). */
export const CAPABILITY_DEMO_BEATS: Array<{
  id: string;
  label: string;
}> = [
  { id: "tap_points", label: "Tap signal reaches the Card" },
  { id: "campaigns", label: "Spotlight attaches" },
  { id: "tapsave", label: "TapSave retains the Card" },
  { id: "audience", label: "Signals become a relationship" },
  { id: "email", label: "Message routes and returns" },
  { id: "autopilot", label: "Paths organize into one next action" },
  { id: "integrations", label: "Bridge extends outward" },
  { id: "insights", label: "Evidence resolves into proof" },
];
