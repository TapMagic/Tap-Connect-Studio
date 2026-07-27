/**
 * Adaptive Workspace Shell V1 — reusable tool / topic registry.
 * Brand Kit and Card register tools through the same contract.
 */

import type {
  DrawerSizeMode,
  MobileSheetMode,
  WorkspaceMode,
} from "./workspace-shell";

export type WorkspaceToolId = string;

export type WorkspaceToolDefinition = {
  id: WorkspaceToolId;
  label: string;
  /** Lucide (or other) icon name — hosts render icons; registry stays data-only. */
  icon?: string;
  /** Recommended desktop drawer size. */
  recommendedDrawerMode: DrawerSizeMode;
  minWidthPct?: number;
  maxWidthPct?: number;
  mobileSheetMode?: MobileSheetMode;
  /** Workspace modes where this tool is available. Empty = all. */
  availableInModes?: WorkspaceMode[];
  /** Opening this tool may move workspace into construct/edit. */
  triggersConstructMode?: boolean;
  supportsSelectionMemory?: boolean;
  supportsResize?: boolean;
  requiredPermissions?: string[];
  /** Honest readiness — host may hide or badge. */
  featureReadiness?: "ready" | "partial" | "deferred";
  workspaceIds?: string[];
};

export type WorkspaceToolRegistry = {
  workspaceId: string;
  tools: WorkspaceToolDefinition[];
};

const registries = new Map<string, WorkspaceToolDefinition[]>();

export function registerWorkspaceTools(
  workspaceId: string,
  tools: WorkspaceToolDefinition[]
): void {
  registries.set(workspaceId, tools.map((t) => ({ ...t })));
}

export function getWorkspaceTools(workspaceId: string): WorkspaceToolDefinition[] {
  return registries.get(workspaceId)?.map((t) => ({ ...t })) ?? [];
}

export function getWorkspaceTool(
  workspaceId: string,
  toolId: string
): WorkspaceToolDefinition | undefined {
  return getWorkspaceTools(workspaceId).find((t) => t.id === toolId);
}

export function clearWorkspaceTools(workspaceId?: string): void {
  if (workspaceId) registries.delete(workspaceId);
  else registries.clear();
}

/** Brand Kit proving-ground tools. */
export const BRAND_KIT_TOOLS: WorkspaceToolDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "LayoutDashboard",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "discover",
    label: "Discover",
    icon: "Sparkles",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "brand",
    label: "Brand",
    icon: "BadgeCheck",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "logos",
    label: "Logos",
    icon: "Image",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "images",
    label: "Images",
    icon: "Images",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "colors",
    label: "Colors",
    icon: "Palette",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "fonts",
    label: "Fonts",
    icon: "Type",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "applications",
    label: "Applications",
    icon: "AppWindow",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["brand-kit"],
  },
  {
    id: "history",
    label: "History",
    icon: "History",
    recommendedDrawerMode: "expanded",
    mobileSheetMode: "expanded",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["brand-kit"],
  },
];

/** Card authoring — shell second-consumer tools (minimal; Format stays in builder). */
export const CARD_AUTHORING_TOOLS: WorkspaceToolDefinition[] = [
  {
    id: "outline",
    label: "Outline",
    icon: "ListTree",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "format",
    label: "Format",
    icon: "SlidersHorizontal",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "inspector",
    label: "Inspector",
    icon: "PanelRight",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
];

export function ensureDefaultToolRegistries(): void {
  if (!registries.has("brand-kit")) {
    registerWorkspaceTools("brand-kit", BRAND_KIT_TOOLS);
  }
  if (!registries.has("card-authoring")) {
    registerWorkspaceTools("card-authoring", CARD_AUTHORING_TOOLS);
  }
}

ensureDefaultToolRegistries();
