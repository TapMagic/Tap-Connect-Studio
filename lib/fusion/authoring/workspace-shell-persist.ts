/**
 * Adaptive Workspace Shell V1 — session persistence for detached tab / refresh.
 * Session-scoped only — never imply durable save when only session state exists.
 */

import {
  createShellSnapshot,
  shellStorageKey,
  type CommandShadeDisplay,
  type CommandShadePreference,
  type DrawerSizeMode,
  type ToolDrawerMemory,
  type WorkspaceMode,
  type WorkspaceShellPersistedState,
  type WorkspaceShellSnapshot,
} from "./workspace-shell";

const SHADE_PREFS: CommandShadePreference[] = [
  "auto",
  "pinned_open",
  "pinned_collapsed",
];

const SHADE_DISPLAYS: CommandShadeDisplay[] = ["open", "peek", "collapsed"];

const DRAWER_MODES: DrawerSizeMode[] = [
  "compact",
  "balanced",
  "library",
  "expanded",
  "custom",
];

const WORKSPACE_MODES: WorkspaceMode[] = [
  "browse",
  "review",
  "edit",
  "construct",
  "focus",
  "needs_attention",
];

function getSessionStorage(): Storage | null {
  try {
    return (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function defaultPersistedShell(
  workspaceId: string
): WorkspaceShellPersistedState {
  return {
    version: 1,
    workspaceId,
    shadePreference: "auto",
    priorShadeDisplay: "open",
    drawerOpen: false,
    selectedToolId: null,
    drawerSizeMode: "balanced",
    customDrawerWidthPct: null,
    selectedObjectId: null,
    previewSurface: null,
    previewZoom: 1,
    focusMode: false,
    workspaceMode: "browse",
    toolMemory: {},
    sessionDraftRestored: false,
  };
}

function normalizeToolMemory(
  raw: unknown
): Record<string, ToolDrawerMemory> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, ToolDrawerMemory> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<ToolDrawerMemory>;
    const sizeMode = DRAWER_MODES.includes(v.sizeMode as DrawerSizeMode)
      ? (v.sizeMode as DrawerSizeMode)
      : "balanced";
    out[id] = {
      sizeMode,
      customWidthPct:
        typeof v.customWidthPct === "number" ? v.customWidthPct : null,
      selectedItemId:
        typeof v.selectedItemId === "string" ? v.selectedItemId : null,
      scrollTop: typeof v.scrollTop === "number" ? v.scrollTop : undefined,
      filters:
        v.filters && typeof v.filters === "object"
          ? (v.filters as Record<string, string>)
          : undefined,
      searchTerm: typeof v.searchTerm === "string" ? v.searchTerm : undefined,
      expandedSections: Array.isArray(v.expandedSections)
        ? v.expandedSections.filter((s): s is string => typeof s === "string")
        : undefined,
      draftKeys: Array.isArray(v.draftKeys)
        ? v.draftKeys.filter((s): s is string => typeof s === "string")
        : undefined,
    };
  }
  return out;
}

export function loadWorkspaceShellState(
  workspaceId: string
): WorkspaceShellPersistedState {
  const storage = getSessionStorage();
  const fallback = defaultPersistedShell(workspaceId);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(shellStorageKey(workspaceId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WorkspaceShellPersistedState>;
    return {
      ...fallback,
      ...parsed,
      version: 1,
      workspaceId,
      shadePreference: SHADE_PREFS.includes(
        parsed.shadePreference as CommandShadePreference
      )
        ? (parsed.shadePreference as CommandShadePreference)
        : "auto",
      priorShadeDisplay: SHADE_DISPLAYS.includes(
        parsed.priorShadeDisplay as CommandShadeDisplay
      )
        ? (parsed.priorShadeDisplay as CommandShadeDisplay)
        : "open",
      drawerSizeMode: DRAWER_MODES.includes(
        parsed.drawerSizeMode as DrawerSizeMode
      )
        ? (parsed.drawerSizeMode as DrawerSizeMode)
        : "balanced",
      workspaceMode: WORKSPACE_MODES.includes(
        parsed.workspaceMode as WorkspaceMode
      )
        ? (parsed.workspaceMode as WorkspaceMode)
        : "browse",
      previewZoom:
        parsed.previewZoom === "fit" ||
        (typeof parsed.previewZoom === "number" && parsed.previewZoom > 0)
          ? parsed.previewZoom
          : 1,
      toolMemory: normalizeToolMemory(parsed.toolMemory),
      sessionDraftRestored: true,
      // Never silently restore unsafe object refs — string ids only.
      selectedObjectId:
        typeof parsed.selectedObjectId === "string"
          ? parsed.selectedObjectId
          : null,
      selectedToolId:
        typeof parsed.selectedToolId === "string" ? parsed.selectedToolId : null,
    };
  } catch {
    return fallback;
  }
}

export function saveWorkspaceShellState(
  state: WorkspaceShellPersistedState
): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    // Bound payload — drop oversized search/filter blobs.
    const toolMemory: Record<string, ToolDrawerMemory> = {};
    for (const [id, mem] of Object.entries(state.toolMemory)) {
      toolMemory[id] = {
        ...mem,
        searchTerm: mem.searchTerm?.slice(0, 200),
        filters: mem.filters
          ? Object.fromEntries(
              Object.entries(mem.filters)
                .slice(0, 20)
                .map(([k, v]) => [k.slice(0, 64), String(v).slice(0, 200)])
            )
          : undefined,
        draftKeys: mem.draftKeys?.slice(0, 40),
      };
    }
    storage.setItem(
      shellStorageKey(state.workspaceId),
      JSON.stringify({ ...state, version: 1 as const, toolMemory })
    );
  } catch {
    /* ignore quota */
  }
}

