/**
 * One Studio, composed differently for the Host's explicit authoring job.
 * Internal composition names never need to appear in customer-facing copy.
 */
export const STUDIO_ADAPTIVE_WORKSPACE_CONTRACT = "studioAdaptiveWorkspace@1.0.0" as const;

export type StudioWorkspaceComposition =
  | "compose"
  | "organize"
  | "refine"
  | "discover"
  | "deep-edit"
  | "review";

export type StudioWorkspaceTaskId =
  | "compose-card"
  | "arrange-card"
  | "refine-selection"
  | "tune-selection"
  | "browse-add"
  | "browse-buttons"
  | "browse-assets"
  | "browse-curated-plugs"
  | "browse-surface"
  | "adjust-resource"
  | "edit-contents"
  | "preview-card"
  | "live-device";

export type StudioWorkspaceTask = {
  id: StudioWorkspaceTaskId;
  hostLabel: string;
  composition: StudioWorkspaceComposition;
  explicit: boolean;
  cardVisibility: "dominant" | "comparison" | "optional" | "review";
  outline: "hidden" | "available" | "primary";
  contextualSurface: "hidden" | "identity" | "full";
  taskSurface: "none" | "compact" | "standard" | "broad";
  transient: boolean;
};

export const STUDIO_WORKSPACE_TASKS: Readonly<Record<StudioWorkspaceTaskId, StudioWorkspaceTask>> = {
  "compose-card": { id: "compose-card", hostLabel: "Compose Card", composition: "compose", explicit: true, cardVisibility: "dominant", outline: "available", contextualSurface: "identity", taskSurface: "none", transient: false },
  "arrange-card": { id: "arrange-card", hostLabel: "Arrange Card", composition: "organize", explicit: true, cardVisibility: "comparison", outline: "primary", contextualSurface: "identity", taskSurface: "standard", transient: true },
  "refine-selection": { id: "refine-selection", hostLabel: "Edit selection", composition: "refine", explicit: true, cardVisibility: "comparison", outline: "hidden", contextualSurface: "full", taskSurface: "none", transient: true },
  "tune-selection": { id: "tune-selection", hostLabel: "Tune selection", composition: "refine", explicit: true, cardVisibility: "comparison", outline: "hidden", contextualSurface: "full", taskSurface: "none", transient: true },
  "browse-add": { id: "browse-add", hostLabel: "Browse Add", composition: "discover", explicit: true, cardVisibility: "optional", outline: "hidden", contextualSurface: "hidden", taskSurface: "broad", transient: true },
  "browse-buttons": { id: "browse-buttons", hostLabel: "Browse Buttons", composition: "discover", explicit: true, cardVisibility: "optional", outline: "hidden", contextualSurface: "hidden", taskSurface: "broad", transient: true },
  "browse-assets": { id: "browse-assets", hostLabel: "Choose Asset", composition: "discover", explicit: true, cardVisibility: "optional", outline: "hidden", contextualSurface: "identity", taskSurface: "broad", transient: true },
  "browse-curated-plugs": { id: "browse-curated-plugs", hostLabel: "Choose plug", composition: "discover", explicit: true, cardVisibility: "optional", outline: "hidden", contextualSurface: "identity", taskSurface: "broad", transient: true },
  "browse-surface": { id: "browse-surface", hostLabel: "Choose Surface", composition: "discover", explicit: true, cardVisibility: "optional", outline: "hidden", contextualSurface: "identity", taskSurface: "broad", transient: true },
  "adjust-resource": { id: "adjust-resource", hostLabel: "Adjust visual", composition: "deep-edit", explicit: true, cardVisibility: "comparison", outline: "hidden", contextualSurface: "full", taskSurface: "standard", transient: true },
  "edit-contents": { id: "edit-contents", hostLabel: "Edit Contents", composition: "deep-edit", explicit: true, cardVisibility: "comparison", outline: "hidden", contextualSurface: "full", taskSurface: "standard", transient: true },
  "preview-card": { id: "preview-card", hostLabel: "Preview", composition: "review", explicit: true, cardVisibility: "review", outline: "hidden", contextualSurface: "hidden", taskSurface: "none", transient: true },
  "live-device": { id: "live-device", hostLabel: "View on phone", composition: "review", explicit: true, cardVisibility: "review", outline: "hidden", contextualSurface: "hidden", taskSurface: "standard", transient: true },
};

