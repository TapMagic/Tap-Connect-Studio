import type { CreativeCompositionBlock } from "../composition";
import type { StudioCuratedAssemblyMutation } from "../platform/structured-assembly";
import type { StudioSemanticResource } from "../platform/semantic-resource-slot";
import { familyAppearanceContract, familyTextTreatmentContract } from "../platform/family-appearance-registry";
import { validateFamilyAppearanceSelection, type FamilyTextTreatmentId } from "../platform/family-appearance";
import {
  resolveSignatureAssembly,
  type SignatureAssemblyActionSelection,
  type SignatureAssemblyInput,
  type SignatureAssemblyLayoutMode,
} from "./assembly";
import { adaptSignatureAssemblyResult, type SignatureCompositionAdapterResult } from "./composition-adapter";
import { SIGNATURE_ASSEMBLY_RECIPES, SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "./registry";
import { signaturePresentation, type SignaturePresentationContract } from "./layout-recipes";
import { canonicalIconAsset } from "../icon-asset";
import {
  isSignatureComponentRuntimeEligible,
  resolveSignatureAccess,
  type SignatureAccessState,
  type SignatureAssetDefinition,
  type SignatureEntitlementKey,
  type SignatureFamilyDefinition,
  type SignatureTypographyRange,
} from "./types";

export const SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT = "signatureAssemblyAuthoring@1.0.0" as const;

export function normalizeSignatureActionCopy(value: string) {
  return value.trim().replace(/\s+([!?.,;:])/g, "$1");
}

export type SignatureAssemblyAuthoringState = {
  contractId: typeof SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT;
  input: SignatureAssemblyInput;
  identityContent?: StudioSemanticResource | { src: string; alt: string };
  identityDefault?: StudioSemanticResource | { src: string; alt: string };
  appearance?: {
    contractId: string;
    contractVersion: string;
    semanticOptionIds: Readonly<Record<string, string>>;
  };
  textTreatment?: {
    contractId: string;
    contractVersion: string;
    requested: FamilyTextTreatmentId;
  };
  lastAuthoringCommand?: {
    commandId: string;
    provenance: "host" | "tapit" | "system";
  };
};

export type SignatureAuthoringLayoutOption = {
  layoutMode: SignatureAssemblyLayoutMode;
  presentationId: string;
  label: string;
  description: string;
  previewAssetId?: string;
  density?: SignaturePresentationContract["density"];
  capabilities?: SignaturePresentationContract["capabilities"];
  defaultActions?: SignaturePresentationContract["defaultActions"];
  recipeId: string;
  recipeVersion: SignatureAssemblyInput["recipeVersion"];
  launchCertifiedActionCounts: readonly number[];
  structuralProofOnlyActionCounts: readonly number[];
};

export type SignatureAuthoringVariant = {
  role: string;
  componentId: string;
  label: string;
  asset: SignatureAssetDefinition;
};

export type SignatureAuthoringFamily = {
  family: SignatureFamilyDefinition;
  previewAsset?: SignatureAssetDefinition;
  certificationStatus: "certified" | "candidate";
  launchMode?: SignatureFamilyDefinition["launchMode"];
  access: SignatureAccessState;
  entitled: boolean;
  runtimeEligible: boolean;
  layouts: readonly SignatureAuthoringLayoutOption[];
  variants: readonly SignatureAuthoringVariant[];
  plugs: readonly SignatureAssetDefinition[];
  informationalComponents: readonly SignatureAssetDefinition[];
};

function runtimeAssets(familyId: string) {
  return SIGNATURE_ASSETS.filter(
    (asset) => asset.familyId === familyId && asset.normalizedContract && isSignatureComponentRuntimeEligible(asset.normalizedContract),
  );
}

export function listSignatureAuthoringFamilies(
  entitlementKeys: readonly SignatureEntitlementKey[] = [],
): readonly SignatureAuthoringFamily[] {
  const granted = new Set(entitlementKeys);
  return SIGNATURE_FAMILIES.map((family) => {
    const entitled = !family.entitlement || granted.has(family.entitlement.entitlementKey);
    const access = family.entitlement
      ? resolveSignatureAccess(family.entitlement, entitled)
      : { visible: true, selectable: true, publishable: true };
    const assets = runtimeAssets(family.id);
    const recipes = SIGNATURE_ASSEMBLY_RECIPES.filter(
      (recipe) => recipe.familyId === family.id && recipe.familyVersion === family.version,
    );
    const variantRoles = new Set(
      recipes.flatMap((recipe) => recipe.fixedTop.map((reference) => reference.role)),
    );
    const variants = assets
      .filter((asset) => {
        const component = asset.normalizedContract!;
        return variantRoles.has(component.role) && component.sockets.some((socket) => socket.contractId.startsWith("identityHeaderSocket@"));
      })
      .map((asset) => ({ role: asset.normalizedContract!.role, componentId: asset.normalizedContract!.componentId, label: asset.label, asset }));
    const plugs = assets.filter((asset) => asset.normalizedContract!.role === "semantic-plug");
    const informationalComponents = assets.filter((asset) => asset.normalizedContract!.liveContentContract?.startsWith("informationalLine@"));
    const referenceAssets = SIGNATURE_ASSETS.filter((asset) => asset.familyId === family.id && asset.referenceOnly);
    return {
      family,
      previewAsset: SIGNATURE_ASSETS.find((asset)=>asset.id===family.discovery?.previewAssetId) ?? referenceAssets[0] ?? assets[0],
      certificationStatus: assets.length > 0 && assets.every((asset) => asset.normalizedContract?.certification.state === "certified") ? "certified" as const : "candidate" as const,
      launchMode: family.launchMode,
      access,
      entitled,
      runtimeEligible: family.lifecycle === "production" && recipes.length > 0 && assets.length > 0,
      layouts: recipes.map((recipe) => ({
        ...(() => { const presentation=signaturePresentation(recipe); return { presentationId:presentation.id, label:presentation.label, description:presentation.description, previewAssetId:presentation.previewAssetId, density:presentation.density, capabilities:presentation.capabilities, defaultActions:presentation.defaultActions }; })(),
        layoutMode: recipe.presentationMode,
        recipeId: recipe.recipeId,
        recipeVersion: recipe.recipeVersion,
        launchCertifiedActionCounts: recipe.certificationLimits.launchCertifiedActionCounts,
        structuralProofOnlyActionCounts: recipe.certificationLimits.structuralProofOnlyActionCounts ?? [],
      })),
      variants,
      plugs,
      informationalComponents,
    };
  }).filter((entry) => entry.access.visible).sort((a, b) => a.family.sortOrder - b.family.sortOrder);
}

function familyEntry(familyId: string) {
  return listSignatureAuthoringFamilies(
    SIGNATURE_FAMILIES.flatMap((family) => family.entitlement ? [family.entitlement.entitlementKey] : []),
  ).find((entry) => entry.family.id === familyId);
}

function typographyRange(familyId: string, layoutMode: SignatureAssemblyLayoutMode) {
  return SIGNATURE_ASSETS.find((asset) =>
    asset.familyId === familyId
    && asset.assetKind === "action"
    && asset.normalizedContract?.liveContentGeometry?.presentationTypography?.[layoutMode]
  )?.normalizedContract?.liveContentGeometry?.presentationTypography?.[layoutMode];
}

function normalizePrecisionValue(value: number | undefined, precision: SignatureTypographyRange) {
  const requested = Number.isFinite(value) ? value! : precision.defaultPx;
  const clamped = Math.max(precision.minPx, Math.min(precision.maxPx, requested));
  const stepped = precision.minPx + Math.round((clamped - precision.minPx) / precision.stepPx) * precision.stepPx;
  return Number(Math.max(precision.minPx, Math.min(precision.maxPx, stepped)).toFixed(3));
}

export function normalizeSignatureActionTypography(
  action: SignatureAssemblyActionSelection,
  familyId: string,
  layoutMode: SignatureAssemblyLayoutMode,
) {
  const precision = typographyRange(familyId, layoutMode);
  return precision
    ? { ...action, textSizePx: normalizePrecisionValue(action.textSizePx, precision) }
    : action;
}

export function normalizeSignatureAssemblyAuthoringState(state: SignatureAssemblyAuthoringState): SignatureAssemblyAuthoringState {
  const appearanceContract = familyAppearanceContract(state.input.familyId);
  const normalizeActionAppearance = (selection: SignatureAssemblyActionSelection["appearanceOptionIds"]) => {
    if (!appearanceContract || !selection) return undefined;
    const entries = appearanceContract.roles.flatMap((role) => {
      const optionId = selection[role.id];
      const option = role.options.find((candidate) => candidate.id === optionId && candidate.certified && candidate.governance === "configurable");
      return option ? [[role.id, option.id] as const] : [];
    });
    return entries.length ? Object.fromEntries(entries) : undefined;
  };
  return {
    ...state,
    input: {
      ...state.input,
      actions: state.input.actions.map((action) => {
        const baseAction = { ...action };
        delete baseAction.appearanceOptionIds;
        const actionAppearance = normalizeActionAppearance(action.appearanceOptionIds);
        return normalizeSignatureActionTypography({
          ...baseAction,
          ...(actionAppearance ? { appearanceOptionIds: actionAppearance } : {}),
          label: normalizeSignatureActionCopy(action.label),
          accessibilityLabel: normalizeSignatureActionCopy(action.accessibilityLabel),
          ...(typeof action.sublabel==="string"?{sublabel:normalizeSignatureActionCopy(action.sublabel)}:{}),
          ...(typeof action.semanticLabel==="string"?{semanticLabel:normalizeSignatureActionCopy(action.semanticLabel)}:{}),
        }, state.input.familyId, state.input.layoutMode);
      }),
    },
  };
}

function createAction(index: number, plugComponentId: string, idFactory: () => string, familyId: string, layoutMode: SignatureAssemblyLayoutMode, presentation?: SignatureAuthoringLayoutOption): SignatureAssemblyActionSelection {
  const ordinal = index + 1;
  const preset=presentation?.defaultActions?.[index%Math.max(presentation.defaultActions.length,1)];
  const canonicalIconId=preset?.canonicalIconId??presentation?.capabilities?.semanticIcon?.defaultCanonicalIconId;
  const semanticIconRef=presentation?.capabilities?.semanticIcon?.supported&&canonicalIconId
    ? canonicalIconAsset(canonicalIconId)??undefined
    : undefined;
  const sidePolicy=presentation?.capabilities?.plugSide;
  const plugPolicy=presentation?.capabilities?.plug??{supported:true,optional:false,defaultEnabled:true};
  const plugEnabled=preset?.plugEnabled??plugPolicy.defaultEnabled;
  const reflection=presentation?.capabilities?.backgroundReflection;
  return normalizeSignatureActionTypography({
    id: idFactory(),
    label: preset?.label??`Action ${ordinal}`,
    destination: preset?.destination??"#",
    actionType: preset?.actionType??"website",
    ...(plugPolicy.supported?{plugComponentId,plugPresentationId:plugComponentId,plugEnabled}:{}),
    ...(presentation?.capabilities?.semanticIcon?.supported&&plugPolicy.supported?{semanticIconRef,semanticLabel:preset?.semanticLabel??semanticIconRef?.accessibleLabel??`Action ${ordinal}`}:{ }),
    ...(presentation?.capabilities?.sublabel?.supported&&preset?.sublabel?{sublabel:preset.sublabel}:{}),
    ...(plugPolicy.supported&&sidePolicy?.mode==="authorable"?{plugSide:preset?.plugSide??sidePolicy.defaultSide}:{ }),
    accessibilityLabel: preset?.accessibilityLabel??preset?.label??`Action ${ordinal}`,
    state: "default",
    analyticsId: `signature-action-${ordinal}`,
    textAlign: preset?.textAlign??"center",
    textSize: "medium",
    ...(reflection?.supported?{backgroundReflectionIntensity:preset?.backgroundReflectionIntensity??reflection.defaultIntensity}:{}),
  }, familyId, layoutMode);
}

export function createSignatureAssemblyAuthoringState(
  familyId: string,
  selection: SignatureAssemblyLayoutMode | { presentationId: string },
  options: { idFactory?: () => string; identityContent?: StudioSemanticResource | { src: string; alt: string }; identityDefault?: StudioSemanticResource | { src: string; alt: string } } = {},
): SignatureAssemblyAuthoringState | null {
  const entry = familyEntry(familyId);
  const layout = typeof selection === "string"
    ? entry?.layouts.find((candidate) => candidate.layoutMode === selection)
    : entry?.layouts.find((candidate) => candidate.presentationId === selection.presentationId);
  const layoutMode=layout?.layoutMode;
  const plug = entry?.plugs[0]?.normalizedContract?.componentId;
  if (!entry?.family.version || !layout || !layoutMode || !plug) return null;
  let counter = 0;
  const idFactory = options.idFactory ?? (() => `signature-action-${Date.now().toString(36)}-${++counter}`);
  const count = layout.launchCertifiedActionCounts[0];
  const variant = entry.variants[0];
  const appearance = familyAppearanceContract(familyId);
  const treatment = familyTextTreatmentContract(familyId);
  const defaultTreatment = treatment?.options.find((option) => option.certified);
  return {
    contractId: SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT,
    input: {
      familyId: entry.family.id,
      familyVersion: entry.family.version,
      recipeId: layout.recipeId,
      recipeVersion: layout.recipeVersion,
      presentationId: layout.presentationId,
      requestedActionCount: count,
      layoutMode,
      actions: Array.from({ length: count }, (_, index) => createAction(index, plug, idFactory, familyId, layoutMode, layout)),
      componentVariants: variant ? { [variant.role]: variant.componentId } : {},
      decorativeFurniture: {},
    },
    ...(options.identityContent ? { identityContent: options.identityContent } : {}),
    ...(options.identityDefault ? { identityDefault: options.identityDefault } : {}),
    appearance: appearance ? {
      contractId: appearance.id,
      contractVersion: appearance.version,
      semanticOptionIds: appearance.defaults,
    } : undefined,
    textTreatment: treatment && defaultTreatment ? {
      contractId: treatment.id,
      contractVersion: treatment.version,
      requested: defaultTreatment.id,
    } : undefined,
  };
}

function withActionCount(state: SignatureAssemblyAuthoringState, count: number, idFactory?: () => string) {
  const entry = familyEntry(state.input.familyId);
  const layout = entry?.layouts.find((candidate) => candidate.recipeId === state.input.recipeId && candidate.recipeVersion === state.input.recipeVersion);
  if (!layout?.launchCertifiedActionCounts.includes(count)) return state;
  const defaultPlug = entry?.plugs[0]?.normalizedContract?.componentId;
  if (!defaultPlug) return state;
  let counter = 0;
  const makeId = idFactory ?? (() => `signature-action-${Date.now().toString(36)}-${++counter}`);
  const actions = state.input.actions.slice(0, count);
  while (actions.length < count) actions.push(createAction(actions.length, defaultPlug, makeId, state.input.familyId, state.input.layoutMode, layout));
  return normalizeSignatureAssemblyAuthoringState({ ...state, input: { ...state.input, requestedActionCount: count, actions } });
}

export function setSignatureActionCount(state: SignatureAssemblyAuthoringState, count: number, idFactory?: () => string) {
  return withActionCount(state, count, idFactory);
}

export function setSignatureLayout(state: SignatureAssemblyAuthoringState, layoutMode: SignatureAssemblyLayoutMode, idFactory?: () => string) {
  const entry = familyEntry(state.input.familyId);
  const layout = entry?.layouts.find((candidate) => candidate.layoutMode === layoutMode);
  if (!layout) return state;
  const desiredCount = layout.launchCertifiedActionCounts.includes(state.input.requestedActionCount)
    ? state.input.requestedActionCount
    : layout.launchCertifiedActionCounts[0];
  return withActionCount({ ...state, input: { ...state.input, layoutMode, recipeId: layout.recipeId, recipeVersion: layout.recipeVersion, presentationId: layout.presentationId } }, desiredCount, idFactory);
}

export function setSignaturePresentation(state: SignatureAssemblyAuthoringState, presentationId: string, idFactory?: () => string) {
  const entry=familyEntry(state.input.familyId);
  const layout=entry?.layouts.find((candidate)=>candidate.presentationId===presentationId);
  if (!layout) return state;
  const desiredCount=layout.launchCertifiedActionCounts.includes(state.input.requestedActionCount)?state.input.requestedActionCount:layout.launchCertifiedActionCounts[0];
  return withActionCount({ ...state, input: { ...state.input, presentationId:layout.presentationId,layoutMode:layout.layoutMode,recipeId:layout.recipeId,recipeVersion:layout.recipeVersion } },desiredCount,idFactory);
}

export function reorderSignatureAction(state: SignatureAssemblyAuthoringState, from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= state.input.actions.length || to >= state.input.actions.length) return state;
  const actions = [...state.input.actions];
  const [moved] = actions.splice(from, 1);
  actions.splice(to, 0, moved);
  return { ...state, input: { ...state.input, actions } };
}

