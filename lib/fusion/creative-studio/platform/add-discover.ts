import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { compositionChildren, hasCompositionParentAuthority } from "../../card/composition-parent-authority";
import { STUDIO_TEXT_ROLES, textRoleCanonicalProps } from "./text-authoring";

export const STUDIO_ADD_DISCOVER_CONTRACT = "studioAddDiscover@1.0.0" as const;

export type StudioAddCategoryId = "text" | "image" | "buttons" | "divider" | "container" | "curated";
export type StudioAddReadiness = "ready" | "hidden";
export type StudioAddPreviewKind = "text" | "image" | "video" | "button" | "divider" | "container" | "curated";

export type StudioAddCategoryRegistration = {
  contractId: typeof STUDIO_ADD_DISCOVER_CONTRACT;
  id: StudioAddCategoryId;
  label: string;
  description: string;
  order: number;
  readiness: StudioAddReadiness;
  previewKind: StudioAddPreviewKind;
  catalogAdapterId: string;
  placementKind: "ordinary-module" | "container" | "curated-module";
};

export type StudioOrdinaryModuleRegistration = {
  contractId: typeof STUDIO_ADD_DISCOVER_CONTRACT;
  id: string;
  categoryId: Exclude<StudioAddCategoryId, "container" | "curated">;
  label: string;
  description: string;
  moduleKind: "text" | "image" | "video" | "button" | "divider";
  previewKind: StudioAddPreviewKind;
  readiness: StudioAddReadiness;
  allowedParents: readonly ("card-surface" | "container")[];
  defaultCanonicalState: Readonly<Record<string, unknown>>;
  refineEntry: "content" | "asset" | "action" | "appearance";
  capabilityGroups: readonly string[];
  governance: "host-editable";
};

export type StudioContainerRegistration = {
  contractId: typeof STUDIO_ADD_DISCOVER_CONTRACT;
  id: string;
  categoryId: "container";
  label: string;
  description: string;
  treatment: "transparent" | "solid" | "smoked_glass" | "image";
  previewKind: "container";
  readiness: StudioAddReadiness;
  allowedParents: readonly ("card-surface" | "container")[];
  refineEntry: "appearance";
  governance: "host-editable";
};

export const STUDIO_ADD_CATEGORIES: readonly StudioAddCategoryRegistration[] = [
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "text", label: "Text", description: "Add editable copy", order: 10, readiness: "ready", previewKind: "text", catalogAdapterId: "studio-add", placementKind: "ordinary-module" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "image", label: "Media", description: "Add an Image or Video", order: 20, readiness: "ready", previewKind: "image", catalogAdapterId: "canonical-assets", placementKind: "ordinary-module" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "buttons", label: "Buttons", description: "Standard and Curated families", order: 30, readiness: "ready", previewKind: "button", catalogAdapterId: "button-families", placementKind: "ordinary-module" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "divider", label: "Divider", description: "Create visual rhythm", order: 40, readiness: "ready", previewKind: "divider", catalogAdapterId: "studio-add", placementKind: "ordinary-module" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "container", label: "Container", description: "Optional grouping and surface", order: 50, readiness: "ready", previewKind: "container", catalogAdapterId: "surface-treatments", placementKind: "container" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "curated", label: "Curated", description: "Finished certified systems", order: 60, readiness: "ready", previewKind: "curated", catalogAdapterId: "button-families", placementKind: "curated-module" },
];

export const STUDIO_ORDINARY_MODULES: readonly StudioOrdinaryModuleRegistration[] = [
  ...STUDIO_TEXT_ROLES.map((role) => ({ contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: `text:${role.id}`, categoryId: "text" as const, label: role.label, description: role.description, moduleKind: "text" as const, previewKind: "text" as const, readiness: "ready" as const, allowedParents: ["card-surface", "container"] as const, defaultCanonicalState: textRoleCanonicalProps(role.id), refineEntry: "content" as const, capabilityGroups: ["content", "text", "spacing", "position", "accessibility"], governance: "host-editable" as const })),
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "image:asset", categoryId: "image", label: "Image from Assets", description: "Choose an uploaded, Brand, recent, favorite, or provider-backed Asset.", moduleKind: "image", previewKind: "image", readiness: "ready", allowedParents: ["card-surface", "container"], defaultCanonicalState: { elementKind: "image", fit: "cover", alt: "Card image" }, refineEntry: "asset", capabilityGroups: ["asset", "treatment", "position", "accessibility"], governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "video:module", categoryId: "image", label: "Video", description: "Add hosted media or a supported provider URL, then choose Standard or Feature presentation.", moduleKind: "video", previewKind: "video", readiness: "ready", allowedParents: ["card-surface", "container"], defaultCanonicalState: { elementKind: "video", videoUrl: "", videoProvider: "hosted", playbackMode: "play_on_tap", muted: false, controls: true, playsInline: true, loop: false, playOnce: false, videoTitle: "Featured video", videoPresentation: "standard", videoAspect: "16:9", videoFrameTreatment: "transparent", aspectLocked: true }, refineEntry: "asset", capabilityGroups: ["source", "playback", "poster", "position", "accessibility", "analytics"], governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "button:standard", categoryId: "buttons", label: "Standard Button", description: "A directly editable action using a customer-ready presentation.", moduleKind: "button", previewKind: "button", readiness: "ready", allowedParents: ["card-surface", "container"], defaultCanonicalState: { elementKind: "button" }, refineEntry: "action", capabilityGroups: ["content", "action", "appearance", "position", "accessibility"], governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "divider:standard", categoryId: "divider", label: "Clean Divider", description: "A restrained separator with editable weight, color, and spacing.", moduleKind: "divider", previewKind: "divider", readiness: "ready", allowedParents: ["card-surface", "container"], defaultCanonicalState: { elementKind: "divider", thicknessPx: 1, opacity: 0.55, lineStyle: "solid" }, refineEntry: "appearance", capabilityGroups: ["appearance", "spacing", "position", "accessibility"], governance: "host-editable" },
];

