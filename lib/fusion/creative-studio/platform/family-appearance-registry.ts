import type { FamilyAppearanceContract, FamilyTextTreatmentContract } from "./family-appearance";
import { CABINET_NOIR_APPEARANCE_CONTRACT, CABINET_NOIR_TEXT_TREATMENT_CONTRACT } from "../signature-assets/cabinet-noir-appearance";
import { FAMILY_NEUTRAL_RUNTIME_FIXTURE_APPEARANCE, FAMILY_NEUTRAL_RUNTIME_FIXTURE_ENABLED } from "../signature-assets/family-neutral-runtime-fixture";
import { EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT, EVERENCORE_LOVE_AND_THEFT_TEXT_TREATMENT_CONTRACT } from "../signature-assets/everencore-love-and-theft-appearance";

const appearanceContracts: readonly FamilyAppearanceContract[] = [CABINET_NOIR_APPEARANCE_CONTRACT, EVERENCORE_LOVE_AND_THEFT_APPEARANCE_CONTRACT, ...(FAMILY_NEUTRAL_RUNTIME_FIXTURE_ENABLED ? [FAMILY_NEUTRAL_RUNTIME_FIXTURE_APPEARANCE] : [])];
const treatmentContracts: readonly FamilyTextTreatmentContract[] = [CABINET_NOIR_TEXT_TREATMENT_CONTRACT, EVERENCORE_LOVE_AND_THEFT_TEXT_TREATMENT_CONTRACT];

export function familyAppearanceContract(familyId: string) {
  return appearanceContracts.find((contract) => contract.familyId === familyId);
}

export function familyTextTreatmentContract(familyId: string) {
  return treatmentContracts.find((contract) => contract.familyId === familyId);
}