export function updateSignatureAction(
  state: SignatureAssemblyAuthoringState,
  actionId: string,
  patch: Partial<Omit<SignatureAssemblyActionSelection, "id">>,
) {
  const normalizedPatch = {
    ...patch,
    ...(typeof patch.label === "string" ? { label: normalizeSignatureActionCopy(patch.label) } : {}),
    ...(typeof patch.accessibilityLabel === "string" ? { accessibilityLabel: normalizeSignatureActionCopy(patch.accessibilityLabel) } : {}),
  };
  return normalizeSignatureAssemblyAuthoringState({
    ...state,
    input: {
      ...state.input,
      actions: state.input.actions.map((action) => {
        if (action.id !== actionId) return action;
        const synchronizedLegacyPresentation = typeof patch.plugComponentId === "string"
          && patch.plugPresentationId === undefined
          && action.plugPresentationId === action.plugComponentId
          ? { plugPresentationId: patch.plugComponentId }
          : {};
        return { ...action, ...normalizedPatch, ...synchronizedLegacyPresentation };
      }),
    },
  });
}

export function setSignatureIdentityContent(
  state: SignatureAssemblyAuthoringState,
  resource?: StudioSemanticResource,
) {
  if (resource && (!resource.src.trim() || !resource.alt.trim())) return state;
  if (!resource && !state.identityContent) return state;
  return { ...state, identityContent: resource };
}

