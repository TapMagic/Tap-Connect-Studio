/**
 * Shared session history helper for visual authoring surfaces.
 * Labels current-session undo/redo — not durable revision history.
 * Reuses AuthoringHistory; do not invent a third competing stack.
 */

import { AuthoringHistory } from "@/lib/fusion/graph/history";

export type SessionHistoryEntry<T> = {
  value: T;
  label: string;
  at: number;
};

export type SessionHistorySnapshot<T> = {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Labels of past actions (most recent last) for History topic UI */
  pastLabels: string[];
  futureLabels: string[];
};

/**
 * Thin labeled wrapper over AuthoringHistory for Brand Kit / Card / shared use.
 */
export class SessionHistory<T> {
  private readonly inner: AuthoringHistory<T>;
  private pastLabels: string[] = [];
  private futureLabels: string[] = [];

  constructor(initial: T, limit = 40) {
    this.inner = new AuthoringHistory(initial, limit);
  }

  get value(): T {
    return this.inner.value;
  }

  get canUndo(): boolean {
    return this.inner.canUndo;
  }

  get canRedo(): boolean {
    return this.inner.canRedo;
  }

  snapshot(): SessionHistorySnapshot<T> {
    return {
      present: this.inner.value,
      canUndo: this.inner.canUndo,
      canRedo: this.inner.canRedo,
      pastLabels: [...this.pastLabels],
      futureLabels: [...this.futureLabels],
    };
  }

  push(next: T, label: string): T {
    this.inner.push(next, label);
    this.pastLabels.push(label);
    this.futureLabels = [];
    return this.inner.value;
  }

  replace(next: T): T {
    this.inner.replace(next);
    this.pastLabels = [];
    this.futureLabels = [];
    return this.inner.value;
  }

  undo(): T {
    if (!this.inner.canUndo) return this.inner.value;
    const label = this.pastLabels.pop() ?? "Change";
    this.inner.undo();
    this.futureLabels.push(label);
    return this.inner.value;
  }

  redo(): T {
    if (!this.inner.canRedo) return this.inner.value;
    const label = this.futureLabels.pop() ?? "Change";
    this.inner.redo();
    this.pastLabels.push(label);
    return this.inner.value;
  }
}

/** React-friendly immutable history ops using the same semantics as editor-history. */
export type LabeledEditorHistory<T> = {
  present: T;
  past: Array<{ value: T; label: string }>;
  future: Array<{ value: T; label: string }>;
};

export function createLabeledHistory<T>(initial: T): LabeledEditorHistory<T> {
  return { present: initial, past: [], future: [] };
}

export function pushLabeledHistory<T>(
  history: LabeledEditorHistory<T>,
  next: T,
  label: string,
  maxDepth = 40
): LabeledEditorHistory<T> {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  const past = [...history.past, { value: structuredClone(history.present), label }];
  if (past.length > maxDepth) past.shift();
  return {
    present: structuredClone(next),
    past,
    future: [],
  };
}

export function undoLabeledHistory<T>(
  history: LabeledEditorHistory<T>
): LabeledEditorHistory<T> | null {
  if (!history.past.length) return null;
  const previous = history.past[history.past.length - 1];
  return {
    present: structuredClone(previous.value),
    past: history.past.slice(0, -1),
    future: [
      { value: structuredClone(history.present), label: previous.label },
      ...history.future,
    ],
  };
}

export function redoLabeledHistory<T>(
  history: LabeledEditorHistory<T>
): LabeledEditorHistory<T> | null {
  if (!history.future.length) return null;
  const [next, ...rest] = history.future;
  return {
    present: structuredClone(next.value),
    past: [
      ...history.past,
      { value: structuredClone(history.present), label: next.label },
    ],
    future: rest,
  };
}
