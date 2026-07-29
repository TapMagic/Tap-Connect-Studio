/**
 * Nested contextual panel stack — one decision narrows to the next.
 * Panel navigation itself must not create undo history entries.
 */

export type PanelStackEntry = {
  id: string;
  title: string;
  /** Parent breadcrumb label (optional) */
  parentTitle?: string;
  /** Opaque panel payload (selection target, format scope, etc.) */
  payload?: Record<string, unknown>;
};

export type PanelStackState = {
  stack: PanelStackEntry[];
  /** Remember last path per root id for reopen memory */
  memory: Record<string, PanelStackEntry[]>;
};

export function createPanelStack(
  root?: PanelStackEntry | null
): PanelStackState {
  return {
    stack: root ? [root] : [],
    memory: {},
  };
}

export function currentPanel(state: PanelStackState): PanelStackEntry | null {
  return state.stack[state.stack.length - 1] ?? null;
}

export function panelBreadcrumbs(state: PanelStackState): string[] {
  return state.stack.map((e) => e.title);
}

export function pushPanel(
  state: PanelStackState,
  entry: PanelStackEntry
): PanelStackState {
  const stack = [...state.stack, entry];
  const rootId = stack[0]?.id;
  const memory = rootId
    ? { ...state.memory, [rootId]: stack }
    : state.memory;
  return { stack, memory };
}

export function popPanel(state: PanelStackState): PanelStackState {
  if (state.stack.length <= 1) {
    return closePanel(state);
  }
  const stack = state.stack.slice(0, -1);
  const rootId = stack[0]?.id;
  const memory = rootId
    ? { ...state.memory, [rootId]: stack }
    : state.memory;
  return { stack, memory };
}

export function closePanel(state: PanelStackState): PanelStackState {
  const rootId = state.stack[0]?.id;
  if (!rootId) return { stack: [], memory: state.memory };
  return {
    stack: [],
    memory: { ...state.memory, [rootId]: state.stack },
  };
}

export function openRootPanel(
  state: PanelStackState,
  root: PanelStackEntry,
  opts?: { restoreMemory?: boolean }
): PanelStackState {
  if (opts?.restoreMemory && state.memory[root.id]?.length) {
    return { stack: state.memory[root.id], memory: state.memory };
  }
  return {
    stack: [root],
    memory: { ...state.memory, [root.id]: [root] },
  };
}

export function replaceStack(
  state: PanelStackState,
  stack: PanelStackEntry[]
): PanelStackState {
  const rootId = stack[0]?.id;
  return {
    stack,
    memory: rootId ? { ...state.memory, [rootId]: stack } : state.memory,
  };
}
