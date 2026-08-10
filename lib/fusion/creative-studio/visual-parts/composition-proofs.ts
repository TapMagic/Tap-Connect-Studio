/**
 * Representative mobile composition proofs A–G — system proofs, not customer templates.
 */

import { BACKGROUND_DIRECTION_PRESETS } from "../starter-preset-registry";
import { CURATED_FAMILY_BRIGHT_LACQUER_ID, CURATED_FAMILY_MISSION_CONTROL_ID } from "./registry";
import { observeViewportYield } from "./layout-rails";

export type CompositionProofId =
  | "clean_light_business"
  | "dark_industrial_grunge"
  | "portrait_led_professional"
  | "two_column_action_grid"
  | "round_team_staff_grid"
  | "hero_plus_launch"
  | "photo_background_optional_surface";

export type CompositionProof = Readonly<{
  id: CompositionProofId;
  label: string;
  pageBackgroundId: string;
  surface: "off" | "quiet_field" | "energy_field" | "copper_harmonized";
  actionFamilyId?: string;
  layoutIntent?: "one_column" | "two_column" | "round_team_grid";
  hero?: "compact" | "identity" | "spotlight" | "media";
  launch?: boolean;
  bottomStop?: string;
  divider?: string;
  notes: string[];
}>;

export const COMPOSITION_PROOFS: readonly CompositionProof[] = [
  {
    id: "clean_light_business",
    label: "Clean / Light Business",
    pageBackgroundId: "clean-light",
    surface: "off",
    actionFamilyId: undefined,
    layoutIntent: "one_column",
    hero: "compact",
    divider: "divider_minimal_line",
    bottomStop: "bottom_stop_minimal",
    notes: ["Light crisp proof — Visual Grammar does not assume dark/neon."],
  },
  {
    id: "dark_industrial_grunge",
    label: "Dark Industrial / Grunge",
    pageBackgroundId: "dark-grunge",
    surface: "energy_field",
    actionFamilyId: CURATED_FAMILY_MISSION_CONTROL_ID,
    layoutIntent: "one_column",
    divider: "divider_electric",
    bottomStop: "bottom_stop_minimal",
    notes: ["Actions staged above Surface with Mount; electric punctuation."],
  },
  {
    id: "portrait_led_professional",
    label: "Portrait-Led Professional",
    pageBackgroundId: "elegant-luxury",
    surface: "quiet_field",
    actionFamilyId: CURATED_FAMILY_BRIGHT_LACQUER_ID,
    layoutIntent: "one_column",
    launch: true,
    notes: ["Oversized left-anchored portrait Icon Station with text safe zone."],
  },
  {
    id: "two_column_action_grid",
    label: "Two-Column Action Grid",
    pageBackgroundId: "clean-light",
    surface: "quiet_field",
    layoutIntent: "two_column",
    divider: "divider_geometric",
    notes: ["Shared rails; unsafe narrow widths auto-stack."],
  },
  {
    id: "round_team_staff_grid",
    label: "Round Team / Staff Grid",
    pageBackgroundId: "clean-light",
    surface: "off",
    layoutIntent: "round_team_grid",
    notes: ["Round portrait Actions as first-class grid cells."],
  },
  {
    id: "hero_plus_launch",
    label: "Hero + Launch",
    pageBackgroundId: "elegant-luxury",
    surface: "copper_harmonized",
    actionFamilyId: CURATED_FAMILY_BRIGHT_LACQUER_ID,
    hero: "identity",
    launch: true,
    bottomStop: "bottom_stop_themed_border",
    notes: ["Beginning/middle/end arc with themed closure."],
  },
  {
    id: "photo_background_optional_surface",
    label: "Photo Background + Optional Surface",
    pageBackgroundId: "photo-env",
    surface: "quiet_field",
    layoutIntent: "one_column",
    notes: ["Local staging preserves photo visibility; Action stays readable."],
  },
] as const;

export function listCompositionProofs(): CompositionProof[] {
  return [...COMPOSITION_PROOFS];
}

export function compositionProofBackground(id: string) {
  return BACKGROUND_DIRECTION_PRESETS.find((item) => item.id === id);
}

export function compositionProofViewportNotes(proof: CompositionProof) {
  const heroHeight = proof.hero === "spotlight" ? 280 : proof.hero ? 160 : 0;
  return observeViewportYield({
    heroHeightPx: heroHeight,
    dividerHeightPx: proof.divider ? 12 : 0,
    actionCount: 2,
    viewportHeightPx: 780,
    oversizedPortrait: proof.id === "portrait_led_professional",
  });
}