export function setSignatureAppearanceOption(
  state: SignatureAssemblyAuthoringState,
  roleId: string,
  optionId: string,
) {
  const contract = familyAppearanceContract(state.input.familyId);
  if (!contract || state.appearance?.contractId !== contract.id) return state;
  const role = contract.roles.find((candidate) => candidate.id === roleId);
  if (!role?.options.some((option) => option.id === optionId && option.certified)) return state;
  const semanticOptionIds = { ...contract.defaults, ...state.appearance.semanticOptionIds, [roleId]: optionId };
  const validation = validateFamilyAppearanceSelection(contract, contract.roles.map((candidate) => semanticOptionIds[candidate.id]));
  if (!validation.ok || state.appearance.semanticOptionIds[roleId] === optionId) return state;
  return { ...state, appearance: { contractId: contract.id, contractVersion: contract.version, semanticOptionIds } };
}

export function setSignatureComponentVariant(state: SignatureAssemblyAuthoringState, role: string, componentId: string) {
  const entry = familyEntry(state.input.familyId);
  if (!entry?.variants.some((variant) => variant.role === role && variant.componentId === componentId)) return state;
  return { ...state, input: { ...state.input, componentVariants: { ...state.input.componentVariants, [role]: componentId } } };
}

export function setSignatureDecorativeFurniture(state: SignatureAssemblyAuthoringState, role: string, enabled: boolean) {
  return { ...state, input: { ...state.input, decorativeFurniture: { ...state.input.decorativeFurniture, [role]: enabled } } };
}

