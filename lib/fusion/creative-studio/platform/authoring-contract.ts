/**
 * Shared contextual-authoring contract.
 *
 * Domain adapters describe authoring intent. StudioAuthoringShell owns the
 * presentation grammar, while canonical models remain the only mutation and
 * persistence authorities.
 */

export const STUDIO_AUTHORING_CAPABILITY_LEGACY_CONTRACT = "studioAuthoringCapability@1.0.0" as const;
export const STUDIO_AUTHORING_CAPABILITY_CONTRACT = "studioAuthoringCapability@2.0.0" as const;
export const STUDIO_AUTHORING_COMMAND_CONTRACT = "studioAuthoringCommand@1.0.0" as const;

export type StudioAuthoringLevel = "card" | "container" | "module" | "module-internal";
export type StudioAuthoringProvenance = "host" | "tapit" | "system";

export type StudioAuthoringSelectionContext = {
  level: StudioAuthoringLevel;
  objectId: string;
  objectKind: string;
  objectLabel: string;
  parentPath: readonly { id: string; label: string; level: Exclude<StudioAuthoringLevel, "module-internal"> }[];
  governance: "direct" | "curated";
  internalId?: string;
};

export type StudioAuthoringVisualOption = {
  id: string;
  label: string;
  previewRef?: string;
  description?: string;
  availability: "enabled" | "disabled" | "read-only";
  disabledReason?: string;
  recommended?: boolean;
  compatibilityTags?: readonly string[];
  metadata?: Readonly<Record<string, string | number | boolean>>;
};

type StudioAuthoringControlBase = {
  id: string;
  label: string;
  description?: string;
  commandId?: string;
  entitlementKey?: string;
  availability?: "enabled" | "disabled" | "read-only";
  disabledReason?: string;
  interactionClass?: "choice" | "continuous" | "text-entry" | "collection" | "status";
  semanticGroup?: "content" | "action" | "appearance" | "position" | "structure" | "accessibility" | "governance";
  responsivePresentation?: "inline" | "popover" | "drawer" | "partial-sheet" | "full-browser";
};

export type StudioAuthoringControl =
  | StudioAuthoringControlBase & { type: "visual-layout"; value: string; options: readonly StudioAuthoringVisualOption[] }
  | StudioAuthoringControlBase & { type: "count-stepper"; value: number; options: readonly number[] }
  | StudioAuthoringControlBase & { type: "action-roster"; activeId?: string; items: readonly { id: string; label: string; secondary?: string; previewRef?: string }[] }
  | StudioAuthoringControlBase & { type: "text"; value: string; inputMode?: "text" | "url" | "email" | "tel"; placeholder?: string; maxLength?: number; guidance?: string }
  | StudioAuthoringControlBase & { type: "action-intent"; value: string; options: readonly StudioAuthoringVisualOption[] }
  | StudioAuthoringControlBase & { type: "action-destination"; value: string; actionType: string; inputMode: "text" | "url" | "email" | "tel"; placeholder: string }
  | StudioAuthoringControlBase & { type: "segmented"; value: string; options: readonly StudioAuthoringVisualOption[] }
  | StudioAuthoringControlBase & { type: "precision"; value: number; unit: "px" | "%" | "deg" | "number"; min: number; max: number; step: number; fineStep?: number; defaultValue?: number; guidance?: string }
  | StudioAuthoringControlBase & { type: "visual-grid"; value?: string; options: readonly StudioAuthoringVisualOption[]; searchable?: boolean; initialVisibleCount?: number }
  | StudioAuthoringControlBase & { type: "asset-slot"; slot: import("./semantic-resource-slot").StudioSemanticResourceSlot }
  | StudioAuthoringControlBase & { type: "appearance-status"; roles: readonly { id: string; label: string; optionLabel: string; preview: string; governed: boolean }[] }
  | StudioAuthoringControlBase & { type: "governance-status"; statements: readonly string[] };

export type StudioAuthoringGroup = {
  id: string;
  label: string;
  level: StudioAuthoringLevel;
  controls: readonly StudioAuthoringControl[];
};

export type StudioAuthoringCapabilityContract = {
  contractId: typeof STUDIO_AUTHORING_CAPABILITY_CONTRACT | typeof STUDIO_AUTHORING_CAPABILITY_LEGACY_CONTRACT;
  id: string;
  version: `${number}.${number}.${number}`;
  adapterAuthority: string;
  subject: { kind: string; familyId?: string };
  selectionLevels: readonly StudioAuthoringLevel[];
  groups: readonly StudioAuthoringGroup[];
  commandIds: readonly string[];
  previewAuthority: string;
  persistenceAuthority: string;
  historyAuthority: string;
  entitlementKeys: readonly string[];
  tapItCommandIds: readonly string[];
  capabilityDeclarations?: readonly import("./authoring-completeness").StudioDeclaredAuthoringCapability[];
};