export const STUDIO_CONTAINERS: readonly StudioContainerRegistration[] = [
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "container:transparent", categoryId: "container", label: "Transparent", description: "Group Modules without adding a visible surface.", treatment: "transparent", previewKind: "container", readiness: "ready", allowedParents: ["card-surface", "container"], refineEntry: "appearance", governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "container:solid", categoryId: "container", label: "Brand Color", description: "A solid region resolved from the Card’s current visual language.", treatment: "solid", previewKind: "container", readiness: "ready", allowedParents: ["card-surface", "container"], refineEntry: "appearance", governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "container:smoked-glass", categoryId: "container", label: "Smoked Glass", description: "A translucent dark region using the real Studio surface renderer.", treatment: "smoked_glass", previewKind: "container", readiness: "ready", allowedParents: ["card-surface", "container"], refineEntry: "appearance", governance: "host-editable" },
  { contractId: STUDIO_ADD_DISCOVER_CONTRACT, id: "container:image", categoryId: "container", label: "Image-backed", description: "Create the region, then choose its image in Refine.", treatment: "image", previewKind: "container", readiness: "ready", allowedParents: ["card-surface", "container"], refineEntry: "appearance", governance: "host-editable" },
];

export type StudioPlacementContext = {
  parentId: string | null;
  insertionIndex: number;
  targetLabel: string;
  reason: "card-surface" | "active-container" | "selected-sibling";
};

export function resolveStudioPlacementContext(
  block: CreativeCompositionBlock | null | undefined,
  selected: CreativeCompositionNode | null | undefined,
): StudioPlacementContext | null {
  if (!block || !hasCompositionParentAuthority(block)) return null;
  if (selected?.compositionKind === "container") {
    return { parentId: selected.id, insertionIndex: compositionChildren(block, selected.id).length, targetLabel: selected.name || "selected Container", reason: "active-container" };
  }
  if (selected?.compositionKind === "module") {
    const parentId = selected.parentId ?? null;
    const siblings = compositionChildren(block, parentId);
    const selectedIndex = siblings.findIndex((node) => node.id === selected.id);
    return { parentId, insertionIndex: Math.max(0, selectedIndex + 1), targetLabel: parentId ? block.nodes.find((node) => node.id === parentId)?.name || "Container" : "Card Surface", reason: "selected-sibling" };
  }
  return { parentId: null, insertionIndex: compositionChildren(block, null).length, targetLabel: "Card Surface", reason: "card-surface" };
}

export function visibleStudioAddCategories(categories: readonly StudioAddCategoryRegistration[] = STUDIO_ADD_CATEGORIES) {
  return categories.filter((category) => category.readiness === "ready").sort((left, right) => left.order - right.order);
}

export function validateStudioAddRegistry(input: {
  categories?: readonly StudioAddCategoryRegistration[];
  modules?: readonly StudioOrdinaryModuleRegistration[];
  containers?: readonly StudioContainerRegistration[];
}) {
  const categories = input.categories ?? STUDIO_ADD_CATEGORIES;
  const modules = input.modules ?? STUDIO_ORDINARY_MODULES;
  const containers = input.containers ?? STUDIO_CONTAINERS;
  const issues: string[] = [];
  const categoryIds = new Set<string>();
  for (const category of categories) {
    if (category.contractId !== STUDIO_ADD_DISCOVER_CONTRACT) issues.push(`Invalid category contract: ${category.id}`);
    if (categoryIds.has(category.id)) issues.push(`Duplicate Add category: ${category.id}`);
    categoryIds.add(category.id);
  }
  const resourceIds = new Set<string>();
  for (const resource of [...modules, ...containers]) {
    if (resource.contractId !== STUDIO_ADD_DISCOVER_CONTRACT) issues.push(`Invalid resource contract: ${resource.id}`);
    if (resourceIds.has(resource.id)) issues.push(`Duplicate Add resource: ${resource.id}`);
    if (!categoryIds.has(resource.categoryId)) issues.push(`Unknown Add category ${resource.categoryId} for ${resource.id}`);
    resourceIds.add(resource.id);
  }
  return issues;
}