export function compileSignatureAuthoringState(
  state: SignatureAssemblyAuthoringState,
  options: { blockId?: string; label?: string; background?: string } = {},
): SignatureCompositionAdapterResult {
  const normalizedState = normalizeSignatureAssemblyAuthoringState(state);
  const appearanceContract = familyAppearanceContract(normalizedState.input.familyId);
  const textContract = familyTextTreatmentContract(normalizedState.input.familyId);
  const semanticOptionIds = appearanceContract
    ? { ...appearanceContract.defaults, ...(normalizedState.appearance?.contractId === appearanceContract.id ? normalizedState.appearance.semanticOptionIds : {}) }
    : undefined;
  const requestedTreatment = textContract?.options.find((option) => option.id === normalizedState.textTreatment?.requested && option.certified)
    ?? textContract?.options.find((option) => option.certified);
  const adapted = adaptSignatureAssemblyResult(resolveSignatureAssembly(normalizedState.input), {
    ...options,
    fixtureContent: normalizedState.identityContent ? { identity: normalizedState.identityContent } : undefined,
    appearance: appearanceContract && semanticOptionIds ? {
      contractId: appearanceContract.id,
      contractVersion: appearanceContract.version,
      semanticOptionIds,
      semanticRendererValues: Object.fromEntries(appearanceContract.roles.map((role) => {
        const optionId = semanticOptionIds[role.id];
        const option = role.options.find((candidate) => candidate.id === optionId && candidate.certified);
        return [role.id, option?.rendererValue ?? "preserve-read-only"];
      })),
      semanticMaterialRoles: Object.fromEntries(appearanceContract.roles.flatMap((role) => {
        const optionId=semanticOptionIds[role.id];
        const option=role.options.find((candidate)=>candidate.id===optionId&&candidate.certified);
        return option?.materialProjection?[[role.id,option.materialProjection]]:[];
      })),
      optionsByRole: Object.fromEntries(appearanceContract.roles.map((role) => [role.id, Object.fromEntries(role.options.filter((option) => option.certified).map((option) => [option.id, { rendererValue: option.rendererValue, materialProjection: option.materialProjection }]))])),
      textTreatmentContractId: textContract?.id,
      textTreatmentContractVersion: textContract?.version,
      textTreatmentId: requestedTreatment?.id,
      textTreatmentRecipe: requestedTreatment?.rendererRecipe,
    } : undefined,
  });
  if (!adapted.ok) return adapted;
  return { ...adapted, composition: { ...adapted.composition, block: { ...adapted.composition.block, signatureAssembly: normalizedState } } };
}