export type StudioAuthoringCommand<TPayload = unknown> = {
  contractId: typeof STUDIO_AUTHORING_COMMAND_CONTRACT;
  capabilityContractId: string;
  commandId: string;
  target: StudioAuthoringSelectionContext;
  payload: TPayload;
  historyLabel: string;
  provenance: StudioAuthoringProvenance;
};

export function createStudioAuthoringCommand<TPayload>(
  contract: StudioAuthoringCapabilityContract,
  input: Omit<StudioAuthoringCommand<TPayload>, "contractId" | "capabilityContractId">,
): StudioAuthoringCommand<TPayload> {
  if (!contract.commandIds.includes(input.commandId)) {
    throw new Error(`Command ${input.commandId} is not declared by ${contract.id}.`);
  }
  if (input.provenance === "tapit" && !contract.tapItCommandIds.includes(input.commandId)) {
    throw new Error(`Command ${input.commandId} is not available to tApIt for ${contract.id}.`);
  }
  return {
    ...input,
    contractId: STUDIO_AUTHORING_COMMAND_CONTRACT,
    capabilityContractId: contract.id,
  };
}

export function controlForCommand(contract: StudioAuthoringCapabilityContract, commandId: string) {
  return contract.groups.flatMap((group) => group.controls).find((control) => control.commandId === commandId);
}

export function validateStudioAuthoringCommand(
  contract: StudioAuthoringCapabilityContract,
  command: StudioAuthoringCommand,
  grantedEntitlements: readonly string[] = [],
): { ok: true } | { ok: false; message: string } {
  if (command.contractId !== STUDIO_AUTHORING_COMMAND_CONTRACT || command.capabilityContractId !== contract.id) {
    return { ok: false, message: "This authoring command does not belong to the selected object." };
  }
  if (!contract.commandIds.includes(command.commandId)) {
    return { ok: false, message: "This capability is not available for the selected object." };
  }
  if (command.provenance === "tapit" && !contract.tapItCommandIds.includes(command.commandId)) {
    return { ok: false, message: "tApIt cannot perform this operation for the selected object." };
  }
  const payload = command.payload && typeof command.payload === "object" ? command.payload as Record<string, unknown> : null;
  const requestedControlId = typeof payload?.controlId === "string" ? payload.controlId : null;
  const control = requestedControlId
    ? contract.groups.flatMap((group) => group.controls).find((candidate) => candidate.id === requestedControlId && candidate.commandId === command.commandId)
    : controlForCommand(contract, command.commandId);
  if (requestedControlId && !control) return { ok: false, message: "This control is not available for the selected object." };
  if (control?.availability === "disabled" || control?.availability === "read-only") {
    return { ok: false, message: control.disabledReason || "This governed capability is not editable." };
  }
  if (control?.entitlementKey && !grantedEntitlements.includes(control.entitlementKey)) {
    return { ok: false, message: "This capability is not included in the current workspace entitlement." };
  }
  if (control && "options" in control && payload && "value" in payload) {
    const option = control.options.find((candidate) => typeof candidate === "number" ? candidate === payload.value : candidate.id === payload.value);
    if (option == null) return { ok: false, message: "That value is outside the selected object’s governed options." };
    if (typeof option !== "number" && option.availability !== "enabled") return { ok: false, message: option.disabledReason || "That governed option is not currently available." };
  }
  if (control?.type === "precision" && payload && typeof payload.value === "number") {
    if (payload.value < control.min || payload.value > control.max) {
      return { ok: false, message: `That value must be between ${control.min} and ${control.max} ${control.unit === "number" ? "" : control.unit}.`.trim() };
    }
  }
  return { ok: true };
}

export function createStudioAuthoringRegistry() {
  const contracts = new Map<string, StudioAuthoringCapabilityContract>();
  return {
    register(contract: StudioAuthoringCapabilityContract) {
      if (contracts.has(contract.id)) throw new Error(`Authoring contract ${contract.id} is already registered.`);
      contracts.set(contract.id, contract);
      return contract;
    },
    get(id: string) { return contracts.get(id); },
    resolve(subject: StudioAuthoringCapabilityContract["subject"]) {
      return [...contracts.values()].find((contract) => contract.subject.kind === subject.kind && contract.subject.familyId === subject.familyId);
    },
    list() { return [...contracts.values()]; },
  };
}
