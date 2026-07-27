/**
 * Adaptive Workspace Shell V1 — shared state contract & resolution.
 *
 * Anatomy: Adaptive Command Shade → Adaptive Task Drawer → Live Work Surface.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 *
 * Vocabulary is internal — do not expose in primary host copy.
 */

/** Host-facing workspace intent (not shown as raw labels). */
export type WorkspaceMode =
  | "browse"
  | "review"
  | "edit"
  | "construct"
  | "focus"
  | "needs_attention";

/** Stored pin / auto preference for the Command Shade. */
export type CommandShadePreference =
  | "auto"
  | "pinned_open"
  | "pinned_collapsed";

/** Resolved visible shade presentation. */
export type CommandShadeDisplay = "open" | "peek" | "collapsed";

/** Full shade vocabulary including preference + display. */
export type CommandShadeState =
  | CommandShadeDisplay
  | "auto"
  | "pinned_open"
  | "pinned_collapsed";

export type DrawerState = "closed" | "open";

export type DrawerSizeMode =
  | "compact"
  | "balanced"
  | "library"
  | "expanded"
  | "custom";

/** Mobile sheet height modes (width modes map here on phone). */
export type MobileSheetMode = "compact" | "balanced" | "library" | "expanded";

export type WorkspaceIdentity = {
  id: string;
  label: string;
  objectLabel?: string;
  zone?: "brand" | "card" | "campaign" | "inbox" | "insights" | "autopilot" | "generic";
};

export type WorkspaceShellSnapshot = {
  workspaceId: string;
  workspaceMode: WorkspaceMode;
  shadePreference: CommandShadePreference;
  /** Last non-forced display under auto (restored when leaving edit/focus/attention). */
  priorShadeDisplay: CommandShadeDisplay;
  drawerOpen: boolean;
  selectedToolId: string | null;
  drawerSizeMode: DrawerSizeMode;
  customDrawerWidthPct: number | null;
  selectedObjectId: string | null;
  previewSurface: string | null;
  previewZoom: number | "fit";
  focusMode: boolean;
  dirty: boolean;
  saved: boolean;
  blockingWarning: string | null;
  modalOpen: boolean;
};

export type ToolDrawerMemory = {
  sizeMode: DrawerSizeMode;
  customWidthPct?: number | null;
  selectedItemId?: string | null;
  scrollTop?: number;
  filters?: Record<string, string>;
  searchTerm?: string;
  expandedSections?: string[];
  /** Session-only draft keys — never treat as durable save. */
  draftKeys?: string[];
};

export type WorkspaceShellPersistedState = {
  version: 1;
  workspaceId: string;
  shadePreference: CommandShadePreference;
  priorShadeDisplay: CommandShadeDisplay;
  drawerOpen: boolean;
  selectedToolId: string | null;
  drawerSizeMode: DrawerSizeMode;
  customDrawerWidthPct: number | null;
  selectedObjectId: string | null;
  previewSurface: string | null;
  previewZoom: number | "fit";
  focusMode: boolean;
  workspaceMode: WorkspaceMode;
  toolMemory: Record<string, ToolDrawerMemory>;
  /** Honest label when session draft was restored. */
  sessionDraftRestored?: boolean;
};

/**
 * State priority (highest first):
 * 1. Blocking warning / needs attention
 * 2. Modal or confirmation
 * 3. Manual pinned state
 * 4. Focus mode
 * 5. Active Edit / Construct mode
 * 6. Browse / Review default
 * 7. Saved workspace preference
 */
export const SHADE_PRIORITY = [
  "blocking_warning",
  "modal",
  "pinned",
  "focus",
  "edit_construct",
  "browse_review",
  "saved_preference",
] as const;

export type ShadePriorityReason = (typeof SHADE_PRIORITY)[number];

export type ResolvedShade = {
  display: CommandShadeDisplay;
  preference: CommandShadePreference;
  reason: ShadePriorityReason;
  /** When pinned-collapsed + blocking warning: keep strip, offer expand. */
  showWarningInStrip: boolean;
  expandAvailable: boolean;
};

/** Recommended drawer width as fraction of work row (desktop). */
export const DRAWER_SIZE_FRACTIONS: Record<Exclude<DrawerSizeMode, "custom">, number> = {
  compact: 1 / 3,
  balanced: 1 / 2,
  library: 2 / 3,
  expanded: 0.85,
};

