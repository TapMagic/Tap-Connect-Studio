import { actionProps, reconcileActionIntent, standardButtonActions, validateActionDestination, type StandardButtonActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import {
  STUDIO_AUTHORING_CAPABILITY_CONTRACT,
  type StudioAuthoringCapabilityContract,
  type StudioAuthoringControl,
  type StudioAuthoringSelectionContext,
} from "../platform/authoring-contract";
import type { StudioCuratedAssemblyMutation, StudioStructuredAssemblyDescriptor } from "../platform/structured-assembly";
import type { StudioSemanticResource } from "../platform/semantic-resource-slot";
import { assertStudioAuthoringCompleteness, declaredAuthoringCapability } from "../platform/authoring-completeness";

export const CURATED_AUTHORING_COMMANDS = {
  setLayout: "curated.layout.set",
  setCount: "curated.action-count.set",
  updateAction: "curated.action.update",
  reorderAction: "curated.action.reorder",
  setResourceSlot: "curated.resource-slot.set",
  setAppearance: "curated.appearance.set",
} as const;

export type CuratedAuthoringCommandPayload =
  | { layoutMode: "standalone" | "single-stack" | "twin-rail" }
  | { count: number }
  | { actionId: string; patch: Extract<StudioCuratedAssemblyMutation, { type: "update-action" }>["patch"] }
  | { controlId: string; slotId: string; resource?: StudioSemanticResource }
  | { controlId: string; roleId: string; value: string }
  | { from: number; to: number };

export function curatedAuthoringSelection(
  assembly: StudioStructuredAssemblyDescriptor,
  selectedNodeId: string,
  activeActionId?: string,
): StudioAuthoringSelectionContext {
  return {
    level: activeActionId ? "module-internal" : "module",
    objectId: selectedNodeId,
    objectKind: "curated-system",
    objectLabel: assembly.familyLabel,
    governance: "curated",
    internalId: activeActionId,
    parentPath: [
      { id: "card", label: "Card", level: "card" },
      { id: assembly.objectId, label: assembly.familyLabel, level: "module" },
    ],
  };
}

export function createCuratedAuthoringCapability(
  assembly: StudioStructuredAssemblyDescriptor,
  activeActionId?: string,
): StudioAuthoringCapabilityContract {
  const active = assembly.slots.find((slot) => slot.id === activeActionId) ?? assembly.slots[0];
  const actionOptions = standardButtonActions();
  const activePresentation = actionOptions.find((action) => action.kind === active?.actionType) ?? actionOptions.find((action) => action.kind === "website")!;
  const activeSize = assembly.textSizes.find((size) => size.id === (active?.textSize || "medium")) ?? assembly.textSizes.find((size) => size.id === "medium");
  const availableTextSizes = assembly.textSizes.filter((size) => size.availability !== "disabled");
  const precision = assembly.textPrecision;
  const activePx = active?.textSizePx ?? precision?.defaultPx ?? activeSize?.phonePx ?? 14;
  const characterLimit = precision ? characterLimitAt(precision, activePx) : activeSize?.recommendedCharacterCount;
  const precisionSafeMax = precision ? safeMaxForLabel(precision, active?.label.trim().length ?? 0) : undefined;
  const textSizeControls: StudioAuthoringControl[] = precision || availableTextSizes.length > 1 ? [{
    id: "text-size",
    label: "Text size",
    description: "Exact phone-scale label size. Certified preset assemblies remain compatible.",
    type: "precision",
    value: activePx,
    unit: "px",
    min: precision?.minPx ?? Math.min(...availableTextSizes.map((size) => size.phonePx)),
    max: precisionSafeMax ?? Math.max(...availableTextSizes.filter((size) => (active?.label.trim().length ?? 0) <= size.recommendedCharacterCount).map((size) => size.phonePx), Math.min(...availableTextSizes.map((size) => size.phonePx))),
    step: precision?.stepPx ?? 1,
    fineStep: precision?.stepPx ?? .5,
    defaultValue: precision?.defaultPx ?? availableTextSizes.find((size) => size.id === "medium")?.phonePx ?? availableTextSizes[0]?.phonePx ?? 14,
    commandId: CURATED_AUTHORING_COMMANDS.updateAction,
    guidance: "Certified range at phone density.",
  }] : [];
  const roster = {
    id: "action-roster",
    label: "Action roster",
    type: "action-roster" as const,
    commandId: CURATED_AUTHORING_COMMANDS.reorderAction,
    activeId: activeActionId,
    items: assembly.slots.map((slot) => ({ id: slot.id, label: slot.label, secondary: slot.plugLabel || "Compatible plug", previewRef: slot.plugPreviewSrc })),
  };
  const treatmentRoles = assembly.appearance.textTreatmentLabel ? [{
    id: "text-treatment",
    label: "Text treatment",
    optionLabel: assembly.appearance.textTreatmentLabel,
    preview: "linear-gradient(145deg,#fff7d2,#a98445)",
    governed: true,
  }] : [];
  const fixedTextSizeRoles = !precision && availableTextSizes.length === 1 ? [{
    id: "label-size",
    label: "Label size",
    optionLabel: `${availableTextSizes[0].phonePx}px at phone density`,
    preview: "linear-gradient(145deg,#131922,#05070a)",
    governed: true,
  }] : [];
  const resourceControls: StudioAuthoringControl[] = (assembly.resourceSlots ?? [])
    .filter((slot) => slot.applicable)
    .map((slot) => ({
      id: `resource-slot:${slot.id}`,
      label: slot.label,
      description: slot.presentation.ownership === "governed"
        ? "Choose the content. The certified recipe owns its fit and placement."
        : "Choose the content for this surface.",
      type: "asset-slot" as const,
      slot,
      commandId: CURATED_AUTHORING_COMMANDS.setResourceSlot,
      interactionClass: "choice" as const,
      semanticGroup: "content" as const,
      responsivePresentation: "full-browser" as const,
    }));
  const identitySlot = (assembly.resourceSlots ?? []).find((slot) => slot.id === "identity");
  const configurableAppearanceControls: StudioAuthoringControl[] = assembly.appearance.roles
    .filter((role) => !role.governed && role.options.some((option) => option.availability === "enabled"))
    .map((role) => ({
      id: `appearance:${role.id}`,
      label: role.label,
      description: "Choose a Product Owner and Design-certified family treatment.",
      type: "visual-grid" as const,
      value: role.value,
      commandId: CURATED_AUTHORING_COMMANDS.setAppearance,
      interactionClass: "choice" as const,
      semanticGroup: "appearance" as const,
      options: role.options.map((option) => ({
        id: option.id,
        label: option.label,
        previewRef: option.preview,
        availability: option.availability,
        disabledReason: option.disabledReason,
        recommended: option.recommended,
        metadata: { rendererValue: option.rendererValue, roleId: role.id },
      })),
    }));
  const declarations = [
    declaredAuthoringCapability({
      id: "curated.identity",
      label: identitySlot?.label ?? "Curated identity",
      classification: "editable-reachable",
      applicable: Boolean(identitySlot?.applicable),
      stateAuthority: assembly.adapterAuthority,
      compilerAuthority: assembly.compiler,
      rendererAuthority: "SignatureMasterBridge/canonical-composition-renderer",
      persistenceAuthority: "signatureAssemblyAuthoring@1.0.0",
      validationAuthority: "studioSemanticResourceSlot@1.0.0 + Curated recipe socket",
      historyAuthority: "CardBuilder labeled undo/redo",
      controlId: identitySlot ? `resource-slot:${identitySlot.id}` : undefined,
      commandId: CURATED_AUTHORING_COMMANDS.setResourceSlot,
      parityAuthorities: ["canvas", "preview", "public", "live-device"],
      visualAcceptance: identitySlot?.presentation.visualFit ? {
        fitContractId: identitySlot.presentation.visualFit.contractId,
        rendererMapping: "StudioVisualResourceProjection",
        normalResourcePolicy: "host-confirmed-crop",
        incompatibleResourcePolicy: identitySlot.presentation.visualFit.fallback === "reject" ? "reject-with-guidance" : "safe-fallback",
        runtimeInspectionRequired: true,
      } : undefined,
    }),
    declaredAuthoringCapability({
      id: "curated.structural-geometry",
      label: "Curated structural geometry",
      classification: "governed",
      applicable: true,
      stateAuthority: assembly.adapterAuthority,
      compilerAuthority: assembly.compiler,
      rendererAuthority: "SignatureMasterBridge/canonical-composition-renderer",
      persistenceAuthority: "recipe identity and canonical inputs",
      validationAuthority: "certified recipe",
      historyAuthority: "derived output is not directly mutable",
      parityAuthorities: ["canvas", "preview", "public", "live-device"],
    }),
    declaredAuthoringCapability({
      id: "curated.appearance",
      label: "Curated family appearance",
      classification: configurableAppearanceControls.length ? "editable-reachable" : "governed",
      applicable: true,
      stateAuthority: `${assembly.appearance.contractId}@${assembly.appearance.contractVersion}`,
      compilerAuthority: assembly.compiler,
      rendererAuthority: "familyAppearance renderer mappings + canonical composition renderer",
      persistenceAuthority: "signatureAssemblyAuthoring.appearance.semanticOptionIds",
      validationAuthority: "certified family combinations and accessibility rules",
      historyAuthority: "CardBuilder labeled undo/redo",
      controlId: configurableAppearanceControls[0]?.id,
      commandId: configurableAppearanceControls.length ? CURATED_AUTHORING_COMMANDS.setAppearance : undefined,
      parityAuthorities: ["canvas", "preview", "public", "live-device"],
    }),
  ];
  const contract: StudioAuthoringCapabilityContract = {
    contractId: STUDIO_AUTHORING_CAPABILITY_CONTRACT,
    id: `signatureCuratedAuthoring:${assembly.familyId}@1.0.0`,
    version: "1.0.0",
    adapterAuthority: assembly.adapterAuthority,
    subject: { kind: "curated-system", familyId: assembly.familyId },
    selectionLevels: ["module", "module-internal"],
    groups: [
      {
        id: "composition",
        label: "Composition",
        level: "module",
        controls: [
          ...resourceControls,
          {
            id: "layout",
            label: "Layout",
            description: "Choose a certified recipe. Structure recompiles automatically.",
            type: "visual-layout",
            value: assembly.layoutMode,
            commandId: CURATED_AUTHORING_COMMANDS.setLayout,
            options: assembly.layouts.map((layout) => ({ id: layout.id, label: layout.label, description: layout.description, availability: "enabled" as const, metadata: { actionCountOptions: layout.allowedActionCounts.join(",") } })),
          },
          {
            id: "action-count",
            label: "Actions",
            description: "Count remains inside this recipe’s certified limits.",
            type: "count-stepper",
            value: assembly.inputCount,
            options: assembly.allowedActionCounts,
            commandId: CURATED_AUTHORING_COMMANDS.setCount,
          },
          roster,
          ...configurableAppearanceControls,
          {
            id: "appearance",
            label: "Appearance",
            description: "Only Product Owner and Design-certified options are exposed.",
            type: "appearance-status",
            roles: [...assembly.appearance.roles.filter((role) => role.governed), ...treatmentRoles, ...fixedTextSizeRoles],
          },
          {
            id: "governance",
            label: "Governed assembly",
            type: "governance-status",
            statements: ["Attachment geometry and vertical optical alignment remain automatic.", "Rails, bridges, spine, caps, crown, and topper are compiler-owned."],
          },
        ],
      },
      {
        id: "action-navigation",
        label: "Actions",
        level: "module-internal",
        controls: [roster],
      },
      {
        id: "content",
        label: "Content",
        level: "module-internal",
        controls: active ? [
          { id: "label", label: "Label", type: "text", value: active.label, maxLength: characterLimit, guidance: characterLimit ? `${activePx}px is phone-safe up to ${characterLimit} characters in ${assembly.recipeLabel}.` : undefined, commandId: CURATED_AUTHORING_COMMANDS.updateAction },
          { id: "accessible-name", label: "Accessible name", type: "text", value: active.accessibleName || active.label, commandId: CURATED_AUTHORING_COMMANDS.updateAction },
          {
            id: "action-intent",
            label: "Action",
            type: "action-intent",
            value: active.actionType || "website",
            commandId: CURATED_AUTHORING_COMMANDS.updateAction,
            options: actionOptions.map((action) => ({ id: action.kind, label: action.label, availability: "enabled" as const, description: action.fieldLabel, metadata: { inputMode: action.inputMode, placeholder: action.placeholder } })),
          },
          { id: "destination", label: activePresentation.fieldLabel, type: "action-destination", value: active.destination || "", actionType: activePresentation.kind, inputMode: activePresentation.inputMode, placeholder: activePresentation.placeholder, commandId: CURATED_AUTHORING_COMMANDS.updateAction },
          {
            id: "alignment",
            label: "Alignment",
            type: "segmented",
            value: active.textAlign || "center",
            commandId: CURATED_AUTHORING_COMMANDS.updateAction,
            options: ["left", "center", "right"].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), availability: "enabled" as const })),
          },
          ...textSizeControls,
          {
            id: "plug",
            label: "Compatible plug",
            description: "Only certified socket-compatible choices appear.",
            type: "visual-grid",
            value: active.plugComponentId,
            commandId: CURATED_AUTHORING_COMMANDS.updateAction,
            searchable: true,
            initialVisibleCount: 8,
            options: assembly.compatiblePlugs.map((plug) => ({ id: plug.componentId, label: plug.label, previewRef: plug.previewSrc, availability: "enabled" as const, compatibilityTags: [assembly.recipeId] })),
          },
        ] : [],
      },
    ],
    commandIds: Object.values(CURATED_AUTHORING_COMMANDS),
    previewAuthority: "SignatureMasterBridge/canonical-composition-renderer",
    persistenceAuthority: "signatureAssemblyAuthoring@1.0.0",
    historyAuthority: "CardBuilder labeled undo/redo",
    entitlementKeys: [],
    tapItCommandIds: [CURATED_AUTHORING_COMMANDS.updateAction, CURATED_AUTHORING_COMMANDS.reorderAction],
    capabilityDeclarations: declarations,
  };
  return assertStudioAuthoringCompleteness(declarations, contract);
}

