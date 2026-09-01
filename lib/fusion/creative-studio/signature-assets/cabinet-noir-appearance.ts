import {
  FAMILY_APPEARANCE_CONTRACT,
  FAMILY_TEXT_TREATMENT_CONTRACT,
  type FamilyAppearanceContract,
  type FamilyTextTreatmentContract,
} from "../platform/family-appearance";
import { CABINET_NOIR_FAMILY_ID, CABINET_NOIR_FINISH_ID } from "./cabinet-noir";

export const CABINET_NOIR_APPEARANCE_CONTRACT: FamilyAppearanceContract = {
  contractId: FAMILY_APPEARANCE_CONTRACT,
  id: "cabinetNoirAppearance@1.0.0",
  version: "1.0.0",
  familyId: CABINET_NOIR_FAMILY_ID,
  roles: [{
    id: "structural-metal",
    label: "Certified finish",
    options: [{ id: CABINET_NOIR_FINISH_ID, label: "Champagne gold · blackened gunmetal", roleId: "structural-metal", preview: "linear-gradient(135deg,#050505 12%,#84633a 45%,#d7b36b 60%,#17130e 86%)", rendererValue: CABINET_NOIR_FINISH_ID, certified: true }],
  }, {
    id: "body-surface",
    label: "Action body",
    options: [{ id: "cabinet-noir-body-certified-source@1.0.0", label: "Certified source surface", roleId: "body-surface", preview: "#090909", rendererValue: "certified-source", certified: true }],
  }, {
    id: "plug-face",
    label: "Plug face",
    options: [{ id: "cabinet-noir-plug-face-certified-source@1.0.0", label: "Certified plug artwork", roleId: "plug-face", preview: "linear-gradient(135deg,#bd9a58,#111827)", rendererValue: "certified-source", certified: true }],
  }, {
    id: "plug-base",
    label: "Plug base",
    options: [{ id: "cabinet-noir-plug-base-certified-source@1.0.0", label: "Certified raised base", roleId: "plug-base", preview: "#121212", rendererValue: "certified-source", certified: true }],
  }, {
    id: "text",
    label: "Action text",
    options: [{ id: "cabinet-noir-text-certified-source@1.0.0", label: "Certified high-contrast text", roleId: "text", preview: "#f8f3e8", rendererValue: "certified-source", certified: true }],
  }, {
    id: "accent",
    label: "Accent",
    options: [{ id: "cabinet-noir-accent-certified-source@1.0.0", label: "Certified source accent", roleId: "accent", preview: "#b68e49", rendererValue: "certified-source", certified: true }],
  }],
  defaults: {
    "structural-metal": CABINET_NOIR_FINISH_ID,
    "body-surface": "cabinet-noir-body-certified-source@1.0.0",
    "plug-face": "cabinet-noir-plug-face-certified-source@1.0.0",
    "plug-base": "cabinet-noir-plug-base-certified-source@1.0.0",
    text: "cabinet-noir-text-certified-source@1.0.0",
    accent: "cabinet-noir-accent-certified-source@1.0.0",
  },
  certifiedCombinations: [{
    id: "cabinet-noir-original-finish",
    optionIds: [CABINET_NOIR_FINISH_ID, "cabinet-noir-body-certified-source@1.0.0", "cabinet-noir-plug-face-certified-source@1.0.0", "cabinet-noir-plug-base-certified-source@1.0.0", "cabinet-noir-text-certified-source@1.0.0", "cabinet-noir-accent-certified-source@1.0.0"],
    recommended: true,
  }],
  accessibilityRules: [
    { id: "certified-source-contrast", description: "Live text and plug content remain inside certified phone-safe contrast regions." },
    { id: "role-combination-certification", description: "Body, plug face/base, text, accent, and structural finish ship only as a certified compatible combination." },
    { id: "runtime-projection-parity", description: "Every selected role treatment must resolve through the canonical composition projection in Studio, Preview, Live Device, and public runtime." },
  ],
  migration: { unknownOption: "preserve-read-only", invalidExplicitChoice: "block-with-reason" },
};

export const CABINET_NOIR_TEXT_TREATMENT_CONTRACT: FamilyTextTreatmentContract = {
  contractId: FAMILY_TEXT_TREATMENT_CONTRACT,
  id: "cabinetNoirTextTreatment@1.0.0",
  version: "1.0.0",
  familyId: CABINET_NOIR_FAMILY_ID,
  options: [{
    id: "raised",
    label: "Raised enamel",
    certified: true,
    rendererRecipe: "raised-enamel",
    compatibleRoleIds: ["text"],
    compatibleSizeIds: ["small", "medium", "large"],
  }],
  deterministicAuto: { enabled: false, inputs: ["family", "appearance", "text-role", "text-size", "renderer-version"] },
  migration: { unsupportedTreatment: "preserve-read-only" },
};