export const DRAWER_WIDTH_MIN_PCT = 18;
export const DRAWER_WIDTH_MAX_PCT = 90;
/** Expanded intentional max — never accidental full cover. */
export const DRAWER_WIDTH_HARD_MAX_PCT = 92;

export const MOBILE_SHEET_HEIGHT: Record<MobileSheetMode, string> = {
  compact: "38vh",
  balanced: "52vh",
  library: "70vh",
  expanded: "88vh",
};

export const DEFAULT_SHELL_SNAPSHOT: Omit<WorkspaceShellSnapshot, "workspaceId"> = {
  workspaceMode: "browse",
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
  dirty: false,
  saved: true,
  blockingWarning: null,
  modalOpen: false,
};

export function createShellSnapshot(
  workspaceId: string,
  patch?: Partial<WorkspaceShellSnapshot>
): WorkspaceShellSnapshot {
  return {
    workspaceId,
    ...DEFAULT_SHELL_SNAPSHOT,
    ...patch,
  };
}

export function isEditOrConstruct(mode: WorkspaceMode): boolean {
  return mode === "edit" || mode === "construct";
}

export function isBrowseOrReview(mode: WorkspaceMode): boolean {
  return mode === "browse" || mode === "review";
}

/**
 * Resolve visible Command Shade from snapshot + priority rules.
 */
export function resolveCommandShade(snapshot: WorkspaceShellSnapshot): ResolvedShade {
  const { shadePreference, priorShadeDisplay, focusMode, workspaceMode, blockingWarning, modalOpen } =
    snapshot;

  // 1–2: Blocking / modal — prefer temporary open unless pinned collapsed (strip + expand).
  if (blockingWarning || workspaceMode === "needs_attention") {
    if (shadePreference === "pinned_collapsed") {
      return {
        display: "collapsed",
        preference: shadePreference,
        reason: "blocking_warning",
        showWarningInStrip: true,
        expandAvailable: true,
      };
    }
    return {
      display: "open",
      preference: shadePreference,
      reason: "blocking_warning",
      showWarningInStrip: Boolean(blockingWarning),
      expandAvailable: false,
    };
  }

  if (modalOpen) {
    if (shadePreference === "pinned_collapsed") {
      return {
        display: "peek",
        preference: shadePreference,
        reason: "modal",
        showWarningInStrip: false,
        expandAvailable: true,
      };
    }
    return {
      display: "open",
      preference: shadePreference,
      reason: "modal",
      showWarningInStrip: false,
      expandAvailable: false,
    };
  }

  // 3: Manual pin overrides auto behavior.
  if (shadePreference === "pinned_open") {
    return {
      display: "open",
      preference: shadePreference,
      reason: "pinned",
      showWarningInStrip: false,
      expandAvailable: false,
    };
  }
  if (shadePreference === "pinned_collapsed") {
    return {
      display: "collapsed",
      preference: shadePreference,
      reason: "pinned",
      showWarningInStrip: false,
      expandAvailable: true,
    };
  }

  // 4: Focus mode → collapsed / minimal
  if (focusMode || workspaceMode === "focus") {
    return {
      display: "collapsed",
      preference: "auto",
      reason: "focus",
      showWarningInStrip: false,
      expandAvailable: true,
    };
  }

  // 5: Edit / Construct → collapse
  if (isEditOrConstruct(workspaceMode)) {
    return {
      display: "collapsed",
      preference: "auto",
      reason: "edit_construct",
      showWarningInStrip: false,
      expandAvailable: true,
    };
  }

  // 6–7: Browse / Review → open or peek from prior / default
  if (isBrowseOrReview(workspaceMode)) {
    const display: CommandShadeDisplay =
      priorShadeDisplay === "collapsed" ? "peek" : priorShadeDisplay;
    return {
      display,
      preference: "auto",
      reason: "browse_review",
      showWarningInStrip: false,
      expandAvailable: display !== "open",
    };
  }

  return {
    display: priorShadeDisplay,
    preference: "auto",
    reason: "saved_preference",
    showWarningInStrip: false,
    expandAvailable: priorShadeDisplay !== "open",
  };
}