function characterLimitAt(precision: NonNullable<StudioStructuredAssemblyDescriptor["textPrecision"]>, px: number) {
  if (px <= precision.defaultPx) {
    const span = Math.max(.001, precision.defaultPx - precision.minPx);
    const progress = (px - precision.minPx) / span;
    return Math.floor(precision.characterLimits.atMin + (precision.characterLimits.atDefault - precision.characterLimits.atMin) * progress);
  }
  const span = Math.max(.001, precision.maxPx - precision.defaultPx);
  const progress = (px - precision.defaultPx) / span;
  return Math.floor(precision.characterLimits.atDefault + (precision.characterLimits.atMax - precision.characterLimits.atDefault) * progress);
}

function safeMaxForLabel(precision: NonNullable<StudioStructuredAssemblyDescriptor["textPrecision"]>, length: number) {
  for (let px = precision.maxPx; px >= precision.minPx; px -= precision.stepPx) {
    if (length <= characterLimitAt(precision, px)) return Math.round(px * 100) / 100;
  }
  return precision.minPx;
}

export function curatedCommandPayloadToMutation(
  commandId: string,
  payload: unknown,
  assembly?: StudioStructuredAssemblyDescriptor,
): StudioCuratedAssemblyMutation | null {
  if (!payload || typeof payload !== "object") return null;
  if (commandId === CURATED_AUTHORING_COMMANDS.setLayout) {
    const layoutMode = "layoutMode" in payload ? payload.layoutMode : "value" in payload ? payload.value : undefined;
    if (layoutMode === "standalone" || layoutMode === "single-stack" || layoutMode === "twin-rail") return { type: "set-layout", layoutMode };
  }
  if (commandId === CURATED_AUTHORING_COMMANDS.setCount) {
    const count = "count" in payload ? payload.count : "value" in payload ? payload.value : undefined;
    if (typeof count === "number") return { type: "set-action-count", count };
  }
  if (commandId === CURATED_AUTHORING_COMMANDS.setResourceSlot) {
    if (!("slotId" in payload) || typeof payload.slotId !== "string") return null;
    if (!(assembly?.resourceSlots ?? []).some((slot) => slot.id === payload.slotId && slot.applicable)) return null;
    if (!("resource" in payload) || payload.resource == null) return { type: "set-resource-slot", slotId: payload.slotId };
    if (typeof payload.resource !== "object" || !("src" in payload.resource) || typeof payload.resource.src !== "string" || !("alt" in payload.resource) || typeof payload.resource.alt !== "string" || !("provenance" in payload.resource) || typeof payload.resource.provenance !== "string") return null;
    return { type: "set-resource-slot", slotId: payload.slotId, resource: payload.resource as StudioSemanticResource };
  }
  if (commandId === CURATED_AUTHORING_COMMANDS.setAppearance) {
    if (!("roleId" in payload) || typeof payload.roleId !== "string" || !("value" in payload) || typeof payload.value !== "string") return null;
    const role = assembly?.appearance.roles.find((candidate) => candidate.id === payload.roleId);
    const option = role?.options.find((candidate) => candidate.id === payload.value && candidate.availability === "enabled");
    return role && option ? { type: "set-appearance-option", roleId: role.id, optionId: option.id } : null;
  }
  if (commandId === CURATED_AUTHORING_COMMANDS.reorderAction && "from" in payload && "to" in payload && typeof payload.from === "number" && typeof payload.to === "number") return { type: "reorder-action", from: payload.from, to: payload.to };
  if (commandId === CURATED_AUTHORING_COMMANDS.updateAction && "actionId" in payload && typeof payload.actionId === "string") {
    if ("patch" in payload && payload.patch && typeof payload.patch === "object") return { type: "update-action", actionId: payload.actionId, patch: payload.patch } as StudioCuratedAssemblyMutation;
    if (!("controlId" in payload) || !("value" in payload) || typeof payload.controlId !== "string") return null;
    if (payload.controlId === "text-size" && typeof payload.value === "number") {
      return { type: "update-action", actionId: payload.actionId, patch: { textSizePx: payload.value } };
    }
    if (typeof payload.value !== "string") return null;
    const slot = assembly?.slots.find((candidate) => candidate.id === payload.actionId);
    const patch = payload.controlId === "label" ? { label: payload.value }
      : payload.controlId === "accessible-name" ? { accessibilityLabel: payload.value }
      : payload.controlId === "action-intent" ? actionIntentPatch(payload.value, slot?.destination)
          : payload.controlId === "destination" ? destinationPatch(slot?.actionType, payload.value)
            : payload.controlId === "alignment" && ["left", "center", "right"].includes(payload.value) ? { textAlign: payload.value as "left" | "center" | "right" }
              : payload.controlId === "text-size" && ["small", "medium", "large"].includes(payload.value) ? { textSize: payload.value as "small" | "medium" | "large" }
                : payload.controlId === "plug" ? { plugComponentId: payload.value }
                  : null;
    return patch ? { type: "update-action", actionId: payload.actionId, patch } : null;
  }
  return null;
}

function destinationPatch(actionType: string | undefined, destination: string) {
  const kind = standardButtonActions().some((action) => action.kind === actionType) ? actionType as StandardButtonActionIntent : "website";
  const reconciled = reconcileActionIntent(kind, destination);
  const props = actionProps(reconciled.kind, reconciled.destination);
  return { actionType: String(props.actionType), destination: String(props.href) };
}

function actionIntentPatch(actionType: string, currentDestination?: string) {
  const kind = standardButtonActions().some((action) => action.kind === actionType) ? actionType as StandardButtonActionIntent : "website";
  if (currentDestination && !validateActionDestination(kind, currentDestination)) {
    const props = actionProps(kind, currentDestination);
    return { actionType: String(props.actionType), destination: String(props.href) };
  }
  const destination = kind === "call" ? "tel:"
    : kind === "sms" ? "sms:"
      : kind === "email" ? "mailto:"
        : kind === "map" ? "geo:"
          : "https://";
  return { actionType: kind, destination };
}
