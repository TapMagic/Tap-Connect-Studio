export const FAMILY_APPEARANCE_CONTRACT = "familyAppearance@1.0.0" as const;
export const FAMILY_TEXT_TREATMENT_CONTRACT = "familyTextTreatment@1.0.0" as const;

export type FamilyAppearanceRoleId = "body-surface" | "text-bar-surface" | "structural-metal" | "trim" | "plug-surface" | "plug-face" | "plug-base" | "text" | "subtext" | "accent" | "edge" | "depth" | (string & {});

export type FamilyAppearanceOption = {
  id: string;
  label: string;
  roleId: FamilyAppearanceRoleId;
  preview: string;
  rendererValue: string;
  certified: boolean;
  governance?: "fixed" | "configurable" | "governed" | "hidden" | "inherited";
  /** Optional projection through the same material catalog used by Standard Buttons. */
  materialProjection?: {
    materialId: string;
    target: "action-surface" | "plug-surface" | "structural" | "text" | "subtext" | "icon-artwork" | "icon-backing";
  };
};

export type FamilyAppearanceOptionAvailability = FamilyAppearanceOption & {
  availability: "enabled" | "disabled" | "read-only";
  disabledReason?: string;
  recommended?: boolean;
};

export type FamilyAppearanceContract = {
  contractId: typeof FAMILY_APPEARANCE_CONTRACT;
  id: string;
  version: `${number}.${number}.${number}`;
  familyId: string;
  roles: readonly { id: FamilyAppearanceRoleId; label: string; options: readonly FamilyAppearanceOption[] }[];
  defaults: Readonly<Record<string, string>>;
  certifiedCombinations: readonly { id: string; optionIds: readonly string[]; recommended?: boolean }[];
  accessibilityRules: readonly { id: string; description: string }[];
  migration: { unknownOption: "preserve-read-only"; invalidExplicitChoice: "block-with-reason" };
};

export type FamilyTextTreatmentId = "engraved" | "raised" | "flat" | "auto";
export type FamilyTextTreatmentContract = {
  contractId: typeof FAMILY_TEXT_TREATMENT_CONTRACT;
  id: string;
  version: `${number}.${number}.${number}`;
  familyId: string;
  options: readonly {
    id: FamilyTextTreatmentId;
    label: string;
    certified: boolean;
    rendererRecipe: string;
    compatibleRoleIds: readonly FamilyAppearanceRoleId[];
    compatibleSizeIds: readonly ("small" | "medium" | "large")[];
  }[];
  deterministicAuto: { enabled: boolean; inputs: readonly ["family", "appearance", "text-role", "text-size", "renderer-version"] };
  migration: { unsupportedTreatment: "preserve-read-only" };
};

export function validateFamilyAppearanceSelection(
  contract: FamilyAppearanceContract,
  selectedOptionIds: readonly string[],
): { ok: true; combinationId: string } | { ok: false; message: string } {
  const unknown = selectedOptionIds.find((id) => !contract.roles.some((role) => role.options.some((option) => option.id === id && option.certified)));
  if (unknown) return { ok: false, message: `Appearance option ${unknown} is not certified for this family.` };
  const combination = contract.certifiedCombinations.find((candidate) => candidate.optionIds.length === selectedOptionIds.length && candidate.optionIds.every((id) => selectedOptionIds.includes(id)));
  return combination ? { ok: true, combinationId: combination.id } : { ok: false, message: "That appearance combination is not certified for this family." };
}

/**
 * Resolves the choices for one semantic appearance role against the complete
 * selected family state. Editors consume this result without knowing a family
 * name, and invalid cross-role combinations remain visible with an explanation
 * instead of becoming a late compiler failure.
 */
export function compatibleFamilyAppearanceOptions(
  contract: FamilyAppearanceContract,
  selectedByRole: Readonly<Record<string, string>>,
  roleId: FamilyAppearanceRoleId,
): readonly FamilyAppearanceOptionAvailability[] {
  const role = contract.roles.find((candidate) => candidate.id === roleId);
  if (!role) return [];
  return role.options.map((option) => {
    if (!option.certified) {
      return { ...option, availability: "disabled" as const, disabledReason: "This treatment is not certified for this family." };
    }
    const candidate = { ...contract.defaults, ...selectedByRole, [roleId]: option.id };
    const validation = validateFamilyAppearanceSelection(contract, contract.roles.map((candidateRole) => candidate[candidateRole.id]));
    const combination = validation.ok
      ? contract.certifiedCombinations.find((item) => item.id === validation.combinationId)
      : undefined;
    return validation.ok
      ? { ...option, availability: "enabled" as const, recommended: combination?.recommended }
      : { ...option, availability: "disabled" as const, disabledReason: validation.message };
  });
}

export function resolveDeterministicTextTreatment(
  contract: FamilyTextTreatmentContract,
  requested: FamilyTextTreatmentId,
  input: { appearanceOptionIds: readonly string[]; roleId: FamilyAppearanceRoleId; sizeId: "small" | "medium" | "large"; rendererVersion: string },
): { ok: true; treatmentId: Exclude<FamilyTextTreatmentId, "auto"> } | { ok: false; message: string } {
  if (requested === "auto" && !contract.deterministicAuto.enabled) return { ok: false, message: "Auto is not certified for this family." };
  const eligible = contract.options.filter((option) => option.certified && option.id !== "auto" && option.compatibleRoleIds.includes(input.roleId) && option.compatibleSizeIds.includes(input.sizeId));
  if (requested !== "auto") {
    const exact = eligible.find((option) => option.id === requested);
    return exact ? { ok: true, treatmentId: exact.id as Exclude<FamilyTextTreatmentId, "auto"> } : { ok: false, message: `${requested} is not certified for this family and text role.` };
  }
  const stableKey = [contract.familyId, [...input.appearanceOptionIds].sort().join(","), input.roleId, input.sizeId, input.rendererVersion].join("|");
  const index = [...stableKey].reduce((sum, character) => sum + character.charCodeAt(0), 0) % Math.max(eligible.length, 1);
  return eligible[index] ? { ok: true, treatmentId: eligible[index].id as Exclude<FamilyTextTreatmentId, "auto"> } : { ok: false, message: "No certified treatment is compatible with this selection." };
}
