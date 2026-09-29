/**
 * Family-neutral Button discovery contract.
 *
 * A family is a browse destination, not necessarily a standalone insertable
 * preset. Standard presentations, Brand-derived styles, governed Signature
 * systems, saved resources, and future providers can all describe themselves
 * through this contract while retaining their canonical persistence models.
 */

export const STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT =
  "studioButtonFamilyDiscovery@1.0.0" as const;

export type StudioButtonFamilyModel =
  | "standalone-presentation"
  | "brand-presentation"
  | "governed-signature"
  | "saved-resource";

export type StudioButtonFamilyReadiness = "ready" | "preview" | "empty" | "restricted";

export type StudioButtonResourceClassification =
  | "assembly-starting-point"
  | "user-selectable"
  | "assembly-managed"
  | "identity-choice"
  | "plug-choice"
  | "utility-choice";

export type StudioButtonFamilyResource = {
  id: string;
  label: string;
  description: string;
  classification: StudioButtonResourceClassification;
  readiness: "ready" | "preview" | "managed";
  previewSrc?: string;
  previewAlt?: string;
  recipeId?: string;
  recipeVersion?: string;
  presentationId?: string;
  layoutMode?: "standalone" | "single-stack" | "twin-rail";
  componentId?: string;
  tags: readonly string[];
};

export type StudioButtonFamilySection = {
  id: string;
  label: string;
  description?: string;
  resources: readonly StudioButtonFamilyResource[];
};

export type StudioButtonFamilyDiscoveryEntry = {
  contractId: typeof STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT;
  id: string;
  label: string;
  description: string;
  model: StudioButtonFamilyModel;
  readiness: StudioButtonFamilyReadiness;
  exposure: "visible" | "hidden";
  available: boolean;
  previewSrc?: string;
  previewAlt?: string;
  provenanceAuthority: string;
  sections: readonly StudioButtonFamilySection[];
  assembly?: {
    supported: boolean;
    mutationReadiness: "ready" | "deliberately-deferred" | "not-applicable";
    entryLabel: string;
    explanation: string;
  };
};

export type StudioButtonFamilyCatalog = {
  contractId: typeof STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT;
  entries: readonly StudioButtonFamilyDiscoveryEntry[];
};

export function findStudioButtonFamily(
  catalog: StudioButtonFamilyCatalog,
  familyId: string,
): StudioButtonFamilyDiscoveryEntry | undefined {
  return catalog.entries.find((entry) => entry.id === familyId);
}

export function visibleStudioButtonFamilies(catalog: StudioButtonFamilyCatalog) {
  return catalog.entries.filter((entry) => entry.exposure === "visible" && entry.readiness !== "empty");
}
