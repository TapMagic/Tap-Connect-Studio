import type { SignatureEntitlementKey } from "@/lib/fusion/creative-studio/signature-assets/types";
import { listSignatureAuthoringFamilies } from "@/lib/fusion/creative-studio/signature-assets/authoring";
import { SIGNATURE_ASSETS } from "@/lib/fusion/creative-studio/signature-assets/registry";
import {
  STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT,
  type StudioButtonFamilyCatalog,
  type StudioButtonFamilyDiscoveryEntry,
  type StudioButtonFamilyResource,
} from "@/lib/fusion/creative-studio/platform/button-family-discovery";

function governedResource(
  asset: (typeof SIGNATURE_ASSETS)[number],
  classification: StudioButtonFamilyResource["classification"],
  readiness: StudioButtonFamilyResource["readiness"],
): StudioButtonFamilyResource {
  return {
    id: asset.id,
    label: asset.label,
    description:
      classification === "assembly-managed"
        ? "Placed and reflowed by the certified recipe."
        : classification === "plug-choice"
          ? "Assignable content for a governed action slot."
          : classification === "identity-choice"
            ? "Approved identity treatment for a compatible assembly."
            : "A registered family component.",
    classification,
    readiness,
    previewSrc: asset.sourceAsset,
    previewAlt: `${asset.label} preview`,
    componentId: asset.normalizedContract?.componentId,
    tags: asset.tags,
  };
}

function governedFamilyEntries(entitlementKeys: readonly SignatureEntitlementKey[]) {
  return listSignatureAuthoringFamilies(entitlementKeys).flatMap<StudioButtonFamilyDiscoveryEntry>((entry) => {
    const discovery=entry.family.discovery;
    if (!discovery || discovery.exposure==="hidden") return [];
    const assets = SIGNATURE_ASSETS.filter((asset) => asset.familyId === entry.family.id && !asset.referenceOnly);
    const referencePresets = SIGNATURE_ASSETS.filter((asset) => asset.familyId === entry.family.id && asset.referenceOnly);
    const assemblyStarts: StudioButtonFamilyResource[] = entry.layouts.map((layout) => {
      const finishedPreview = SIGNATURE_ASSETS.find((asset)=>asset.id===layout.previewAssetId) ?? entry.previewAsset ?? referencePresets[0];
      return {
      id: `${entry.family.id}:${layout.recipeId}`,
      label: layout.label,
      description: layout.description,
      classification: "assembly-starting-point",
      readiness: entry.access.selectable ? "ready" : "managed",
      previewSrc: finishedPreview?.sourceAsset,
      previewAlt: `${entry.family.label} ${layout.label} assembly preview`,
      recipeId: layout.recipeId,
      recipeVersion: layout.recipeVersion,
      presentationId: layout.presentationId,
      layoutMode: layout.layoutMode,
      tags: [entry.family.slug, "assembly", layout.layoutMode],
      };
    });
    const actionResources = assets
      .filter((asset) => asset.assetKind === "action")
      .slice(0, 6)
      .map((asset) => governedResource(
        asset,
        entry.layouts.length ? "assembly-managed" : "user-selectable",
        entry.runtimeEligible && !entry.layouts.length ? "ready" : entry.layouts.length ? "managed" : "preview",
      ));
    const identityResources = assets
      .filter((asset) => asset.assetKind === "identity" || entry.variants.some((variant) => variant.asset.id === asset.id))
      .slice(0, 4)
      .map((asset) => governedResource(asset, "identity-choice", entry.runtimeEligible ? "managed" : "preview"));
    const plugResources = entry.plugs.slice(0, 6).map((asset) => governedResource(asset, "plug-choice", "managed"));
    const utilityResources = entry.informationalComponents.slice(0, 4).map((asset) => governedResource(asset, "utility-choice", "managed"));
    const previewAsset = entry.previewAsset ?? assets.find((asset) => asset.assetKind === "action") ?? assets[0];
    return [{
      contractId: STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT,
      id: entry.family.id,
      label: entry.family.label,
      description: discovery.description,
      model: "governed-signature",
      readiness: entry.access.selectable ? (entry.runtimeEligible ? "ready" : "preview") : "restricted",
      exposure: discovery.exposure==="active"?"visible":"hidden",
      available: entry.access.selectable,
      previewSrc: previewAsset?.sourceAsset,
      previewAlt: discovery.previewAlt ?? (previewAsset ? `${entry.family.label} family preview` : undefined),
      provenanceAuthority: "signature-family-registry",
      sections: [
        ...(assemblyStarts.length ? [{ id: "assembly-starts", label: "Assembly starting points", description: "Choose the governed layout; edit its inputs after placement.", resources: assemblyStarts }] : []),
        ...(!entry.layouts.length && actionResources.length ? [{ id: "actions", label: "Actions", description: "Registered standalone family actions.", resources: actionResources }] : []),
        ...(identityResources.length ? [{ id: "identity", label: "Identity", description: "Approved identity choices, never loose structural furniture.", resources: identityResources }] : []),
        ...(plugResources.length ? [{ id: "plugs", label: "Plug choices", description: "Assignable semantic content for compatible action slots.", resources: plugResources }] : []),
        ...(utilityResources.length ? [{ id: "utility", label: "Utility", description: "Optional live-content choices exposed by registry contract.", resources: utilityResources }] : []),
      ],
      assembly: {
        supported: entry.layouts.length > 0,
        mutationReadiness: entry.layouts.length ? "ready" : "not-applicable",
        entryLabel: entry.layouts.length ? "Edit Contents" : "Use registered family components",
        explanation: entry.layouts.length
          ? "Choose a certified layout, then edit its declared content inputs while the Curated recipe owns structure and reflow."
          : "This family has no certified structured recipe in the current registry.",
      },
    }];
  });
}

export function buildStudioButtonFamilyCatalog(
  entitlementKeys: readonly SignatureEntitlementKey[],
): StudioButtonFamilyCatalog {
  const entries: StudioButtonFamilyDiscoveryEntry[] = [
    {
      contractId: STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT,
      id: "standard",
      label: "Standard",
      description: "Purpose-built standalone actions for common Card jobs.",
      model: "standalone-presentation",
      readiness: "ready",
      exposure: "visible",
      available: true,
      provenanceAuthority: "tapconnect-standard-button-catalog",
      sections: [],
      assembly: { supported: false, mutationReadiness: "not-applicable", entryLabel: "Browse Standard Buttons", explanation: "Standalone Buttons place directly on the Card." },
    },
    {
      contractId: STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT,
      id: "brand",
      label: "Brand",
      description: "Actions resolved from the current Card’s Brand roles.",
      model: "brand-presentation",
      readiness: "ready",
      exposure: "visible",
      available: true,
      provenanceAuthority: "tapconnect-standard-button-catalog",
      sections: [],
      assembly: { supported: false, mutationReadiness: "not-applicable", entryLabel: "Browse Brand Buttons", explanation: "Brand styles remain standalone presentations." },
    },
    ...governedFamilyEntries(entitlementKeys),
    {
      contractId: STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT,
      id: "saved",
      label: "Saved",
      description: "Reusable Button resources you intentionally save.",
      model: "saved-resource",
      readiness: "empty",
      exposure: "hidden",
      available: true,
      provenanceAuthority: "creative-resource-registry",
      sections: [],
      assembly: { supported: false, mutationReadiness: "not-applicable", entryLabel: "Browse saved Buttons", explanation: "No saved Button styles exist in this review workspace." },
    },
  ];
  return { contractId: STUDIO_BUTTON_FAMILY_DISCOVERY_CONTRACT, entries };
}
