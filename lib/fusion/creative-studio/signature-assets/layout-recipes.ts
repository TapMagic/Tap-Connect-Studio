import {
  APPROVED_SIGNATURE_CONTRACT_IDS,
  isSignatureContractId,
  type SignatureAssemblyContractId,
  type SignatureLayoutRecipe,
  type SignatureSide,
  type SignatureSocketContractId,
} from "./types";

export type SignatureAssemblyComponentReference = {
  role: string;
  componentId?: string;
  side?: SignatureSide;
  ownsSockets?: readonly SignatureSocketContractId[];
};

export type SignatureActionMasterStrategy =
  | { mode: "single"; master: SignatureAssemblyComponentReference }
  | { mode: "alternating"; sequence: readonly SignatureAssemblyComponentReference[] }
  | {
      mode: "side-specific";
      masters: Readonly<Partial<Record<Extract<SignatureSide, "left" | "right" | "center">, SignatureAssemblyComponentReference>>>;
    };

export type SignatureLiveActionUnit = {
  id: string;
  kind: "row" | "paired-level";
  capacity: number;
  masterStrategy: SignatureActionMasterStrategy;
  socketOwnership: "action-master" | "assembly";
};

export type SignatureRepeatInterval = {
  id: string;
  components: readonly SignatureAssemblyComponentReference[];
  axis: "y";
  cadence: "action-row" | "paired-level" | string;
  nativeStridePx: number;
  normalizedStride: number;
  preferredOverlapPx: number;
  maximumSeamOverlapPx: number;
  placement: "between-action-units";
};

export type SignatureOddActionTreatment =
  | { mode: "not-applicable" }
  | {
      mode: "full-width-after-complete-pairs";
      terminateRepeatsAfterLastCompleteUnit: true;
      finalActionMaster: SignatureAssemblyComponentReference;
      transitionFurniture: SignatureAssemblyComponentReference;
      transitionIsInteractive: false;
      structuralTerminationFollows: true;
    };

export type SignatureAssemblyCertificationLimits = {
  minimumActions: number;
  launchCertifiedActionCounts: readonly number[];
  structuralProofOnlyActionCounts?: readonly number[];
  maximumLaunchCertifiedActions: number;
};

export type SignatureAssemblyVerticalReference =
  | "assembly-origin"
  | "unit-start"
  | "content-end"
  | "odd-action-end"
  | "transition-end";

export type SignatureAssemblyPlacementRule = {
  role: string;
  side?: SignatureSide;
  verticalReference: SignatureAssemblyVerticalReference;
  xPx: number;
  yOffsetPx: number;
  scale: number;
  zOrder: number;
  attachmentAnchorId?: string;
  targetXPx?: number;
};

export type SignatureAssemblyGeometryContract = {
  coordinateWidthPx: number;
  unitStridePx: number;
  fixedTop: readonly SignatureAssemblyPlacementRule[];
  actionSlots: readonly SignatureAssemblyPlacementRule[];
  repeatComponents: readonly SignatureAssemblyPlacementRule[];
  structuralTermination: SignatureAssemblyPlacementRule;
  decorativeTermination?: SignatureAssemblyPlacementRule;
  oddAction?: {
    action: SignatureAssemblyPlacementRule;
    transition: SignatureAssemblyPlacementRule;
  };
};

export type SignatureAssemblyRecipe = {
  contractId: SignatureAssemblyContractId;
  familyId: string;
  familyVersion: `${number}.${number}.${number}`;
  recipeId: string;
  recipeVersion: `${number}.${number}.${number}`;
  fixedTop: readonly SignatureAssemblyComponentReference[];
  actionUnit: SignatureLiveActionUnit;
  repeatInterval?: SignatureRepeatInterval;
  structuralTermination: SignatureAssemblyComponentReference;
  optionalDecorativeTermination?: SignatureAssemblyComponentReference;
  oddActionTreatment: SignatureOddActionTreatment;
  attachmentOrder: readonly string[];
  certificationLimits: SignatureAssemblyCertificationLimits;
  geometry: SignatureAssemblyGeometryContract;
};

export const SIGNATURE_ASSEMBLY_CONTRACT_IDS = {
  singleStack: APPROVED_SIGNATURE_CONTRACT_IDS.singleStackAssembly,
  twinRail: APPROVED_SIGNATURE_CONTRACT_IDS.twinRailAssembly,
} as const satisfies Record<string, SignatureAssemblyContractId>;