export type StudioAuthoringContextSnapshot = {
  taskId: StudioWorkspaceTaskId;
  selectedObjectId: string | null;
  selectedInternalItemId: string | null;
  semanticAncestors: readonly string[];
  cardScroll: { left: number; top: number };
  zoom: number | null;
  outline: { expandedIds: readonly string[]; scrollOffset: number };
  inspectorGroup: string | null;
  browser: {
    adapterId: string | null;
    path: readonly string[];
    query: string;
    filters: Readonly<Record<string, readonly string[]>>;
    scrollOffset: number;
    candidateResultId: string | null;
  };
  focusTarget: string | null;
  returnDestination: string | null;
};

export const EMPTY_STUDIO_CONTEXT: StudioAuthoringContextSnapshot = {
  taskId: "compose-card",
  selectedObjectId: null,
  selectedInternalItemId: null,
  semanticAncestors: [],
  cardScroll: { left: 0, top: 0 },
  zoom: null,
  outline: { expandedIds: [], scrollOffset: 0 },
  inspectorGroup: null,
  browser: { adapterId: null, path: [], query: "", filters: {}, scrollOffset: 0, candidateResultId: null },
  focusTarget: null,
  returnDestination: null,
};

export type StudioWorkspaceState = {
  contractId: typeof STUDIO_ADAPTIVE_WORKSPACE_CONTRACT;
  activeTaskId: StudioWorkspaceTaskId;
  composition: StudioWorkspaceComposition;
  returnStack: readonly StudioAuthoringContextSnapshot[];
  transitionSerial: number;
};

export const INITIAL_STUDIO_WORKSPACE_STATE: StudioWorkspaceState = {
  contractId: STUDIO_ADAPTIVE_WORKSPACE_CONTRACT,
  activeTaskId: "compose-card",
  composition: "compose",
  returnStack: [],
  transitionSerial: 0,
};

export type StudioWorkspaceEvent =
  | { type: "BEGIN_EXPLICIT_TASK"; taskId: StudioWorkspaceTaskId; context: StudioAuthoringContextSnapshot }
  | { type: "BEGIN_NESTED_TASK"; taskId: StudioWorkspaceTaskId; context: StudioAuthoringContextSnapshot }
  | { type: "HANDOFF_TRANSIENT_TASK"; taskId: StudioWorkspaceTaskId }
  | { type: "INCIDENTAL_SELECTION"; selectedObjectId: string | null }
  | { type: "COMPLETE_TRANSIENT_TASK" }
  | { type: "COMPLETE_AUTHORING_TRANSACTION" }
  | { type: "CANCEL_TRANSIENT_TASK" }
  | { type: "RESTORE"; state: StudioWorkspaceState };

export type StudioTransientTaskLifecycle = {
  enter: (
    taskId: StudioWorkspaceTaskId,
    transition: { mode: "nested" | "handoff"; consumeBoundary?: "catalog-open" | "catalog-close" },
  ) => void;
  exit: (outcome: "apply" | "cancel") => void;
};

