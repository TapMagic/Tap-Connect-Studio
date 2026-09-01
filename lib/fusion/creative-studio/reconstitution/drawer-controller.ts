import type { StudioRailId } from "./studio-rail-registry";

export type StudioDrawerMode = "closed" | "standard" | "expanded" | "compact";
export type StudioPlacementMode = "insert" | "apply";

export type StudioDrawerPathMemory = {
  query: string;
  scrollOffset: number;
  tabId: string | null;
};

export type StudioDrawerState = {
  activeRailId: StudioRailId | null;
  path: string[];
  mode: StudioDrawerMode;
  query: string;
  scrollOffset: number;
  tabId: string | null;
  placementMode: StudioPlacementMode;
  applyTargetId: string | null;
  memory: Record<string, StudioDrawerPathMemory>;
};

export type StudioDrawerEvent =
  | { type: "RESTORE"; state: StudioDrawerState }
  | { type: "OPEN_RAIL"; railId: StudioRailId; mode?: Exclude<StudioDrawerMode, "closed"> }
  | { type: "NAVIGATE"; path: string[]; mode?: Exclude<StudioDrawerMode, "closed"> }
  | { type: "BACK" }
  | { type: "CLOSE" }
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_SCROLL"; scrollOffset: number }
  | { type: "SET_TAB"; tabId: string | null }
  | { type: "START_APPLY"; targetId: string }
  | { type: "END_APPLY" };

export const INITIAL_STUDIO_DRAWER_STATE: StudioDrawerState = {
  activeRailId: null,
  path: [],
  mode: "closed",
  query: "",
  scrollOffset: 0,
  tabId: null,
  placementMode: "insert",
  applyTargetId: null,
  memory: {},
};

function pathKey(railId: StudioRailId | null, path: readonly string[]) {
  return [railId, ...path].filter(Boolean).join("/");
}

function parentPath(path: readonly string[]): string[] {
  // `family` is an internal routing namespace, not a customer-visible page.
  // Governed families return directly to the Buttons gallery.
  if ((path[0] === "buttons" || path[0] === "curated") && path[1] === "family" && path.length >= 3) {
    return [path[0]];
  }
  return path.slice(0, -1);
}

function remember(state: StudioDrawerState): StudioDrawerState["memory"] {
  if (!state.activeRailId) return state.memory;
  return {
    ...state.memory,
    [pathKey(state.activeRailId, state.path)]: {
      query: state.query,
      scrollOffset: state.scrollOffset,
      tabId: state.tabId,
    },
  };
}

function restore(
  state: StudioDrawerState,
  railId: StudioRailId,
  path: string[]
): Pick<StudioDrawerState, "query" | "scrollOffset" | "tabId"> {
  return state.memory[pathKey(railId, path)] ?? { query: "", scrollOffset: 0, tabId: null };
}

export function studioDrawerReducer(
  state: StudioDrawerState,
  event: StudioDrawerEvent
): StudioDrawerState {
  if (event.type === "RESTORE") return event.state;
  if (event.type === "OPEN_RAIL") {
    if (state.activeRailId === event.railId && state.mode !== "closed") {
      return { ...state, memory: remember(state), mode: "closed" };
    }
    const memory = remember(state);
    const nextBase = { ...state, memory };
    return {
      ...nextBase,
      activeRailId: event.railId,
      path: [],
      mode: event.mode ?? (event.railId === "layers" ? "compact" : "standard"),
      ...restore(nextBase, event.railId, []),
    };
  }
  if (event.type === "NAVIGATE") {
    if (!state.activeRailId) return state;
    const memory = remember(state);
    const nextBase = { ...state, memory };
    return {
      ...nextBase,
      path: [...event.path],
      mode: event.mode ?? state.mode,
      ...restore(nextBase, state.activeRailId, event.path),
    };
  }
  if (event.type === "BACK") {
    if (!state.activeRailId || state.path.length === 0) return { ...state, mode: "closed" };
    return studioDrawerReducer(state, { type: "NAVIGATE", path: parentPath(state.path) });
  }
  if (event.type === "CLOSE") return { ...state, memory: remember(state), mode: "closed" };
  if (event.type === "SET_QUERY") return { ...state, query: event.query };
  if (event.type === "SET_SCROLL") return { ...state, scrollOffset: Math.max(0, event.scrollOffset) };
  if (event.type === "SET_TAB") return { ...state, tabId: event.tabId };
  if (event.type === "START_APPLY") return { ...state, placementMode: "apply", applyTargetId: event.targetId };
  if (event.type === "END_APPLY") return { ...state, placementMode: "insert", applyTargetId: null };
  return state;
}