export function persistedToSnapshot(
  persisted: WorkspaceShellPersistedState
): WorkspaceShellSnapshot {
  return createShellSnapshot(persisted.workspaceId, {
    workspaceMode: persisted.focusMode ? "focus" : persisted.workspaceMode,
    shadePreference: persisted.shadePreference,
    priorShadeDisplay: persisted.priorShadeDisplay,
    drawerOpen: persisted.drawerOpen,
    selectedToolId: persisted.selectedToolId,
    drawerSizeMode: persisted.drawerSizeMode,
    customDrawerWidthPct: persisted.customDrawerWidthPct,
    selectedObjectId: persisted.selectedObjectId,
    previewSurface: persisted.previewSurface,
    previewZoom: persisted.previewZoom,
    focusMode: persisted.focusMode,
    dirty: false,
    saved: true,
    blockingWarning: null,
    modalOpen: false,
  });
}

export function snapshotToPersisted(
  snapshot: WorkspaceShellSnapshot,
  toolMemory: Record<string, ToolDrawerMemory>,
  extras?: { sessionDraftRestored?: boolean }
): WorkspaceShellPersistedState {
  return {
    version: 1,
    workspaceId: snapshot.workspaceId,
    shadePreference: snapshot.shadePreference,
    priorShadeDisplay: snapshot.priorShadeDisplay,
    drawerOpen: snapshot.drawerOpen,
    selectedToolId: snapshot.selectedToolId,
    drawerSizeMode: snapshot.drawerSizeMode,
    customDrawerWidthPct: snapshot.customDrawerWidthPct,
    selectedObjectId: snapshot.selectedObjectId,
    previewSurface: snapshot.previewSurface,
    previewZoom: snapshot.previewZoom,
    focusMode: snapshot.focusMode,
    workspaceMode: snapshot.workspaceMode,
    toolMemory,
    sessionDraftRestored: extras?.sessionDraftRestored ?? false,
  };
}

/** Honest copy when only session chrome was restored. */
export const SESSION_RESTORE_LABEL =
  "Workspace layout restored from this browser session — not a durable save.";
