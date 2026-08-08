/**
 * Registry-derived Owner-simulation interaction inventory.
 *
 * Coverage expands when commands, families, appearance categories,
 * effects, or starter presets are registered — not via a human checklist.
 */

import {
  EDITOR_COMMAND_REGISTRY,
  type EditorCommand,
} from "@/lib/fusion/creative-studio/editor-command-registry";
import {
  OBJECT_CAPABILITY_REGISTRY,
  type ObjectFamily,
} from "@/lib/fusion/creative-studio/capabilities";
import { appearanceCategoriesForFamily } from "@/lib/fusion/creative-studio/appearance-ia";
import { EFFECT_RECIPES, MATERIAL_CATALOG } from "@/lib/fusion/creative-studio/material-engine";
import { BADGE_SHAPE_DEFS } from "@/lib/fusion/creative-studio/badge-shape";
import {
  STARTER_BADGE_COMPOSITIONS,
  STARTER_BADGE_SHAPES,
  STARTER_BUTTON_PRESETS,
  STARTER_CONTAINER_PRESETS,
  STARTER_COUPON_LAYOUTS,
  STARTER_DIVIDER_PRESETS,
  STARTER_FORM_PRESETS,
  STARTER_PRESET_PACK,
  STARTER_TEXT_COMBINATIONS,
  STARTER_TICKET_LAYOUTS,
  listStarterPresetFamilies,
} from "@/lib/fusion/creative-studio/starter-preset-registry";

export type CertStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "BROKEN"
  | "BLOCKED"
  | "NOT_APPLICABLE"
  | "DEFERRED"
  | "DEFERRED_BY_SCOPE";

export type InsertSurface = {
  family: ObjectFamily;
  railTool: string;
  libraryTestId: string;
  /** Representative insert control — role name or testId. */
  insert: { kind: "role"; name: RegExp } | { kind: "testid"; id: string };
  canvasSelector: string;
};

/** Families the Owner can physically insert from the rail today. */
export const INSERT_SURFACES: readonly InsertSurface[] = [
  {
    family: "text",
    railTool: "card-creative-tool-text",
    libraryTestId: "card-text-library",
    insert: { kind: "role", name: /Add text box/i },
    canvasSelector: '[data-primitive="text"]',
  },
  {
    family: "icon",
    railTool: "card-creative-tool-icons",
    libraryTestId: "card-icon-library",
    insert: { kind: "testid", id: "icon-recommended-ticket" },
    canvasSelector: '[data-icon-artwork="true"], [data-element-kind="icon"]',
  },
  {
    family: "button",
    railTool: "card-creative-tool-buttons",
    libraryTestId: "card-button-library",
    insert: { kind: "testid", id: "button-preset-primary-cta" },
    canvasSelector: '[data-primitive="button"]',
  },
  {
    family: "badge",
    railTool: "card-creative-tool-badges",
    libraryTestId: "polished-badge-library",
    insert: { kind: "testid", id: "starter-badge-pill" },
    canvasSelector: "[data-badge-shape]",
  },
  {
    family: "coupon",
    railTool: "card-creative-tool-coupons",
    libraryTestId: "card-coupon-library",
    insert: { kind: "testid", id: "coupon-preset-clean-retail" },
    canvasSelector: '[data-component-kind="coupon"]',
  },
  {
    family: "ticket",
    railTool: "card-creative-tool-tickets",
    libraryTestId: "card-ticket-library",
    insert: { kind: "testid", id: "ticket-preset-admission-stub" },
    canvasSelector: '[data-component-kind="ticket"]',
  },
] as const;

/** Map registry command ids → visible contextual toolbar testIds where they exist. */
export const COMMAND_TO_TOOLBAR_TESTID: Readonly<Record<string, string | string[]>> = {
  "color.open": ["contextual-color", "contextual-group-color"],
  "font.open": ["contextual-font", "contextual-group-font"],
  "fontSize.quick": ["contextual-font-size", "contextual-group-font-size"],
  "bold.toggle": ["contextual-group-bold"],
  "italic.toggle": ["contextual-group-italic"],
  "underline.toggle": ["contextual-group-underline"],
  "content.edit": ["contextual-content"],
  "appearance.open": [
    "contextual-text-appearance",
    "contextual-button-appearance",
    "contextual-badge-appearance",
    "contextual-group-appearance",
    "contextual-icon-appearance",
    "contextual-appearance",
    "contextual-frame-appearance",
  ],
  "material.open": ["contextual-text-appearance", "contextual-button-appearance", "contextual-badge-appearance"],
  "icon.open": ["contextual-icon-picker"],
  "icon.appearance": ["contextual-icon-appearance"],
  "component.editChildren": [
    "contextual-button-content",
    "contextual-group-edit-contents",
  ],
  "ungroup.open": ["contextual-group-ungroup"],
  "badge.shape": ["contextual-badge-shape"],
  "action.open": ["contextual-action", "contextual-button-action"],
  "motion.open": ["contextual-animate", "contextual-button-motion"],
  "transform.position": ["contextual-position"],
  "magicWrite.open": ["contextual-group-magic-write"],
  "media.replace": ["contextual-replace-media"],
  "media.cropFit": ["contextual-crop-fit"],
  "media.adjust": ["contextual-adjust"],
  "resizePolicy.open": ["contextual-container-resize-policy"],
  "divider.style": ["contextual-divider-style"],
  "divider.thickness": ["contextual-divider-thickness"],
  "divider.color": ["contextual-divider-color"],
  "divider.appearance": ["contextual-divider-appearance"],
};

export type FamilyCommandExpectation = {
  family: ObjectFamily;
  commandId: string;
  command: EditorCommand;
  toolbarTestIds: string[];
  appearanceCategories: string[];
};

