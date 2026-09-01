import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import {
  STUDIO_CATALOG_BROWSER_CONTRACT,
  type StudioCatalogCategory,
  type StudioCatalogConsumerAdapter,
  type StudioCatalogResult,
} from "../platform/catalog-browser";
import type { StudioAuthoringVisualOption } from "../platform/authoring-contract";
import type { StudioButtonFamilyCatalog } from "../platform/button-family-discovery";
import { visibleStudioButtonFamilies } from "../platform/button-family-discovery";
import type { StudioDiscoveryResource } from "../platform/discovery";

function category(id: string, label: string, parentId: string | null, readiness: StudioCatalogCategory["readiness"] = "ready", projection?: StudioCatalogCategory["projection"]): StudioCatalogCategory {
  return { id, label, parentId, readiness, projection };
}

export function buttonFamilyCatalogAdapter(
  catalog: StudioButtonFamilyCatalog,
  presentationResources: readonly StudioDiscoveryResource[],
): StudioCatalogConsumerAdapter {
  const visibleFamilies = visibleStudioButtonFamilies(catalog);
  const hiddenFamilies = catalog.entries.filter((entry) => entry.exposure === "hidden");
  const categories: StudioCatalogCategory[] = [
    category("buttons", "Buttons", null),
    ...visibleFamilies.map((entry) => category(`family:${entry.id}`, entry.label, "buttons", "ready", entry.model === "governed-signature" ? "focused-gallery" : "inline-drawer")),
    ...hiddenFamilies.map((entry) => category(`family:${entry.id}`, entry.label, "buttons", "hidden", "focused-gallery")),
  ];
  const presentationResults: StudioCatalogResult[] = presentationResources.map((resource) => {
    const presetId = String((resource.application as { presetId?: string }).presetId || resource.ref.resourceId);
    const familyId = presetId === "brand-primary" ? "brand" : "standard";
    return {
      id: resource.ref.resourceId,
      label: resource.label,
      categoryId: `family:${familyId}`,
      readiness: resource.governance.readiness === "ready" ? "ready" : "hidden",
      searchText: resource.search.text,
      stableResourceId: `${resource.ref.provider}:${resource.ref.resourceId}@${resource.ref.version ?? "current"}`,
      previewAuthority: resource.preview.authority,
    };
  });
  const governedResults = catalog.entries.flatMap((entry) => entry.sections.flatMap((section) => section.resources
    .filter((resource) => resource.classification === "assembly-starting-point")
    .map<StudioCatalogResult>((resource) => ({
      id: resource.id,
      label: resource.label,
      categoryId: `family:${entry.id}`,
      readiness: entry.exposure === "visible" && resource.readiness === "ready" ? "ready" : "hidden",
      searchText: `${entry.label} ${resource.label} ${resource.tags.join(" ")}`,
      stableResourceId: `${entry.provenanceAuthority}:${resource.recipeId ?? resource.id}@${resource.recipeVersion ?? "current"}`,
      previewAuthority: entry.provenanceAuthority,
    }))));
  return {
    contractId: STUDIO_CATALOG_BROWSER_CONTRACT,
    id: "button-families",
    domainLabel: "Buttons",
    resultKind: "button-presentation",
    categories,
    results: [...presentationResults, ...governedResults],
    previewAdapterId: "canonical-button-renderers",
    application: "place",
    supports: { brand: true, recent: true, saved: true, favorites: false, pagination: true },
    returnBehavior: "restore-context",
  };
}

