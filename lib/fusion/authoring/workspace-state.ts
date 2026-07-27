/**
 * Detached-tab / refresh restoration for Brand Kit focused workspace.
 * Session-scoped only — not durable Brand revision history.
 *
 * Adaptive Workspace Shell V1 extends chrome via workspace-shell-persist;
 * this module remains the Brand topic / preview surface contract.
 */

import type {
  CommandShadePreference,
  DrawerSizeMode,
  ToolDrawerMemory,
} from "./workspace-shell";

export type BrandWorkspaceTopic =
  | "overview"
  | "discover"
  | "brand"
  | "logos"
  | "images"
  | "colors"
  | "fonts"
  | "applications"
  | "history";

export type BrandPreviewSurface = "brand" | "card" | "typography";

export type BrandWorkspacePersistedState = {
  topic: BrandWorkspaceTopic | null;
  drawerOpen: boolean;
  selectedAssetId: string | null;
  zoom: number;
  previewSurface: BrandPreviewSurface;
  focusMode: boolean;
  /** Adaptive Workspace Shell V1 chrome (optional for back-compat). */
  shadePreference?: CommandShadePreference;
  drawerSizeMode?: DrawerSizeMode;
  customDrawerWidthPct?: number | null;
  toolMemory?: Record<string, ToolDrawerMemory>;
  sessionDraftRestored?: boolean;
};

export const BRAND_WORKSPACE_STORAGE_KEY = "tapconnect.brand-kit-workspace.v0";

export const DEFAULT_BRAND_WORKSPACE_STATE: BrandWorkspacePersistedState = {
  topic: "overview",
  drawerOpen: true,
  selectedAssetId: null,
  zoom: 1,
  previewSurface: "brand",
  focusMode: false,
  shadePreference: "auto",
  drawerSizeMode: "balanced",
  customDrawerWidthPct: null,
  toolMemory: {},
  sessionDraftRestored: false,
};

export function loadBrandWorkspaceState(): BrandWorkspacePersistedState {
  const storage = getSessionStorage();
  if (!storage) return { ...DEFAULT_BRAND_WORKSPACE_STATE };
  try {
    const raw = storage.getItem(BRAND_WORKSPACE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_WORKSPACE_STATE };
    const parsed = JSON.parse(raw) as Partial<BrandWorkspacePersistedState>;
    const hadSession = Boolean(raw);
    return {
      ...DEFAULT_BRAND_WORKSPACE_STATE,
      ...parsed,
      topic: normalizeTopic(parsed.topic),
      previewSurface: normalizeSurface(parsed.previewSurface),
      zoom: typeof parsed.zoom === "number" && parsed.zoom > 0 ? parsed.zoom : 1,
      shadePreference: normalizeShadePref(parsed.shadePreference),
      drawerSizeMode: normalizeDrawerMode(parsed.drawerSizeMode),
      customDrawerWidthPct:
        typeof parsed.customDrawerWidthPct === "number"
          ? parsed.customDrawerWidthPct
          : null,
      toolMemory:
        parsed.toolMemory && typeof parsed.toolMemory === "object"
          ? parsed.toolMemory
          : {},
      sessionDraftRestored: hadSession,
    };
  } catch {
    return { ...DEFAULT_BRAND_WORKSPACE_STATE };
  }
}

export function saveBrandWorkspaceState(state: BrandWorkspacePersistedState): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(BRAND_WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function getSessionStorage(): Storage | null {
  try {
    const s = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

const TOPICS: BrandWorkspaceTopic[] = [
  "overview",
  "discover",
  "brand",
  "logos",
  "images",
  "colors",
  "fonts",
  "applications",
  "history",
];

function normalizeTopic(
  t: BrandWorkspaceTopic | null | undefined
): BrandWorkspaceTopic | null {
  if (t == null) return null;
  return TOPICS.includes(t) ? t : "overview";
}

function normalizeSurface(
  s: BrandPreviewSurface | undefined
): BrandPreviewSurface {
  if (s === "card" || s === "typography" || s === "brand") return s;
  return "brand";
}

function normalizeShadePref(
  p: CommandShadePreference | undefined
): CommandShadePreference {
  if (p === "pinned_open" || p === "pinned_collapsed" || p === "auto") return p;
  return "auto";
}

function normalizeDrawerMode(m: DrawerSizeMode | undefined): DrawerSizeMode {
  if (
    m === "compact" ||
    m === "balanced" ||
    m === "library" ||
    m === "expanded" ||
    m === "custom"
  ) {
    return m;
  }
  return "balanced";
}

export const BRAND_TOPIC_LABELS: Record<BrandWorkspaceTopic, string> = {
  overview: "Overview",
  discover: "Discover",
  brand: "Brand",
  logos: "Logos",
  images: "Images",
  colors: "Colors",
  fonts: "Fonts",
  applications: "Applications",
  history: "History",
};