function isAssemblyOwnedNode(node: CreativeCompositionBlock["nodes"][number]) {
  return typeof node.props.signatureAssemblyInstanceId === "string"
    && typeof node.props.signatureRecipeId === "string";
}

/**
 * Replaces only the registered assembly furniture while retaining independently
 * inserted root objects. Preserved objects keep their rendered vertical geometry
 * when a recipe change alters the assembly's page height.
 */
export function mergeSignatureAssemblyComposition(
  current: CreativeCompositionBlock,
  compiled: CreativeCompositionBlock,
): CreativeCompositionBlock {
  const preserved = current.nodes.filter((node) => !isAssemblyOwnedNode(node));
  const currentHeight = current.pageHeightPx ?? compiled.pageHeightPx;
  const compiledHeight = compiled.pageHeightPx ?? currentHeight;
  const requiredHeight = preserved.reduce((height, node) => {
    if (!currentHeight) return height;
    return Math.max(height, (node.y + node.height) * currentHeight);
  }, compiledHeight ?? currentHeight ?? 0);
  const pageHeightPx = requiredHeight > 0 ? requiredHeight : undefined;
  const adjustedPreserved = currentHeight && pageHeightPx
    ? preserved.map((node) => ({
        ...node,
        y: node.y * currentHeight / pageHeightPx,
        height: node.height * currentHeight / pageHeightPx,
      }))
    : preserved;
  const maxAssemblyZ = compiled.nodes.reduce((maximum, node) => Math.max(maximum, node.zIndex), 0);
  const normalizedPreserved = adjustedPreserved.map((node, index) => ({
    ...node,
    zIndex: Math.max(node.zIndex, maxAssemblyZ + index + 1),
  }));
  return {
    ...compiled,
    background: current.background?.kind === "solid" && current.background.value === "#030303" ? { kind: "none" } : current.background,
    resourceRef: current.resourceRef,
    pageHeightPx,
    nodes: [...compiled.nodes, ...normalizedPreserved],
  };
}

