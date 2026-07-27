/**
 * Detached-tab / refresh restoration for Brand Kit focused workspace.
 * Session-scoped only — not durable Brand revision history.
 */

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
};

export const BRAND_WORKSPACE_STORAGE_KEY = "tapconnect.brand-kit-workspace.v0";

export const DEFAULT_BRAND_WORKSPACE_STATE: BrandWorkspacePersistedState = {
  topic: "overview",
  drawerOpen: true,
  selectedAssetId: null,
  zoom: 1,
  previewSurface: "brand",
  focusMode: false,
};

export function loadBrandWorkspaceState(): BrandWorkspacePersistedState {
  const storage = getSessionStorage();
  if (!storage) return { ...DEFAULT_BRAND_WORKSPACE_STATE };
  try {
    const raw = storage.getItem(BRAND_WORKSPACE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_WORKSPACE_STATE };
    const parsed = JSON.parse(raw) as Partial<BrandWorkspacePersistedState>;
    return {
      ...DEFAULT_BRAND_WORKSPACE_STATE,
      ...parsed,
      topic: normalizeTopic(parsed.topic),
      previewSurface: normalizeSurface(parsed.previewSurface),
      zoom: typeof parsed.zoom === "number" && parsed.zoom > 0 ? parsed.zoom : 1,
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
