import type { CreativeCompositionBlock } from "../composition";
import {
  resolveSignatureAssembly,
  type SignatureAssemblyActionSelection,
  type SignatureAssemblyInput,
  type SignatureAssemblyLayoutMode,
} from "./assembly";
import { adaptSignatureAssemblyResult, type SignatureCompositionAdapterResult } from "./composition-adapter";
import { SIGNATURE_ASSEMBLY_RECIPES, SIGNATURE_ASSETS, SIGNATURE_FAMILIES } from "./registry";
import {
  isSignatureComponentRuntimeEligible,
  resolveSignatureAccess,
  type SignatureAccessState,
  type SignatureAssetDefinition,
  type SignatureEntitlementKey,
  type SignatureFamilyDefinition,
} from "./types";

export const SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT = "signatureAssemblyAuthoring@1.0.0" as const;

export type SignatureAssemblyAuthoringState = {
  contractId: typeof SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT;
  input: SignatureAssemblyInput;
  identityContent?: { src: string; alt: string };
};

export type SignatureAuthoringLayoutOption = {
  layoutMode: SignatureAssemblyLayoutMode;
  label: string;
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

function layoutModeForRecipe(kind: "row" | "paired-level"): SignatureAssemblyLayoutMode {
  return kind === "row" ? "single-stack" : "twin-rail";
}

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
      previewAsset: referenceAssets[0] ?? assets[0],
      certificationStatus: assets.length > 0 && assets.every((asset) => asset.normalizedContract?.certification.state === "certified") ? "certified" as const : "candidate" as const,
      launchMode: family.launchMode,
      access,
      entitled,
      runtimeEligible: family.lifecycle === "production" && recipes.length > 0 && assets.length > 0,
      layouts: recipes.map((recipe) => ({
        layoutMode: layoutModeForRecipe(recipe.actionUnit.kind),
        label: recipe.actionUnit.kind === "row" ? "Single Stack" : "Twin Rail",
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

function createAction(index: number, plugComponentId: string, idFactory: () => string): SignatureAssemblyActionSelection {
  const ordinal = index + 1;
  return {
    id: idFactory(),
    label: `Action ${ordinal}`,
    destination: "#",
    plugComponentId,
    accessibilityLabel: `Action ${ordinal}`,
    state: "default",
    analyticsId: `signature-action-${ordinal}`,
  };
}

export function createSignatureAssemblyAuthoringState(
  familyId: string,
  layoutMode: SignatureAssemblyLayoutMode,
  options: { idFactory?: () => string; identityContent?: { src: string; alt: string } } = {},
): SignatureAssemblyAuthoringState | null {
  const entry = familyEntry(familyId);
  const layout = entry?.layouts.find((candidate) => candidate.layoutMode === layoutMode);
  const plug = entry?.plugs[0]?.normalizedContract?.componentId;
  if (!entry?.family.version || !layout || !plug) return null;
  let counter = 0;
  const idFactory = options.idFactory ?? (() => `signature-action-${Date.now().toString(36)}-${++counter}`);
  const count = layout.launchCertifiedActionCounts[0];
  const variant = entry.variants[0];
  return {
    contractId: SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT,
    input: {
      familyId: entry.family.id,
      familyVersion: entry.family.version,
      recipeId: layout.recipeId,
      recipeVersion: layout.recipeVersion,
      requestedActionCount: count,
      layoutMode,
      actions: Array.from({ length: count }, (_, index) => createAction(index, plug, idFactory)),
      componentVariants: variant ? { [variant.role]: variant.componentId } : {},
      decorativeFurniture: {},
    },
    identityContent: options.identityContent,
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
  while (actions.length < count) actions.push(createAction(actions.length, defaultPlug, makeId));
  return { ...state, input: { ...state.input, requestedActionCount: count, actions } };
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
  return withActionCount({ ...state, input: { ...state.input, layoutMode, recipeId: layout.recipeId, recipeVersion: layout.recipeVersion } }, desiredCount, idFactory);
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
  return { ...state, input: { ...state.input, actions: state.input.actions.map((action) => action.id === actionId ? { ...action, ...patch } : action) } };
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
  const adapted = adaptSignatureAssemblyResult(resolveSignatureAssembly(state.input), {
    ...options,
    fixtureContent: state.identityContent ? { identity: state.identityContent } : undefined,
  });
  if (!adapted.ok) return adapted;
  return { ...adapted, composition: { ...adapted.composition, block: { ...adapted.composition.block, signatureAssembly: state } } };
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
    background: current.background,
    resourceRef: current.resourceRef,
    pageHeightPx,
    nodes: [...compiled.nodes, ...normalizedPreserved],
  };
}

export function readSignatureAssemblyAuthoringState(block: CreativeCompositionBlock): SignatureAssemblyAuthoringState | null {
  const value = block.signatureAssembly;
  if (!value || value.contractId !== SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT) return null;
  const result = resolveSignatureAssembly(value.input);
  return result.ok ? value : null;
}