export function readSignatureAssemblyAuthoringState(block: CreativeCompositionBlock): SignatureAssemblyAuthoringState | null {
  const value = block.signatureAssembly;
  if (!value || value.contractId !== SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT) return null;
  const result = resolveSignatureAssembly(value.input);
  return result.ok ? normalizeSignatureAssemblyAuthoringState(value) : null;
}

/**
 * Rebuilds derived Curated-System furniture from its canonical authored input.
 *
 * Stored nodes are a disposable projection: recipe/renderer corrections must be
 * visible after reload (and in old published snapshots) without migrating or
 * mutating the Host's labels, destinations, plugs, ordering, or identity data.
 * Independently placed objects are retained by the shared merge authority.
 */
export function recompileSignatureAssemblyComposition(
  block: CreativeCompositionBlock,
): CreativeCompositionBlock {
  const state = readSignatureAssemblyAuthoringState(block);
  if (!state) return block;
  const compiled = compileSignatureAuthoringState(state, {
    blockId: block.id,
    label: block.label,
    background: block.background?.kind === "solid" && block.background.value !== "#030303" ? block.background.value : undefined,
  });
  return compiled.ok
    ? mergeSignatureAssemblyComposition(block, compiled.composition.block)
    : block;
}

/**
 * Rebuilds every Curated projection in a composition tree. Curated Systems are
 * commonly hosted by ordinary flow Modules, so repairing only the root block
 * creates a Studio/runtime split for persisted nested assemblies.
 */
