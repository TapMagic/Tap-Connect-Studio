/**
 * Bounded undo/redo history for visual authoring definitions.
 */

export type HistorySnapshot<T> = {
  value: T;
  label?: string;
  at: number;
};

export class AuthoringHistory<T> {
  private past: HistorySnapshot<T>[] = [];
  private future: HistorySnapshot<T>[] = [];
  private current: T;
  private readonly limit: number;

  constructor(initial: T, limit = 40) {
    this.current = initial;
    this.limit = limit;
  }

  get value(): T {
    return this.current;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Commit a new value (clears redo stack). */
  push(next: T, label?: string): T {
    this.past.push({ value: this.current, label, at: Date.now() });
    if (this.past.length > this.limit) this.past.shift();
    this.current = next;
    this.future = [];
    return this.current;
  }

  /** Replace current without recording (e.g. load draft). */
  replace(next: T): T {
    this.current = next;
    this.past = [];
    this.future = [];
    return this.current;
  }

  undo(): T {
    const prev = this.past.pop();
    if (!prev) return this.current;
    this.future.push({ value: this.current, at: Date.now() });
    this.current = prev.value;
    return this.current;
  }

  redo(): T {
    const next = this.future.pop();
    if (!next) return this.current;
    this.past.push({ value: this.current, at: Date.now() });
    this.current = next.value;
    return this.current;
  }
}