export function validateSignatureAssemblyRecipe(recipe: SignatureAssemblyRecipe): readonly string[] {
  const errors: string[] = [];
  const expectedContract = recipe.actionUnit.kind === "row" ? "singleStackAssembly" : "twinRailAssembly";
  if (!isSignatureContractId(recipe.contractId, expectedContract)) {
    errors.push(`contractId must be a versioned ${expectedContract} contract`);
  }
  if (recipe.fixedTop.length === 0) errors.push("fixedTop must contain at least one structural component");
  if (recipe.actionUnit.capacity < 1) errors.push("actionUnit capacity must be positive");
  if (recipe.repeatInterval) {
    if (recipe.repeatInterval.nativeStridePx <= 0) errors.push("repeat stride must be positive");
    if (recipe.repeatInterval.normalizedStride <= 0) errors.push("normalized repeat stride must be positive");
    if (recipe.repeatInterval.preferredOverlapPx < 0) errors.push("preferred overlap cannot be negative");
    if (recipe.repeatInterval.maximumSeamOverlapPx < recipe.repeatInterval.preferredOverlapPx) {
      errors.push("maximum seam overlap cannot be less than preferred overlap");
    }
  }
  if (recipe.actionUnit.masterStrategy.mode === "alternating" && recipe.actionUnit.masterStrategy.sequence.length < 2) {
    errors.push("alternating action strategy requires at least two masters");
  }
  if (recipe.actionUnit.masterStrategy.mode === "side-specific") {
    if (!recipe.actionUnit.masterStrategy.masters.left || !recipe.actionUnit.masterStrategy.masters.right) {
      errors.push("side-specific action strategy requires left and right masters");
    }
  }
  if (recipe.oddActionTreatment.mode !== "not-applicable" && recipe.actionUnit.kind !== "paired-level") {
    errors.push("odd-action treatment is valid only for paired-level assemblies");
  }
  if (new Set(recipe.attachmentOrder).size !== recipe.attachmentOrder.length) {
    errors.push("attachmentOrder entries must be unique");
  }
  if (!recipe.attachmentOrder.includes(recipe.actionUnit.id)) {
    errors.push("attachmentOrder must include the live action unit");
  }
  if (recipe.repeatInterval && !recipe.attachmentOrder.includes(recipe.repeatInterval.id)) {
    errors.push("attachmentOrder must include the repeat interval");
  }
  if (recipe.certificationLimits.maximumLaunchCertifiedActions < recipe.certificationLimits.minimumActions) {
    errors.push("maximum launch-certified actions cannot be below the minimum");
  }
  if (recipe.geometry.coordinateWidthPx <= 0 || recipe.geometry.unitStridePx <= 0) {
    errors.push("assembly geometry requires positive coordinate width and unit stride");
  }
  if (recipe.geometry.actionSlots.length === 0) errors.push("assembly geometry requires at least one action slot");
  if (recipe.geometry.repeatComponents.length !== (recipe.repeatInterval?.components.length ?? 0)) {
    errors.push("repeat placement rules must match repeat interval components");
  }
  if (recipe.geometry.fixedTop.length !== recipe.fixedTop.length) errors.push("fixed-top placement rules must match fixed-top components");
  recipe.fixedTop.forEach((component,index)=>{
    if (recipe.geometry.fixedTop[index]?.role!==component.role) errors.push(`fixed-top placement ${index} must match role ${component.role}`);
  });
  recipe.repeatInterval?.components.forEach((component,index)=>{
    if (recipe.geometry.repeatComponents[index]?.role!==component.role) errors.push(`repeat placement ${index} must match role ${component.role}`);
  });
  const actionMasters = recipe.actionUnit.masterStrategy.mode==="single"
    ? [recipe.actionUnit.masterStrategy.master]
    : recipe.actionUnit.masterStrategy.mode==="alternating"
      ? recipe.actionUnit.masterStrategy.sequence
      : Object.values(recipe.actionUnit.masterStrategy.masters).filter((component):component is SignatureAssemblyComponentReference=>Boolean(component));
  actionMasters.forEach((component)=>{
    if (!recipe.geometry.actionSlots.some((rule)=>rule.role===component.role && (!component.side || rule.side===component.side))) errors.push(`action placement must cover role ${component.role}${component.side?` on ${component.side}`:""}`);
  });
  if (recipe.geometry.structuralTermination.role!==recipe.structuralTermination.role) errors.push("structural termination placement must match its component role");
  if (recipe.optionalDecorativeTermination && recipe.geometry.decorativeTermination?.role!==recipe.optionalDecorativeTermination.role) errors.push("decorative termination placement must match its component role");
  if (recipe.oddActionTreatment.mode==="full-width-after-complete-pairs") {
    if (recipe.geometry.oddAction?.action.role!==recipe.oddActionTreatment.finalActionMaster.role) errors.push("odd-action placement must match the final action role");
    if (recipe.geometry.oddAction?.transition.role!==recipe.oddActionTreatment.transitionFurniture.role) errors.push("odd transition placement must match its furniture role");
  }
  const placementRules = [
    ...recipe.geometry.fixedTop,
    ...recipe.geometry.actionSlots,
    ...recipe.geometry.repeatComponents,
    recipe.geometry.structuralTermination,
    ...(recipe.geometry.decorativeTermination?[recipe.geometry.decorativeTermination]:[]),
    ...(recipe.geometry.oddAction?[recipe.geometry.oddAction.action,recipe.geometry.oddAction.transition]:[]),
  ];
  if (placementRules.some((rule)=>!Number.isFinite(rule.xPx)||!Number.isFinite(rule.yOffsetPx)||!Number.isFinite(rule.scale)||rule.scale<=0)) {
    errors.push("assembly placement rules require finite coordinates and positive scale");
  }
  return errors;
}

export const SIGNATURE_LAYOUT_RECIPES: readonly SignatureLayoutRecipe[] = [
  { id: "SINGLE", label: "Single", minItems: 1, maxItems: 1, columns: 1, compact: false },
  { id: "STACK-2", label: "Two-row stack", minItems: 2, maxItems: 2, columns: 1, compact: false },
  { id: "STACK-3", label: "Three-row stack", minItems: 3, maxItems: 3, columns: 1, compact: false },
  { id: "GRID-2", label: "Two-column grid", minItems: 2, maxItems: 12, columns: 2, compact: false },
  { id: "GROUPED-COMPACT", label: "Grouped compact", minItems: 2, maxItems: 8, columns: 1, compact: true },
  { id: "ICON-ROW", label: "Independent icon row", minItems: 3, maxItems: 6, columns: 1, compact: true },
] as const;

export function getSignatureLayoutRecipe(id: SignatureLayoutRecipe["id"]) {
  return SIGNATURE_LAYOUT_RECIPES.find((recipe) => recipe.id === id);
}
