import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { SignatureAssemblyAuthoringState } from "@/lib/fusion/creative-studio/signature-assets/authoring";
import { SIGNATURE_ASSEMBLY_RECIPES, SIGNATURE_ASSETS, SIGNATURE_FAMILIES, getSignatureAssemblyRecipe } from "@/lib/fusion/creative-studio/signature-assets/registry";
import {
  STUDIO_STRUCTURED_ASSEMBLY_CONTRACT,
  type StudioStructuredAssemblyDescriptor,
} from "@/lib/fusion/creative-studio/platform/structured-assembly";
import { familyAppearanceContract, familyTextTreatmentContract } from "../platform/family-appearance-registry";
import { signaturePresentation } from "../signature-assets/layout-recipes";
import { CANONICAL_PLATFORM_ICON_ASSETS } from "../icon-asset";
import { reconcileActionIntent } from "@/lib/fusion/card/action-intent-presentation";
import { createIdentityVisualResourceFitContract, createStudioSemanticResourceSlot, type StudioSemanticResource } from "../platform/semantic-resource-slot";
import { compatibleFamilyAppearanceOptions } from "../platform/family-appearance";

function semanticResource(
  value: SignatureAssemblyAuthoringState["identityContent"],
  fallbackProvenance: StudioSemanticResource["provenance"],
): StudioSemanticResource | undefined {
  if (!value?.src || !value.alt) return undefined;
  return {
    ...value,
    provenance: "provenance" in value ? value.provenance : fallbackProvenance,
    source: "source" in value ? value.source : "legacy",
  };
}