export type ShadeAction =
  | { type: "set_preference"; preference: CommandShadePreference }
  | { type: "set_display"; display: CommandShadeDisplay }
  | { type: "enter_edit" }
  | { type: "enter_construct" }
  | { type: "exit_edit_construct" }
  | { type: "enter_focus" }
  | { type: "exit_focus" }
  | { type: "needs_attention"; warning?: string | null }
  | { type: "clear_attention" }
  | { type: "set_modal"; open: boolean }
  | { type: "completion_pulse" }
  | { type: "set_mode"; mode: WorkspaceMode };

/**
 * Apply shade-related transitions. Pin preference overrides auto until host returns to Auto.
 */
export function applyShadeAction(
  snapshot: WorkspaceShellSnapshot,
  action: ShadeAction
): WorkspaceShellSnapshot {
  switch (action.type) {
    case "set_preference":
      return {
        ...snapshot,
        shadePreference: action.preference,
        priorShadeDisplay:
          action.preference === "pinned_open"
            ? "open"
            : action.preference === "pinned_collapsed"
              ? "collapsed"
              : snapshot.priorShadeDisplay,
      };
    case "set_display":
      return {
        ...snapshot,
        priorShadeDisplay: action.display,
        shadePreference:
          snapshot.shadePreference === "auto" ? "auto" : snapshot.shadePreference,
      };
    case "enter_edit":
      return {
        ...snapshot,
        workspaceMode: "edit",
        focusMode: false,
        priorShadeDisplay:
          snapshot.shadePreference === "auto"
            ? resolveCommandShade({ ...snapshot, workspaceMode: "browse" }).display
            : snapshot.priorShadeDisplay,
      };
    case "enter_construct":
      return {
        ...snapshot,
        workspaceMode: "construct",
        focusMode: false,
        priorShadeDisplay:
          snapshot.shadePreference === "auto"
            ? resolveCommandShade({ ...snapshot, workspaceMode: "browse" }).display
            : snapshot.priorShadeDisplay,
      };
    case "exit_edit_construct":
      return {
        ...snapshot,
        workspaceMode: "browse",
        // priorShadeDisplay already holds pre-edit state under auto
      };
    case "enter_focus":
      return {
        ...snapshot,
        focusMode: true,
        workspaceMode: "focus",
        drawerOpen: false,
        priorShadeDisplay:
          snapshot.shadePreference === "auto"
            ? resolveCommandShade({
                ...snapshot,
                focusMode: false,
                workspaceMode: isEditOrConstruct(snapshot.workspaceMode)
                  ? "browse"
                  : snapshot.workspaceMode === "focus"
                    ? "browse"
                    : snapshot.workspaceMode,
              }).display
            : snapshot.priorShadeDisplay,
      };
    case "exit_focus":
      return {
        ...snapshot,
        focusMode: false,
        workspaceMode: isEditOrConstruct(snapshot.workspaceMode)
          ? snapshot.workspaceMode
          : "browse",
      };
    case "needs_attention":
      return {
        ...snapshot,
        workspaceMode: "needs_attention",
        blockingWarning: action.warning ?? snapshot.blockingWarning ?? "Attention required",
      };
    case "clear_attention":
      return {
        ...snapshot,
        workspaceMode: snapshot.focusMode ? "focus" : "browse",
        blockingWarning: null,
      };
    case "set_modal":
      return { ...snapshot, modalOpen: action.open };
    case "completion_pulse":
      // Briefly prefer peek/open via prior; host may animate then restore.
      return {
        ...snapshot,
        priorShadeDisplay: snapshot.priorShadeDisplay === "collapsed" ? "peek" : "open",
        workspaceMode: isEditOrConstruct(snapshot.workspaceMode)
          ? snapshot.workspaceMode
          : "review",
      };
    case "set_mode":
      return { ...snapshot, workspaceMode: action.mode, focusMode: action.mode === "focus" };
    default:
      return snapshot;
  }
}

export function drawerWidthPct(
  mode: DrawerSizeMode,
  customPct: number | null | undefined
): number {
  if (mode === "custom" && typeof customPct === "number") {
    return clampDrawerPct(customPct);
  }
  const key = mode === "custom" ? "balanced" : mode;
  return Math.round(DRAWER_SIZE_FRACTIONS[key] * 100);
}