export function curatedPlugCatalogAdapter(familyId: string, familyLabel: string, options: readonly StudioAuthoringVisualOption[]): StudioCatalogConsumerAdapter {
  return {
    contractId: STUDIO_CATALOG_BROWSER_CONTRACT,
    id: `curated-plugs:${familyId}`,
    domainLabel: `${familyLabel} plugs`,
    resultKind: "curated-plug",
    categories: [category("plugs", "Plugs", null)],
    results: options.map((option) => ({ id: option.id, label: option.label, categoryId: "plugs", readiness: option.availability === "enabled" ? "ready" : "hidden", searchText: `${option.label} ${option.description ?? ""}`, stableResourceId: `${familyId}:plug:${option.id}`, previewAuthority: "signature-family-registry" })),
    previewAdapterId: "signature-asset-renderer",
    application: "assign",
    supports: { brand: false, recent: true, saved: false, favorites: false, pagination: false },
    returnBehavior: "restore-context",
  };
}

export function surfaceCatalogAdapter(): StudioCatalogConsumerAdapter {
  return {
    contractId: STUDIO_CATALOG_BROWSER_CONTRACT,
    id: "surface-treatments",
    domainLabel: "Surfaces",
    resultKind: "surface-treatment",
    categories: [
      category("surface", "Surface", null),
      category("color", "Color", "surface", "ready", "inline-drawer"),
      category("image", "Image", "surface", "ready", "focused-gallery"),
      category("glass", "Glass", "surface", "ready", "inline-drawer"),
      category("materials", "Materials", "surface", "hidden", "focused-gallery"),
      category("wood", "Wood", "materials", "hidden"),
      category("metal", "Metal", "materials", "hidden"),
      category("fabric", "Fabric", "materials", "hidden"),
      category("paper", "Paper", "materials", "hidden"),
      category("stone", "Stone", "materials", "hidden"),
    ],
    results: [
      { id: "transparent", label: "Transparent", categoryId: "surface", readiness: "ready", searchText: "transparent clear none", stableResourceId: "surface:transparent@1", previewAuthority: "studio-surface" },
      { id: "solid", label: "Solid", categoryId: "color", readiness: "ready", searchText: "solid color brand", stableResourceId: "surface:solid@1", previewAuthority: "studio-surface" },
      { id: "image", label: "Image-backed", categoryId: "image", readiness: "ready", searchText: "image photo asset background", stableResourceId: "surface:image@1", previewAuthority: "studio-surface" },
      { id: "smoked_glass", label: "Smoked glass", categoryId: "glass", readiness: "ready", searchText: "smoked glass translucent blur", stableResourceId: "surface:smoked-glass@1", previewAuthority: "studio-surface" },
    ],
    previewAdapterId: "studio-surface",
    application: "apply",
    supports: { brand: true, recent: true, saved: true, favorites: true, pagination: true },
    returnBehavior: "restore-context",
  };
}

export function canonicalAssetCatalogAdapter(assets: readonly MediaAssetCandidate[] = []): StudioCatalogConsumerAdapter {
  return {
    contractId: STUDIO_CATALOG_BROWSER_CONTRACT,
    id: "canonical-assets",
    domainLabel: "Assets",
    resultKind: "media-asset",
    categories: [
      category("assets", "Assets", null),
      category("library", "Library", "assets", "ready", "focused-gallery"),
      category("brand", "Brand", "assets", "ready", "focused-gallery"),
      category("recent", "Recent", "assets", "ready", "focused-gallery"),
      category("favorites", "Favorites", "assets", "ready", "focused-gallery"),
      category("upload", "Upload", "assets", "ready", "inline-drawer"),
      category("found", "Found", "assets", "ready", "focused-gallery"),
    ],
    results: assets.map((asset) => ({ id: asset.id, label: asset.label, categoryId: asset.isBrandApproved ? "brand" : asset.isFavorite ? "favorites" : asset.recentAt ? "recent" : "library", readiness: "ready", searchText: `${asset.label} ${asset.sourceLabel} ${asset.attributionName ?? ""}`, stableResourceId: asset.mediaAssetId ?? asset.id, previewAuthority: "canonical-media-asset" })),
    previewAdapterId: "canonical-media-asset",
    application: "replace",
    supports: { brand: true, recent: true, saved: false, favorites: true, pagination: true },
    returnBehavior: "restore-context",
  };
}
