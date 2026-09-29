/**
 * Curated-System cockpit contract for governed multipart compositions.
 *
 * Domain adapters map their canonical recipe state into this descriptor. The
 * shell may inspect and route the user to assembly-input editing without ever
 * treating generated rails, spines, caps, or other furniture as loose objects.
 */

export const STUDIO_CURATED_ASSEMBLY_CONTRACT = "studioCuratedAssembly@1.0.0" as const;
/** @deprecated Compatibility export for the pre-scope-clarification name. */
export const STUDIO_STRUCTURED_ASSEMBLY_CONTRACT = STUDIO_CURATED_ASSEMBLY_CONTRACT;

export type StudioStructuredAssemblySlot = {
  id: string;
  label: string;
  destination?: string;
  actionType?: string;
  accessibleName?: string;
  plugComponentId?: string;
  plugPresentationId?: string;
  semanticIconRef?: import("../icon-asset").IconAsset;
  semanticLabel?: string;
  sublabel?: string;
  plugSide?: "left" | "right";
  plugLabel?: string;
  plugPreviewSrc?: string;
  textAlign?: "left" | "center" | "right";
  textSize?: "small" | "medium" | "large";
  textSizePx?: number;
  contentType: "action" | "identity" | "plug" | "content";
  required: boolean;
  order: number;
};

export type StudioStructuredAssemblyDescriptor = {
  contractId: typeof STUDIO_CURATED_ASSEMBLY_CONTRACT;
  adapterAuthority: string;
  familyId: string;
  familyLabel: string;
  objectId: string;
  layoutMode: "standalone" | "single-stack" | "twin-rail";
  presentationId?: string;
  recipeId: string;
  recipeVersion: string;
  recipeLabel: string;
  inputCount: number;
  slots: readonly StudioStructuredAssemblySlot[];
  resourceSlots?: readonly import("./semantic-resource-slot").StudioSemanticResourceSlot[];
  allowedActionCounts: readonly number[];
  layouts: readonly {
    id: string;
    layoutMode?: "standalone" | "single-stack" | "twin-rail";
    label: string;
    description: string;
    allowedActionCounts: readonly number[];
  }[];
  capabilities?: {
    supportsSublabel: boolean;
    supportsSemanticIcon: boolean;
    plugSide: "fixed" | "authorable" | "derived";
    allowedPlugSides?: readonly ("left" | "right")[];
  };
  textSizes: readonly {
    id: "small" | "medium" | "large";
    label: string;
    phonePx: number;
    recommendedCharacterCount: number;
    availability?: "enabled" | "disabled";
    disabledReason?: string;
  }[];
  textPrecision?: {
    minPx: number;
    maxPx: number;
    stepPx: number;
    defaultPx: number;
    characterLimits: { atMin: number; atDefault: number; atMax: number };
  };
  appearance: {
    contractId: string;
    contractVersion: string;
    roles: readonly {
      id: string;
      label: string;
      value: string;
      optionLabel: string;
      preview: string;
      governed: boolean;
      options: readonly {
        id: string;
        label: string;
        preview: string;
        rendererValue: string;
        availability: "enabled" | "disabled" | "read-only";
        disabledReason?: string;
        recommended?: boolean;
      }[];
    }[];
    textTreatmentLabel?: string;
  };
  compatiblePlugs: readonly {
    componentId: string;
    label: string;
    previewSrc: string;
    previewAlt: string;
  }[];
  compatibleSemanticIcons?: readonly import("../icon-asset").IconAsset[];
  outputOwnership: "recipe-governed";
  compiler: "deterministic";
  mutationReadiness: "ready" | "deliberately-deferred";
  preservedAuthorities: readonly string[];
};

type StudioCuratedAssemblyMutationInput =
  | { type: "update-action"; actionId: string; patch: { label?: string; sublabel?: string; destination?: string; actionType?: string; accessibilityLabel?: string; semanticLabel?: string; plugComponentId?: string; plugPresentationId?: string; semanticIconRef?: import("../icon-asset").IconAsset; plugSide?: "left" | "right"; textAlign?: "left" | "center" | "right"; textSize?: "small" | "medium" | "large"; textSizePx?: number } }
  | { type: "reorder-action"; from: number; to: number }
  | { type: "set-action-count"; count: number }
  | { type: "set-resource-slot"; slotId: string; resource?: import("./semantic-resource-slot").StudioSemanticResource }
  | { type: "set-appearance-option"; roleId: string; optionId: string }
  | { type: "set-layout"; layoutMode: "standalone" | "single-stack" | "twin-rail" }
  | { type: "set-presentation"; presentationId: string };

export type StudioCuratedAssemblyMutation = StudioCuratedAssemblyMutationInput & {
  commandId?: string;
  provenance?: "host" | "tapit" | "system";
};