export function clampDrawerPct(pct: number): number {
  return Math.min(DRAWER_WIDTH_HARD_MAX_PCT, Math.max(DRAWER_WIDTH_MIN_PCT, Math.round(pct)));
}

export function recommendedModeForTool(
  recommended: DrawerSizeMode | undefined
): DrawerSizeMode {
  return recommended ?? "balanced";
}

export function resetDrawerToRecommended(
  recommended: DrawerSizeMode
): Pick<WorkspaceShellSnapshot, "drawerSizeMode" | "customDrawerWidthPct"> {
  return {
    drawerSizeMode: recommended === "custom" ? "balanced" : recommended,
    customDrawerWidthPct: null,
  };
}

export function rememberToolDrawer(
  memory: Record<string, ToolDrawerMemory>,
  toolId: string,
  patch: Partial<ToolDrawerMemory>
): Record<string, ToolDrawerMemory> {
  const prev = memory[toolId] ?? { sizeMode: "balanced" };
  return {
    ...memory,
    [toolId]: { ...prev, ...patch },
  };
}

export function openToolDrawer(
  snapshot: WorkspaceShellSnapshot,
  toolId: string,
  recommended: DrawerSizeMode,
  memory: Record<string, ToolDrawerMemory>,
  options?: { triggersConstructMode?: boolean }
): {
  snapshot: WorkspaceShellSnapshot;
  memory: Record<string, ToolDrawerMemory>;
} {
  const mem = memory[toolId];
  const sizeMode = mem?.sizeMode ?? recommended;
  const customDrawerWidthPct =
    sizeMode === "custom" ? (mem?.customWidthPct ?? null) : null;
  const shouldEdit =
    options?.triggersConstructMode === true ||
    (options?.triggersConstructMode === undefined &&
      isBrowseOrReview(snapshot.workspaceMode) &&
      (recommended === "compact" ||
        recommended === "library" ||
        recommended === "expanded"));

  return {
    snapshot: {
      ...snapshot,
      drawerOpen: true,
      selectedToolId: toolId,
      drawerSizeMode: sizeMode,
      customDrawerWidthPct,
      selectedObjectId: mem?.selectedItemId ?? snapshot.selectedObjectId,
      workspaceMode: shouldEdit ? "edit" : snapshot.workspaceMode,
      focusMode: false,
    },
    memory,
  };
}

/**
 * Esc priority (documented + tested):
 * 1. Close modal if open
 * 2. Close expanded drawer state if applicable (downgrade expanded → prior mode)
 * 3. Exit Focus mode
 * 4. Close ordinary drawer
 * 5. Exit workspace (caller handles navigation)
 */
export type EscLayer =
  | "modal"
  | "expanded_drawer"
  | "focus"
  | "drawer"
  | "exit_workspace";

export function nextEscLayer(input: {
  modalOpen: boolean;
  drawerOpen: boolean;
  drawerSizeMode: DrawerSizeMode;
  focusMode: boolean;
}): EscLayer {
  if (input.modalOpen) return "modal";
  if (input.drawerOpen && input.drawerSizeMode === "expanded") return "expanded_drawer";
  if (input.focusMode) return "focus";
  if (input.drawerOpen) return "drawer";
  return "exit_workspace";
}

export function applyEscLayer(
  snapshot: WorkspaceShellSnapshot,
  layer: EscLayer,
  priorSizeMode: DrawerSizeMode = "balanced"
): WorkspaceShellSnapshot {
  switch (layer) {
    case "modal":
      return { ...snapshot, modalOpen: false };
    case "expanded_drawer":
      return {
        ...snapshot,
        drawerSizeMode: priorSizeMode === "expanded" ? "balanced" : priorSizeMode,
        customDrawerWidthPct: null,
      };
    case "focus":
      return applyShadeAction(snapshot, { type: "exit_focus" });
    case "drawer":
      return { ...snapshot, drawerOpen: false };
    case "exit_workspace":
      return snapshot;
    default:
      return snapshot;
  }
}

export function mapDesktopModeToMobileSheet(mode: DrawerSizeMode): MobileSheetMode {
  if (mode === "custom") return "balanced";
  return mode;
}

export function shellStorageKey(workspaceId: string): string {
  return `tapconnect.workspace-shell.v1.${workspaceId}`;
}