export function selectedStructuredAssembly(
  blocks: readonly (CreativeCompositionBlock | null | undefined)[],
  selectedNode: CreativeCompositionNode | null | undefined,
): StudioStructuredAssemblyDescriptor | null {
  if (!selectedNode) return null;
  const hostedBlock = selectedNode.moduleComposition?.signatureAssembly ? selectedNode.moduleComposition : null;
  if (!hostedBlock && typeof selectedNode.props.signatureAssemblyInstanceId !== "string") return null;
  const block = hostedBlock ?? blocks.find((candidate) => candidate?.nodes.some((node) => node.id === selectedNode.id));
  const state = block?.signatureAssembly as SignatureAssemblyAuthoringState | undefined;
  if (!state?.input || typeof state.input.familyId !== "string" || !Array.isArray(state.input.actions)) return null;
  const family = SIGNATURE_FAMILIES.find((candidate) => candidate.id === state.input.familyId);
  const recipe = getSignatureAssemblyRecipe(state.input.recipeId, state.input.recipeVersion);
  const familyRecipes = SIGNATURE_ASSEMBLY_RECIPES.filter((candidate) => candidate.familyId === state.input.familyId && candidate.familyVersion === state.input.familyVersion).map((candidate) => {
    const layoutMode = candidate.presentationMode;
    const presentation=signaturePresentation(candidate);
    return {
      id: presentation.id,
      layoutMode,
      label: presentation.label,
      description: presentation.description,
      allowedActionCounts: layoutMode === "twin-rail"
        ? candidate.certificationLimits.launchCertifiedActionCounts.filter((count) => count % 2 === 0)
        : candidate.certificationLimits.launchCertifiedActionCounts,
    };
  });
  const plugs = SIGNATURE_ASSETS.filter((asset) =>
    asset.familyId === state.input.familyId &&
    asset.normalizedContract?.role === "semantic-plug" &&
    Boolean(recipe && asset.normalizedContract.layoutCompatibility.includes(recipe.contractId))
  );
  const activePresentation=recipe?signaturePresentation(recipe):undefined;
  const recipeLabel = activePresentation?.label ?? (state.input.layoutMode === "standalone" ? "Standalone Action" : state.input.layoutMode === "twin-rail" ? "Twin Rail" : "Single Stack");
  const liveTextGeometry = SIGNATURE_ASSETS.find((asset) => asset.familyId === state.input.familyId && asset.assetKind === "action" && asset.normalizedContract?.liveContentGeometry?.textSizePresetsPxAt390)?.normalizedContract?.liveContentGeometry;
  const textPrecision = liveTextGeometry?.presentationTypography?.[state.input.layoutMode];
  const sizeIds = ["small", "medium", "large"] as const;
  const hasIdentitySocket = SIGNATURE_ASSEMBLY_RECIPES
    .filter((candidate) => candidate.familyId === state.input.familyId && candidate.familyVersion === state.input.familyVersion)
    .some((candidate) => candidate.fixedTop.some((reference) => SIGNATURE_ASSETS.some((asset) =>
      asset.familyId === state.input.familyId
      && asset.normalizedContract?.componentId === reference.componentId
      && asset.normalizedContract?.sockets.some((socket) => socket.contractId.startsWith("identityHeaderSocket@")),
    )));
  const identityContent = semanticResource(state.identityContent, "legacy-preserved");
  const identityDefault = semanticResource(state.identityDefault, "brand");
  const appearanceContract=familyAppearanceContract(state.input.familyId);
  const textContract=familyTextTreatmentContract(state.input.familyId);
  const selectedAppearance = appearanceContract?{
    ...appearanceContract.defaults,
    ...(state.appearance?.contractId === appearanceContract.id ? state.appearance.semanticOptionIds : {}),
  }:{};
  return {
    contractId: STUDIO_STRUCTURED_ASSEMBLY_CONTRACT,
    adapterAuthority: "signatureAssemblyAuthoring@1.0.0",
    familyId: state.input.familyId,
    familyLabel: family?.label ?? state.input.familyId,
    objectId: hostedBlock ? selectedNode.id : String(selectedNode.props.signatureAssemblyInstanceId),
    layoutMode: state.input.layoutMode,
    presentationId: state.input.presentationId??activePresentation?.id??state.input.recipeId,
    recipeId: state.input.recipeId,
    recipeVersion: state.input.recipeVersion,
    recipeLabel,
    inputCount: state.input.actions.length,
    slots: state.input.actions.map((action, index) => ({
      id: action.id,
      label: action.label,
      destination: action.destination,
      actionType: reconcileActionIntent(action.actionType, action.destination).kind,
      accessibleName: action.accessibilityLabel,
      plugComponentId: action.plugComponentId,
      plugPresentationId: action.plugPresentationId,
      semanticIconRef: action.semanticIconRef,
      semanticLabel: action.semanticLabel,
      sublabel: action.sublabel,
      plugSide: action.plugSide,
      plugLabel: plugs.find((plug) => plug.normalizedContract?.componentId === (action.plugPresentationId??action.plugComponentId))?.label,
      plugPreviewSrc: plugs.find((plug) => plug.normalizedContract?.componentId === (action.plugPresentationId??action.plugComponentId))?.sourceAsset,
      textAlign: action.textAlign ?? "center",
      textSize: action.textSize ?? "medium",
      textSizePx: action.textSizePx,
      contentType: "action" as const,
      required: true,
      order: index,
    })),
    resourceSlots: hasIdentitySocket ? [createStudioSemanticResourceSlot({
      id: "identity",
      label: "Crown identity",
      semanticRole: "identity",
      acceptedKinds: ["logo", "image"],
      required: false,
      applicable: state.input.layoutMode !== "standalone",
      value: identityContent,
      defaultValue: identityDefault,
      presentation: { ownership: "governed", fit: "contain", visualFit: createIdentityVisualResourceFitContract() },
      operations: ["choose", "replace", "remove", "adjust", ...(identityDefault ? ["reset" as const] : [])],
    })] : [],
    allowedActionCounts: state.input.layoutMode === "twin-rail"
      ? (recipe?.certificationLimits.launchCertifiedActionCounts ?? []).filter((count) => count % 2 === 0)
      : recipe?.certificationLimits.launchCertifiedActionCounts ?? [],
    layouts: familyRecipes,
    capabilities: {
      supportsSublabel:Boolean(activePresentation?.capabilities?.sublabel?.supported),
      supportsSemanticIcon:Boolean(activePresentation?.capabilities?.semanticIcon?.supported),
      plugSide:activePresentation?.capabilities?.plugSide?.mode??"derived",
      allowedPlugSides:activePresentation?.capabilities?.plugSide?.mode==="authorable"?activePresentation.capabilities.plugSide.allowed:undefined,
    },
    textSizes: sizeIds.map((id) => ({
      id,
      label: id[0].toUpperCase() + id.slice(1),
      phonePx: liveTextGeometry?.textSizePresetsPxAt390?.[id] ?? ({ small: 12, medium: 14, large: 17 } as const)[id],
      recommendedCharacterCount: liveTextGeometry?.recommendedCharacterCounts?.[id] ?? ({ small: 26, medium: 20, large: 15 } as const)[id],
      availability: state.input.layoutMode !== "twin-rail" || id === "small" ? "enabled" as const : "disabled" as const,
      disabledReason: state.input.layoutMode === "twin-rail" && id !== "small"
        ? "Twin Rail currently certifies Small type only at representative phone widths."
        : undefined,
    })),
    textPrecision,
    appearance: {
      contractId: appearanceContract?.id??"familyAppearance@none",
      contractVersion: appearanceContract?.version??"1.0.0",
      roles: (appearanceContract?.roles??[]).map((role) => {
        const options = compatibleFamilyAppearanceOptions(appearanceContract!, selectedAppearance, role.id);
        const selected = options.find((option) => option.id === selectedAppearance[role.id]) ?? options[0];
        return {
          id: role.id,
          label: role.label,
          value: selectedAppearance[role.id],
          optionLabel: selected?.label ?? "Preserved legacy treatment",
          preview: selected?.preview ?? "#111",
          governed: options.filter((option) => option.availability === "enabled").length <= 1,
          options,
        };
      }),
      textTreatmentLabel: textContract?.options.find((option) => option.certified)?.label,
    },
    compatiblePlugs: plugs.map((plug) => ({
      componentId: plug.normalizedContract!.componentId,
      label: plug.label,
      previewSrc: plug.sourceAsset,
      previewAlt: `${plug.label} plug preview`,
    })),
    compatibleSemanticIcons: activePresentation?.capabilities?.semanticIcon?.supported?CANONICAL_PLATFORM_ICON_ASSETS:[],
    outputOwnership: "recipe-governed",
    compiler: "deterministic",
    mutationReadiness: "ready",
    preservedAuthorities: ["content identity", "Action intent", "plug assignment", "provenance", "entitlement", "certified geometry"],
  };
}
