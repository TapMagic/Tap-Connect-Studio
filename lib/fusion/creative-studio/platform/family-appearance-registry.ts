import type { FamilyAppearanceContract, FamilyTextTreatmentContract } from "./family-appearance";
import { CABINET_NOIR_APPEARANCE_CONTRACT, CABINET_NOIR_TEXT_TREATMENT_CONTRACT } from "../signature-assets/cabinet-noir-appearance";

const appearanceContracts: readonly FamilyAppearanceContract[] = [CABINET_NOIR_APPEARANCE_CONTRACT];
const treatmentContracts: readonly FamilyTextTreatmentContract[] = [CABINET_NOIR_TEXT_TREATMENT_CONTRACT];

export function familyAppearanceContract(familyId: string) {
  return appearanceContracts.find((contract) => contract.familyId === familyId);
}

export function familyTextTreatmentContract(familyId: string) {
  return treatmentContracts.find((contract) => contract.familyId === familyId);
}
