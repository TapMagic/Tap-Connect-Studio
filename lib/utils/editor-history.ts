/** Pure undo/redo stack for editor state (blocks, card config, etc.) */

export type EditorHistory<T> = {
  present: T;
  past: T[];
  future: T[];
};

export function createEditorHistory<T>(initial: T): EditorHistory<T> {
  return { present: initial, past: [], future: [] };
}

function cloneSnapshot<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pushEditorHistory<T>(
  history: EditorHistory<T>,
  next: T,
  maxDepth = 50
): EditorHistory<T> {
  const prevJson = JSON.stringify(history.present);
  const nextJson = JSON.stringify(next);
  if (prevJson === nextJson) return history;

  const past = [...history.past, cloneSnapshot(history.present)];
  if (past.length > maxDepth) past.shift();

  return {
    present: cloneSnapshot(next),
    past,
    future: [],
  };
}

export function undoEditorHistory<T>(history: EditorHistory<T>): EditorHistory<T> | null {
  if (!history.past.length) return null;
  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  const future = [cloneSnapshot(history.present), ...history.future];
  return { present: cloneSnapshot(previous), past, future };
}

export function redoEditorHistory<T>(history: EditorHistory<T>): EditorHistory<T> | null {
  if (!history.future.length) return null;
  const [next, ...futureRest] = history.future;
  const past = [...history.past, cloneSnapshot(history.present)];
  return { present: cloneSnapshot(next), past, future: futureRest };
}

export function canUndoEditorHistory<T>(history: EditorHistory<T>): boolean {
  return history.past.length > 0;
}

export function canRedoEditorHistory<T>(history: EditorHistory<T>): boolean {
  return history.future.length > 0;
}