export function recompileSignatureAssemblyTree(block: CreativeCompositionBlock): CreativeCompositionBlock {
  const recompiled = recompileSignatureAssemblyComposition(block);
  return {
    ...recompiled,
    nodes: recompiled.nodes.map((node) => node.moduleComposition
      ? { ...node, moduleComposition: recompileSignatureAssemblyTree(node.moduleComposition) }
      : node),
  };
}

export function applySignatureAssemblyMutation(
  block: CreativeCompositionBlock,
  mutation: StudioCuratedAssemblyMutation,
): { ok: true; block: CreativeCompositionBlock; selectedActionId?: string } | { ok: false; message: string } {
  const current = readSignatureAssemblyAuthoringState(block);
  if (!current) return { ok: false, message: "This Curated assembly no longer has valid canonical inputs." };
  if (mutation.type === "update-action") {
    const action = current.input.actions.find((candidate) => candidate.id === mutation.actionId);
    const size = mutation.patch.textSize ?? action?.textSize ?? "medium";
    const label = mutation.patch.label ?? action?.label ?? "";
    const geometry = SIGNATURE_ASSETS.find((asset) => asset.familyId === current.input.familyId && asset.assetKind === "action" && asset.normalizedContract?.liveContentGeometry?.recommendedCharacterCounts)?.normalizedContract?.liveContentGeometry;
    const limit = geometry?.recommendedCharacterCounts?.[size];
    if (limit && label.trim().length > limit) return { ok: false, message: `Shorten this label to ${limit} characters or fewer for ${size} text.` };
    if (mutation.patch.textSizePx != null) {
      const precision = geometry?.presentationTypography?.[current.input.layoutMode];
      if (precision) {
        const px = mutation.patch.textSizePx;
        const limit = characterLimitForPrecision(precision, px);
        if (px < precision.minPx || px > precision.maxPx) return { ok: false, message: `Choose a phone text size between ${precision.minPx} and ${precision.maxPx}px for ${current.input.layoutMode}.` };
        if (label.trim().length > limit) return { ok: false, message: `Shorten this label to ${limit} characters or fewer at ${px}px.` };
      } else {
      const presets = geometry?.textSizePresetsPxAt390;
      const counts = geometry?.recommendedCharacterCounts;
      const allowed = (["small", "medium", "large"] as const).filter((candidate) => label.trim().length <= (counts?.[candidate] ?? Number.POSITIVE_INFINITY)).map((candidate) => presets?.[candidate]).filter((candidate): candidate is number => typeof candidate === "number");
      const min = presets ? Math.min(...Object.values(presets)) : 10;
      const max = allowed.length ? Math.max(...allowed) : min;
      if (mutation.patch.textSizePx < min || mutation.patch.textSizePx > max) return { ok: false, message: `Choose a phone text size between ${min} and ${max}px for this label.` };
      }
    }
    if (mutation.patch.backgroundReflectionIntensity != null) {
      const activeRecipe=SIGNATURE_ASSEMBLY_RECIPES.find((candidate)=>candidate.familyId===current.input.familyId&&candidate.recipeId===current.input.recipeId);
      const presentation=activeRecipe?signaturePresentation(activeRecipe):undefined;
      const reflection=presentation?.capabilities?.backgroundReflection;
      if (!reflection?.supported) return { ok: false, message: "This Curated presentation does not support an adjustable background reflection." };
      if (mutation.patch.backgroundReflectionIntensity < reflection.minIntensity || mutation.patch.backgroundReflectionIntensity > reflection.maxIntensity) return { ok: false, message: `Choose a background reflection between ${reflection.minIntensity}% and ${reflection.maxIntensity}%.` };
    }
  }
  const mutated = mutation.type === "update-action"
    ? updateSignatureAction(current, mutation.actionId, mutation.patch)
    : mutation.type === "reorder-action"
      ? reorderSignatureAction(current, mutation.from, mutation.to)
      : mutation.type === "set-action-count"
        ? setSignatureActionCount(current, mutation.count)
        : mutation.type === "set-resource-slot"
          ? mutation.slotId === "identity" ? setSignatureIdentityContent(current, mutation.resource) : current
          : mutation.type === "set-appearance-option"
            ? setSignatureAppearanceOption(current, mutation.roleId, mutation.optionId)
            : mutation.type === "set-presentation"
              ? setSignaturePresentation(current, mutation.presentationId)
              : setSignatureLayout(current, mutation.layoutMode);
  const next = mutated === current ? current : mutation.commandId && mutation.provenance
    ? { ...mutated, lastAuthoringCommand: { commandId: mutation.commandId, provenance: mutation.provenance } }
    : mutated;
  if (next === current) return { ok: false, message: "That change is outside this Curated recipe’s certified limits." };
  const familyLabel = familyEntry(next.input.familyId)?.family.label ?? block.label;
  const nextLabel = mutation.type === "set-layout" || mutation.type === "set-presentation"
    ? `${familyLabel} ${familyEntry(next.input.familyId)?.layouts.find((layout)=>layout.presentationId===next.input.presentationId)?.label??next.input.layoutMode}`
    : block.label;
  const compiled = compileSignatureAuthoringState(next, {
    blockId: block.id,
    label: nextLabel,
    background: block.background?.kind === "solid" && block.background.value !== "#030303" ? block.background.value : undefined,
  });
  if (!compiled.ok) return { ok: false, message: compiled.errors.map((error) => error.message).join(" ") };
  return {
    ok: true,
    block: mergeSignatureAssemblyComposition(block, compiled.composition.block),
    selectedActionId: mutation.type === "update-action" ? mutation.actionId : undefined,
  };
}

function characterLimitForPrecision(
  precision: SignatureTypographyRange,
  px: number,
) {
  if (px <= precision.defaultPx) {
    const progress = (px - precision.minPx) / Math.max(.001, precision.defaultPx - precision.minPx);
    return Math.floor(precision.characterLimits.atMin + (precision.characterLimits.atDefault - precision.characterLimits.atMin) * progress);
  }
  const progress = (px - precision.defaultPx) / Math.max(.001, precision.maxPx - precision.defaultPx);
  return Math.floor(precision.characterLimits.atDefault + (precision.characterLimits.atMax - precision.characterLimits.atDefault) * progress);
}
