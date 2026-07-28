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

/** Card authoring — Adaptive Workspace Shell tools (one drawer topic at a time). */
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
    id: "content",
    label: "Content",
    icon: "PanelRight",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
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
    workspaceIds: ["card-authoring"],
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
    workspaceIds: ["card-authoring"],
  },
  {
    id: "typography",
    label: "Typography",
    icon: "Type",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "buttons",
    label: "Buttons",
    icon: "MousePointerClick",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "media",
    label: "Media",
    icon: "Image",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "layout",
    label: "Layout",
    icon: "LayoutTemplate",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "offer",
    label: "Offer Spotlight",
    icon: "Sparkles",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "tapsave",
    label: "TapSave",
    icon: "Bookmark",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "history",
    label: "History",
    icon: "History",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    icon: "GitBranch",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["card-authoring"],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "Code2",
    recommendedDrawerMode: "expanded",
    mobileSheetMode: "expanded",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["card-authoring"],
  },
  /** Compatibility aliases — open Content / Colors drawers */
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

/** Campaign Workbench — third consumer of Adaptive Workspace Shell + Visual Core. */
export const CAMPAIGN_AUTHORING_TOOLS: WorkspaceToolDefinition[] = [
  {
    id: "outline",
    label: "Outline",
    icon: "ListTree",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
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
    workspaceIds: ["campaign-authoring"],
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
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "typography",
    label: "Typography",
    icon: "Type",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "layout",
    label: "Layout",
    icon: "LayoutTemplate",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "buttons",
    label: "Buttons",
    icon: "MousePointerClick",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "media",
    label: "Media",
    icon: "Image",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "effects",
    label: "Effects",
    icon: "Sparkles",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "templates",
    label: "Templates",
    icon: "GalleryHorizontal",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "readiness",
    label: "Readiness",
    icon: "ShieldCheck",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
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
    workspaceIds: ["campaign-authoring"],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "Code2",
    recommendedDrawerMode: "expanded",
    mobileSheetMode: "expanded",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["campaign-authoring"],
  },
];

/** Email authoring — fourth consumer of Adaptive Workspace Shell + Visual Core. */
export const EMAIL_AUTHORING_TOOLS: WorkspaceToolDefinition[] = [
  {
    id: "outline",
    label: "Outline",
    icon: "ListTree",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "content",
    label: "Content",
    icon: "FileText",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
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
    workspaceIds: ["email-authoring"],
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
    workspaceIds: ["email-authoring"],
  },
  {
    id: "typography",
    label: "Typography",
    icon: "Type",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "buttons",
    label: "Buttons",
    icon: "MousePointerClick",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "media",
    label: "Media",
    icon: "Image",
    recommendedDrawerMode: "library",
    mobileSheetMode: "library",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "layout",
    label: "Layout",
    icon: "LayoutTemplate",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "partial",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "subject",
    label: "Subject",
    icon: "Mail",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    triggersConstructMode: true,
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "audience",
    label: "Audience",
    icon: "Users",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "readiness",
    label: "Consent",
    icon: "ShieldCheck",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "preview",
    label: "Preview",
    icon: "Eye",
    recommendedDrawerMode: "compact",
    mobileSheetMode: "compact",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
  {
    id: "plain_text",
    label: "Plain Text",
    icon: "AlignLeft",
    recommendedDrawerMode: "balanced",
    mobileSheetMode: "balanced",
    supportsSelectionMemory: false,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
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
    workspaceIds: ["email-authoring"],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "Code2",
    recommendedDrawerMode: "expanded",
    mobileSheetMode: "expanded",
    supportsSelectionMemory: true,
    supportsResize: true,
    featureReadiness: "ready",
    workspaceIds: ["email-authoring"],
  },
];

export function ensureDefaultToolRegistries(): void {
  if (!registries.has("brand-kit")) {
    registerWorkspaceTools("brand-kit", BRAND_KIT_TOOLS);
  }
  // Always refresh Card tools — registry grew with Adaptive Task Drawer topics.
  registerWorkspaceTools("card-authoring", CARD_AUTHORING_TOOLS);
  if (!registries.has("campaign-authoring")) {
    registerWorkspaceTools("campaign-authoring", CAMPAIGN_AUTHORING_TOOLS);
  }
  if (!registries.has("email-authoring")) {
    registerWorkspaceTools("email-authoring", EMAIL_AUTHORING_TOOLS);
  }
}

ensureDefaultToolRegistries();
