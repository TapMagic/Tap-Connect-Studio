import {
  FAMILY_APPEARANCE_CONTRACT,
  FAMILY_TEXT_TREATMENT_CONTRACT,
  type FamilyAppearanceContract,
  type FamilyAppearanceOption,
  type FamilyTextTreatmentContract,
} from "../platform/family-appearance";
import { EVERENCORE_LOVE_AND_THEFT_FAMILY_ID, EVERENCORE_LOVE_AND_THEFT_ROOT } from "./everencore-love-and-theft";

export const LOVE_AND_THEFT_APPEARANCE_OPTION_IDS = {
  smokyBlack: "love-and-theft-smoky-black-glass",
  burgundyPlum: "love-and-theft-burgundy-plum-glass",
  frostedCharcoal: "love-and-theft-frosted-charcoal",
  deepBlue: "love-and-theft-deep-blue-glass",
  agedBrass: "love-and-theft-aged-brass-pick",
  engravedIcon: "love-and-theft-recessed-engraved-icon",
} as const;

const surface = (
  id: string,
  label: string,
  previewFile: string,
  materialId: string,
): FamilyAppearanceOption => ({
  id,
  label,
  roleId: "text-bar-surface",
  preview: `${EVERENCORE_LOVE_AND_THEFT_ROOT}/previews/${previewFile}`,
  rendererValue: materialId,
  certified: true,
  governance: "configurable",
  materialProjection: { materialId, target: "action-surface" },
});

const treatments = [
  surface(LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack, "Smoky Black Glass", "treatment-smoky-black.svg", "smoky_black_glass"),
  surface(LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum, "Burgundy Plum", "treatment-burgundy-plum.svg", "burgundy_plum_glass"),
  surface(LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal, "Frosted Charcoal", "treatment-frosted-charcoal.svg", "frosted_charcoal"),
  surface(LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue, "Deep Blue Glass", "treatment-deep-blue.svg", "deep_blue_glass"),
] as const;

export const EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT: FamilyAppearanceContract = {
  contractId: FAMILY_APPEARANCE_CONTRACT,
  id: "everencoreLoveAndTheftAppearance@1.0.0",
  version: "1.0.0",
  familyId: EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
  roles: [
    { id: "text-bar-surface", label: "Glass treatment", options: treatments },
    {
      id: "plug-surface",
      label: "Guitar-pick plug",
      options: [{
        id: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.agedBrass,
        label: "Aged Brass",
        roleId: "plug-surface",
        preview: "linear-gradient(145deg,#5f3b18 4%,#d7ad62 38%,#7d4d22 78%,#2c190d)",
        rendererValue: "aged_brass",
        certified: true,
        governance: "fixed",
        materialProjection: { materialId: "aged_brass", target: "plug-surface" },
      }],
    },
    {
      id: "accent",
      label: "Icon treatment",
      options: [{
        id: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.engravedIcon,
        label: "Recessed Engraving",
        roleId: "accent",
        preview: "linear-gradient(145deg,#4b2c13,#c69348)",
        rendererValue: "aged_brass",
        certified: true,
        governance: "fixed",
        materialProjection: { materialId: "aged_brass", target: "icon-artwork" },
      }],
    },
  ],
  defaults: {
    "text-bar-surface": LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack,
    "plug-surface": LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.agedBrass,
    accent: LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.engravedIcon,
  },
  certifiedCombinations: treatments.map((option) => ({
    id: `${option.id}-certified`,
    optionIds: [option.id, LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.agedBrass, LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.engravedIcon],
    recommended: option.id === LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack,
  })),
  accessibilityRules: [
    { id: "phone-contrast", description: "Cream primary and muted-gold secondary copy maintain certified contrast over every glass treatment at 390px." },
    { id: "engraving-envelope", description: "Canonical semantic icons stay inside the guitar-pick safe area and remain legible as recessed engraving." },
    { id: "runtime-projection-parity", description: "Studio, Preview, Live Device, and public runtime resolve the same material identifiers and geometry." },
  ],
  migration: { unknownOption: "preserve-read-only", invalidExplicitChoice: "block-with-reason" },
};

export const EVERENCORE_LOVE_AND_THEFT_TEXT_TREATMENT_CONTRACT: FamilyTextTreatmentContract = {
  contractId: FAMILY_TEXT_TREATMENT_CONTRACT,
  id: "everencoreLoveAndTheftTextTreatment@1.0.0",
  version: "1.0.0",
  familyId: EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
  options: [{
    id: "raised",
    label: "Raised warm enamel",
    certified: true,
    rendererRecipe: "raised-enamel",
    compatibleRoleIds: ["text", "subtext"],
    compatibleSizeIds: ["small", "medium", "large"],
  }],
  deterministicAuto: { enabled: false, inputs: ["family", "appearance", "text-role", "text-size", "renderer-version"] },
  migration: { unsupportedTreatment: "preserve-read-only" },
};