export function studioWorkspaceReducer(state: StudioWorkspaceState, event: StudioWorkspaceEvent): StudioWorkspaceState {
  if (event.type === "RESTORE") return event.state.contractId === STUDIO_ADAPTIVE_WORKSPACE_CONTRACT ? event.state : INITIAL_STUDIO_WORKSPACE_STATE;
  // Choose → Browse → Place is one authoring transaction even when discovery
  // temporarily nests an Asset browser. Successful placement owns the new
  // selection, so it exits every discovery return frame without restoring the
  // pre-placement selection.
  if (event.type === "COMPLETE_AUTHORING_TRANSACTION") {
    return { ...INITIAL_STUDIO_WORKSPACE_STATE, transitionSerial: state.transitionSerial + 1 };
  }
  // Selection changes update the canonical selection authority, never workspace furniture.
  if (event.type === "INCIDENTAL_SELECTION") return state;
  if (event.type === "BEGIN_EXPLICIT_TASK") {
    const task = STUDIO_WORKSPACE_TASKS[event.taskId];
    if (state.activeTaskId === event.taskId && state.composition === task.composition) return state;
    // Local depth inside the same workspace composition is navigation, not a
    // second furniture transition. Preserve one return point for the whole job.
    if (state.composition === task.composition) {
      return { ...state, activeTaskId: event.taskId, transitionSerial: state.transitionSerial + 1 };
    }
    return {
      ...state,
      activeTaskId: event.taskId,
      composition: task.composition,
      returnStack: task.transient ? [...state.returnStack, event.context] : state.returnStack,
      transitionSerial: state.transitionSerial + 1,
    };
  }
  // Modal/deep authoring launched from another task is a real nested
  // transaction even when both tasks use the same workspace composition.
  // Its own return point must not be coalesced away.
  if (event.type === "BEGIN_NESTED_TASK") {
    const task = STUDIO_WORKSPACE_TASKS[event.taskId];
    return {
      ...state,
      activeTaskId: event.taskId,
      composition: task.composition,
      returnStack: [...state.returnStack, event.context],
      transitionSerial: state.transitionSerial + 1,
    };
  }
  // A handoff is one Host transaction changing surfaces (for example Asset
  // browser -> crop). Preserve the original return point; do not complete the
  // first surface and then race a second BEGIN against stale React state.
  if (event.type === "HANDOFF_TRANSIENT_TASK") {
    const task = STUDIO_WORKSPACE_TASKS[event.taskId];
    return {
      ...state,
      activeTaskId: event.taskId,
      composition: task.composition,
      transitionSerial: state.transitionSerial + 1,
    };
  }
  if (event.type === "COMPLETE_TRANSIENT_TASK" || event.type === "CANCEL_TRANSIENT_TASK") {
    const prior = state.returnStack.at(-1);
    if (!prior) return INITIAL_STUDIO_WORKSPACE_STATE;
    const task = STUDIO_WORKSPACE_TASKS[prior.taskId];
    return {
      ...state,
      activeTaskId: prior.taskId,
      composition: task.composition,
      returnStack: state.returnStack.slice(0, -1),
      transitionSerial: state.transitionSerial + 1,
    };
  }
  return state;
}

export type StudioContextTargetIndex = {
  existingObjectIds: ReadonlySet<string>;
  parentByObjectId: Readonly<Record<string, string | null | undefined>>;
  cardSurfaceId?: string;
};

export type StudioContextRestoreTarget = {
  objectId: string | null;
  reason: "exact" | "semantic-parent" | "card-context" | "card-surface";
};

export function resolveStudioContextRestoreTarget(
  snapshot: StudioAuthoringContextSnapshot,
  index: StudioContextTargetIndex,
): StudioContextRestoreTarget {
  if (snapshot.selectedObjectId && index.existingObjectIds.has(snapshot.selectedObjectId)) {
    return { objectId: snapshot.selectedObjectId, reason: "exact" };
  }
  for (const ancestor of snapshot.semanticAncestors) {
    if (index.existingObjectIds.has(ancestor)) return { objectId: ancestor, reason: "semantic-parent" };
  }
  let parent = snapshot.selectedObjectId ? index.parentByObjectId[snapshot.selectedObjectId] : null;
  while (parent) {
    if (index.existingObjectIds.has(parent)) return { objectId: parent, reason: "card-context" };
    parent = index.parentByObjectId[parent] ?? null;
  }
  return { objectId: index.cardSurfaceId ?? null, reason: "card-surface" };
}

export type StudioViewportClass = "phone" | "small-laptop" | "desktop" | "wide";

export function classifyStudioViewport(width: number): StudioViewportClass {
  if (width < 768) return "phone";
  if (width < 1180) return "small-laptop";
  if (width < 1680) return "desktop";
  return "wide";
}

export function resolveStudioWorkspaceChoreography(state: StudioWorkspaceState, width: number) {
  const task = STUDIO_WORKSPACE_TASKS[state.activeTaskId];
  const viewport = classifyStudioViewport(width);
  const singleSecondarySurface = viewport === "small-laptop" || viewport === "phone";
  return {
    viewport,
    composition: state.composition,
    hostLabel: task.hostLabel,
    cardVisibility: task.cardVisibility,
    outlineVisible: task.outline === "primary",
    contextualSurface: singleSecondarySurface && task.taskSurface === "broad" ? "hidden" as const : task.contextualSurface,
    taskSurface: viewport === "phone" && task.taskSurface === "broad" ? "broad" as const : task.taskSurface,
    singleSecondarySurface,
  };
}