export function deriveFamilyCommandExpectations(
  families: ObjectFamily[] = INSERT_SURFACES.map((s) => s.family)
): FamilyCommandExpectation[] {
  const out: FamilyCommandExpectation[] = [];
  for (const family of families) {
    const def = OBJECT_CAPABILITY_REGISTRY[family];
    const categories = appearanceCategoriesForFamily(family).map((c) => c.id);
    for (const commandId of def.toolbarCommands) {
      const command = EDITOR_COMMAND_REGISTRY.get(commandId);
      if (!command) continue;
      const mapped = COMMAND_TO_TOOLBAR_TESTID[commandId];
      out.push({
        family,
        commandId,
        command,
        toolbarTestIds: mapped ? (Array.isArray(mapped) ? mapped : [mapped]) : [],
        appearanceCategories: categories,
      });
    }
  }
  return out;
}

/** Same conceptual capability across families that register it. */
export function deriveCrossFamilyCapabilityComparisons(capability: string) {
  return deriveFamilyCommandExpectations().filter((item) => item.command.capability === capability);
}

export function deriveMajorEffectIds(): string[] {
  return EFFECT_RECIPES.filter((recipe) => recipe.id !== "none").map((recipe) => recipe.id);
}

/** Effects exercised in the main crawl's 7-sample text set. */
export const TEXT_EFFECT_BASELINE_IDS = [
  "soft_glow",
  "neon_edge",
  "double_neon",
  "aura",
  "electric",
  "soft_shadow",
  "deep_shadow",
] as const;

/** Remaining major text-target effects for expansion certification. */
export const TEXT_EFFECT_EXPANSION_IDS = [
  "floating",
  "inner_glow",
  "outline_glow",
  "gloss_highlight",
  "dimensional_edge",
] as const;

/** Exhaustive surface-target effects for Button / Badge certification. */
export const BUTTON_SURFACE_EFFECT_IDS = EFFECT_RECIPES.map((recipe) => recipe.id);

export function deriveCouponPresetIds(): string[] {
  return STARTER_COUPON_LAYOUTS.map((item) => item.id);
}

export function deriveTicketPresetIds(): string[] {
  return STARTER_TICKET_LAYOUTS.map((item) => item.id);
}

/** Exhaustive button preset ids. */
export function deriveButtonPresetSampleIds(count = STARTER_BUTTON_PRESETS.length): string[] {
  return STARTER_BUTTON_PRESETS.slice(0, count).map((item) => item.id);
}

/** Exhaustive badge shape + composition ids (deduped). */
export function deriveBadgePresetSampleIds(count = 10_000): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...STARTER_BADGE_SHAPES, ...STARTER_BADGE_COMPOSITIONS]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item.id);
    if (out.length >= count) break;
  }
  return out;
}

export function deriveAllTextCombinationIds(): string[] {
  return STARTER_TEXT_COMBINATIONS.map((item) => item.id);
}

export function deriveAllMaterialIds(): string[] {
  return MATERIAL_CATALOG.map((item) => item.id);
}

export function deriveAllBadgeShapeIds(): string[] {
  return BADGE_SHAPE_DEFS.map((item) => item.id);
}

/** All registered effects including "none". */
export function deriveAllEffectIds(): string[] {
  return EFFECT_RECIPES.map((recipe) => recipe.id);
}

export function badgePresetInsertTestId(id: string): string {
  return STARTER_BADGE_COMPOSITIONS.some((item) => item.id === id)
    ? `starter-badge-composition-${id}`
    : `starter-badge-${id}`;
}

export function derivePresetInventory() {
  return {
    pack: STARTER_PRESET_PACK,
    counts: listStarterPresetFamilies(),
    textIds: STARTER_TEXT_COMBINATIONS.map((item) => item.id),
    buttonIds: STARTER_BUTTON_PRESETS.map((item) => item.id),
    badgeShapeIds: STARTER_BADGE_SHAPES.map((item) => item.id),
    badgeCompositionIds: STARTER_BADGE_COMPOSITIONS.map((item) => item.id),
    couponIds: STARTER_COUPON_LAYOUTS.map((item) => item.id),
    ticketIds: STARTER_TICKET_LAYOUTS.map((item) => item.id),
    dividerIds: STARTER_DIVIDER_PRESETS.map((item) => item.id),
    formIds: STARTER_FORM_PRESETS.map((item) => item.id),
    containerIds: STARTER_CONTAINER_PRESETS.map((item) => item.id),
  };
}

export type ManifestDomain =
  | "selection-and-scope"
  | "physical-transforms"
  | "appearance"
  | "effects"
  | "libraries"
  | "nested-editing"
  | "groups"
  | "preset-truth"
  | "drawer-transitions"
  | "persistence"
  | "responsive"
  | "accessibility";

export function buildInteractionManifest() {
  const familyCommands = deriveFamilyCommandExpectations();
  const presets = derivePresetInventory();
  const effects = deriveMajorEffectIds();
  return {
    derivedAt: new Date().toISOString(),
    insertSurfaces: INSERT_SURFACES,
    commandCount: EDITOR_COMMAND_REGISTRY.size,
    familyCommandExpectations: familyCommands,
    crossFamilyColor: deriveCrossFamilyCapabilityComparisons("color"),
    crossFamilyAppearance: deriveCrossFamilyCapabilityComparisons("appearance"),
    majorEffects: effects,
    presets,
    domains: [
      "selection-and-scope",
      "physical-transforms",
      "appearance",
      "effects",
      "libraries",
      "nested-editing",
      "groups",
      "preset-truth",
      "drawer-transitions",
      "persistence",
      "responsive",
      "accessibility",
    ] as ManifestDomain[],
  };
}
